"""RBAC + enrollment-scope tests (BR1/BR2): student can't manage, can't peek classes."""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.academics.models import Class, Course, Enrollment
from tests.conftest import bearer, login, make_user


async def seed_course_class(db: AsyncSession, lecturer_id: int) -> tuple[int, int]:
    course = Course(code="NET101", name="Lập trình mạng", created_by=lecturer_id)
    db.add(course)
    await db.flush()
    class_obj = Class(course_id=course.id, code="NET101-01", name="Nhóm 1",
                      semester="2026.1", lecturer_id=lecturer_id)
    db.add(class_obj)
    await db.commit()
    await db.refresh(class_obj)
    return course.id, class_obj.id


async def test_student_cannot_create_class(client: AsyncClient, db: AsyncSession):
    await make_user(db, "lec@example.com", ["lecturer"])
    student = await make_user(db, "stu@example.com", ["student"], student_code="SV100")
    _ = student
    tokens = await login(client, "stu@example.com")
    resp = await client.post(
        "/api/v1/classes",
        json={"course_id": 1, "code": "C1", "name": "Lớp 1", "semester": "2026.1", "lecturer_id": 1},
        headers=bearer(tokens),
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


async def test_student_cannot_create_course(client: AsyncClient, db: AsyncSession):
    await make_user(db, "stu-c@example.com", ["student"])
    tokens = await login(client, "stu-c@example.com")
    resp = await client.post(
        "/api/v1/courses",
        json={"code": "X1", "name": "Khóa X"},
        headers=bearer(tokens),
    )
    assert resp.status_code == 403


async def test_lecturer_can_create_course_and_class(client: AsyncClient, db: AsyncSession):
    lecturer = await make_user(db, "lec2@example.com", ["lecturer"])
    tokens = await login(client, "lec2@example.com")
    resp = await client.post("/api/v1/courses", json={"code": "PY101", "name": "Python cơ bản"},
                             headers=bearer(tokens))
    assert resp.status_code == 201, resp.text
    course_id = resp.json()["id"]
    resp = await client.post(
        "/api/v1/classes",
        json={"course_id": course_id, "code": "PY101-01", "name": "Nhóm 1",
              "semester": "2026.1", "lecturer_id": lecturer.id},
        headers=bearer(tokens),
    )
    assert resp.status_code == 201, resp.text


async def test_student_blocked_from_foreign_class(client: AsyncClient, db: AsyncSession):
    lecturer = await make_user(db, "lec3@example.com", ["lecturer"])
    await make_user(db, "outsider@example.com", ["student"], student_code="SV200")
    _course_id, class_id = await seed_course_class(db, lecturer.id)
    tokens = await login(client, "outsider@example.com")
    resp = await client.get(f"/api/v1/classes/{class_id}", headers=bearer(tokens))
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "ENROLLMENT_REQUIRED"


async def test_enrolled_student_can_view_class(client: AsyncClient, db: AsyncSession):
    lecturer = await make_user(db, "lec4@example.com", ["lecturer"])
    student = await make_user(db, "insider@example.com", ["student"], student_code="SV300")
    _course_id, class_id = await seed_course_class(db, lecturer.id)
    db.add(Enrollment(class_id=class_id, student_id=student.id))
    await db.commit()

    tokens = await login(client, "insider@example.com")
    resp = await client.get(f"/api/v1/classes/{class_id}", headers=bearer(tokens))
    assert resp.status_code == 200, resp.text
    assert resp.json()["code"] == "NET101-01"


async def test_lecturer_enrolls_students_and_student_sees_my_classes(client: AsyncClient, db: AsyncSession):
    lecturer = await make_user(db, "lec5@example.com", ["lecturer"])
    student = await make_user(db, "enrollee@example.com", ["student"], student_code="SV400")
    _course_id, class_id = await seed_course_class(db, lecturer.id)

    lec_tokens = await login(client, "lec5@example.com")
    resp = await client.post(
        f"/api/v1/classes/{class_id}/enrollments",
        json=[{"student_id": student.id}],  # array of objects per api-spec §3
        headers=bearer(lec_tokens),
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["added"] == 1

    stu_tokens = await login(client, "enrollee@example.com")
    resp = await client.get("/api/v1/me/classes", headers=bearer(stu_tokens))
    assert resp.status_code == 200
    # Page envelope per api-spec §1
    page = resp.json()
    assert page["total"] == 1 and page["page"] == 1 and page["limit"] == 20
    classes = page["items"]
    assert len(classes) == 1 and classes[0]["id"] == class_id and classes[0]["status"] == "active"
    # joined display fields for class cards
    assert classes[0]["course_code"] == "NET101"
    assert classes[0]["course_name"] == "Lập trình mạng"
    assert classes[0]["lecturer_name"] == "Test User"

    # student list visible to lecturer (paginated envelope)
    resp = await client.get(f"/api/v1/classes/{class_id}/students", headers=bearer(lec_tokens))
    assert resp.status_code == 200
    page = resp.json()
    assert page["total"] == 1 and page["page"] == 1 and page["limit"] == 20
    assert [s["user_id"] for s in page["items"]] == [student.id]

    # class detail carries joined fields too
    resp = await client.get(f"/api/v1/classes/{class_id}", headers=bearer(lec_tokens))
    assert resp.status_code == 200
    detail = resp.json()
    assert detail["course_code"] == "NET101" and detail["lecturer_name"] == "Test User"


async def test_remove_enrollment(client: AsyncClient, db: AsyncSession):
    lecturer = await make_user(db, "lec6@example.com", ["lecturer"])
    student = await make_user(db, "dropped@example.com", ["student"], student_code="SV500")
    _course_id, class_id = await seed_course_class(db, lecturer.id)
    db.add(Enrollment(class_id=class_id, student_id=student.id))
    await db.commit()

    lec_tokens = await login(client, "lec6@example.com")
    resp = await client.delete(f"/api/v1/classes/{class_id}/enrollments/{student.id}",
                               headers=bearer(lec_tokens))
    assert resp.status_code == 204

    # after dropping, student loses access again (BR2)
    stu_tokens = await login(client, "dropped@example.com")
    resp = await client.get(f"/api/v1/classes/{class_id}", headers=bearer(stu_tokens))
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "ENROLLMENT_REQUIRED"


async def test_list_classes_filters_by_course_id(client: AsyncClient, db: AsyncSession):
    """B3: GET /classes?course_id= chỉ trả lớp của khóa đó."""
    lecturer = await make_user(db, "lec7@example.com", ["lecturer"])
    course1 = Course(code="FIL201", name="Triết học", created_by=lecturer.id)
    course2 = Course(code="MAT202", name="Toán rời rạc", created_by=lecturer.id)
    db.add_all([course1, course2])
    await db.flush()
    db.add_all([
        Class(course_id=course1.id, code="FIL201-01", name="Nhóm 1", semester="2026.1", lecturer_id=lecturer.id),
        Class(course_id=course1.id, code="FIL201-02", name="Nhóm 2", semester="2026.1", lecturer_id=lecturer.id),
        Class(course_id=course2.id, code="MAT202-01", name="Nhóm 1", semester="2026.1", lecturer_id=lecturer.id),
    ])
    await db.commit()

    tokens = await login(client, "lec7@example.com")
    resp = await client.get(f"/api/v1/classes?course_id={course1.id}", headers=bearer(tokens))
    assert resp.status_code == 200
    page = resp.json()
    assert page["total"] == 2
    assert all(c["course_id"] == course1.id for c in page["items"])
    assert [c["code"] for c in page["items"]] == ["FIL201-01", "FIL201-02"]

    # unfiltered returns everything
    resp = await client.get("/api/v1/classes", headers=bearer(tokens))
    assert resp.json()["total"] == 3
