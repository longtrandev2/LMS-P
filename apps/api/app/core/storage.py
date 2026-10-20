"""Local file storage for learning materials (M3, FR-MAT-01).

Layout: STORAGE_DIR/materials/<class_id>/<uuid><ext>
Guards: extension whitelist, MAX_UPLOAD_MB size cap (streamed), path-traversal
check when resolving stored paths back to disk.
"""

import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.config import get_settings
from app.core.exceptions import AppError

# FR-MAT-01: pdf / doc / slide / zip
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".zip"}
CHUNK_SIZE = 1024 * 1024  # stream uploads in 1MB chunks

# extension -> materials.type enum (database-design §2.3)
EXT_TO_TYPE = {
    ".pdf": "pdf",
    ".doc": "doc",
    ".docx": "doc",
    ".ppt": "slide",
    ".pptx": "slide",
    ".zip": "archive",
}


def storage_root() -> Path:
    return Path(get_settings().STORAGE_DIR).resolve()


def save_material_file(class_id: int, upload: UploadFile) -> tuple[str, int]:
    """Stream an upload to disk; return (relative posix path, size_bytes).

    Raises VALIDATION_ERROR for a disallowed extension or size over MAX_UPLOAD_MB.
    """
    ext = Path(upload.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise AppError.validation(
            "Định dạng tệp không được hỗ trợ",
            details={"allowed_extensions": sorted(ALLOWED_EXTENSIONS)},
        )
    max_bytes = get_settings().MAX_UPLOAD_MB * 1024 * 1024
    rel_dir = Path("materials") / str(class_id)
    target_dir = storage_root() / rel_dir
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / f"{uuid.uuid4().hex}{ext}"

    size = 0
    with target.open("wb") as out:
        while chunk := upload.file.read(CHUNK_SIZE):
            size += len(chunk)
            if size > max_bytes:
                out.close()
                target.unlink(missing_ok=True)
                raise AppError.validation(
                    f"Tệp vượt quá giới hạn {get_settings().MAX_UPLOAD_MB}MB"
                )
            out.write(chunk)
    return f"{rel_dir.as_posix()}/{target.name}", size


def resolve_material_file(rel_path: str | None) -> Path:
    """Resolve a stored relative path to an absolute file path.

    Refuses anything resolving outside STORAGE_DIR/materials (path traversal)
    and anything that is not an existing file.
    """
    if not rel_path:
        raise AppError.not_found("Học liệu không có tệp đính kèm")
    materials_root = (storage_root() / "materials").resolve()
    # rel_path is relative to STORAGE_DIR and already starts with "materials/"
    candidate = (storage_root() / rel_path).resolve()
    if not candidate.is_relative_to(materials_root):
        raise AppError.validation("Đường dẫn tệp không hợp lệ")
    if not candidate.is_file():
        raise AppError.not_found("Không tìm thấy tệp học liệu trên máy chủ")
    return candidate


def delete_material_file(rel_path: str | None) -> None:
    """Best-effort cleanup of the stored file when a material is deleted."""
    if not rel_path:
        return
    try:
        resolve_material_file(rel_path).unlink(missing_ok=True)
    except AppError:
        # file already gone or path invalid — nothing to clean up
        pass
