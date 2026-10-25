"""
Storage abstraction for render-worker.

STORAGE_BACKEND=local  → files on LOCAL_STORAGE_DIR (shared volume)
STORAGE_BACKEND=gcs    → Google Cloud Storage bucket
"""

from pathlib import Path
from worker.config import settings


# ---------------------------------------------------------------------------
# Local helpers
# ---------------------------------------------------------------------------

def _local_path(storage_key: str) -> Path:
    safe_key = storage_key.lstrip("/")
    base_dir = Path(settings.LOCAL_STORAGE_DIR).resolve()
    return (base_dir / safe_key).resolve()


def _local_read(storage_key: str) -> bytes:
    return _local_path(storage_key).read_bytes()


def _local_exists(storage_key: str) -> bool:
    return _local_path(storage_key).is_file()


def _local_save(storage_key: str, content: bytes) -> str:
    path = _local_path(storage_key)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return storage_key


# ---------------------------------------------------------------------------
# GCS helpers
# ---------------------------------------------------------------------------

def _gcs_bucket():
    from google.cloud import storage as gcs  # type: ignore
    return gcs.Client().bucket(settings.GCS_BUCKET)


def _gcs_read(storage_key: str) -> bytes:
    return _gcs_bucket().blob(storage_key).download_as_bytes()


def _gcs_exists(storage_key: str) -> bool:
    return _gcs_bucket().blob(storage_key).exists()


def _gcs_save(storage_key: str, content: bytes) -> str:
    _gcs_bucket().blob(storage_key).upload_from_string(content)
    return storage_key


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def read_file(storage_key: str) -> bytes:
    if settings.STORAGE_BACKEND == "gcs":
        return _gcs_read(storage_key)
    return _local_read(storage_key)


def file_exists(storage_key: str) -> bool:
    if settings.STORAGE_BACKEND == "gcs":
        return _gcs_exists(storage_key)
    return _local_exists(storage_key)


def save_file(storage_key: str, content: bytes) -> str:
    if settings.STORAGE_BACKEND == "gcs":
        return _gcs_save(storage_key, content)
    return _local_save(storage_key, content)
