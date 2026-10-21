"""Materials endpoints (M3, api-spec §4)."""

from fastapi import APIRouter, Depends, Request, Response, UploadFile
from fastapi.responses import FileResponse
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.error_schemas import error_responses
from app.core.exceptions import AppError
from app.core.pagination import Page, PageParams, page_query, paginate
from app.modules.identity.auth_router import client_ip
from app.modules.identity.deps import get_current_user, require_roles
from app.modules.identity.models import User
from app.modules.materials import repository as repo
from app.modules.materials import service
from app.modules.materials.schemas import MaterialLinkIn, MaterialOut, MaterialUpdateIn

router = APIRouter(tags=["materials"])
lecturer_only = require_roles("lecturer")


@router.get("/classes/{class_id}/materials", response_model=Page[MaterialOut],
            responses=error_responses(401, 403, 404))
async def list_materials(
    class_id: int,
    actor: User = Depends(get_current_user),
    pager: PageParams = Depends(page_query),
    db: AsyncSession = Depends(get_db),
):
    """List materials of a class — any member (FR-MAT-02, BR2)."""
    await service.ensure_list_access(db, actor, class_id)
    return await paginate(db, repo.list_materials_stmt(class_id), MaterialOut.model_validate,
                          pager.page, pager.limit)


@router.post("/classes/{class_id}/materials", response_model=MaterialOut, status_code=201,
             responses=error_responses(400, 401, 403, 404, 413))
async def create_material(
    class_id: int,
    request: Request,
    actor: User = Depends(lecturer_only),
    db: AsyncSession = Depends(get_db),
):
    """Upload multipart file OR create a link material via JSON body (api-spec §4)."""
    content_type = request.headers.get("content-type", "")
    ip = client_ip(request)
    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        title = (form.get("title") or "").strip()
        if not title:
            raise AppError.validation("Thiếu tiêu đề học liệu", details={"title": "required"})
        description = form.get("description") or None
        upload = form.get("file")
        # starlette form files are UploadFile duck-types (not fastapi.UploadFile)
        if upload is None or not hasattr(upload, "filename"):
            raise AppError.validation("Thiếu tệp đính kèm", details={"file": "required"})
        return await service.create_file_material(
            db, class_id, title, description, upload, actor, ip
        )
    # JSON body -> link material
    try:
        payload = MaterialLinkIn.model_validate_json(await request.body())
    except ValidationError as exc:
        raise AppError.validation("Dữ liệu không hợp lệ", details={"url": str(exc.errors()[0]["msg"])})
    return await service.create_link_material(db, class_id, payload, actor, ip)


@router.get("/materials/{material_id}/download", responses=error_responses(400, 401, 403, 404))
async def download_material(
    material_id: int,
    actor: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stream the stored file (BR2: enrollment check at service level)."""
    material, path = await service.get_material_for_download(db, actor, material_id)
    filename = f"{material.title}{path.suffix}"
    return FileResponse(path, filename=filename, media_type="application/octet-stream")


@router.patch("/materials/{material_id}", response_model=MaterialOut,
              responses=error_responses(400, 401, 403, 404))
async def update_material(
    material_id: int,
    payload: MaterialUpdateIn,
    request: Request,
    actor: User = Depends(lecturer_only),
    db: AsyncSession = Depends(get_db),
):
    return await service.update_material(db, material_id, payload, actor, client_ip(request))


@router.delete("/materials/{material_id}", status_code=204, responses=error_responses(401, 403, 404))
async def delete_material(
    material_id: int,
    request: Request,
    actor: User = Depends(lecturer_only),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_material(db, material_id, actor, client_ip(request))
    return Response(status_code=204)
