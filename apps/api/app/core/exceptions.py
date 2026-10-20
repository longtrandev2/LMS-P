"""Unified error envelope per api-spec.md §1.

Every business error raises AppError with a standard code; FastAPI handlers
convert them (and RequestValidationError) into `{error:{code,message,details}}`.
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppError(Exception):
    status_code = 400

    def __init__(self, code: str, message: str, status_code: int = 400, details: dict | None = None):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)

    # -- convenient constructors for standard codes ------------------------
    @classmethod
    def unauthenticated(cls, message: str = "Yêu cầu đăng nhập"):
        return cls("UNAUTHENTICATED", message, 401)

    @classmethod
    def forbidden(cls, message: str = "Bạn không có quyền thực hiện thao tác này"):
        return cls("FORBIDDEN", message, 403)

    @classmethod
    def enrollment_required(cls, message: str = "Bạn không thuộc lớp này"):
        return cls("ENROLLMENT_REQUIRED", message, 403)

    @classmethod
    def not_found(cls, message: str = "Không tìm thấy tài nguyên"):
        return cls("NOT_FOUND", message, 404)

    @classmethod
    def validation(cls, message: str = "Dữ liệu không hợp lệ", details: dict | None = None, status_code: int = 400):
        return cls("VALIDATION_ERROR", message, status_code, details)

    @classmethod
    def rate_limited(cls, message: str = "Quá nhiều yêu cầu"):
        return cls("RATE_LIMITED", message, 429)

    @classmethod
    def internal(cls, message: str = "Lỗi hệ thống"):
        return cls("INTERNAL", message, 500)


def error_payload(code: str, message: str, details: dict | None = None) -> dict:
    return {"error": {"code": code, "message": message, "details": details or {}}}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_req: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=error_payload(exc.code, exc.message, exc.details))

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_req: Request, exc: RequestValidationError) -> JSONResponse:
        details = {}
        for err in exc.errors():
            loc = ".".join(str(p) for p in err.get("loc", []) if p != "body")
            details[loc or "body"] = err.get("msg", "invalid")
        return JSONResponse(status_code=400, content=error_payload("VALIDATION_ERROR", "Dữ liệu không hợp lệ", details))

    @app.exception_handler(Exception)
    async def handle_unexpected(_req: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(status_code=500, content=error_payload("INTERNAL", "Lỗi hệ thống"))
