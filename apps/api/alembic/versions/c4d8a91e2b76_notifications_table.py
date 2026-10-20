"""notifications table (database-design: FR-NTF-01..02)

Revision ID: c4d8a91e2b76
Revises: a7c3f10d5b21
Create Date: 2026-10-20 23:55:00.000000

NOTE (wave 2, parallel agents): down_revision temporarily points at
a7c3f10d5b21 (current head). The lead will re-chain this onto the materials
migration once both branches land — adjust down_revision only, never edit
this file after commit (per CLAUDE.md migration rules).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c4d8a91e2b76"
down_revision: Union[str, None] = "b8f4d2c6e931"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

MYSQL_CHARSET = {"mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_0900_ai_ci"}


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.BigInteger().with_variant(sa.Integer(), "sqlite"),
                  primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("data", sa.JSON(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        **MYSQL_CHARSET,
    )
    op.create_index(
        "ix_notifications_user_read_created",
        "notifications",
        ["user_id", "is_read", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_notifications_user_read_created", table_name="notifications")
    op.drop_table("notifications")
