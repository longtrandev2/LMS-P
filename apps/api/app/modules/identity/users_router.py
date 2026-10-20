"""User endpoints: self-update + admin management (list/create/import/update)."""

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.pagination import Page, PageParams, page_query, paginate
from app.modules.identity import repository as repo
from app.modules.identity import user_service
from app.modules.identity.auth_router import client_ip
from app.modules.identity.csv_import import import_users
from app.modules.identity.deps import get_current_user, require_roles
from app.modules.identity.models import User
from app.modules.identity.schemas import (
    ImportResult,
    UpdateMeIn,
    UserCreateIn,
    UserOut,
    UserUpdateIn,
    UserWithTempPassword,
)

router = APIRouter(tags=["users"])


@router.patch("/users/me", response_model=UserOut)
async def update_me(
    payload: UpdateMeIn,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updated = await user_service.update_me(
        db, user, payload.full_name, payload.current_password, payload.new_password, client_ip(request)
    )
    return UserOut.from_user(updated)


@router.get("/users", response_model=Page[UserOut], dependencies=[Depends(require_roles("admin"))])
async def list_users(
    role: str | None = Query(None),
    status: str | None = Query(None),
    q: str | None = Query(None),
    pager: PageParams = Depends(page_query),
    db: AsyncSession = Depends(get_db),
):
    stmt = await repo.list_users(db, role, status, q)
    return await paginate(db, stmt, UserOut.from_user, pager.page, pager.limit)


@router.post("/users", response_model=UserWithTempPassword, status_code=201,
             dependencies=[Depends(require_roles("admin"))])
async def create_user(
    payload: UserCreateIn,
    request: Request,
    actor: User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    user, temp_pw = await user_service.create_user(db, payload, actor, client_ip(request))
    return UserWithTempPassword(user=UserOut.from_user(user), temporary_password=temp_pw)


@router.post("/users/import", response_model=ImportResult, dependencies=[Depends(require_roles("admin"))])
async def import_users_csv(
    request: Request,
    file: UploadFile = File(...),
    actor: User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    content = (await file.read()).decode("utf-8-sig")
    created, skipped, errors, temp_passwords = await import_users(db, content, actor, client_ip(request))
    return ImportResult(created=created, skipped=skipped, errors=errors, temp_passwords=temp_passwords)


@router.get("/users/{user_id}", response_model=UserOut, dependencies=[Depends(require_roles("admin"))])
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    return UserOut.from_user(await user_service.get_user_or_404(db, user_id))


@router.patch("/users/{user_id}", response_model=UserWithTempPassword, dependencies=[Depends(require_roles("admin"))])
async def update_user(
    user_id: int,
    payload: UserUpdateIn,
    request: Request,
    actor: User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    user, temp_pw = await user_service.update_user(db, user_id, payload, actor, client_ip(request))
    return UserWithTempPassword(user=UserOut.from_user(user), temporary_password=temp_pw)
