"""Academics models (M2): courses, classes, enrollments."""

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, BigInteger, DateTime, Enum, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.modules.identity.models import MYSQL_CHARSET, BigIntegerPK
from app.modules.identity.models import User, utcnow


class Course(Base):
    __tablename__ = "courses"
    __table_args__ = MYSQL_CHARSET

    id: Mapped[int] = mapped_column(BigIntegerPK, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    classes: Mapped[list["Class"]] = relationship(back_populates="course")


class Class(Base):
    __tablename__ = "classes"
    __table_args__ = (UniqueConstraint("course_id", "code"), MYSQL_CHARSET)

    id: Mapped[int] = mapped_column(BigIntegerPK, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(30), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    semester: Mapped[str] = mapped_column(String(20), nullable=False)
    lecturer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    grade_policy: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    course: Mapped[Course] = relationship(back_populates="classes")
    lecturer: Mapped[User] = relationship()
    enrollments: Mapped[list["Enrollment"]] = relationship(back_populates="class_")

    # joined display fields for ClassOut (course + lecturer)
    @property
    def course_code(self) -> str:
        return self.course.code

    @property
    def course_name(self) -> str:
        return self.course.name

    @property
    def lecturer_name(self) -> str:
        return self.lecturer.full_name


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("class_id", "student_id"), MYSQL_CHARSET)

    id: Mapped[int] = mapped_column(BigIntegerPK, primary_key=True, autoincrement=True)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id"), nullable=False)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(Enum("active", "dropped", name="enrollment_status"), default="active", nullable=False)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    class_: Mapped[Class] = relationship(back_populates="enrollments")
    student: Mapped[User] = relationship()


__all__ = ["Course", "Class", "Enrollment"]
