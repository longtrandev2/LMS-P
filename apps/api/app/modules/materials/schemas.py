"""Pydantic schemas for materials module (M3)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class MaterialLinkIn(BaseModel):
    """JSON body for creating a link-type material (api-spec §4)."""

    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    url: HttpUrl


class MaterialUpdateIn(BaseModel):
    """PATCH metadata only (FR-MAT-03)."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None


class MaterialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    class_id: int
    title: str
    description: str | None = None
    type: str
    file_path: str | None = None  # file -> storage path, link -> URL
    size_bytes: int
    uploaded_by: int
    created_at: datetime
