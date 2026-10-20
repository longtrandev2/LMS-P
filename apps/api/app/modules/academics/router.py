"""Academics endpoints: courses, classes, enrollments, my classes."""

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.exceptions import AppError
from app.core.pagination import Page, PageParams, page_query, paginate
from app.modules.academics import repository as repo
from app.modules.academics import service
from app.modules.academics.deps import require_class_access
from app.modules.academics.schemas import (
    ClassCreateIn,
    ClassOut,
    ClassUpdateIn,
    CourseCreateIn,
    CourseOut,
    CourseUpdateIn,
    EnrollItem,
    MyClassOut,
    StudentInClassOut,
)
from app.modules.identity.auth_router import client_ip
from app.modules.identity.deps import require_roles
from app.modules.identity.models import User

router = APIRouter(tags=["academics"])
lecturer_or_admin = require_roles("lecturer", "admin")


# -- Courses ---------------------------------------------------------------


@router.get("/courses", response_model=Page[CourseOut], dependencies=[Depends(lecturer_or_admin)])
async def list_courses(pager: PageParams = Depends(page_query), db: AsyncSession = Depends(get_db)):
    return await paginate(db, repo.list_courses(), CourseOut.model_validate, pager.page, pager.limit)


@router.post("/courses", response_model=CourseOut, status_code=201, dependencies=[Depends(lecturer_or_admin)])
async def create_course(
    payload: CourseCreateIn,
    request: Request,
    actor: User = Depends(lecturer_or_admin),
    db: AsyncSession = Depends(get_db),
):
    return await service.create_course(db, payload, actor, client_ip(request))


@router.get("/courses/{course_id}", response_model=CourseOut, dependencies=[Depends(lecturer_or_admin)])
async def get_course(course_id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_course_or_404(db, course_id)


@router.patch("/courses/{course_id}", response_model=CourseOut, dependencies=[Depends(lecturer_or_admin)])
async def update_course(
    course_id: int,
    payload: CourseUpdateIn,
    request: Request,
    actor: User = Depends(lecturer_or_admin),
    db: AsyncSession = Depends(get_db),
):
    return await service.update_course(db, course_id, payload, actor, client_ip(request))


@router.delete("/courses/{course_id}", status_code=204, dependencies=[Depends(lecturer_or_admin)])
async def delete_course(
    course_id: int,
    request: Request,
    actor: User = Depends(lecturer_or_admin),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_course(db, course_id, actor, client_ip(request))
    return Response(status_code=204)


# -- Classes ---------------------------------------------------------------


@router.get("/classes", response_model=Page[ClassOut], dependencies=[Depends(lecturer_or_admin)])
async def list_classes(
    course_id: int | None = Query(None, description="Lọc lớp theo khóa học"),
    pager: PageParams = Depends(page_query),
    db: AsyncSession = Depends(get_db),
):
    return await paginate(db, repo.list_classes(course_id), ClassOut.model_validate, pager.page, pager.limit)


@router.post("/classes", response_model=ClassOut, status_code=201, dependencies=[Depends(lecturer_or_admin)])
async def create_class(
    payload: ClassCreateIn,
    request: Request,
    actor: User = Depends(lecturer_or_admin),
    db: AsyncSession = Depends(get_db),
):
    return await service.create_class(db, payload, actor, client_ip(request))


@router.get("/classes/{class_id}", response_model=ClassOut)
async def get_class(class_obj=Depends(require_class_access)):
    return ClassOut.model_validate(class_obj)


@router.patch("/classes/{class_id}", response_model=ClassOut, dependencies=[Depends(lecturer_or_admin)])
async def update_class(
    class_id: int,
    payload: ClassUpdateIn,
    request: Request,
    actor: User = Depends(lecturer_or_admin),
    db: AsyncSession = Depends(get_db),
):
    return await service.update_class(db, class_id, payload, actor, client_ip(request))


@router.delete("/classes/{class_id}", status_code=204, dependencies=[Depends(lecturer_or_admin)])
async def delete_class(
    class_id: int,
    request: Request,
    actor: User = Depends(lecturer_or_admin),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_class(db, class_id, actor, client_ip(request))
    return Response(status_code=204)


# -- Enrollments -----------------------------------------------------------


@router.post("/classes/{class_id}/enrollments", status_code=201, dependencies=[Depends(lecturer_or_admin)])
async def enroll_students(
    class_id: int,
    payload: list[EnrollItem],
    request: Request,
    actor: User = Depends(lecturer_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Single enroll = array of one item `[{student_id}]` (api-spec §3)."""
    ids = [item.student_id for item in payload]
    if not ids:
        raise AppError.validation("Cần ít nhất một student_id")
    added = await service.enroll_students(db, class_id, ids, actor, client_ip(request))
    return {"added": added}


@router.delete("/classes/{class_id}/enrollments/{student_id}", status_code=204,
               dependencies=[Depends(lecturer_or_admin)])
async def remove_enrollment(
    class_id: int,
    student_id: int,
    request: Request,
    actor: User = Depends(lecturer_or_admin),
    db: AsyncSession = Depends(get_db),
):
    await service.remove_enrollment(db, class_id, student_id, actor, client_ip(request))
    return Response(status_code=204)


@router.get("/classes/{class_id}/students", response_model=Page[StudentInClassOut],
            dependencies=[Depends(lecturer_or_admin)])
async def list_students(
    class_id: int,
    pager: PageParams = Depends(page_query),
    db: AsyncSession = Depends(get_db),
):
    await service.get_class_or_404(db, class_id)
    return await paginate(db, repo.list_students_stmt(class_id), _student_out, pager.page, pager.limit)


def _student_out(e) -> StudentInClassOut:
    """Map an Enrollment (student eagerly loaded) to the student-in-class view."""
    return StudentInClassOut(
        user_id=e.student_id,
        email=e.student.email,
        full_name=e.student.full_name,
        student_code=e.student.student_code,
        status=e.status,
        enrolled_at=e.enrolled_at,
    )


# -- Student self-service ---------------------------------------------------


@router.get("/me/classes", response_model=Page[MyClassOut])
async def my_classes(
    user: User = Depends(require_roles("student")),
    pager: PageParams = Depends(page_query),
    db: AsyncSession = Depends(get_db),
):
    return await paginate(db, repo.my_classes_stmt(user.id), _my_class_out, pager.page, pager.limit)


def _my_class_out(e) -> MyClassOut:
    """Map an Enrollment (class eagerly loaded) to the my-classes view."""
    c = e.class_
    return MyClassOut(
        id=c.id, course_id=c.course_id, code=c.code, name=c.name,
        semester=c.semester, lecturer_id=c.lecturer_id, status=e.status,
        course_code=c.course_code, course_name=c.course_name, lecturer_name=c.lecturer_name,
    )
