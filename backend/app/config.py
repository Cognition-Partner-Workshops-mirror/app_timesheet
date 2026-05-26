"""
CareAI Configuration Module
Centralized settings management using Pydantic Settings.
All environment variables and application configuration are defined here.
Supports PostgreSQL as primary database and AWS S3/MinIO for file storage.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application settings
    APP_NAME: str = "CareAI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    SECRET_KEY: str = "careai-secret-key-change-in-production"
    API_PREFIX: str = "/api/v1"

    # PostgreSQL database settings (primary database)
    # Format: postgresql+asyncpg://user:password@host:port/dbname
    DATABASE_URL: str = "postgresql+asyncpg://careai:careai_password@localhost:5432/careai_db"

    # SQLite fallback for quick local dev (set USE_SQLITE=true to enable)
    USE_SQLITE: bool = False
    SQLITE_URL: str = "sqlite+aiosqlite:///./careai.db"

    # JWT Authentication settings
    JWT_SECRET_KEY: str = "careai-jwt-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OpenAI settings for AI features
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4"

    # AWS S3 / MinIO storage settings for file uploads
    # For self-hosted MinIO: set S3_ENDPOINT_URL to MinIO server URL
    S3_BUCKET_NAME: str = "careai-uploads"
    S3_REGION: str = "ap-south-1"
    S3_ACCESS_KEY_ID: Optional[str] = None
    S3_SECRET_ACCESS_KEY: Optional[str] = None
    S3_ENDPOINT_URL: Optional[str] = None  # Set for MinIO (e.g., http://minio:9000)

    # Local file upload fallback (used when S3 is not configured)
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB

    # CORS settings
    CORS_ORIGINS: str = "*"

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    @property
    def effective_database_url(self) -> str:
        """Return the active database URL based on configuration.
        Uses SQLite if USE_SQLITE is True, otherwise PostgreSQL.
        """
        if self.USE_SQLITE:
            return self.SQLITE_URL
        return self.DATABASE_URL

    @property
    def s3_configured(self) -> bool:
        """Check if S3 storage is properly configured with credentials."""
        return bool(self.S3_ACCESS_KEY_ID and self.S3_SECRET_ACCESS_KEY)

    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
