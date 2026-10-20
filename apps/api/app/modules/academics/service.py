"""Academics business logic: courses/classes CRUD, enrollments (BR2, FR-CRS-01..03)."""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import write_audit
from app.core.exceptions import AppError
from app.modules.academics import repository as repo
from app.modules.academics.models import Class, Course, Enrollment
from app.modules.academics.schemas import (
    ClassCreateIn,
    ClassUpdateIn,
    CourseCreateIn,
    CourseUpdateIn,
)
from app.modules.identity.models import User


async def get_course_or_404(db: AsyncSession, course_id: int) -> Course:
    course = await repo.get_course(db, course_id)
    if course is None:
        raise AppError.not_found("Không tìm thấy khóa học")
    return course


async def get_class_or_404(db: AsyncSession, class_id: int) -> Class:
    class_obj = await repo.get_class(db, class_id)
    if class_obj is None:
        raise AppError.not_found("Không tìm thấy lớp học")
    return class_obj


async def create_course(db: AsyncSession, payload: CourseCreateIn, actor: User, ip: str | None) -> Course:
    if await repo.get_course_by_code(db, payload.code):
        raise AppError.validation("Mã khóa học đã tồn tại", status_code=409)
    course = Course(code=payload.code, name=payload.name, description=payload.description, created_by=actor.id)
    db.add(course)
    await db.flush()
    await write_audit(db, actor.id, "course.create", "course", course.id,
                      new={"code": course.code, "name": course.name}, ip=ip)
    await db.commit()
    await db.refresh(course)
    return course


async def update_course(db: AsyncSession, course_id: int, payload: CourseUpdateIn, actor: User, ip: str | None) -> Course:
    course = await get_course_or_404(db, course_id)
    old = {"code": course.code, "name": course.name, "description": course.description}
    for field in ("code", "name", "description"):
        value = getattr(payload, field)
        if value is not None:
            setattr(course, field, value)
    try:
        await write_audit(db, actor.id, "course.update", "course", course.id, old=old,
                          new={"code": course.code, "name": course.name}, ip=ip)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise AppError.validation("Mã khóa học đã tồn tại", status_code=409)
    await db.refresh(course)
    return course


async def delete_course(db: AsyncSession, course_id: int, actor: User, ip: str | None) -> None:
    course = await get_course_or_404(db, course_id)
    try:
        await db.delete(course)
        await write_audit(db, actor.id, "course.delete", "course", course_id,
                          old={"code": course.code}, ip=ip)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise AppError.validation("Không thể xóa khóa học còn lớp học", status_code=409)


async def create_class(db: AsyncSession, payload: ClassCreateIn, actor: User, ip: str | None) -> Class:
    await get_course_or_404(db, payload.course_id)
    class_obj = Class(
        course_id=payload.course_id,
        code=payload.code,
        name=payload.name,
        semester=payload.semester,
        lecturer_id=payload.lecturer_id,
        grade_policy=payload.grade_policy,
    )
    db.add(class_obj)
    try:
        await db.flush()
        await write_audit(db, actor.id, "class.create", "class", class_obj.id,
                          new={"code": class_obj.code, "course_id": class_obj.course_id}, ip=ip)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise AppError.validation("Mã lớp đã tồn tại trong khóa học", status_code=409)
    # re-fetch with eager joins (course/lecturer) for ClassOut serialization
    return await repo.get_class(db, class_obj.id)


async def update_class(db: AsyncSession, class_id: int, payload: ClassUpdateIn, actor: User, ip: str | None) -> Class:
    class_obj = await get_class_or_404(db, class_id)
    old = {"code": class_obj.code, "name": class_obj.name, "semester": class_obj.semester,
           "lecturer_id": class_obj.lecturer_id, "grade_policy": class_obj.grade_policy}
    for field in ("code", "name", "semester", "lecturer_id", "grade_policy"):
        value = getattr(payload, field)
        if value is not None:
            setattr(class_obj, field, value)
    try:
        await write_audit(db, actor.id, "class.update", "class", class_obj.id, old=old,
                          new={"code": class_obj.code, "name": class_obj.name}, ip=ip)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise AppError.validation("Mã lớp đã tồn tại trong khóa học", status_code=409)
    return await repo.get_class(db, class_obj.id)


async def delete_class(db: AsyncSession, class_id: int, actor: User, ip: str | None) -> None:
    class_obj = await get_class_or_404(db, class_id)
    try:
        await db.delete(class_obj)
        await write_audit(db, actor.id, "class.delete", "class", class_id,
                          old={"code": class_obj.code}, ip=ip)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise AppError.validation("Không thể xóa lớp còn sinh viên ghi danh", status_code=409)


async def enroll_students(db: AsyncSession, class_id: int, student_ids: list[int], actor: User, ip: str | None) -> int:
    class_obj = await get_class_or_404(db, class_id)
    added = 0
    for sid in student_ids:
        student = await db.get(User, sid)
        if student is None or "student" not in student.role_names:
            raise AppError.validation(f"User {sid} không phải sinh viên")
        existing = await repo.get_enrollment(db, class_obj.id, sid)
        if existing is not None:
            if existing.status == "dropped":
                existing.status = "active"  # re-enroll
                added += 1
            continue
        db.add(Enrollment(class_id=class_obj.id, student_id=sid))
        await write_audit(db, actor.id, "enrollment.add", "class", class_obj.id,
                          new={"student_id": sid}, ip=ip)
        added += 1
    await db.commit()
    return added


async def remove_enrollment(db: AsyncSession, class_id: int, student_id: int, actor: User, ip: str | None) -> None:
    await get_class_or_404(db, class_id)
    enrollment = await repo.get_enrollment(db, class_id, student_id)
    if enrollment is None:
        raise AppError.not_found("Sinh viên không ghi danh lớp này")
    enrollment.status = "dropped"
    await write_audit(db, actor.id, "enrollment.remove", "class", class_id,
                      old={"student_id": student_id, "status": "active"},
                      new={"student_id": student_id, "status": "dropped"}, ip=ip)
    await db.commit()


async def my_classes(db: AsyncSession, student: User) -> list[dict]:
    rows = (await db.execute(repo.my_classes_stmt(student.id))).all()
    return [
        {
            "id": c.id, "course_id": c.course_id, "code": c.code, "name": c.name,
            "semester": c.semester, "lecturer_id": c.lecturer_id, "status": status,
            "course_code": c.course_code, "course_name": c.course_name,
            "lecturer_name": c.lecturer_name,
        }
        for c, status in rows
    ]
