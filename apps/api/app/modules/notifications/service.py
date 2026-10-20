"""Notifications business logic (FR-NTF-01..02): create + push, list, mark read.

Integration point for other modules (materials, grading...):
    from app.modules.notifications.service import create_notification
Stable signature:
    create_notification(db, user_id, type, title, body=None, data=None, commit=True)
Inserts the row, then pushes WS event notification.new with payload
{id, type, title, body, data} per message-contracts.md section 3.
"""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.core.pagination import Page, paginate
from app.modules.notifications import repository as repo
from app.modules.notifications.models import Notification
from app.modules.notifications.schemas import NotificationOut
from app.ws.manager import manager


async def create_notification(
    db: AsyncSession,
    user_id: int,
    type: str,
    title: str,
    body: str | None = None,
    data: dict[str, Any] | None = None,
    commit: bool = True,
) -> Notification:
    """Persist a notification and push notification.new over WS (best effort)."""
    notification = Notification(user_id=user_id, type=type, title=title, body=body, data=data)
    db.add(notification)
    if commit:
        await db.commit()
    else:
        await db.flush()  # caller owns the surrounding transaction
    await db.refresh(notification)
    try:
        await manager.push_to_user(
            user_id,
            "notification.new",
            {
                "id": notification.id,
                "type": notification.type,
                "title": notification.title,
                "body": notification.body,
                "data": notification.data,
            },
        )
    except Exception:
        # WS is an optimization channel (message-contracts section 4) - never fail the txn
        pass
    return notification


async def list_notifications(
    db: AsyncSession, user_id: int, is_read: bool | None, page: int, limit: int
) -> Page[NotificationOut]:
    stmt = repo.list_notifications_stmt(user_id, is_read)
    return await paginate(db, stmt, NotificationOut.model_validate, page, limit)


async def mark_read(db: AsyncSession, user_id: int, notification_id: int) -> Notification:
    """Mark one notification read; 404 if missing or owned by someone else."""
    notification = await repo.get_notification(db, notification_id)
    if notification is None or notification.user_id != user_id:
        raise AppError.not_found("Không tìm thấy thông báo")
    if not notification.is_read:
        notification.is_read = True
        await db.commit()
        await db.refresh(notification)
    return notification


async def mark_all_read(db: AsyncSession, user_id: int) -> int:
    updated = await repo.mark_all_read(db, user_id)
    await db.commit()
    return updated
