from pathlib import Path
from worker.config import settings

def get_storage_path(storage_key: str) -> Path:
    safe_key = storage_key.lstrip("/")
    base_dir = Path(settings.LOCAL_STORAGE_DIR).resolve()
    return (base_dir / safe_key).resolve()

def read_file(storage_key: str) -> bytes:
    path = get_storage_path(storage_key)
    with open(path, "rb") as f:
        return f.read()

def file_exists(storage_key: str) -> bool:
    return get_storage_path(storage_key).is_file()

def save_file(storage_key: str, content: bytes) -> str:
    path = get_storage_path(storage_key)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as f:
        f.write(content)
    return storage_key
