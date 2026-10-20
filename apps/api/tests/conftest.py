"""Shared fixtures: in-memory aiosqlite DB + ASGI client (no external services)."""

import os
import tempfile

# JWT_SECRET is mandatory (create_app fails fast) — set before importing app
os.environ.setdefault("JWT_SECRET", "test-only-secret-0123456789abcdef0123456789abcdef")
# Isolated storage root for material upload/download tests (read once by Settings)
os.environ.setdefault("STORAGE_DIR", tempfile.mkdtemp(prefix="lms-test-storage-"))

import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy import select  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402

import app.modules.academics.models  # noqa: F401,E402 — register tables
import app.modules.notifications.models  # noqa: F401,E402
import app.modules.materials.models  # noqa: F401,E402 — register tables
from app.core.db import Base, get_db  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.main import app  # noqa: E402
from app.modules.identity.models import Role, User  # noqa: E402

DEMO_PASSWORD = "Demo@12345"


@pytest_asyncio.fixture
async def db_engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db(db_engine):
    maker = async_sessionmaker(db_engine, expire_on_commit=False)
    async with maker() as session:
        session.add_all([
            Role(name="student", description="Sinh viên"),
            Role(name="lecturer", description="Giảng viên"),
            Role(name="admin", description="Quản trị"),
        ])
        await session.commit()
        yield session


@pytest_asyncio.fixture
async def client(db, db_engine):
    maker = async_sessionmaker(db_engine, expire_on_commit=False)

    async def override_get_db():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


async def make_user(db, email: str, roles: list[str], password: str = DEMO_PASSWORD,
                    full_name: str = "Test User", student_code: str | None = None) -> User:
    role_objs = (await db.execute(select(Role).where(Role.name.in_(roles)))).scalars().all()
    user = User(
        email=email,
        full_name=full_name,
        student_code=student_code,
        password_hash=hash_password(password),
        roles=list(role_objs),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def login(client: AsyncClient, email: str, password: str = DEMO_PASSWORD) -> dict:
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()


def bearer(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}
