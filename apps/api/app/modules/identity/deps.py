"""RBAC dependencies: get_current_user, require_roles(...)."""

import jwt as pyjwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.exceptions import AppError
from app.core.security import decode_access_token
from app.modules.identity import repository as repo
from app.modules.identity.models import User

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if creds is None or creds.scheme.lower() != "bearer" or not creds.credentials:
        raise AppError.unauthenticated()
    try:
        payload = decode_access_token(creds.credentials)
        user_id = int(payload["sub"])
    except (pyjwt.InvalidTokenError, KeyError, ValueError):
        raise AppError.unauthenticated("Token không hợp lệ hoặc đã hết hạn")
    user = await repo.get_user_by_id(db, user_id)
    if user is None or user.status != "active":
        raise AppError.unauthenticated("Tài khoản không khả dụng")
    return user


def require_roles(*role_names: str):
    """Dependency factory: allow only users holding one of the given roles."""

    async def checker(user: User = Depends(get_current_user)) -> User:
        if not set(role_names) & set(user.role_names):
            raise AppError.forbidden()
        return user

    return checker
