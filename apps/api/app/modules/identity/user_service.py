"""User management: self-update, admin CRUD, role assign, password reset."""

import secrets
import string

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import write_audit
from app.core.exceptions import AppError
from app.core.security import hash_password, verify_password
from app.modules.identity import repository as repo
from app.modules.identity.models import User
from app.modules.identity.schemas import UserCreateIn, UserUpdateIn


def generate_temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


async def update_me(db: AsyncSession, user: User, full_name: str | None,
                    current_password: str | None, new_password: str | None, ip: str | None) -> User:
    old = {"full_name": user.full_name}
    if full_name is not None:
        user.full_name = full_name
    if new_password is not None:
        if not current_password or not verify_password(current_password, user.password_hash):
            raise AppError.validation("Mật khẩu hiện tại không đúng")
        user.password_hash = hash_password(new_password)
        old["password"] = "***"
        # kill all live sessions (M4): refresh tokens revoked in the same txn
        await repo.revoke_all_refresh_tokens(db, user.id)
    await write_audit(db, user.id, "user.update", "user", user.id, old=old,
                      new={"full_name": user.full_name}, ip=ip)
    await db.commit()
    await db.refresh(user)
    return user


async def create_user(db: AsyncSession, payload: UserCreateIn, actor: User, ip: str | None):
    if await repo.get_user_by_email(db, payload.email):
        raise AppError.validation("Email đã tồn tại", status_code=409)
    temp_password = payload.password or generate_temp_password()
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        student_code=payload.student_code,
        password_hash=hash_password(temp_password),
    )
    db.add(user)
    try:
        await db.flush()
        await repo.set_user_roles(db, user, payload.role_names)
        await write_audit(db, actor.id, "user.create", "user", user.id,
                          new={"email": user.email, "roles": payload.role_names}, ip=ip)
        await db.commit()
    except IntegrityError:
        # race on unique email/student_code (minor #2) -> clean 409, not 500
        await db.rollback()
        raise AppError.validation("Email hoặc mã sinh viên đã tồn tại", status_code=409)
    await db.refresh(user)
    return user, (None if payload.password else temp_password)


async def get_user_or_404(db: AsyncSession, user_id: int) -> User:
    user = await repo.get_user_by_id(db, user_id)
    if user is None:
        raise AppError.not_found("Không tìm thấy người dùng")
    return user


async def update_user(db: AsyncSession, user_id: int, payload: UserUpdateIn, actor: User, ip: str | None):
    user = await get_user_or_404(db, user_id)
    old = {"full_name": user.full_name, "status": user.status, "roles": user.role_names}
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.student_code is not None:
        user.student_code = payload.student_code or None
    sessions_revoked = False
    if payload.status is not None and payload.status != user.status:
        user.status = payload.status
        if payload.status == "locked":
            await repo.revoke_all_refresh_tokens(db, user.id)  # lock kills sessions (M4)
            sessions_revoked = True
    if payload.role_names is not None:
        await repo.set_user_roles(db, user, payload.role_names)
        await write_audit(db, actor.id, "role.assign", "user", user.id,
                          old={"roles": old["roles"]}, new={"roles": payload.role_names}, ip=ip)
    temp_password = None
    if payload.reset_password:
        temp_password = generate_temp_password()
        user.password_hash = hash_password(temp_password)
        await repo.revoke_all_refresh_tokens(db, user.id)  # reset kills sessions (M4)
        sessions_revoked = True
    await write_audit(db, actor.id, "user.update", "user", user.id, old=old,
                      new={"full_name": user.full_name, "status": user.status,
                           "roles": user.role_names, "password_reset": payload.reset_password,
                           "sessions_revoked": sessions_revoked},
                      ip=ip)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise AppError.validation("Mã sinh viên đã tồn tại", status_code=409)
    await db.refresh(user)
    return user, temp_password
