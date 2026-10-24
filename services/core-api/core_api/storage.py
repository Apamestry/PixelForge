import os
import jwt
from pathlib import Path
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from core_api.config import settings

def get_storage_path(storage_key: str) -> Path:
    # Protect against path traversal
    safe_key = storage_key.lstrip("/")
    base_dir = Path(settings.LOCAL_STORAGE_DIR).resolve()
    full_path = (base_dir / safe_key).resolve()
    if not str(full_path).startswith(str(base_dir)):
        raise HTTPException(status_code=400, detail="Invalid storage path")
    return full_path

def save_file(storage_key: str, content: bytes) -> str:
    path = get_storage_path(storage_key)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as f:
        f.write(content)
    return storage_key

def delete_file(storage_key: str):
    path = get_storage_path(storage_key)
    if path.exists():
        path.unlink()

def generate_signed_url(storage_key: str, ttl_seconds: int = 900) -> str:
    expire = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
    payload = {
        "key": storage_key,
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
    return f"/api/files/{token}"

def verify_file_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        key = payload.get("key")
        if not key:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")
        return key
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Link expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token")
