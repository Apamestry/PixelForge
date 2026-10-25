from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENV: str = "local"
    PORT: int = 8080
    DATABASE_URL: str = "sqlite:///./core_api.db"
    # Storage
    STORAGE_BACKEND: str = "local"          # "local" | "gcs"
    LOCAL_STORAGE_DIR: str = "/data"
    GCS_BUCKET: str = ""
    SIGNING_SERVICE_ACCOUNT: str = ""       # for V4 IAM signBlob
    SIGNED_URL_TTL_SECONDS: int = 900
    RENDER_ARTIFICIAL_DELAY_SECONDS: float = 0.0

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

