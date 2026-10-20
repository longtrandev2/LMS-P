"""Contract route ↔ docs/api-spec.md (§2 Auth/Users, §3 Courses/Classes/Enrollments, §9 /health).

Mỗi route khai báo trong api-spec (đã merge vào code) phải tồn tại đúng
method + path + status thành công trong OpenAPI schema. Ngược lại, mọi route
trong OpenAPI phải có mặt trong api-spec — chặn scope creep (thêm endpoint
không cập nhật spec).

Data-driven: khi module mới (materials M3, notifications M9) được merge,
chỉ cần THÊM 1 DÒNG vào SPEC_ROUTES — không viết test mới.

Chạy:  cd apps/api && python -m pytest tests/test_contracts/test_openapi_vs_spec_routes.py -v
"""

import pytest

# (method, path, success_status, is_paginated_list)
# path dùng đúng key OpenAPI (path param dạng {user_id}).
SPEC_ROUTES = [
    # -- §2 Auth & Users (M1) -------------------------------------------------
    ("post", "/api/v1/auth/login", 200, False),
    ("post", "/api/v1/auth/refresh", 200, False),
    ("post", "/api/v1/auth/logout", 204, False),  # spec không nêu mã; code dùng 204
    ("get", "/api/v1/auth/me", 200, False),
    ("patch", "/api/v1/users/me", 200, False),
    ("get", "/api/v1/users", 200, True),
    ("post", "/api/v1/users", 201, False),
    ("post", "/api/v1/users/import", 200, False),
    ("get", "/api/v1/users/{user_id}", 200, False),
    ("patch", "/api/v1/users/{user_id}", 200, False),
    # -- §3 Courses / Classes / Enrollment (M2) -------------------------------
    ("get", "/api/v1/courses", 200, True),
    ("post", "/api/v1/courses", 201, False),
    ("get", "/api/v1/courses/{course_id}", 200, False),
    ("patch", "/api/v1/courses/{course_id}", 200, False),
    ("delete", "/api/v1/courses/{course_id}", 204, False),
    ("get", "/api/v1/classes", 200, True),
    ("post", "/api/v1/classes", 201, False),
    ("get", "/api/v1/classes/{class_id}", 200, False),
    ("patch", "/api/v1/classes/{class_id}", 200, False),
    ("delete", "/api/v1/classes/{class_id}", 204, False),
    ("post", "/api/v1/classes/{class_id}/enrollments", 201, False),
    ("delete", "/api/v1/classes/{class_id}/enrollments/{student_id}", 204, False),
    ("get", "/api/v1/classes/{class_id}/students", 200, True),
    ("get", "/api/v1/me/classes", 200, True),
    # -- §4 Materials (M3) -----------------------------------------------------
    ("get", "/api/v1/classes/{class_id}/materials", 200, True),
    ("post", "/api/v1/classes/{class_id}/materials", 201, False),
    ("get", "/api/v1/materials/{material_id}/download", 200, False),
    ("patch", "/api/v1/materials/{material_id}", 200, False),
    ("delete", "/api/v1/materials/{material_id}", 204, False),
    # -- §9 Notifications (M9) — spec chỉ ghi PATCH (wave 2: bỏ POST alias) ---
    ("get", "/api/v1/notifications", 200, True),
    ("patch", "/api/v1/notifications/{notification_id}/read", 200, False),
    ("patch", "/api/v1/notifications/read-all", 200, False),
    # -- §9 health (ngoài prefix /api/v1) --------------------------------------
    ("get", "/health", 200, False),
]

IGNORED_PATHS = {"/docs", "/redoc", "/openapi.json"}  # meta-endpoints của FastAPI

IDS = [f"{m.upper()} {p}" for m, p, _, _ in SPEC_ROUTES]


def test_spec_routes_exist_in_openapi(openapi_schema):
    paths = openapi_schema["paths"]
    for method, path, _, _ in SPEC_ROUTES:
        assert path in paths, f"api-spec khai báo {method.upper()} {path} nhưng OpenAPI không có path này"
        assert method in paths[path], (
            f"api-spec khai báo {method.upper()} {path} nhưng OpenAPI chỉ có "
            f"{sorted(k for k in paths[path] if k != 'parameters')}"
        )


def test_success_status_matches_openapi(openapi_schema):
    for method, path, status, _ in SPEC_ROUTES:
        op = openapi_schema["paths"][path][method]
        declared = [s for s in op["responses"] if s != "422"]
        assert str(status) in op["responses"], (
            f"{method.upper()} {path}: spec/expected {status}, OpenAPI khai báo {declared}"
        )


def test_no_undocumented_routes(openapi_schema):
    """Chống scope creep: route có trong code mà api-spec không có → fail."""
    known = {f"{m.upper()} {p}" for m, p, _, _ in SPEC_ROUTES}
    extra = []
    for path, item in openapi_schema["paths"].items():
        if path in IGNORED_PATHS:
            continue
        for method in ("get", "post", "patch", "put", "delete"):
            if method in item and f"{method.upper()} {path}" not in known:
                extra.append(f"{method.upper()} {path}")
    assert not extra, (
        "Route tồn tại trong code nhưng KHÔNG có trong api-spec.md — cập nhật spec "
        f"trước (spec-first), hoặc bỏ route: {extra}"
    )


@pytest.mark.parametrize("route_id", IDS)
def test_route_operation_documented(openapi_schema, route_id):
    """Mỗi operation phải có summary/description + tags để /docs là tài liệu sống."""
    method, path = route_id.split(" ", 1)
    op = openapi_schema["paths"][path][method.lower()]
    assert op.get("summary") or op.get("description"), f"{route_id} thiếu summary/description"
    assert op.get("tags"), f"{route_id} thiếu tags"
