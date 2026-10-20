"""Negative runtime tests: envelope lỗi THẬT (không chỉ schema khai báo).

Đối chiếu runtime với api-spec.md §1:
    { "error": { "code": "...", "message": "...", "details": {} } }

Chạy:  cd apps/api && python -m pytest tests/test_contracts/test_runtime_error_envelope_contract.py -v
"""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import bearer, login, make_user

ERROR_KEYS = {"code", "message", "details"}


def assert_error_envelope(body: dict) -> None:
    """Envelope lỗi đúng §1: đúng key, đúng kiểu, không key lạ."""
    assert set(body.keys()) == {"error"}, f"Top-level phải chỉ chứa `error`, got {set(body.keys())}"
    err = body["error"]
    assert set(err.keys()) >= ERROR_KEYS, f"error thiếu trường: {set(err.keys())}"
    assert isinstance(err["code"], str) and err["code"], "code phải là string khác rỗng"
    assert isinstance(err["message"], str) and err["message"], "message phải là string khác rỗng"
    assert isinstance(err["details"], dict), "details phải là object (có thể rỗng)"


async def test_login_wrong_password_returns_error_envelope(client: AsyncClient, db: AsyncSession):
    await make_user(db, "contract-wrongpw@example.com", ["student"])
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "contract-wrongpw@example.com", "password": "not-the-password"},
    )
    assert resp.status_code == 401
    assert_error_envelope(resp.json())
    assert resp.json()["error"]["code"] == "UNAUTHENTICATED"


async def test_me_without_token_returns_error_envelope(client: AsyncClient, db: AsyncSession):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    assert_error_envelope(resp.json())


async def test_validation_error_returns_400_envelope(client: AsyncClient, db: AsyncSession):
    """Pydantic/FastAPI validation phải về 400 VALIDATION_ERROR (§1), không phải 422."""
    resp = await client.post("/api/v1/auth/login", json={"email": "not-an-email", "password": ""})
    assert resp.status_code == 400
    body = resp.json()
    assert_error_envelope(body)
    assert body["error"]["code"] == "VALIDATION_ERROR"


async def test_fe_parity_logout_without_body(client: AsyncClient, db: AsyncSession):
    """FE gọi đúng kiểu app-shell.tsx: `api.post("/auth/logout")` KHÔNG gửi body.

    app-shell không truyền refresh_token (token nằm trong auth store nhưng bị bỏ).
    Nếu test fail → BE yêu cầu body RefreshIn mà FE không gửi: một trong hai phía
    lệch contract, lead quyết định (BE nhận refresh token từ access token hiện tại,
    hoặc FE sửa thành api.post("/auth/logout", { refresh_token }))."""
    await make_user(db, "contract-logout@example.com", ["student"])
    tokens = await login(client, "contract-logout@example.com")
    resp = await client.post("/api/v1/auth/logout", headers=bearer(tokens))
    assert resp.status_code in (200, 204), (
        f"FE gọi POST /auth/logout không body nhưng BE trả {resp.status_code}: {resp.text}"
    )
