"""
Application configuration module.
Loads settings from environment variables with sensible defaults.
Uses pydantic-settings for type-safe configuration management.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Central configuration for the Virtual Try-On backend service."""

    # Application settings
    APP_NAME: str = "Virtual Try-On API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4

    # Database settings (PostgreSQL)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/virtual_tryon"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10

    # Redis settings
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 3600  # 1 hour default TTL for cached results

    # Object Storage settings (MinIO / S3-compatible)
    STORAGE_ENDPOINT: str = "localhost:9000"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    STORAGE_BUCKET_NAME: str = "virtual-tryon"
    STORAGE_USE_SSL: bool = False
    STORAGE_REGION: str = "us-east-1"

    # AI Service settings
    AI_SERVICE_URL: str = "http://localhost:8001"
    AI_SERVICE_TIMEOUT: int = 60  # seconds

    # JWT Authentication settings
    JWT_SECRET_KEY: str = "change-this-to-a-secure-random-string"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Image upload settings
    MAX_IMAGE_SIZE_MB: int = 10
    ALLOWED_IMAGE_TYPES: list = ["image/jpeg", "image/png", "image/webp"]
    IMAGE_RESIZE_WIDTH: int = 768
    IMAGE_RESIZE_HEIGHT: int = 1024
    THUMBNAIL_SIZE: int = 256

    # Rate limiting
    RATE_LIMIT_UPLOADS: int = 10  # per minute
    RATE_LIMIT_TRYON: int = 5  # per minute

    # CORS settings
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        case_sensitive = True


# Singleton settings instance
settings = Settings()
