"""WS endpoint /ws — auth at handshake, ping/pong keepalive, server-push only.

Connect: GET /ws?token=<access_token> (api-spec.md §10, message-contracts.md §4).
Invalid/expired token -> close code 1008 before accept.
"""

import jwt as pyjwt
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import decode_access_token
from app.modules.identity.models import User
from app.ws.manager import manager, ws_envelope

router = APIRouter()

CLOSE_POLICY_VIOLATION = 1008  # auth failed at handshake


async def _authenticate(token: str, db: AsyncSession) -> User | None:
    """Validate access token + user status. Returns None when rejected."""
    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except (pyjwt.InvalidTokenError, KeyError, ValueError):
        return None
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None or user.status != "active":
        return None
    return user


@router.websocket("/ws")
async def ws_endpoint(
    websocket: WebSocket,
    token: str = Query(""),
    db: AsyncSession = Depends(get_db),
):
    user = await _authenticate(token, db)
    if user is None:
        await websocket.close(code=CLOSE_POLICY_VIOLATION)
        return

    # capture the id before rollback: rollback expires ORM instances, and an
    # expired-attribute refresh cannot run on AsyncSession (MissingGreenlet)
    user_id = user.id
    # release the DB connection: a live socket must not hold a transaction open
    await db.rollback()

    await websocket.accept()
    await manager.connect(user_id, websocket)
    try:
        while True:
            # client only sends {"type":"ping"} keepalives (message-contracts §3)
            message = await websocket.receive_json()
            if message.get("type") == "ping":
                await websocket.send_json(ws_envelope("pong"))
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(user_id, websocket)
