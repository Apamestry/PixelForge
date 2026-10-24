import mimetypes
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from core_api.storage import verify_file_token, get_storage_path

router = APIRouter(tags=["files"])

@router.get("/files/{token}")
def get_file(token: str):
    storage_key = verify_file_token(token)
    file_path = get_storage_path(storage_key)

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    content_type, _ = mimetypes.guess_type(str(file_path))
    if not content_type:
        content_type = "application/octet-stream"

    return FileResponse(
        path=str(file_path),
        media_type=content_type,
        filename=file_path.name
    )
