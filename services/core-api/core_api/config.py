import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENV: str = "local"
    PORT: int = 8080
    DATABASE_URL: str = "sqlite:///./core_api.db"
    JWT_SECRET: str = "pixelforge-dev-secret-jwt-key"
    JWT_EXPIRE_MINUTES: int = 1440
    STORAGE_BACKEND: str = "local"
    LOCAL_STORAGE_DIR: str = "/data"
    SIGNED_URL_TTL_SECONDS: int = 900
    QUEUE_BACKEND: str = "local"
    WORKER_URL: str = "http://render-worker:8080"
    CORS_ORIGINS: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
