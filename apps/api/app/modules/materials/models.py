"""Materials models (M3): materials table per database-design §2.3."""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.modules.identity.models import MYSQL_CHARSET, BigIntegerPK, utcnow


class Material(Base):
    __tablename__ = "materials"
    __table_args__ = (
        Index("ix_materials_class_created", "class_id", "created_at"),
        MYSQL_CHARSET,
    )

    id: Mapped[int] = mapped_column(BigIntegerPK, primary_key=True, autoincrement=True)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(
        Enum("pdf", "doc", "slide", "link", "video", "archive", "other", name="material_type"),
        default="other",
        nullable=False,
    )
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)  # link -> URL
    size_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


__all__ = ["Material"]
