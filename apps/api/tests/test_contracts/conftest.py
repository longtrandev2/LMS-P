"""Fixtures dùng chung cho contract test suite (OpenAPI ↔ api-spec ↔ FE client).

Chạy toàn bộ suite (từ apps/api):
    python -m pytest tests/test_contracts -v

Lưu ý: JWT_SECRET được set bởi tests/conftest.py (cấp cha) TRƯỚC khi import
`app.main` — không set lại ở đây.
"""

import pytest

from app.main import app


@pytest.fixture(scope="session")
def openapi_schema() -> dict:
    """OpenAPI schema sinh từ FastAPI app thật (tài liệu sống tại /docs)."""
    return app.openapi()
