"""Contract FE client ↔ BE OpenAPI: mọi endpoint mà apps/web gọi phải tồn tại.

Scan trực tiếp nguồn FE (apps/web/src/**/*.{ts,tsx}) bắt các lời gọi
`api.get/post/patch/put/delete/upload(...)` trong apps/web/src/lib/api.ts,
chuẩn hoá template literal (`/users/${user.id}` → segment động) rồi đối chiếu
method + path với OpenAPI schema của BE.

Vì vậy KHÔNG cần bảng tĩnh: FE gọi endpoint BE chưa có (hoặc đổi method) →
test fail ngay, không đợi tới lúc chạy UI.

Chạy:  cd apps/api && python -m pytest tests/test_contracts/test_fe_client_endpoint_contract.py -v
"""

import re
from pathlib import Path

import pytest

# apps/api/tests/test_contracts/x.py → repo root = parents[4]
REPO_ROOT = Path(__file__).resolve().parents[4]
WEB_SRC = REPO_ROOT / "apps" / "web" / "src"

# bắt cả call xuống dòng: api.get<Foo>(
#   `/classes/${id}/students`, ...)
CALL_RE = re.compile(
    r"""api\.(get|post|patch|put|delete|upload)\s*(?:<[^<>]*>)?\(\s*
        (["'`])(/[^"'`?]*)\2""",
    re.VERBOSE,
)
METHOD_MAP = {"upload": "post"}


def _normalize(template: str) -> str:
    """`/users/${user.id}` và `/users/{user_id}` → cùng dạng `/users/:seg`."""
    return re.sub(r"\$\{[^}]*\}|\{[^}]*\}", ":seg", template)


def collect_fe_calls() -> list[tuple[str, str, str]]:
    """Trả về [(method, path, file:line)] của mọi lời gọi api.* trong FE."""
    calls = []
    for src in WEB_SRC.rglob("*"):
        if src.suffix not in {".ts", ".tsx"} or not src.is_file():
            continue
        for i, line in enumerate(src.read_text(encoding="utf-8").splitlines(), 1):
            for m in CALL_RE.finditer(line):
                method = METHOD_MAP.get(m.group(1), m.group(1))
                calls.append((method, _normalize(m.group(3)), f"{src.relative_to(WEB_SRC)}:{i}"))
    return calls


def test_fe_calls_backend_paths_exist():
    if not WEB_SRC.exists():
        pytest.skip("apps/web/src không tồn tại — bỏ qua contract FE↔BE")
    calls = collect_fe_calls()
    assert calls, "Không scan được lời gọi api.* nào trong FE — regex hoặc cấu trúc FE đã đổi?"

    from app.main import app  # import sau khi tests/conftest.py set JWT_SECRET

    paths = app.openapi()["paths"]
    problems = []
    for method, path, loc in calls:
        # FE path tương đối với BASE_URL đã chứa /api/v1 → thử cả hai dạng
        real = next((p for p in paths if _normalize(p) in (path, f"/api/v1{path}")), None)
        if real is None:
            problems.append(f"{loc}: {method.upper()} {path} — BE không có path này")
            continue
        if method not in paths[real]:
            problems.append(f"{loc}: {method.upper()} {path} — BE chỉ có "
                            f"{sorted(k for k in paths[real] if k != 'parameters')}")
    assert not problems, "FE đang gọi endpoint BE chưa cung cấp:\n- " + "\n- ".join(problems)
