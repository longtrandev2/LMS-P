"""Application settings loaded from environment / .env (pydantic-settings)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "mysql+asyncmy://lms:lms@localhost:3306/lms"
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672/"
    JWT_SECRET: str = "dev-secret-change-me-0123456789abcdef0123456789abcdef"
    JWT_ACCESS_TTL_MIN: int = 15
    JWT_REFRESH_TTL_DAYS: int = 7
    STORAGE_DIR: str = "../storage"
    CORS_ORIGINS: str = "http://localhost:3000"
    MAX_UPLOAD_MB: int = 100

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
