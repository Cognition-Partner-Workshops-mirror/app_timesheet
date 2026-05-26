"""
AI Service configuration.
Manages model paths, GPU settings, and service connection parameters.
"""

from pydantic_settings import BaseSettings


class AISettings(BaseSettings):
    """Configuration for the AI Model Service."""

    # Service settings
    APP_NAME: str = "Virtual Try-On AI Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8001

    # GPU settings
    USE_GPU: bool = True
    GPU_DEVICE_ID: int = 0
    MIXED_PRECISION: bool = True  # FP16 inference for reduced memory usage

    # Model paths (relative to model registry directory)
    MODEL_DIR: str = "./models"
    POSE_MODEL_NAME: str = "mediapipe_pose"
    SEGMENTATION_MODEL_NAME: str = "u2net"
    TRYON_MODEL_NAME: str = "viton_hd"

    # Inference settings
    INPUT_WIDTH: int = 768
    INPUT_HEIGHT: int = 1024
    BATCH_SIZE: int = 1
    INFERENCE_TIMEOUT: int = 60  # seconds

    # Object Storage (MinIO) for fetching/storing images
    STORAGE_ENDPOINT: str = "localhost:9000"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    STORAGE_BUCKET_NAME: str = "virtual-tryon"
    STORAGE_USE_SSL: bool = False

    # Quality thresholds
    MIN_POSE_CONFIDENCE: float = 0.5
    MIN_SEGMENTATION_IOU: float = 0.7

    class Config:
        env_file = ".env"
        case_sensitive = True


# Singleton settings instance
ai_settings = AISettings()
