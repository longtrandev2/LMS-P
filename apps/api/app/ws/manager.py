"""In-process ConnectionManager: one user may hold many WS connections.

Event envelope per message-contracts.md §3:
    {"type": <event>, "ts": <epoch_ms>, "data": {...}}
"""

import asyncio
import time
from collections import defaultdict

from fastapi import WebSocket


def ws_envelope(event: str, data: dict | None = None) -> dict:
    return {"type": event, "ts": int(time.time() * 1000), "data": data or {}}


class ConnectionManager:
    """Registry of live sockets per user_id; push events to a specific user."""

    def __init__(self) -> None:
        self._connections: dict[int, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections[user_id].add(websocket)

    async def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        async with self._lock:
            conns = self._connections.get(user_id)
            if conns is None:
                return
            conns.discard(websocket)
            if not conns:
                self._connections.pop(user_id, None)

    async def push_to_user(self, user_id: int, event: str, data: dict | None = None) -> None:
        """Send an event to every live connection of a user; offline -> no-op."""
        payload = ws_envelope(event, data)
        for websocket in list(self._connections.get(user_id, ())):
            try:
                await websocket.send_json(payload)
            except Exception:
                # dead socket: drop it so future pushes skip it
                await self.disconnect(user_id, websocket)

    def is_online(self, user_id: int) -> bool:
        return bool(self._connections.get(user_id))


# single shared hub instance for the API process
manager = ConnectionManager()
