"""Append-only audit trail (BR7): model + write_audit helper."""

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, BigInteger, DateTime, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.modules.identity.models import BigIntegerPK


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_entity", "entity_type", "entity_id"),
        Index("ix_audit_actor", "actor_id", "created_at"),
        Index("ix_audit_created", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigIntegerPK, primary_key=True, autoincrement=True)
    actor_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    action: Mapped[str] = mapped_column(String(60))
    entity_type: Mapped[str] = mapped_column(String(40))
    entity_id: Mapped[int] = mapped_column(BigInteger)
    old_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    new_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


async def write_audit(
    db,
    actor_id: int | None,
    action: str,
    entity_type: str,
    entity_id: int,
    old: dict[str, Any] | None = None,
    new: dict[str, Any] | None = None,
    ip: str | None = None,
) -> None:
    """Queue an audit row on the given session (committed with caller's txn)."""
    db.add(
        AuditLog(
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=old,
            new_value=new,
            ip=ip,
            created_at=datetime.utcnow(),
        )
    )
