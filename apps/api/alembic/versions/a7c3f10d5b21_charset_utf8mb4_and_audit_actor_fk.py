"""utf8mb4 charset for all tables + audit_logs.actor_id FK (design §2.9/§4)

Review follow-up M6 + minor-8: initial migration is already committed, so this
new migration converts every table to utf8mb4 / utf8mb4_0900_ai_ci and adds the
missing FK audit_logs.actor_id -> users.id (NULL = system).

Revision ID: a7c3f10d5b21
Revises: 41f98c9e9ef3
Create Date: 2026-10-20 23:05:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = "a7c3f10d5b21"
down_revision: Union[str, None] = "41f98c9e9ef3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = [
    "users",
    "roles",
    "user_roles",
    "refresh_tokens",
    "courses",
    "classes",
    "enrollments",
    "audit_logs",
]


def upgrade() -> None:
    for table in TABLES:
        op.execute(
            f"ALTER TABLE `{table}` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
        )
    op.create_foreign_key(
        "fk_audit_logs_actor_id",
        source_table="audit_logs",
        referent_table="users",
        local_cols=["actor_id"],
        remote_cols=["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint("fk_audit_logs_actor_id", "audit_logs", type_="foreignkey")
    # leave charset conversion in place: converting back could truncate data
