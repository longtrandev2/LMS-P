"""WS hub tests: handshake auth, ping/pong, push routing per user, cleanup.

All DB access runs inside the TestClient portal loop (single event loop for
engine + websockets) — sharing the async `db` fixture across two loops breaks
aiosqlite, so this suite brings its own StaticPool in-memory engine.
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

import app.modules.academics.models  # noqa: F401 — register tables
import app.modules.notifications.models  # noqa: F401
from app.core.db import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.modules.identity.models import Role, User
from app.ws import manager as manager_module
from app.ws.manager import ConnectionManager, ws_envelope


@pytest.fixture
def ws_env():
    """Yields (TestClient, session_maker); DB lives on the portal loop only."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", poolclass=StaticPool)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _setup():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with maker() as s:
            s.add_all([
                Role(name="student", description="Sinh vien"),
                Role(name="lecturer", description="Giang vien"),
                Role(name="admin", description="Quan tri"),
            ])
            await s.commit()

    async def override_get_db():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as tc:
        tc.portal.call(_setup)
        try:
            yield tc, maker
        finally:
            tc.portal.call(engine.dispose)
    app.dependency_overrides.clear()


def seed_user(tc: TestClient, maker, email: str) -> tuple[int, list[str]]:
    """Create an active student on the portal loop; returns (id, role_names)."""

    async def _seed():
        async with maker() as s:
            role = (await s.execute(select(Role).where(Role.name == "student"))).scalar_one()
            user = User(
                email=email,
                full_name="Ws Tester",
                password_hash=hash_password("Demo@12345"),
                roles=[role],
            )
            s.add(user)
            await s.commit()
            await s.refresh(user)
            return user.id, sorted(r.name for r in user.roles)

    return tc.portal.call(_seed)


def _wait_offline(user_id: int, timeout: float = 2.0) -> bool:
    import time

    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if not manager_module.manager.is_online(user_id):
            return True
        time.sleep(0.02)
    return not manager_module.manager.is_online(user_id)


class _FakeSocket:
    """Minimal WebSocket double: records pushed JSON, optional send failure."""

    def __init__(self, fail: bool = False):
        self.sent: list[dict] = []
        self.fail = fail

    async def send_json(self, payload: dict) -> None:
        if self.fail:
            raise RuntimeError("dead socket")
        self.sent.append(payload)


def test_envelope_shape():
    env = ws_envelope("notification.new", {"id": 1})
    assert env["type"] == "notification.new"
    assert env["data"] == {"id": 1}
    assert isinstance(env["ts"], int)


def test_manager_routes_push_to_target_user_only():
    import asyncio

    mgr = ConnectionManager()
    a1, a2, b1 = _FakeSocket(), _FakeSocket(), _FakeSocket()

    async def _run():
        await mgr.connect(1, a1)
        await mgr.connect(1, a2)
        await mgr.connect(2, b1)
        await mgr.push_to_user(1, "notification.new", {"id": 9, "type": "exam.published"})
        # dead socket is dropped silently, live sibling still gets the next push
        dead = _FakeSocket(fail=True)
        await mgr.connect(1, dead)
        await mgr.push_to_user(1, "notification.new", {"id": 10})
        await mgr.disconnect(1, a1)
        await mgr.disconnect(1, a2)

    asyncio.run(_run())
    assert len(a1.sent) == 2 and len(a2.sent) == 2
    assert b1.sent == []  # other user must not receive it
    assert a1.sent[0]["data"]["id"] == 9
    assert dead_not_registered(mgr, 1)
    assert mgr.is_online(1) is False


def dead_not_registered(mgr: ConnectionManager, user_id: int) -> bool:
    return all(getattr(s, "fail", False) is False for s in mgr._connections.get(user_id, ()))


def test_ws_rejects_bad_token(ws_env):
    tc, _ = ws_env
    with pytest.raises(WebSocketDisconnect) as exc:
        with tc.websocket_connect("/ws?token=not-a-jwt"):
            pass  # pragma: no cover — server closes before accept
    assert exc.value.code == 1008


def test_ws_rejects_token_of_unknown_user(ws_env):
    tc, _ = ws_env
    token = create_access_token(999999, ["student"])
    with pytest.raises(WebSocketDisconnect) as exc:
        with tc.websocket_connect(f"/ws?token={token}"):
            pass  # pragma: no cover
    assert exc.value.code == 1008


def test_ws_ping_pong_and_cleanup_on_disconnect(ws_env):
    tc, maker = ws_env
    user_id, roles = seed_user(tc, maker, "ws-a@example.com")
    token = create_access_token(user_id, roles)

    with tc.websocket_connect(f"/ws?token={token}") as ws:
        assert manager_module.manager.is_online(user_id)
        ws.send_json({"type": "ping"})
        pong = ws.receive_json()
        assert pong["type"] == "pong"
        assert pong["data"] == {}
        assert isinstance(pong["ts"], int)

    # context exit disconnects; hub must drop the socket promptly
    assert _wait_offline(user_id), "connection not cleaned up after disconnect"


def test_push_reaches_only_the_target_user_over_real_socket(ws_env):
    tc, maker = ws_env
    alice_id, alice_roles = seed_user(tc, maker, "ws-alice@example.com")
    bob_id, bob_roles = seed_user(tc, maker, "ws-bob@example.com")

    with tc.websocket_connect(f"/ws?token={create_access_token(alice_id, alice_roles)}") as ws_alice:
        with tc.websocket_connect(f"/ws?token={create_access_token(bob_id, bob_roles)}") as ws_bob:
            # push runs inside the portal loop, exactly like the API process would
            tc.portal.call(
                manager_module.manager.push_to_user,
                alice_id,
                "notification.new",
                {"id": 7, "type": "grade.released", "title": "Diem", "body": None, "data": {"class_id": 3}},
            )
            event = ws_alice.receive_json()
            assert event["type"] == "notification.new"
            assert event["data"]["id"] == 7
            assert event["data"]["type"] == "grade.released"

            # bob must NOT have received alice's event: his next message is his own pong
            ws_bob.send_json({"type": "ping"})
            assert ws_bob.receive_json()["type"] == "pong"

    assert _wait_offline(alice_id) and _wait_offline(bob_id)


def test_create_notification_pushes_notification_new(ws_env):
    from app.modules.notifications.service import create_notification

    tc, maker = ws_env
    user_id, roles = seed_user(tc, maker, "ws-c@example.com")

    with tc.websocket_connect(f"/ws?token={create_access_token(user_id, roles)}") as ws:

        async def _create():
            # same loop as the WS hub, fresh session on the shared test engine
            async with maker() as session:
                return await create_notification(
                    session, user_id, "assignment.published", "Bai moi", "Mo bai 1", {"assignment_id": 11}
                )

        notification = tc.portal.call(_create)
        event = ws.receive_json()
        assert event["type"] == "notification.new"
        assert event["data"] == {
            "id": notification.id,
            "type": "assignment.published",
            "title": "Bai moi",
            "body": "Mo bai 1",
            "data": {"assignment_id": 11},
        }
