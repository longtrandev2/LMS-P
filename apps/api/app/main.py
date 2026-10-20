"""App factory: CORS whitelist, routers under /api/v1, /health (DB + AMQP)."""

from contextlib import asynccontextmanager

import aio_pika
import sqlalchemy as sa
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.db import engine
from app.core.exceptions import error_payload, register_exception_handlers
from app.core.openapi import register_custom_openapi
from app.modules.academics.router import router as academics_router
from app.modules.identity.auth_router import router as auth_router
from app.modules.identity.users_router import router as users_router
from app.modules.notifications.router import router as notifications_router
from app.ws.router import router as ws_router
from app.modules.materials.router import router as materials_router

API_PREFIX = "/api/v1"

# known-bad secrets that must never reach a running server
_BLACKLISTED_SECRETS = {"change-me"}


def _assert_jwt_secret(secret: str | None) -> None:
    if not secret or not secret.strip() or secret in _BLACKLISTED_SECRETS:
        raise RuntimeError("JWT_SECRET is missing or a known default — set a strong value via environment/.env")
    if len(secret) < 32:
        raise RuntimeError("JWT_SECRET must be at least 32 bytes (RFC 7518 §3.2)")


async def _ping_db() -> bool:
    try:
        async with engine.connect() as conn:
            await conn.execute(sa.text("SELECT 1"))
        return True
    except Exception:
        return False


async def _ping_amqp(url: str) -> bool:
    try:
        conn = await aio_pika.connect(url, timeout=3)
        await conn.close()
        return True
    except Exception:
        return False


def create_app() -> FastAPI:
    settings = get_settings()
    _assert_jwt_secret(settings.JWT_SECRET)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        yield
        await engine.dispose()

    app = FastAPI(title="LMS API", version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)
    register_custom_openapi(app)  # OpenAPI: bỏ 422, thay bằng 400 envelope §1

    app.include_router(auth_router, prefix=API_PREFIX)
    app.include_router(users_router, prefix=API_PREFIX)
    app.include_router(academics_router, prefix=API_PREFIX)
    app.include_router(notifications_router, prefix=API_PREFIX)
    app.include_router(ws_router)  # /ws lives at root, not under /api/v1 (api-spec section 10)
    app.include_router(materials_router, prefix=API_PREFIX)

    @app.get("/health", tags=["ops"])
    async def health():
        db_ok = await _ping_db()
        amqp_ok = await _ping_amqp(settings.RABBITMQ_URL)
        body = {"status": "ok" if (db_ok and amqp_ok) else "degraded", "db": db_ok, "amqp": amqp_ok}
        if not (db_ok and amqp_ok):
            return JSONResponse(status_code=503, content=body)
        return body

    return app


app = create_app()
