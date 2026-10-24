import io
import uuid
from typing import List
from PIL import Image
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from core_api.database import get_db
from core_api.models import Asset, User
from core_api.schemas import AssetResponse
from core_api.auth import get_current_user
from core_api.storage import save_file, delete_file, generate_signed_url

router = APIRouter(prefix="/assets", tags=["assets"])

ALLOWED_FORMATS = {"PNG": "image/png", "JPEG": "image/jpeg", "WEBP": "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def upload_asset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 10 MB limit"
        )

    # Verify with Pillow
    try:
        img = Image.open(io.BytesIO(content))
        img.verify()
        # Re-open after verify to get format and dimensions
        img = Image.open(io.BytesIO(content))
        img_format = img.format
        width, height = img.size
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or unreadable image file"
        )

    if img_format not in ALLOWED_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image format: {img_format}. Allowed: png, jpeg, webp"
        )

    content_type = ALLOWED_FORMATS[img_format]
    ext = img_format.lower()
    if ext == "jpeg":
        ext = "jpg"

    asset_id = str(uuid.uuid4())
    storage_key = f"users/{current_user.id}/assets/{asset_id}.{ext}"

    save_file(storage_key, content)

    asset = Asset(
        id=asset_id,
        user_id=current_user.id,
        filename=file.filename or f"asset.{ext}",
        content_type=content_type,
        storage_key=storage_key,
        size_bytes=len(content),
        width=width,
        height=height
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    resp = AssetResponse.model_validate(asset)
    resp.url = generate_signed_url(asset.storage_key)
    return resp

@router.get("", response_model=List[AssetResponse])
def list_assets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assets = db.query(Asset).filter(Asset.user_id == current_user.id).order_by(Asset.created_at.desc()).all()
    result = []
    for a in assets:
        resp = AssetResponse.model_validate(a)
        resp.url = generate_signed_url(a.storage_key)
        result.append(resp)
    return result

@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.user_id == current_user.id
    ).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    delete_file(asset.storage_key)
    db.delete(asset)
    db.commit()
    return None
