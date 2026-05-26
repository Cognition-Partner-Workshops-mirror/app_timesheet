"""
Virtual Try-On AI Model Service - Main Application Entry Point.

FastAPI application that provides ML inference endpoints for:
- Pose estimation (MediaPipe body landmark detection)
- Body/clothing segmentation (U-Net semantic segmentation)
- Virtual try-on generation (garment warping + image synthesis)

This service is designed to run on GPU-enabled infrastructure.
Models are loaded into GPU memory on startup and kept warm
for low-latency inference.

Integration:
- Called by the Backend Service via HTTP for try-on job processing
- Reads/writes images from MinIO object storage
- Reports metrics via Prometheus endpoint
"""

import io
import time
import uuid

import boto3
import structlog
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from app.config import ai_settings
from app.pipeline.processor import pipeline

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger(__name__)

# Initialize FastAPI application
app = FastAPI(
    title=ai_settings.APP_NAME,
    version=ai_settings.APP_VERSION,
    description="ML inference service for virtual garment try-on",
    docs_url="/docs",
)

# Initialize S3/MinIO client for image storage
s3_client = boto3.client(
    "s3",
    endpoint_url=f"{'https' if ai_settings.STORAGE_USE_SSL else 'http'}://{ai_settings.STORAGE_ENDPOINT}",
    aws_access_key_id=ai_settings.STORAGE_ACCESS_KEY,
    aws_secret_access_key=ai_settings.STORAGE_SECRET_KEY,
    region_name="us-east-1",
)


# ──────────────────────────────────────────────
# Request/Response Schemas
# ──────────────────────────────────────────────

class InferenceRequest(BaseModel):
    """Request schema for the try-on inference endpoint."""
    job_id: str
    user_image_path: str       # Storage path in MinIO
    product_image_id: str      # Product image identifier
    options: Optional[dict] = None


class InferenceResponse(BaseModel):
    """Response schema returned after successful try-on generation."""
    job_id: str
    result_image_url: str
    thumbnail_url: str
    storage_path: str
    pose_confidence: float
    segmentation_quality: float
    overall_quality_score: float
    processing_time_ms: int
    metadata: dict


# ──────────────────────────────────────────────
# Lifecycle Events
# ──────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    """
    Pre-load ML models into GPU memory on service startup.
    This avoids cold-start delays on the first inference request.
    """
    logger.info("ai_service_starting", version=ai_settings.APP_VERSION)
    try:
        pipeline.warm_up()
        logger.info("ai_service_models_loaded")
    except Exception as e:
        logger.error("model_warmup_failed", error=str(e))
        # Service starts but will attempt model load on first request


@app.on_event("shutdown")
async def shutdown_event():
    """Release GPU memory and model resources on shutdown."""
    pipeline.cleanup()
    logger.info("ai_service_shutdown")


# ──────────────────────────────────────────────
# Health Check Endpoints
# ──────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health_check():
    """Liveness probe - returns OK if the service process is running."""
    return {
        "status": "healthy",
        "service": ai_settings.APP_NAME,
        "version": ai_settings.APP_VERSION,
    }


@app.get("/ready", tags=["Health"])
async def readiness_check():
    """
    Readiness probe - checks that ML models are loaded and GPU is available.
    Returns OK only when the service can handle inference requests.
    """
    import torch

    gpu_available = torch.cuda.is_available() if ai_settings.USE_GPU else True
    models_loaded = pipeline._models_loaded

    if not models_loaded:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "reason": "models_not_loaded"},
        )

    return {
        "status": "ready",
        "models_loaded": models_loaded,
        "gpu_available": gpu_available,
        "gpu_device": ai_settings.GPU_DEVICE_ID if gpu_available else None,
    }


@app.get("/metrics", tags=["Monitoring"])
async def metrics():
    """Prometheus-compatible metrics endpoint for monitoring."""
    import torch

    metrics_data = {
        "models_loaded": pipeline._models_loaded,
    }

    if torch.cuda.is_available():
        metrics_data["gpu_memory_allocated_mb"] = round(
            torch.cuda.memory_allocated() / 1024 / 1024, 2
        )
        metrics_data["gpu_memory_reserved_mb"] = round(
            torch.cuda.memory_reserved() / 1024 / 1024, 2
        )

    return metrics_data


# ──────────────────────────────────────────────
# Inference Endpoints
# ──────────────────────────────────────────────

@app.post("/api/v1/inference/process", response_model=InferenceResponse)
async def process_tryon(request: InferenceRequest):
    """
    Process a virtual try-on inference request.
    
    Pipeline steps:
    1. Fetch user and garment images from object storage
    2. Run pose estimation (MediaPipe - ~50ms)
    3. Run body segmentation (U-Net - ~100ms)
    4. Execute garment warping and composition (~2-5s)
    5. Upload result to object storage
    6. Return result metadata and URLs
    
    Timeout: 60 seconds per request.
    """
    logger.info("inference_request_received", job_id=request.job_id)
    start_time = time.time()

    try:
        # Fetch images from object storage
        user_image_bytes = _fetch_image(request.user_image_path)
        product_image_bytes = _fetch_image(f"product_image/{request.product_image_id}.jpg")

        # Run the complete try-on pipeline
        result = pipeline.process(
            user_image_bytes=user_image_bytes,
            garment_image_bytes=product_image_bytes,
            options=request.options,
        )

        # Upload result images to object storage
        result_path = f"results/{request.job_id}.jpg"
        thumb_path = f"results/thumbnails/{request.job_id}.jpg"

        _upload_image(result["result_image_bytes"], result_path)
        _upload_image(result["thumbnail_bytes"], thumb_path)

        # Generate URLs
        protocol = "https" if ai_settings.STORAGE_USE_SSL else "http"
        base_url = f"{protocol}://{ai_settings.STORAGE_ENDPOINT}/{ai_settings.STORAGE_BUCKET_NAME}"

        total_time = int((time.time() - start_time) * 1000)

        logger.info(
            "inference_complete",
            job_id=request.job_id,
            total_time_ms=total_time,
            quality=result["overall_quality_score"],
        )

        return InferenceResponse(
            job_id=request.job_id,
            result_image_url=f"{base_url}/{result_path}",
            thumbnail_url=f"{base_url}/{thumb_path}",
            storage_path=result_path,
            pose_confidence=result["pose_confidence"],
            segmentation_quality=result["segmentation_quality"],
            overall_quality_score=result["overall_quality_score"],
            processing_time_ms=total_time,
            metadata=result["metadata"],
        )

    except FileNotFoundError as e:
        logger.error("image_not_found", job_id=request.job_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image not found: {str(e)}",
        )
    except Exception as e:
        logger.error("inference_failed", job_id=request.job_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference failed: {str(e)}",
        )


# ──────────────────────────────────────────────
# Helper Functions
# ──────────────────────────────────────────────

def _fetch_image(storage_path: str) -> bytes:
    """Fetch an image from MinIO object storage."""
    try:
        response = s3_client.get_object(
            Bucket=ai_settings.STORAGE_BUCKET_NAME,
            Key=storage_path,
        )
        return response["Body"].read()
    except Exception as e:
        raise FileNotFoundError(f"Cannot fetch image at {storage_path}: {str(e)}")


def _upload_image(content: bytes, storage_path: str) -> str:
    """Upload an image to MinIO object storage."""
    s3_client.put_object(
        Bucket=ai_settings.STORAGE_BUCKET_NAME,
        Key=storage_path,
        Body=io.BytesIO(content),
        ContentType="image/jpeg",
        ContentLength=len(content),
    )
    return storage_path
