"""CSV import tests: parse, create, skip duplicates, reject bad header."""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import bearer, login, make_user

CSV_OK = """email,full_name,student_code,role
new1@example.com,Nguyễn Văn A,SV9001,student
new2@example.com,Trần Thị B,SV9002,student
new3@example.com,Lê Giảng,,lecturer
"""

CSV_DUP = """email,full_name,student_code,role
dup@example.com,Trùng Nhau,SV9003,student
dup@example.com,Trùng Nhau Lần 2,SV9004,student
"""

CSV_BAD_HEADER = "email,name,code,role\nx@example.com,X,SV1,student\n"

CSV_BAD_ROLE = """email,full_name,student_code,role
bad@example.com,Bad Role,SV9005,teacher
"""


async def test_import_creates_users(client: AsyncClient, db: AsyncSession):
    await make_user(db, "admin@example.com", ["admin"])
    tokens = await login(client, "admin@example.com")
    resp = await client.post(
        "/api/v1/users/import",
        files={"file": ("users.csv", CSV_OK.encode("utf-8"), "text/csv")},
        headers=bearer(tokens),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["created"] == 3
    assert data["skipped"] == []
    assert len(data["temp_passwords"]) == 3
    # imported student can log in with the returned temp password
    temp_pw = next(t["temp_password"] for t in data["temp_passwords"] if t["email"] == "new1@example.com")
    resp = await client.post("/api/v1/auth/login", json={"email": "new1@example.com", "password": temp_pw})
    assert resp.status_code == 200


async def test_import_duplicate_rows_skipped(client: AsyncClient, db: AsyncSession):
    await make_user(db, "admin2@example.com", ["admin"])
    tokens = await login(client, "admin2@example.com")
    resp = await client.post(
        "/api/v1/users/import",
        files={"file": ("dup.csv", CSV_DUP.encode("utf-8"), "text/csv")},
        headers=bearer(tokens),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["created"] == 1
    assert data["skipped"] == ["dup@example.com"]


async def test_import_rejects_bad_header(client: AsyncClient, db: AsyncSession):
    await make_user(db, "admin3@example.com", ["admin"])
    tokens = await login(client, "admin3@example.com")
    resp = await client.post(
        "/api/v1/users/import",
        files={"file": ("bad.csv", CSV_BAD_HEADER.encode("utf-8"), "text/csv")},
        headers=bearer(tokens),
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


async def test_import_reports_row_errors(client: AsyncClient, db: AsyncSession):
    """Row-level problems land in `errors` [{row, reason}]; other rows still import."""
    content = CSV_OK + "half@example.com,Only Email,SV9006,teacher\n"
    await make_user(db, "admin4@example.com", ["admin"])
    tokens = await login(client, "admin4@example.com")
    resp = await client.post(
        "/api/v1/users/import",
        files={"file": ("badrole.csv", content.encode("utf-8"), "text/csv")},
        headers=bearer(tokens),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["created"] == 3
    assert len(data["errors"]) == 1
    assert data["errors"][0]["row"] == 5
    assert "role" in data["errors"][0]["reason"]


async def test_admin_reset_password_returns_temporary_password(client: AsyncClient, db: AsyncSession):
    await make_user(db, "admin5@example.com", ["admin"])
    target = await make_user(db, "reset@example.com", ["student"], student_code="SV9999")
    tokens = await login(client, "admin5@example.com")
    resp = await client.patch(
        f"/api/v1/users/{target.id}",
        json={"reset_password": True},
        headers=bearer(tokens),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["temporary_password"]  # one-time field per FE contract
    # new password actually works
    resp = await client.post(
        "/api/v1/auth/login", json={"email": "reset@example.com", "password": data["temporary_password"]}
    )
    assert resp.status_code == 200


async def test_import_requires_admin(client: AsyncClient, db: AsyncSession):
    await make_user(db, "stu-imp@example.com", ["student"])
    tokens = await login(client, "stu-imp@example.com")
    resp = await client.post(
        "/api/v1/users/import",
        files={"file": ("u.csv", CSV_OK.encode("utf-8"), "text/csv")},
        headers=bearer(tokens),
    )
    assert resp.status_code == 403
