"""CSV bulk import (FR-AUTH-05): columns email, full_name, student_code, role."""

import csv
import io

import app.core.email_compat  # noqa: F401 — allow @lms.local demo domain
from email_validator import EmailNotValidError, validate_email
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import write_audit
from app.core.exceptions import AppError
from app.core.security import hash_password
from app.modules.identity import repository as repo
from app.modules.identity.models import User
from app.modules.identity.user_service import generate_temp_password

REQUIRED_HEADERS = {"email", "full_name", "student_code", "role"}


def _email_error(email: str) -> str | None:
    """Return a reason string if the email is invalid, else None (M3)."""
    try:
        validate_email(email, check_deliverability=False)
        return None
    except EmailNotValidError as exc:
        return f"email không hợp lệ: {str(exc)[:80]}"


def parse_csv(content: str) -> tuple[list[dict], list[dict]]:
    """Parse CSV -> (valid_rows, errors[{row, reason}]). Raises ValueError on bad header only."""
    reader = csv.DictReader(io.StringIO(content))
    headers = set(reader.fieldnames or [])
    missing = REQUIRED_HEADERS - headers
    if missing:
        raise ValueError(f"CSV thiếu cột: {', '.join(sorted(missing))}")
    rows: list[dict] = []
    errors: list[dict] = []
    for line_no, row in enumerate(reader, start=2):
        cleaned = {k: (v or "").strip() for k, v in row.items() if k in REQUIRED_HEADERS}
        if not cleaned.get("email"):
            continue  # skip blank lines
        if not cleaned.get("full_name"):
            errors.append({"row": line_no, "reason": "thiếu họ tên"})
            continue
        if cleaned["role"] not in ("student", "lecturer", "admin"):
            errors.append({"row": line_no, "reason": f"role không hợp lệ '{cleaned['role']}'"})
            continue
        if reason := _email_error(cleaned["email"]):
            errors.append({"row": line_no, "reason": reason})
            continue
        rows.append(cleaned | {"_line": line_no})
    return rows, errors


async def import_users(db: AsyncSession, content: str, actor: User, ip: str | None):
    """Create users from CSV; skip existing emails, collect per-row errors.

    Returns (created_count, skipped_emails, errors, temp_passwords).
    """
    try:
        rows, errors = parse_csv(content)
    except ValueError as exc:
        raise AppError.validation(str(exc)) from exc
    skipped: list[str] = []
    temp_passwords: list[dict] = []
    created = 0
    for row in rows:
        if await repo.get_user_by_email(db, row["email"]):
            skipped.append(row["email"])
            continue
        temp_pw = generate_temp_password()
        user = User(
            email=row["email"],
            full_name=row["full_name"],
            student_code=row["student_code"] or None,
            password_hash=hash_password(temp_pw),
        )
        db.add(user)
        await db.flush()
        await repo.set_user_roles(db, user, [row["role"]])
        await write_audit(db, actor.id, "user.create", "user", user.id,
                          new={"email": user.email, "roles": [row["role"]], "imported": True}, ip=ip)
        temp_passwords.append({"email": row["email"], "temp_password": temp_pw})
        created += 1
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise AppError.validation("Dữ liệu CSV xung đột (mã sinh viên đã tồn tại?)", status_code=409)
    return created, skipped, errors, temp_passwords
