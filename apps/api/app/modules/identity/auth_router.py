"""Auth endpoints: login, refresh, logout, me."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.modules.identity import auth_service
from app.modules.identity.deps import get_current_user
from app.modules.identity.models import User
from app.modules.identity.schemas import LoginIn, RefreshIn, TokenPair, UserOut

router = APIRouter(tags=["auth"])


@router.post("/auth/login", response_model=TokenPair)
async def login(payload: LoginIn, db: AsyncSession = Depends(get_db)):
    return await auth_service.login(db, payload.email, payload.password)


@router.post("/auth/refresh", response_model=TokenPair)
async def refresh(payload: RefreshIn, db: AsyncSession = Depends(get_db)):
    return await auth_service.refresh(db, payload.refresh_token)


@router.post("/auth/logout", status_code=204)
async def logout(
    payload: RefreshIn,
    user: User = Depends(get_current_user),  # spec: logout requires auth
    db: AsyncSession = Depends(get_db),
):
    await auth_service.logout(db, payload.refresh_token)


@router.get("/auth/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return UserOut.from_user(user)


def client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None
