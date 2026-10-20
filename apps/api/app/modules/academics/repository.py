"""SQLAlchemy data access for academics module."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.academics.models import Class, Course, Enrollment

# eager-load joins needed for ClassOut display fields
_CLASS_EAGER = (selectinload(Class.course), selectinload(Class.lecturer))


async def get_course(db: AsyncSession, course_id: int) -> Course | None:
    return await db.get(Course, course_id)


async def get_course_by_code(db: AsyncSession, code: str) -> Course | None:
    return (await db.execute(select(Course).where(Course.code == code))).scalar_one_or_none()


def list_courses() -> select:
    return select(Course).order_by(Course.id)


async def get_class(db: AsyncSession, class_id: int) -> Class | None:
    stmt = select(Class).options(*_CLASS_EAGER).where(Class.id == class_id)
    return (await db.execute(stmt)).scalar_one_or_none()


def list_classes() -> select:
    return select(Class).options(*_CLASS_EAGER).order_by(Class.id)


async def get_enrollment(db: AsyncSession, class_id: int, student_id: int) -> Enrollment | None:
    return (
        await db.execute(select(Enrollment).where(Enrollment.class_id == class_id, Enrollment.student_id == student_id))
    ).scalar_one_or_none()


async def is_enrolled(db: AsyncSession, class_id: int, student_id: int) -> bool:
    enrollment = await get_enrollment(db, class_id, student_id)
    return enrollment is not None and enrollment.status == "active"


def list_students_stmt(class_id: int) -> select:
    """Active enrollments of a class with student eagerly loaded (paginatable)."""
    return (
        select(Enrollment)
        .options(selectinload(Enrollment.student))
        .where(Enrollment.class_id == class_id, Enrollment.status == "active")
        .order_by(Enrollment.student_id)
    )


def my_classes_stmt(student_id: int) -> select:
    return (
        select(Class, Enrollment.status)
        .options(*_CLASS_EAGER)
        .join(Enrollment, Enrollment.class_id == Class.id)
        .where(Enrollment.student_id == student_id)
        .order_by(Class.id)
    )
