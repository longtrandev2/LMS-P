"""SQLAlchemy data access for notifications module."""

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.models import Notification


def list_notifications_stmt(user_id: int, is_read: bool | None = None) -> select:
    """Owner-scoped list, newest first (index user_id,is_read,created_at)."""
    stmt = select(Notification).where(Notification.user_id == user_id)
    if is_read is not None:
        stmt = stmt.where(Notification.is_read == is_read)
    return stmt.order_by(Notification.created_at.desc(), Notification.id.desc())


async def get_notification(db: AsyncSession, notification_id: int) -> Notification | None:
    return await db.get(Notification, notification_id)


async def mark_all_read(db: AsyncSession, user_id: int) -> int:
    """Mark every unread notification of the user as read. Returns rowcount."""
    result = await db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    return result.rowcount or 0
