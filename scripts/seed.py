"""Idempotent seed: roles, admin (random password printed), demo lecturer/student.

Run from repo root with the API venv:
    apps/api/.venv/Scripts/python.exe scripts/seed.py
Requires DATABASE_URL (env or apps/api/.env) pointing at a migrated database.
"""

import asyncio
import secrets
import string
import sys
from pathlib import Path

_API_ROOT = Path(__file__).resolve().parents[1]
if (_API_ROOT / "apps" / "api" / "app").is_dir():
    API_ROOT = _API_ROOT / "apps" / "api"  # host: scripts/ nằm ở repo root
else:
    API_ROOT = _API_ROOT  # container: scripts được mount cạnh package `app`
sys.path.insert(0, str(API_ROOT))

from sqlalchemy import select  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.modules.identity import repository as repo  # noqa: E402
from app.modules.identity.models import Role, User  # noqa: E402

ROLES = [
    ("student", "Sinh viên"),
    ("lecturer", "Giảng viên"),
    ("admin", "Quản trị"),
]
DEMO_PASSWORD = "Demo@12345"


def random_password(length: int = 14) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


async def ensure_user(db, email: str, full_name: str, role_names: list[str],
                      password: str | None = None, student_code: str | None = None) -> tuple[User, bool, str | None]:
    """Create user if missing. Returns (user, created, plain_password_or_None)."""
    existing = await repo.get_user_by_email(db, email)
    if existing:
        return existing, False, None
    plain = password or random_password()
    user = User(
        email=email,
        full_name=full_name,
        student_code=student_code,
        password_hash=hash_password(plain),
    )
    db.add(user)
    await db.flush()
    await repo.set_user_roles(db, user, role_names)
    await db.commit()
    await db.refresh(user)
    return user, True, (None if password else plain)


async def main() -> None:
    from app.core.db import SessionLocal  # import after sys.path setup

    async with SessionLocal() as db:
        for name, description in ROLES:
            existing = (await db.execute(select(Role).where(Role.name == name))).scalar_one_or_none()
            if existing is None:
                db.add(Role(name=name, description=description))
                await db.commit()
                print(f"[seed] created role: {name}")

        admin, created, pw = await ensure_user(db, "admin@lms.local", "Quản trị viên", ["admin"])
        if created:
            print(f"[seed] created admin  admin@lms.local  password: {pw}")
        else:
            print("[seed] admin exists, skipped")

        lecturer, created, _ = await ensure_user(
            db, "lecturer@lms.local", "Giảng viên Demo", ["lecturer"], password=DEMO_PASSWORD
        )
        if created:
            print(f"[seed] created lecturer  lecturer@lms.local  password: {DEMO_PASSWORD}")
        student, created, _ = await ensure_user(
            db, "student@lms.local", "Sinh viên Demo", ["student"],
            password=DEMO_PASSWORD, student_code="SV000001",
        )
        if created:
            print(f"[seed] created student  student@lms.local  password: {DEMO_PASSWORD}")
        print("[seed] done.")


if __name__ == "__main__":
    asyncio.run(main())
