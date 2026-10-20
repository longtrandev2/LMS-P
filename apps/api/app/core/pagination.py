"""Standard pagination: ?page=1&limit=20 -> {items,total,page,limit} (limit max 100)."""

from collections.abc import Callable
from typing import Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

T = TypeVar("T")


class PageParams(BaseModel):
    page: int = 1
    limit: int = 20


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    limit: int


async def paginate(db: AsyncSession, stmt: Select, mapper: Callable[[object], T], page: int, limit: int) -> Page[T]:
    """Count total, fetch one page, map ORM rows through `mapper`.

    Runtime generic arg is erased; the route's `response_model=Page[X]` drives serialization.
    """
    total = await db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery()))
    rows = (await db.execute(stmt.offset((page - 1) * limit).limit(limit))).scalars().all()
    return Page(items=[mapper(r) for r in rows], total=total or 0, page=page, limit=limit)


def page_query(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)) -> PageParams:
    return PageParams(page=page, limit=limit)
