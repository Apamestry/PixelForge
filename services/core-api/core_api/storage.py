"""
Storage abstraction for core-api.

STORAGE_BACKEND=local  -> files on LOCAL_STORAGE_DIR (shared volume)
STORAGE_BACKEND=gcs    -> Google Cloud Storage bucket

Signed URLs:
  local -> /api/files/<jwt>  (JWT signed with JWT_SECRET)
  gcs   -> V4 signed URL via IAM signBlob (no key files, works on Cloud Run)
"""

import mimetypes
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path

import jwt
from fastapi import HTTPException, status

from core_api.config import settings


# ---------------------------------------------------------------------------
# Local helpers
# ---------------------------------------------------------------------------

def _local_storage_path(storage_key: str) -> Path:
    """Resolve a storage key to an absolute path, guarding against traversal."""
    safe_key = storage_key.lstrip("/")
    base_dir = Path(settings.LOCAL_STORAGE_DIR).resolve()
    full_path = (base_dir / safe_key).resolve()
    if not str(full_path).startswith(str(base_dir)):
        raise HTTPException(status_code=400, detail="Invalid storage path")
    return full_path


def _local_save(storage_key: str, content: bytes) -> str:
    path = _local_storage_path(storage_key)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return storage_key


def _local_delete(storage_key: str) -> None:
    path = _local_storage_path(storage_key)
    if path.exists():
        path.unlink()


def _local_signed_url(storage_key: str, ttl_seconds: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
    token = jwt.encode(
        {"key": storage_key, "exp": expire, "iat": datetime.now(timezone.utc)},
        settings.JWT_SECRET,
        algorithm="HS256",
    )
    return f"/api/files/{token}"


# ---------------------------------------------------------------------------
# GCS helpers  (imported lazily so tests without google-cloud-storage still pass)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _gcs_client():
    from google.cloud import storage as gcs  # type: ignore
    return gcs.Client()


def _gcs_bucket():
    return _gcs_client().bucket(settings.GCS_BUCKET)


def _gcs_save(storage_key: str, content: bytes) -> str:
    content_type = mimetypes.guess_type(storage_key)[0] or "application/octet-stream"
    _gcs_bucket().blob(storage_key).upload_from_string(content, content_type=content_type)
    return storage_key


def _gcs_delete(storage_key: str) -> None:
    blob = _gcs_bucket().blob(storage_key)
    try:
        blob.delete()
    except Exception:
        pass  # already gone


_signing_creds = None


def _signing_credentials():
    """Default credentials, created once and refreshed only when the token has expired."""
    global _signing_creds
    import google.auth  # type: ignore
    import google.auth.transport.requests  # type: ignore

    if _signing_creds is None:
        _signing_creds, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
    if not _signing_creds.valid:
        _signing_creds.refresh(google.auth.transport.requests.Request())
    return _signing_creds


def _gcs_signed_url(storage_key: str, ttl_seconds: int) -> str:
    """
    V4 signed URL via IAM signBlob: no service-account key file needed.
    Requires the service account running this code to have roles/iam.serviceAccountTokenCreator
    on itself, and SIGNING_SERVICE_ACCOUNT to be set to that account's email.
    """
    creds = _signing_credentials()
    return _gcs_bucket().blob(storage_key).generate_signed_url(
        version="v4",
        expiration=timedelta(seconds=ttl_seconds),
        method="GET",
        service_account_email=settings.SIGNING_SERVICE_ACCOUNT,
        access_token=creds.token,
    )


# ---------------------------------------------------------------------------
# Public API (called by routes)
# ---------------------------------------------------------------------------

def save_file(storage_key: str, content: bytes) -> str:
    if settings.STORAGE_BACKEND == "gcs":
        return _gcs_save(storage_key, content)
    return _local_save(storage_key, content)


def delete_file(storage_key: str) -> None:
    if settings.STORAGE_BACKEND == "gcs":
        _gcs_delete(storage_key)
    else:
        _local_delete(storage_key)


def generate_signed_url(
    storage_key: str,
    ttl_seconds: int | None = None,
) -> str:
    ttl = ttl_seconds if ttl_seconds is not None else settings.SIGNED_URL_TTL_SECONDS
    if settings.STORAGE_BACKEND == "gcs":
        return _gcs_signed_url(storage_key, ttl)
    return _local_signed_url(storage_key, ttl)


# ---------------------------------------------------------------------------
# Local-mode file-token verification (used by GET /api/files/{token})
# ---------------------------------------------------------------------------

def verify_file_token(token: str) -> str:
    """Decode and validate a local-mode signed-URL token, return the storage key."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        key = payload.get("key")
        if not key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token"
            )
        return key
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Link expired"
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token"
        )


def get_storage_path(storage_key: str) -> Path:
    """Return local filesystem path (used by GET /api/files/{token})."""
    return _local_storage_path(storage_key)
