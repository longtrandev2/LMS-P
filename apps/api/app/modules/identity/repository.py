"""SQLAlchemy data access for identity module."""


from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.identity.models import RefreshToken, Role, User, user_roles_table, utcnow


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    return (await db.execute(select(User).where(func.lower(User.email) == email.lower()))).scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    return await db.get(User, user_id)


async def get_roles_by_names(db: AsyncSession, names: list[str]) -> list[Role]:
    result = await db.execute(select(Role).where(Role.name.in_(names)))
    return list(result.scalars().all())


async def get_all_roles(db: AsyncSession) -> list[Role]:
    return list((await db.execute(select(Role))).scalars().all())


async def set_user_roles(db: AsyncSession, user: User, role_names: list[str]) -> None:
    roles = await get_roles_by_names(db, role_names)
    if len(roles) != len(set(role_names)):
        missing = set(role_names) - {r.name for r in roles}
        raise ValueError(f"role không tồn tại: {missing}")
    await db.execute(user_roles_table.delete().where(user_roles_table.c.user_id == user.id))
    for role in roles:
        await db.execute(user_roles_table.insert().values(user_id=user.id, role_id=role.id))
    await db.refresh(user)


def store_refresh_token(db: AsyncSession, user_id: int, token_hash: str, expires_at: datetime) -> None:
    db.add(RefreshToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at))


async def find_refresh_token(db: AsyncSession, token_hash: str) -> RefreshToken | None:
    return (await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))).scalar_one_or_none()


async def revoke_refresh_token(db: AsyncSession, token: RefreshToken) -> None:
    token.revoked_at = utcnow()


async def revoke_all_refresh_tokens(db: AsyncSession, user_id: int) -> None:
    """Revoke every live refresh token of a user (password reset/change, lock)."""
    await db.execute(
        RefreshToken.__table__.update()
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=utcnow())
    )


def list_users(role: str | None, status: str | None, q: str | None) -> select:
    """Build the filtered user query (sync — returns the statement)."""
    stmt = select(User).options(selectinload(User.roles)).order_by(User.id)
    if status:
        stmt = stmt.where(User.status == status)
    if q:
        stmt = stmt.where((User.email.ilike(f"%{q}%")) | (User.full_name.ilike(f"%{q}%")))
    if role:
        stmt = stmt.join(User.roles).where(Role.name == role)
    return stmt
