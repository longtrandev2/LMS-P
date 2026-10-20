"""Pydantic schemas for identity module (auth, me, admin users)."""

from datetime import datetime
from typing import Literal

import app.core.email_compat  # noqa: F401 — allow @lms.local demo domain
from pydantic import BaseModel, ConfigDict, EmailStr, Field

RoleName = Literal["student", "lecturer", "admin"]


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    student_code: str | None = None
    status: Literal["active", "locked"]
    last_login_at: datetime | None = None
    created_at: datetime
    roles: list[str] = []

    @classmethod
    def from_user(cls, user) -> "UserOut":
        return cls(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            student_code=user.student_code,
            status=user.status,
            last_login_at=user.last_login_at,
            created_at=user.created_at,
            roles=user.role_names,
        )


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshIn(BaseModel):
    refresh_token: str


class UpdateMeIn(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=150)
    current_password: str | None = None
    new_password: str | None = Field(default=None, min_length=8, max_length=128)


class UserCreateIn(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=150)
    student_code: str | None = Field(default=None, max_length=20)
    role_names: list[RoleName] = Field(min_length=1)
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateIn(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=150)
    student_code: str | None = Field(default=None, max_length=20)  # "" clears the code
    role_names: list[RoleName] | None = None
    status: Literal["active", "locked"] | None = None
    reset_password: bool = False


class UserWithTempPassword(BaseModel):
    user: UserOut
    temporary_password: str | None = None


class ImportRowError(BaseModel):
    row: int
    reason: str


class ImportResult(BaseModel):
    created: int
    skipped: list[str] = []
    errors: list[ImportRowError] = []
    temp_passwords: list[dict] = []
