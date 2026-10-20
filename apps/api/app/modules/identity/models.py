"""Identity models (M1): users, roles, user_roles, refresh_tokens."""

from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    CHAR,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Table,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

# BIGINT PK; Integer variant keeps sqlite (tests) autoincrement working
BigIntegerPK = BigInteger().with_variant(Integer, "sqlite")

# database-design §4: utf8mb4 + utf8mb4_0900_ai_ci toàn hệ thống (tiếng Việt)
MYSQL_CHARSET = {"mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_0900_ai_ci"}

user_roles_table = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    **MYSQL_CHARSET,
)


def utcnow() -> datetime:
    """Naive UTC timestamp (app-level UTC per database-design conventions)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"
    __table_args__ = MYSQL_CHARSET

    id: Mapped[int] = mapped_column(BigIntegerPK, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    student_code: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    status: Mapped[str] = mapped_column(Enum("active", "locked", name="user_status"), default="active", nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    roles: Mapped[list["Role"]] = relationship(secondary=user_roles_table, lazy="selectin")

    @property
    def role_names(self) -> list[str]:
        return sorted(r.name for r in self.roles)


class Role(Base):
    __tablename__ = "roles"
    __table_args__ = MYSQL_CHARSET

    # TINYINT-like PK; Integer variant keeps sqlite (tests) autoincrement working
    id: Mapped[int] = mapped_column(
        SmallInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True
    )
    name: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = MYSQL_CHARSET

    id: Mapped[int] = mapped_column(BigIntegerPK, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(CHAR(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


__all__ = ["User", "Role", "RefreshToken", "user_roles_table", "utcnow", "MYSQL_CHARSET"]
