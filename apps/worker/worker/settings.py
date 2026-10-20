"""Worker runtime settings — read from environment variables."""

import os

# AMQP connection string, e.g. amqp://lms:lms@rabbitmq:5672/
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://lms:lms@localhost:5672/")

# MySQL (async driver) — worker fetches submissions/test cases from DB (P3+)
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+asyncmy://lms:lms@localhost:3306/lms")

# Per-consumer unacked message budget (message-contracts.md §1: prefetch=2)
PREFETCH = int(os.getenv("WORKER_PREFETCH", "2"))
