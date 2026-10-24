from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENV: str = "local"
    PORT: int = 8080
    DATABASE_URL: str = "sqlite:///./core_api.db"
    STORAGE_BACKEND: str = "local"
    LOCAL_STORAGE_DIR: str = "/data"
    GCS_BUCKET: str = ""
    RENDER_ARTIFICIAL_DELAY_SECONDS: float = 0.0

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
