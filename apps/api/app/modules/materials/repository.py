"""SQLAlchemy data access for materials module."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.materials.models import Material


async def get_material(db: AsyncSession, material_id: int) -> Material | None:
    return await db.get(Material, material_id)


def list_materials_stmt(class_id: int) -> select:
    """Materials of a class, newest first (index class_id+created_at, §2.3)."""
    return (
        select(Material)
        .where(Material.class_id == class_id)
        .order_by(Material.created_at.desc(), Material.id.desc())
    )
