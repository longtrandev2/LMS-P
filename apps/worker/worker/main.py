"""Worker entrypoint — connect AMQP, declare topology, consume q.grading.

Topology (docs/message-contracts.md §1):
  exchange lms (direct, durable)
    ├─ grading.submit ─▶ q.grading (durable, x-max-priority=10, DLX=lms.dlx)
    └─ events.ws      ─▶ q.events (durable, consumed by API)
  exchange lms.dlx (fanout) ─▶ q.grading.dead
"""

import asyncio
import logging
import signal

import aio_pika

from worker.consumer import handle_grading_message
from worker.settings import PREFETCH, RABBITMQ_URL

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

RETRY_MIN_S = 1
RETRY_MAX_S = 30


async def connect_with_retry() -> aio_pika.abc.AbstractRobustConnection:
    """Connect to RabbitMQ with exponential-ish backoff 1s → 30s."""
    delay = RETRY_MIN_S
    while True:
        try:
            connection = await aio_pika.connect(RABBITMQ_URL)
            logger.info("connected to RabbitMQ")
            return connection
        except Exception as exc:  # noqa: BLE001 — broker down at boot is expected
            logger.warning("RabbitMQ connect failed (%s), retrying in %ss", exc, delay)
            await asyncio.sleep(delay)
            delay = min(delay * 2, RETRY_MAX_S)


async def declare_topology(channel: aio_pika.abc.AbstractChannel) -> aio_pika.Queue:
    """Idempotently declare exchanges/queues per message-contracts §1."""
    await channel.set_qos(prefetch_count=PREFETCH)

    exchange = await channel.declare_exchange("lms", aio_pika.ExchangeType.DIRECT, durable=True)
    dlx = await channel.declare_exchange("lms.dlx", aio_pika.ExchangeType.FANOUT, durable=True)

    q_grading = await channel.declare_queue(
        "q.grading",
        durable=True,
        arguments={
            "x-max-priority": 10,
            "x-dead-letter-exchange": "lms.dlx",
        },
    )
    await q_grading.bind(exchange, routing_key="grading.submit")

    q_dead = await channel.declare_queue("q.grading.dead", durable=True)
    # DLX is fanout → binding not required, but explicit bind documents intent
    await q_dead.bind(dlx, routing_key="")

    q_events = await channel.declare_queue("q.events", durable=True)
    await q_events.bind(exchange, routing_key="events.ws")

    return q_grading


async def run() -> None:
    """Connect, declare, consume until stopped; supervise on connection loss."""
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, stop.set)
        except NotImplementedError:
            # Windows Proactor loop — signal handled via KeyboardInterrupt below
            pass

    while not stop.is_set():
        connection = None
        try:
            connection = await connect_with_retry()
            channel = await connection.channel()
            q_grading = await declare_topology(channel)
            consumer_tag = await q_grading.consume(handle_grading_message)
            logger.info("consuming q.grading (prefetch=%s)", PREFETCH)
            await stop.wait()
            logger.info("shutdown requested — cancelling consumer")
            await q_grading.cancel(consumer_tag)
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001 — reconnect on any mid-run failure
            logger.exception("worker loop crashed, reconnecting in %ss", RETRY_MIN_S)
            await asyncio.sleep(RETRY_MIN_S)
        finally:
            if connection is not None and not connection.is_closed:
                await connection.close()
    logger.info("worker stopped cleanly")


def main() -> None:
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        logging.getLogger(__name__).info("interrupted — exiting")


if __name__ == "__main__":
    main()
