"""
Image processing service.
Handles image validation, resizing, thumbnail generation, and storage operations.
All image binary data is stored in MinIO (S3-compatible), metadata in PostgreSQL.
"""

import hashlib
import io
import uuid
from typing import Optional, Tuple

import structlog
from PIL import Image
from fastapi import UploadFile, HTTPException, status

from app.core.config import settings

logger = structlog.get_logger(__name__)

# Allowed MIME types for uploaded images
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}

# Maximum file size in bytes (default: 10MB)
MAX_FILE_SIZE = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024


async def validate_image(file: UploadFile) -> bytes:
    """
    Validate an uploaded image file.
    Checks MIME type, file size, and that the file is a valid image.
    Returns the raw file bytes if validation passes.
    """
    # Check content type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_IMAGE",
                "message": "Image must be JPEG, PNG, or WebP format",
                "details": {
                    "received_type": file.content_type,
                    "allowed_types": list(ALLOWED_TYPES),
                },
            },
        )

    # Read file content
    content = await file.read()

    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "code": "FILE_TOO_LARGE",
                "message": f"Image file size must not exceed {settings.MAX_IMAGE_SIZE_MB}MB",
                "details": {
                    "max_size_bytes": MAX_FILE_SIZE,
                    "received_size_bytes": len(content),
                },
            },
        )

    # Verify it's a valid image by attempting to open it
    try:
        img = Image.open(io.BytesIO(content))
        img.verify()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_IMAGE",
                "message": "Uploaded file is not a valid image",
            },
        )

    logger.info("image_validated", size=len(content), content_type=file.content_type)
    return content


def get_image_dimensions(content: bytes) -> Tuple[int, int]:
    """Extract width and height from image bytes."""
    img = Image.open(io.BytesIO(content))
    return img.size  # (width, height)


def resize_image(
    content: bytes,
    target_width: int = settings.IMAGE_RESIZE_WIDTH,
    target_height: int = settings.IMAGE_RESIZE_HEIGHT,
) -> bytes:
    """
    Resize image to target dimensions while maintaining aspect ratio.
    Uses LANCZOS resampling for high-quality downscaling.
    Pads with white if aspect ratios don't match.
    """
    img = Image.open(io.BytesIO(content))

    # Convert to RGB if necessary (handles RGBA, palette modes)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    # Calculate scaling to fit within target dimensions
    img_ratio = img.width / img.height
    target_ratio = target_width / target_height

    if img_ratio > target_ratio:
        # Image is wider than target: fit by width
        new_width = target_width
        new_height = int(target_width / img_ratio)
    else:
        # Image is taller than target: fit by height
        new_height = target_height
        new_width = int(target_height * img_ratio)

    img = img.resize((new_width, new_height), Image.LANCZOS)

    # Center on white canvas
    canvas = Image.new("RGB", (target_width, target_height), (255, 255, 255))
    offset_x = (target_width - new_width) // 2
    offset_y = (target_height - new_height) // 2
    canvas.paste(img, (offset_x, offset_y))

    # Save to bytes buffer as JPEG
    buffer = io.BytesIO()
    canvas.save(buffer, format="JPEG", quality=90)
    return buffer.getvalue()


def generate_thumbnail(content: bytes, size: int = settings.THUMBNAIL_SIZE) -> bytes:
    """
    Generate a square thumbnail from image bytes.
    Center-crops and resizes to the given size.
    """
    img = Image.open(io.BytesIO(content))

    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    # Center-crop to square
    min_dim = min(img.width, img.height)
    left = (img.width - min_dim) // 2
    top = (img.height - min_dim) // 2
    img = img.crop((left, top, left + min_dim, top + min_dim))

    # Resize to target thumbnail size
    img = img.resize((size, size), Image.LANCZOS)

    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=85)
    return buffer.getvalue()


def compute_image_hash(content: bytes) -> str:
    """Compute SHA-256 hash of image content for cache key generation."""
    return hashlib.sha256(content).hexdigest()


def generate_storage_path(image_type: str, extension: str = "jpg") -> str:
    """
    Generate a unique storage path for an image in the object store.
    Format: {image_type}/{uuid}.{extension}
    """
    unique_id = uuid.uuid4().hex
    return f"{image_type}/{unique_id}.{extension}"
