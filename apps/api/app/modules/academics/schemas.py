"""Pydantic schemas for academics module (courses, classes, enrollments)."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CourseCreateIn(BaseModel):
    code: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None


class CourseUpdateIn(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=20)
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    description: str | None = None
    created_by: int
    created_at: datetime


class ClassCreateIn(BaseModel):
    course_id: int
    code: str = Field(min_length=1, max_length=30)
    name: str = Field(min_length=1, max_length=200)
    semester: str = Field(min_length=1, max_length=20)
    lecturer_id: int
    grade_policy: dict[str, Any] | None = None


class ClassUpdateIn(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=30)
    name: str | None = Field(default=None, min_length=1, max_length=200)
    semester: str | None = Field(default=None, min_length=1, max_length=20)
    lecturer_id: int | None = None
    grade_policy: dict[str, Any] | None = None


class ClassOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    code: str
    name: str
    semester: str
    lecturer_id: int
    grade_policy: dict[str, Any] | None = None
    created_at: datetime
    # joined fields for class cards (course + lecturer)
    course_code: str
    course_name: str
    lecturer_name: str


class EnrollItem(BaseModel):
    """One enrollment entry — body is an array of these (api-spec §3)."""

    student_id: int


class StudentInClassOut(BaseModel):
    user_id: int
    email: str
    full_name: str
    student_code: str | None = None
    status: str
    enrolled_at: datetime


class MyClassOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    code: str
    name: str
    semester: str
    lecturer_id: int
    status: str  # enrollment status
    # joined display fields (same shape as ClassOut for shared card component)
    course_code: str
    course_name: str
    lecturer_name: str
