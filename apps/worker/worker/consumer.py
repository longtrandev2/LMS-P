"""grading.submit message handler (P0 skeleton).

Contract: docs/message-contracts.md §2.1. Full grading pipeline (fetch code,
sandbox run, persist, publish events.ws) arrives in P3 — for now we validate
the payload shape, log it and manually ack so the topology is provably alive.
"""

import json
import logging

import aio_pika

logger = logging.getLogger(__name__)

# Minimum required fields of a grading.submit message
REQUIRED_FIELDS = ("submission_id", "question_id", "student_id", "language", "priority")


def validate_payload(data: object) -> dict:
    """Return payload dict if it has all required fields, else raise ValueError."""
    if not isinstance(data, dict):
        raise ValueError("payload must be a JSON object")
    missing = [f for f in REQUIRED_FIELDS if f not in data]
    if missing:
        raise ValueError(f"missing required fields: {', '.join(missing)}")
    return data


async def handle_grading_message(message: aio_pika.IncomingMessage) -> None:
    """Parse → validate → log → manual ack. Malformed messages go to DLQ."""
    try:
        payload = validate_payload(json.loads(message.body.decode()))
    except (json.JSONDecodeError, UnicodeDecodeError, ValueError) as exc:
        logger.error(
            "invalid grading.submit message (reject to DLQ): %s body=%r", exc, message.body[:200]
        )
        # Not a retryable problem — never requeue garbage back onto q.grading
        message.reject(requeue=False)
        return

    logger.info(
        "received grading.submit submission_id=%s question_id=%s student_id=%s "
        "language=%s priority=%s (grading pipeline lands in P3)",
        payload["submission_id"],
        payload["question_id"],
        payload["student_id"],
        payload["language"],
        payload["priority"],
    )
    # P0: ack immediately. From P3: ack only AFTER results are persisted in DB
    # (message-contracts.md §4 — ack-after-persist, crash → redeliver).
    message.ack()
