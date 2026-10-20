"""Notification endpoints (api-spec.md section 9). Owner-only (JWT user)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.error_schemas import error_responses
from app.core.pagination import Page, PageParams, page_query
from app.modules.identity.deps import get_current_user
from app.modules.identity.models import User
from app.modules.notifications import service
from app.modules.notifications.schemas import NotificationOut, ReadAllOut

router = APIRouter(tags=["notifications"])


@router.get("/notifications", summary="Danh sách thông báo của tôi", response_model=Page[NotificationOut],
            responses=error_responses(401))
async def list_notifications(
    is_read: bool | None = Query(None, description="Lọc theo trạng thái đã đọc"),
    user: User = Depends(get_current_user),
    pager: PageParams = Depends(page_query),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_notifications(db, user.id, is_read, pager.page, pager.limit)


@router.patch(
    "/notifications/{notification_id}/read",
    summary="Đánh dấu một thông báo đã đọc",
    response_model=NotificationOut,
    responses=error_responses(401, 404),
)
async def read_notification(
    notification_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notification = await service.mark_read(db, user.id, notification_id)
    return NotificationOut.model_validate(notification)


@router.patch("/notifications/read-all", summary="Đánh dấu tất cả đã đọc", response_model=ReadAllOut,
              responses=error_responses(401))
async def read_all_notifications(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return ReadAllOut(updated=await service.mark_all_read(db, user.id))
