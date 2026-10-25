from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENV: str = "local"
    PORT: int = 8080
    DATABASE_URL: str = "sqlite:///./core_api.db"
    JWT_SECRET: str = "pixelforge-dev-secret-jwt-key"
    JWT_EXPIRE_MINUTES: int = 1440
    # Storage
    STORAGE_BACKEND: str = "local"          # "local" | "gcs"
    LOCAL_STORAGE_DIR: str = "/data"
    GCS_BUCKET: str = ""
    SIGNED_URL_TTL_SECONDS: int = 900
    SIGNING_SERVICE_ACCOUNT: str = ""       # needed for V4 IAM signBlob on Cloud Run
    # Queue
    QUEUE_BACKEND: str = "local"            # "local" | "pubsub"
    WORKER_URL: str = "http://render-worker:8080"   # local mode only
    PUBSUB_TOPIC: str = ""                  # full topic path, GCP mode only
    # Network
    CORS_ORIGINS: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

