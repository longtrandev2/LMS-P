"""Enrollment-scope dependencies (BR2): class access check at service level."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.exceptions import AppError
from app.modules.academics import repository as repo
from app.modules.academics.models import Class
from app.modules.identity.deps import get_current_user
from app.modules.identity.models import User


async def ensure_class_access(db: AsyncSession, user: User, class_obj: Class) -> None:
    """Admin/lecturer pass; student must have an active enrollment (BR2)."""
    roles = set(user.role_names)
    if roles & {"admin", "lecturer"}:
        return
    if "student" in roles and await repo.is_enrolled(db, class_obj.id, user.id):
        return
    raise AppError.enrollment_required()


async def require_class_access(
    class_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Class:
    """Load class by path param (404 if missing) then enforce enrollment scope (BR2)."""
    class_obj = await repo.get_class(db, class_id)
    if class_obj is None:
        raise AppError.not_found("Không tìm thấy lớp học")
    await ensure_class_access(db, user, class_obj)
    return class_obj
