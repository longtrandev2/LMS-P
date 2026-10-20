"""Auth tests: login ok/bad, brute-force lock, refresh rotation, me."""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import DEMO_PASSWORD, bearer, login, make_user


async def test_login_success(client: AsyncClient, db: AsyncSession):
    await make_user(db, "student1@example.com", ["student"], student_code="SV001")
    data = await login(client, "student1@example.com")
    assert data["access_token"] and data["refresh_token"]
    assert data["user"]["email"] == "student1@example.com"
    assert data["user"]["roles"] == ["student"]


async def test_login_wrong_password_envelope(client: AsyncClient, db: AsyncSession):
    await make_user(db, "student2@example.com", ["student"])
    resp = await client.post(
        "/api/v1/auth/login", json={"email": "student2@example.com", "password": "wrong-pass"}
    )
    assert resp.status_code == 401
    body = resp.json()
    assert body["error"]["code"] == "UNAUTHENTICATED"
    assert "message" in body["error"] and body["error"]["details"] == {}


async def test_login_locked_user_rejected(client: AsyncClient, db: AsyncSession):
    user = await make_user(db, "locked@example.com", ["student"])
    user.status = "locked"
    await db.commit()
    resp = await client.post("/api/v1/auth/login", json={"email": "locked@example.com", "password": DEMO_PASSWORD})
    assert resp.status_code == 401


async def test_brute_force_lock_after_5_failures(client: AsyncClient, db: AsyncSession):
    await make_user(db, "brute@example.com", ["student"])
    for _ in range(5):
        resp = await client.post("/api/v1/auth/login", json={"email": "brute@example.com", "password": "nope"})
        assert resp.status_code == 401
    # 6th attempt — even with the CORRECT password — must be rate-limited
    resp = await client.post("/api/v1/auth/login", json={"email": "brute@example.com", "password": DEMO_PASSWORD})
    assert resp.status_code == 429
    assert resp.json()["error"]["code"] == "RATE_LIMITED"


async def test_refresh_rotation_revokes_old_token(client: AsyncClient, db: AsyncSession):
    await make_user(db, "rot@example.com", ["student"])
    tokens = await login(client, "rot@example.com")

    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert resp.status_code == 200
    new_tokens = resp.json()
    assert new_tokens["refresh_token"] != tokens["refresh_token"]

    # reusing the old (revoked) refresh token must fail
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHENTICATED"


async def test_logout_revokes_refresh(client: AsyncClient, db: AsyncSession):
    await make_user(db, "logout@example.com", ["student"])
    tokens = await login(client, "logout@example.com")
    resp = await client.post("/api/v1/auth/logout", json={"refresh_token": tokens["refresh_token"]},
                             headers=bearer(tokens))
    assert resp.status_code == 204
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert resp.status_code == 401


async def test_logout_requires_bearer(client: AsyncClient, db: AsyncSession):
    await make_user(db, "logout2@example.com", ["student"])
    tokens = await login(client, "logout2@example.com")
    resp = await client.post("/api/v1/auth/logout", json={"refresh_token": tokens["refresh_token"]})
    assert resp.status_code == 401


async def test_change_password_revokes_all_refresh_tokens(client: AsyncClient, db: AsyncSession):
    """M4: đổi mật khẩu phải thu hồi mọi refresh token đang sống."""
    await make_user(db, "chg-revoke@example.com", ["student"])
    tokens1 = await login(client, "chg-revoke@example.com")
    tokens2 = await login(client, "chg-revoke@example.com")
    resp = await client.patch(
        "/api/v1/users/me",
        json={"current_password": DEMO_PASSWORD, "new_password": "NewPass@123"},
        headers=bearer(tokens1),
    )
    assert resp.status_code == 200
    # both pre-change refresh tokens are now dead
    for old in (tokens1, tokens2):
        resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": old["refresh_token"]})
        assert resp.status_code == 401
    # fresh login works and yields a live token
    fresh = await login(client, "chg-revoke@example.com", "NewPass@123")
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": fresh["refresh_token"]})
    assert resp.status_code == 200


async def test_me_requires_token(client: AsyncClient, db: AsyncSession):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHENTICATED"


async def test_change_password(client: AsyncClient, db: AsyncSession):
    await make_user(db, "chg@example.com", ["student"])
    tokens = await login(client, "chg@example.com")
    resp = await client.patch(
        "/api/v1/users/me",
        json={"current_password": DEMO_PASSWORD, "new_password": "NewPass@123", "full_name": "Tên Mới"},
        headers=bearer(tokens),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["full_name"] == "Tên Mới"

    # old password no longer works, new one does
    resp = await client.post("/api/v1/auth/login", json={"email": "chg@example.com", "password": DEMO_PASSWORD})
    assert resp.status_code == 401
    resp = await client.post("/api/v1/auth/login", json={"email": "chg@example.com", "password": "NewPass@123"})
    assert resp.status_code == 200


async def test_change_password_requires_current(client: AsyncClient, db: AsyncSession):
    await make_user(db, "chg2@example.com", ["student"])
    tokens = await login(client, "chg2@example.com")
    resp = await client.patch(
        "/api/v1/users/me",
        json={"new_password": "NewPass@123"},
        headers=bearer(tokens),
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"
