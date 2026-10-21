"""Contract response envelope theo docs/api-spec.md §1.

- Endpoint list phải có response schema chứa {items, total, page, limit} (bắt buộc).
- Endpoint khai báo lỗi trong spec phải khai báo response schema lỗi đúng
  envelope {error: {code, message, details}} trong OpenAPI (để FE codegen/type
  từ schema không bị mù về lỗi).
- OpenAPI không được khai báo 422 (validation error) vì handler chuyển hết về
  400 VALIDATION_ERROR (xem app/core/exceptions.py).

Chạy:  cd apps/api && python -m pytest tests/test_contracts/test_openapi_response_envelopes.py -v
"""

import pytest

# Các endpoint list dùng Page envelope (§1: ?page=&limit= → {items,total,page,limit})
LIST_ROUTES = [
    ("get", "/api/v1/users"),
    ("get", "/api/v1/courses"),
    ("get", "/api/v1/classes"),
    ("get", "/api/v1/classes/{class_id}/students"),
    ("get", "/api/v1/me/classes"),
    ("get", "/api/v1/classes/{class_id}/materials"),
    ("get", "/api/v1/notifications"),
]

# (method, path, status lỗi) — nơi api-spec/spec §1 chỉ rõ lỗi nghiệp vụ trả về.
# Thêm endpoint mới → thêm dòng.
ERROR_DECLARATIONS = [
    ("post", "/api/v1/auth/login", "401"),  # sai mật khẩu → UNAUTHENTICATED
    ("post", "/api/v1/auth/login", "429"),  # khóa tạm do brute-force (spec §2)
    ("get", "/api/v1/auth/me", "401"),
    ("patch", "/api/v1/users/me", "401"),
    ("get", "/api/v1/users", "403"),        # admin-only
    ("post", "/api/v1/users", "403"),
    ("get", "/api/v1/classes/{class_id}", "403"),   # ENROLLMENT_REQUIRED (BR2)
    ("get", "/api/v1/classes/{class_id}", "404"),
    ("post", "/api/v1/classes/{class_id}/enrollments", "404"),
]


def _resolve(schema: dict, doc: dict) -> dict:
    """Theo $ref vào components/schemas (đệ quy khi lồng nhau)."""
    while "$ref" in schema:
        name = schema["$ref"].split("/")[-1]
        schema = doc["components"]["schemas"][name]
    return schema


def _json_schema(method_item: dict, status: str, doc: dict) -> dict | None:
    resp = method_item["responses"].get(status)
    if resp is None:
        return None
    content = resp.get("content", {}).get("application/json")
    if content is None:
        return None
    return _resolve(content["schema"], doc)


@pytest.mark.parametrize("method,path", LIST_ROUTES)
def test_list_endpoints_use_page_envelope(openapi_schema, method, path):
    schema = _json_schema(openapi_schema["paths"][path][method], "200", openapi_schema)
    assert schema is not None, f"{method.upper()} {path} không khai báo JSON response 200"
    missing = {"items", "total", "page", "limit"} - set(schema.get("properties", {}))
    assert not missing, f"{method.upper()} {path} thiếu trường Page envelope: {missing}"
    required = set(schema.get("required", []))
    assert {"items", "total", "page", "limit"} <= required, (
        f"{method.upper()} {path}: items/total/page/limit phải là required"
    )


def test_error_envelope_declared_in_openapi(openapi_schema):
    """Lỗi nghiệp vụ phải hiện trong OpenAPI đúng envelope §1, và không được
    khai báo 422 (handler RequestValidationError trả 400 VALIDATION_ERROR —
    xem app/core/exceptions.py; FE generate client từ schema sẽ bắt nhầm).
    Nếu test này fail: routers cần khai báo `responses={...}` với schema
    ErrorEnvelope + `generate_unique_id`/custom route class suppress 422,
    hoặc lead chấp nhận lỗi không tự sinh tài liệu."""
    problems = []
    for method, path, status in ERROR_DECLARATIONS:
        schema = _json_schema(openapi_schema["paths"][path][method], status, openapi_schema)
        if schema is None:
            problems.append(f"{method.upper()} {path} {status}: chưa khai báo response lỗi")
            continue
        err = schema.get("properties", {}).get("error")
        if err is None:
            problems.append(f"{method.upper()} {path} {status}: schema thiếu object `error`")
        else:
            err = _resolve(err, openapi_schema)
            missing = {"code", "message"} - set(err.get("properties", {}))
            if missing:
                problems.append(f"{method.upper()} {path} {status}: error thiếu {missing}")

    for path, item in openapi_schema["paths"].items():
        for method, op in item.items():
            if method in ("get", "post", "patch", "put", "delete") and "422" in op.get("responses", {}):
                problems.append(f"{method.upper()} {path}: khai báo 422 nhưng runtime trả 400 VALIDATION_ERROR")

    assert not problems, "Envelope lỗi chưa được khai báo đúng trong OpenAPI:\n- " + "\n- ".join(problems)
