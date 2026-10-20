"""Auth flows: login (argon2 + brute-force lock), refresh rotation, logout."""


from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
    refresh_expiry,
    verify_password,
)
from app.modules.identity import repository as repo
from app.modules.identity.login_throttle import login_throttle
from app.modules.identity.models import User, utcnow
from app.modules.identity.schemas import TokenPair, UserOut


def _issue_tokens(db: AsyncSession, user: User) -> TokenPair:
    refresh_token = generate_refresh_token()
    repo.store_refresh_token(db, user.id, hash_refresh_token(refresh_token), refresh_expiry())
    access_token = create_access_token(user.id, user.role_names)
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut.from_user(user),
    )


async def login(db: AsyncSession, email: str, password: str) -> TokenPair:
    remaining = login_throttle.check(email)
    if remaining > 0:
        raise AppError.rate_limited(f"Tài khoản tạm khóa do đăng nhập sai nhiều lần. Thử lại sau {int(remaining // 60 + 1)} phút.")

    user = await repo.get_user_by_email(db, email)
    ok = user is not None and user.status == "active" and verify_password(password, user.password_hash)
    if not ok:
        fails = login_throttle.record_failure(email)
        msg = "Email hoặc mật khẩu không đúng"
        if fails >= 4:
            msg += f" (còn {5 - fails} lần thử trước khi khóa tạm)"
        raise _cred_error(msg)

    login_throttle.reset(email)
    user.last_login_at = utcnow()
    pair = _issue_tokens(db, user)
    await db.commit()
    return pair


def _cred_error(msg: str) -> AppError:
    # 401 with generic credential error (avoid user enumeration)
    return AppError("UNAUTHENTICATED", msg, 401)


async def refresh(db: AsyncSession, refresh_token: str) -> TokenPair:
    token_hash = hash_refresh_token(refresh_token)
    stored = await repo.find_refresh_token(db, token_hash)
    now = utcnow()
    if stored is None or stored.revoked_at is not None or stored.expires_at <= now:
        raise AppError.unauthenticated("Refresh token không hợp lệ hoặc đã hết hạn")
    user = await repo.get_user_by_id(db, stored.user_id)
    if user is None or user.status != "active":
        raise AppError.unauthenticated("Tài khoản không khả dụng")
    # rotate: revoke old, issue new pair
    stored.revoked_at = now
    pair = _issue_tokens(db, user)
    await db.commit()
    return pair


async def logout(db: AsyncSession, refresh_token: str) -> None:
    stored = await repo.find_refresh_token(db, hash_refresh_token(refresh_token))
    if stored is not None and stored.revoked_at is None:
        stored.revoked_at = utcnow()
        await db.commit()


async def logout_all(db: AsyncSession, user_id: int) -> None:
    """Logout khi client không gửi refresh_token: thu hồi toàn bộ session (M4)."""
    await repo.revoke_all_refresh_tokens(db, user_id)
    await db.commit()
