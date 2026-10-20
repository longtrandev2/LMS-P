"""Notification REST tests: list/filter, read one, read-all, owner isolation."""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.service import create_notification
from tests.conftest import bearer, login, make_user


async def _seed(db: AsyncSession, user_id: int) -> None:
    await create_notification(db, user_id, "assignment.published", "Bai 1 mo", body="Chi tiet", data={"class_id": 1})
    await create_notification(db, user_id, "submission.graded", "Bai da cham")
    read_one = await create_notification(db, user_id, "grade.released", "Diem cong bo")
    read_one.is_read = True
    await db.commit()


async def test_list_page_envelope_newest_first(client: AsyncClient, db: AsyncSession):
    user = await make_user(db, "ntf-a@example.com", ["student"])
    await _seed(db, user.id)
    resp = await client.get("/api/v1/notifications", headers=bearer(await login(client, "ntf-a@example.com")))
    assert resp.status_code == 200
    body = resp.json()
    assert set(body) == {"items", "total", "page", "limit"}
    assert body["total"] == 3 and body["page"] == 1 and body["limit"] == 20
    titles = [i["title"] for i in body["items"]]
    assert titles == ["Diem cong bo", "Bai da cham", "Bai 1 mo"]  # newest first
    first = body["items"][0]
    assert {"id", "user_id", "type", "title", "body", "data", "is_read", "created_at"} <= set(first)


async def test_filter_is_read(client: AsyncClient, db: AsyncSession):
    user = await make_user(db, "ntf-b@example.com", ["student"])
    await _seed(db, user.id)
    headers = bearer(await login(client, "ntf-b@example.com"))
    resp = await client.get("/api/v1/notifications", params={"is_read": "false"}, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2
    assert all(i["is_read"] is False for i in body["items"])
    resp = await client.get("/api/v1/notifications", params={"is_read": "true"}, headers=headers)
    assert resp.json()["total"] == 1


async def test_read_single_then_read_all(client: AsyncClient, db: AsyncSession):
    user = await make_user(db, "ntf-c@example.com", ["student"])
    await _seed(db, user.id)
    headers = bearer(await login(client, "ntf-c@example.com"))

    listing = (await client.get("/api/v1/notifications", headers=headers)).json()
    unread_id = next(i["id"] for i in listing["items"] if not i["is_read"])

    resp = await client.patch(f"/api/v1/notifications/{unread_id}/read", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["is_read"] is True
    resp = await client.patch("/api/v1/notifications/read-all", headers=headers)
    assert resp.status_code == 200 and resp.json() == {"updated": 1}
    body = (await client.get("/api/v1/notifications", params={"is_read": "false"}, headers=headers)).json()
    assert body["total"] == 0


async def test_owner_isolation_404(client: AsyncClient, db: AsyncSession):
    owner = await make_user(db, "ntf-owner@example.com", ["student"])
    await make_user(db, "ntf-intruder@example.com", ["student"])
    notification = await create_notification(db, owner.id, "exam.published", "Ky thi mo")
    intruder_headers = bearer(await login(client, "ntf-intruder@example.com"))
    resp = await client.patch(f"/api/v1/notifications/{notification.id}/read", headers=intruder_headers)
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "NOT_FOUND"
    # read-all of intruder must not touch owner rows
    resp = await client.patch("/api/v1/notifications/read-all", headers=intruder_headers)
    assert resp.json() == {"updated": 0}


async def test_unauthenticated_rejected(client: AsyncClient, db: AsyncSession):
    resp = await client.get("/api/v1/notifications")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHENTICATED"


async def test_missing_notification_404(client: AsyncClient, db: AsyncSession):
    await make_user(db, "ntf-d@example.com", ["student"])
    headers = bearer(await login(client, "ntf-d@example.com"))
    resp = await client.patch("/api/v1/notifications/999999/read", headers=headers)
    assert resp.status_code == 404
