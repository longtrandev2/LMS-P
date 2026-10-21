"""Error envelope schemas dùng chung cho khai báo OpenAPI (api-spec.md §1).

Runtime: handler trong app/core/exceptions.py luôn trả về shape này.
Khai báo: router dùng `error_responses(...)` để OpenAPI/Swagger (và FE codegen)
thấy đúng envelope lỗi — xem tests/test_contracts/test_openapi_response_envelopes.py.
"""

from pydantic import BaseModel, Field


class ErrorBody(BaseModel):
    """Phần `error` của envelope — code chuẩn + message tiếng Việt."""

    code: str = Field(examples=["NOT_FOUND"])
    message: str = Field(examples=["Không tìm thấy tài nguyên"])
    details: dict = Field(default_factory=dict, examples=[{}])


class ErrorEnvelope(BaseModel):
    """Envelope lỗi chuẩn §1: `{error: {code, message, details}}`."""

    error: ErrorBody


# Mô tả ngắn theo mã — dùng chung cho mọi router (nhất quán trong /docs).
DESCRIPTIONS = {
    400: "Dữ liệu không hợp lệ (VALIDATION_ERROR)",
    401: "Chưa đăng nhập hoặc token không hợp lệ (UNAUTHENTICATED)",
    403: "Không có quyền truy cập tài nguyên (FORBIDDEN / ENROLLMENT_REQUIRED)",
    404: "Không tìm thấy tài nguyên (NOT_FOUND)",
    409: "Xung đột dữ liệu — trùng email/mã hoặc vi phạm ràng buộc",
    413: "Tệp tải lên vượt quá dung lượng cho phép",
    429: "Quá nhiều yêu cầu — khóa tạm do brute-force (RATE_LIMITED)",
}


def error_responses(*codes: int) -> dict[int, dict]:
    """OpenAPI `responses={...}` cho đúng các mã lỗi route thực sự trả về.

    Ví dụ: `@router.get(..., responses=error_responses(401, 404))`.
    """
    return {
        code: {"model": ErrorEnvelope, "description": DESCRIPTIONS.get(code, "Lỗi nghiệp vụ")}
        for code in codes
    }
