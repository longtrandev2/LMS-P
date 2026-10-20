"""OpenAPI customization: bỏ 422 tự sinh, thay bằng 400 VALIDATION_ERROR §1.

FastAPI tự thêm response 422 (HTTPValidationError) cho mọi operation có tham số,
nhưng runtime handler RequestValidationError (app/core/exceptions.py) trả về
400 VALIDATION_ERROR đúng envelope. Ghi đè `app.openapi()` để tài liệu khớp
runtime — FE generate client từ schema sẽ không bắt nhầm 422.
"""

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from app.core.error_schemas import ErrorBody, ErrorEnvelope

_HTTP_METHODS = {"get", "post", "patch", "put", "delete"}

_VALIDATION_ERROR_400 = {
    "description": "Dữ liệu không hợp lệ (VALIDATION_ERROR)",
    "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ErrorEnvelope"}}},
}


def _register_error_components(components: dict) -> None:
    """Đảm bảo ErrorEnvelope/ErrorBody có mặt dù không route nào reference (fallback)."""
    for model in (ErrorBody, ErrorEnvelope):
        if model.__name__ not in components:
            raw = model.model_json_schema(ref_template="#/components/schemas/{model}")
            raw.pop("title", None)
            components[model.__name__] = raw


def replace_422_with_400(schema: dict) -> dict:
    """Mọi operation: xóa response 422, đặt 400 envelope nếu chưa khai báo."""
    for item in schema.get("paths", {}).values():
        for method, op in item.items():
            if method not in _HTTP_METHODS:
                continue
            responses = op.get("responses")
            if responses and "422" in responses:
                del responses["422"]
                responses.setdefault("400", _VALIDATION_ERROR_400)
    _register_error_components(schema.setdefault("components", {}).setdefault("schemas", {}))
    return schema


def register_custom_openapi(app: FastAPI) -> None:
    """Gắn `app.openapi()` phiên bản đã chuẩn hóa lỗi theo §1."""

    def custom_openapi() -> dict:
        if app.openapi_schema:
            return app.openapi_schema
        schema = get_openapi(title=app.title, version=app.version, routes=app.routes)
        app.openapi_schema = replace_422_with_400(schema)
        return app.openapi_schema

    app.openapi = custom_openapi  # type: ignore[method-assign]
