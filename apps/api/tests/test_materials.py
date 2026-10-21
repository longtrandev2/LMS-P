"""Materials tests (M3, FR-MAT-01..03, BR2): upload/list/download/link/patch/delete."""

import io

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.modules.academics.models import Class, Course, Enrollment
from tests.conftest import bearer, login, make_user

PDF_BYTES = b"%PDF-1.4 fake pdf payload for tests"


async def seed_class(db: AsyncSession) -> tuple[int, int, int]:
    """Create lecturer + class; returns (lecturer_id, class_id, student_id) with student enrolled."""
    lecturer = await make_user(db, "mat-lec@example.com", ["lecturer"])
    student = await make_user(db, "mat-stu@example.com", ["student"], student_code="SVM1")
    course = Course(code="MAT301", name="Học liệu", created_by=lecturer.id)
    db.add(course)
    await db.flush()
    class_obj = Class(course_id=course.id, code="MAT301-01", name="Nhóm 1",
                      semester="2026.1", lecturer_id=lecturer.id)
    db.add(class_obj)
    await db.flush()
    db.add(Enrollment(class_id=class_obj.id, student_id=student.id))
    await db.commit()
    return lecturer.id, class_obj.id, student.id


def _multipart(title="Slide bài 1", filename="slide1.pdf", content=PDF_BYTES):
    return {"title": (None, title), "description": (None, "Mô tả"),
            "file": (filename, io.BytesIO(content), "application/pdf")}


async def test_lecturer_uploads_and_student_downloads(client: AsyncClient, db: AsyncSession):
    _lec_id, class_id, _stu_id = await seed_class(db)

    lec_tokens = await login(client, "mat-lec@example.com")
    resp = await client.post(f"/api/v1/classes/{class_id}/materials", files=_multipart(),
                             headers=bearer(lec_tokens))
    assert resp.status_code == 201, resp.text
    material = resp.json()
    assert material["type"] == "pdf"
    assert material["size_bytes"] == len(PDF_BYTES)
    assert material["file_path"].startswith(f"materials/{class_id}/")

    # enrolled student sees the list (Page envelope)
    stu_tokens = await login(client, "mat-stu@example.com")
    resp = await client.get(f"/api/v1/classes/{class_id}/materials", headers=bearer(stu_tokens))
    assert resp.status_code == 200
    page = resp.json()
    assert page["total"] == 1 and page["items"][0]["id"] == material["id"]

    # and downloads the exact bytes
    resp = await client.get(f"/api/v1/materials/{material['id']}/download", headers=bearer(stu_tokens))
    assert resp.status_code == 200, resp.text
    assert resp.content == PDF_BYTES
    assert "slide1" not in resp.headers.get("content-disposition", "")  # served under stored name


async def test_outside_student_blocked_from_list_and_download(client: AsyncClient, db: AsyncSession):
    _lec_id, class_id, _stu_id = await seed_class(db)
    await make_user(db, "mat-out@example.com", ["student"], student_code="SVM2")

    lec_tokens = await login(client, "mat-lec@example.com")
    resp = await client.post(f"/api/v1/classes/{class_id}/materials", files=_multipart(),
                             headers=bearer(lec_tokens))
    material_id = resp.json()["id"]

    out_tokens = await login(client, "mat-out@example.com")
    resp = await client.get(f"/api/v1/classes/{class_id}/materials", headers=bearer(out_tokens))
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "ENROLLMENT_REQUIRED"

    resp = await client.get(f"/api/v1/materials/{material_id}/download", headers=bearer(out_tokens))
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "ENROLLMENT_REQUIRED"


async def test_link_material_and_download_rejected(client: AsyncClient, db: AsyncSession):
    _lec_id, class_id, _stu_id = await seed_class(db)

    lec_tokens = await login(client, "mat-lec@example.com")
    resp = await client.post(
        f"/api/v1/classes/{class_id}/materials",
        json={"title": "Tham khảo ngoài", "url": "https://example.com/docs"},
        headers=bearer(lec_tokens),
    )
    assert resp.status_code == 201, resp.text
    material = resp.json()
    assert material["type"] == "link"
    assert material["file_path"] == "https://example.com/docs"
    assert material["size_bytes"] == 0

    # link materials have no file to stream
    stu_tokens = await login(client, "mat-stu@example.com")
    resp = await client.get(f"/api/v1/materials/{material['id']}/download", headers=bearer(stu_tokens))
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


async def test_patch_and_delete_by_owner_lecturer(client: AsyncClient, db: AsyncSession):
    _lec_id, class_id, _stu_id = await seed_class(db)
    lec_tokens = await login(client, "mat-lec@example.com")
    resp = await client.post(f"/api/v1/classes/{class_id}/materials", files=_multipart(),
                             headers=bearer(lec_tokens))
    material_id = resp.json()["id"]
    stored_path = resp.json()["file_path"]

    resp = await client.patch(f"/api/v1/materials/{material_id}",
                              json={"title": "Slide bài 1 (bản sửa)"},
                              headers=bearer(lec_tokens))
    assert resp.status_code == 200, resp.text
    assert resp.json()["title"] == "Slide bài 1 (bản sửa)"

    from pathlib import Path

    storage_file = Path(get_settings().STORAGE_DIR) / stored_path
    assert storage_file.is_file()

    resp = await client.delete(f"/api/v1/materials/{material_id}", headers=bearer(lec_tokens))
    assert resp.status_code == 204
    assert not storage_file.exists()  # file removed from disk

    resp = await client.get(f"/api/v1/materials/{material_id}/download", headers=bearer(lec_tokens))
    assert resp.status_code == 404


async def test_other_lecturer_and_student_cannot_write(client: AsyncClient, db: AsyncSession):
    _lec_id, class_id, _stu_id = await seed_class(db)
    await make_user(db, "mat-lec2@example.com", ["lecturer"])

    # another lecturer (not owner of the class)
    lec2_tokens = await login(client, "mat-lec2@example.com")
    resp = await client.post(f"/api/v1/classes/{class_id}/materials", files=_multipart(),
                             headers=bearer(lec2_tokens))
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"

    # student cannot upload at all
    stu_tokens = await login(client, "mat-stu@example.com")
    resp = await client.post(f"/api/v1/classes/{class_id}/materials", files=_multipart(),
                             headers=bearer(stu_tokens))
    assert resp.status_code == 403


async def test_upload_validation_extension_and_missing_file(client: AsyncClient, db: AsyncSession):
    _lec_id, class_id, _stu_id = await seed_class(db)
    lec_tokens = await login(client, "mat-lec@example.com")

    # bad extension
    resp = await client.post(
        f"/api/v1/classes/{class_id}/materials",
        files=_multipart(title="Ảnh", filename="avatar.exe", content=b"MZ"),
        headers=bearer(lec_tokens),
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"

    # multipart without file
    resp = await client.post(f"/api/v1/classes/{class_id}/materials",
                             data={"title": "Không có tệp"}, headers=bearer(lec_tokens))
    assert resp.status_code == 400

    # invalid link URL
    resp = await client.post(f"/api/v1/classes/{class_id}/materials",
                             json={"title": "Link xấu", "url": "not-a-url"},
                             headers=bearer(lec_tokens))
    assert resp.status_code == 400
