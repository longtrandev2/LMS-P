"""Materials business logic (M3, FR-MAT-01..03, BR2).

Write ops are restricted to the lecturer of the class; read/download requires
class membership (enrollment for students). Audit via write_audit (BR7).
"""

import logging
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import storage
from app.core.audit import write_audit
from app.core.exceptions import AppError
from app.modules.academics import repository as academics_repo
from app.modules.academics.deps import ensure_class_access
from app.modules.academics.models import Class, Enrollment
from app.modules.academics.service import get_class_or_404
from app.modules.identity.models import User
from app.modules.materials import repository as repo
from app.modules.materials.models import Material
from app.modules.materials.schemas import MaterialLinkIn, MaterialUpdateIn

logger = logging.getLogger(__name__)


def _ensure_class_lecturer(user: User, class_obj: Class) -> None:
    """Write ops (upload/patch/delete): lecturer must own the class (BR1)."""
    if "lecturer" not in user.role_names or class_obj.lecturer_id != user.id:
        raise AppError.forbidden("Chỉ giảng viên phụ trách lớp mới được quản lý học liệu")


async def get_material_or_404(db: AsyncSession, material_id: int) -> Material:
    material = await repo.get_material(db, material_id)
    if material is None:
        raise AppError.not_found("Không tìm thấy học liệu")
    return material


async def create_file_material(
    db: AsyncSession,
    class_id: int,
    title: str,
    description: str | None,
    upload: UploadFile,
    actor: User,
    ip: str | None,
) -> Material:
    class_obj = await get_class_or_404(db, class_id)
    _ensure_class_lecturer(actor, class_obj)
    rel_path, size = storage.save_material_file(class_obj.id, upload)
    ext = Path(rel_path).suffix.lower()
    material = Material(
        class_id=class_obj.id,
        title=title,
        description=description,
        type=storage.EXT_TO_TYPE[ext],
        file_path=rel_path,
        size_bytes=size,
        uploaded_by=actor.id,
    )
    db.add(material)
    await db.flush()
    await write_audit(db, actor.id, "material.create", "material", material.id,
                      new={"title": material.title, "type": material.type,
                           "class_id": material.class_id, "size_bytes": material.size_bytes},
                      ip=ip)
    await db.commit()
    await db.refresh(material)
    await notify_class_new_material(db, class_obj, material, actor)
    return material


async def create_link_material(
    db: AsyncSession, class_id: int, payload: MaterialLinkIn, actor: User, ip: str | None
) -> Material:
    class_obj = await get_class_or_404(db, class_id)
    _ensure_class_lecturer(actor, class_obj)
    material = Material(
        class_id=class_obj.id,
        title=payload.title,
        description=payload.description,
        type="link",
        file_path=str(payload.url),
        size_bytes=0,
        uploaded_by=actor.id,
    )
    db.add(material)
    await db.flush()
    await write_audit(db, actor.id, "material.create", "material", material.id,
                      new={"title": material.title, "type": "link",
                           "class_id": material.class_id, "url": material.file_path},
                      ip=ip)
    await db.commit()
    await db.refresh(material)
    await notify_class_new_material(db, class_obj, material, actor)
    return material


async def update_material(
    db: AsyncSession, material_id: int, payload: MaterialUpdateIn, actor: User, ip: str | None
) -> Material:
    material = await get_material_or_404(db, material_id)
    class_obj = await get_class_or_404(db, material.class_id)
    _ensure_class_lecturer(actor, class_obj)
    old = {"title": material.title, "description": material.description}
    if payload.title is not None:
        material.title = payload.title
    if payload.description is not None:
        material.description = payload.description
    await write_audit(db, actor.id, "material.update", "material", material.id,
                      old=old, new={"title": material.title}, ip=ip)
    await db.commit()
    await db.refresh(material)
    return material


async def delete_material(db: AsyncSession, material_id: int, actor: User, ip: str | None) -> None:
    material = await get_material_or_404(db, material_id)
    class_obj = await get_class_or_404(db, material.class_id)
    _ensure_class_lecturer(actor, class_obj)
    await write_audit(db, actor.id, "material.delete", "material", material_id,
                      old={"title": material.title, "type": material.type,
                           "file_path": material.file_path},
                      ip=ip)
    await db.delete(material)
    await db.commit()
    storage.delete_material_file(material.file_path)


async def get_material_for_download(db: AsyncSession, actor: User, material_id: int) -> tuple[Material, Path]:
    """Enforce BR2 (member of the class) then resolve the stored file."""
    material = await get_material_or_404(db, material_id)
    class_obj = await academics_repo.get_class(db, material.class_id)
    if class_obj is None:
        raise AppError.not_found("Không tìm thấy lớp học")
    await ensure_class_access(db, actor, class_obj)
    if material.type == "link":
        raise AppError.validation("Học liệu dạng liên kết không có tệp để tải")
    path = storage.resolve_material_file(material.file_path)
    return material, path


async def ensure_list_access(db: AsyncSession, actor: User, class_id: int) -> None:
    """List materials: any class member (FR-MAT-02, BR2)."""
    class_obj = await get_class_or_404(db, class_id)
    await ensure_class_access(db, actor, class_obj)


async def notify_class_new_material(
    db: AsyncSession, class_obj: Class, material: Material, actor: User
) -> None:
    """Push a 'material.created' notification to enrolled students (FR-NTF-01).

    Imported inside the function so materials still works if the notifications
    module is absent (parallel agent builds it); notification failures never
    break the upload itself.
    """
    try:
        from app.modules.notifications.service import create_notification
    except ImportError:
        return
    stmt = (
        select(Enrollment.student_id)
        .where(Enrollment.class_id == class_obj.id, Enrollment.status == "active")
    )
    student_ids = (await db.execute(stmt)).scalars().all()
    for student_id in student_ids:
        try:
            await create_notification(
                db,
                student_id,
                type="material.created",
                title=f"Học liệu mới: {material.title}",
                body=material.description,
                data={"material_id": material.id, "class_id": class_obj.id},
            )
        except Exception:  # notification failure must never break upload
            logger.warning("notify_class_new_material failed for user %s", student_id, exc_info=True)
