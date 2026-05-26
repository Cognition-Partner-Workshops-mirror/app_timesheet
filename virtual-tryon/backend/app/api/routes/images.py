"""
Image upload and management API routes.
Handles user photo and product image uploads with validation,
resizing, thumbnail generation, and storage in MinIO.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user_id
from app.database.connection import get_db
from app.database.models import UserImage
from app.models.schemas import ImageUploadResponse, ImageDimensions, ImageMetadataResponse
from app.services.image_service import (
    validate_image,
    get_image_dimensions,
    resize_image,
    generate_thumbnail,
    generate_storage_path,
)
from app.services.storage_service import storage_service

router = APIRouter(prefix="/images", tags=["Images"])


@router.post("/upload", response_model=ImageUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(..., description="Image file (JPEG, PNG, or WebP)"),
    image_type: str = Form(
        default="user_photo",
        description="Type of image: 'user_photo' or 'product_image'",
    ),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a user photo or product image.
    The image is validated, resized to standard dimensions (768x1024),
    a thumbnail is generated, and both are stored in MinIO.
    Metadata is persisted in the database.
    """
    # Validate the uploaded image (format, size, integrity)
    content = await validate_image(file)

    # Get original dimensions before processing
    width, height = get_image_dimensions(content)

    # Resize image to standard try-on dimensions
    resized_content = resize_image(content)

    # Generate thumbnail for preview displays
    thumbnail_content = generate_thumbnail(content)

    # Generate unique storage paths
    main_path = generate_storage_path(image_type, "jpg")
    thumb_path = generate_storage_path(f"{image_type}/thumbnails", "jpg")

    # Upload both images to object storage
    main_url = storage_service.upload_file(resized_content, main_path)
    thumb_url = storage_service.upload_file(thumbnail_content, thumb_path)

    # Get final dimensions after resize
    final_width, final_height = get_image_dimensions(resized_content)

    # Persist metadata in the database
    user_image = UserImage(
        user_id=user_id,
        image_url=main_url,
        thumbnail_url=thumb_url,
        image_type=image_type,
        width=final_width,
        height=final_height,
        file_size_bytes=len(resized_content),
        storage_path=main_path,
        metadata_json={
            "original_width": width,
            "original_height": height,
            "original_size_bytes": len(content),
            "original_filename": file.filename,
        },
    )
    db.add(user_image)
    await db.flush()
    await db.refresh(user_image)

    return ImageUploadResponse(
        image_id=user_image.id,
        url=main_url,
        thumbnail_url=thumb_url,
        image_type=image_type,
        dimensions=ImageDimensions(width=final_width, height=final_height),
        file_size_bytes=len(resized_content),
        created_at=user_image.created_at,
    )


@router.get("/{image_id}", response_model=ImageMetadataResponse)
async def get_image(
    image_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve metadata for a previously uploaded image."""
    result = await db.execute(
        select(UserImage).where(
            UserImage.id == image_id,
            UserImage.user_id == user_id,
        )
    )
    image = result.scalar_one_or_none()

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )

    return ImageMetadataResponse(
        image_id=image.id,
        url=image.image_url,
        thumbnail_url=image.thumbnail_url,
        image_type=image.image_type,
        dimensions=ImageDimensions(width=image.width, height=image.height),
        created_at=image.created_at,
    )


@router.delete("/{image_id}", status_code=status.HTTP_200_OK)
async def delete_image(
    image_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete an uploaded image.
    Removes both the object storage file and the database record.
    """
    result = await db.execute(
        select(UserImage).where(
            UserImage.id == image_id,
            UserImage.user_id == user_id,
        )
    )
    image = result.scalar_one_or_none()

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )

    # Delete from object storage
    storage_service.delete_file(image.storage_path)

    # Delete database record
    await db.delete(image)

    return {"status": "success", "message": "Image deleted successfully"}
