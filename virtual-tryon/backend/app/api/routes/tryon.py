"""
Virtual Try-On API routes.
Handles try-on job creation, status polling, result retrieval,
and user try-on history.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_current_user_id
from app.database.connection import get_db
from app.models.schemas import (
    TryOnGenerateRequest,
    TryOnJobResponse,
    TryOnStatusResponse,
    TryOnStepStatus,
    TryOnResultResponse,
    TryOnHistoryResponse,
    TryOnHistoryItem,
)
from app.services.tryon_service import tryon_service

router = APIRouter(prefix="/tryon", tags=["Virtual Try-On"])

# Pipeline step definitions for progress reporting
PIPELINE_STEPS = ["pose_estimation", "body_segmentation", "garment_warping", "image_synthesis"]


@router.post("/generate", response_model=TryOnJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_tryon(
    request: TryOnGenerateRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate a virtual try-on generation.
    Creates a job that is processed asynchronously by the AI service.
    Returns a job_id for status polling.

    The processing pipeline includes:
    1. Pose estimation (body landmark detection)
    2. Body segmentation (body/clothing/background separation)
    3. Garment warping (geometric transformation to fit body)
    4. Image synthesis (final composite generation)
    """
    # Create the try-on job in the database
    job = await tryon_service.create_job(
        db=db,
        user_id=user_id,
        user_image_id=request.user_image_id,
        product_image_id=request.product_image_id,
        product_id=request.product_id,
        options=request.options,
    )

    # Queue background processing (in production, this would use Redis message queue)
    background_tasks.add_task(process_tryon_background, str(job.id))

    return TryOnJobResponse(
        job_id=job.id,
        status=job.status,
        estimated_time_seconds=15,
        created_at=job.created_at,
        poll_url=f"{settings.API_V1_PREFIX}/tryon/status/{job.id}",
    )


async def process_tryon_background(job_id: str):
    """
    Background task that triggers try-on processing.
    In production, this would publish to a Redis message queue
    for consumption by dedicated worker pods.
    """
    from app.database.connection import async_session_factory

    async with async_session_factory() as db:
        try:
            await tryon_service.process_job(db, UUID(job_id))
            await db.commit()
        except Exception as e:
            await db.rollback()
            # Error is already logged and stored in the job record by tryon_service


@router.get("/status/{job_id}", response_model=TryOnStatusResponse)
async def get_tryon_status(
    job_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Poll the status of a try-on generation job.
    Returns current progress, active step, and result when complete.
    Recommended polling interval: 2 seconds.
    """
    job = await tryon_service.get_job_status(db, job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    # Verify the job belongs to the requesting user
    if str(job.user_id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    # Build step status list based on current progress
    steps = []
    current_found = False
    for step_name in PIPELINE_STEPS:
        if job.current_step == step_name:
            steps.append(TryOnStepStatus(name=step_name, status="in_progress"))
            current_found = True
        elif not current_found and job.status == "completed":
            steps.append(TryOnStepStatus(name=step_name, status="completed"))
        elif not current_found:
            steps.append(TryOnStepStatus(name=step_name, status="completed"))
        else:
            steps.append(TryOnStepStatus(name=step_name, status="pending"))

    # Include result data if job is completed
    result_data = None
    if job.status == "completed" and job.result:
        result_data = {
            "image_url": job.result.result_image_url,
            "thumbnail_url": job.result.thumbnail_url,
            "metadata": {
                "pose_confidence": job.result.pose_confidence,
                "segmentation_quality": job.result.segmentation_quality,
                "overall_quality_score": job.result.overall_quality_score,
            },
        }

    return TryOnStatusResponse(
        job_id=job.id,
        status=job.status,
        progress=job.progress,
        current_step=job.current_step,
        steps=steps,
        result=result_data,
        processing_time_ms=job.processing_time_ms,
        completed_at=job.completed_at,
    )


@router.get("/result/{job_id}", response_model=TryOnResultResponse)
async def get_tryon_result(
    job_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve the final result of a completed try-on job.
    Returns URLs for the result image, original user image, and product image.
    """
    job = await tryon_service.get_job_status(db, job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    if str(job.user_id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    if job.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job is not completed. Current status: {job.status}",
        )

    result = await tryon_service.get_job_result(db, job_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Result not found",
        )

    return TryOnResultResponse(
        job_id=job.id,
        result_url=result.result_image_url,
        thumbnail_url=result.thumbnail_url,
        user_image_url="",  # Populated from UserImage lookup in production
        product_image_url="",  # Populated from ProductImage lookup in production
        quality_score=result.overall_quality_score,
        created_at=result.created_at,
    )


@router.get("/history", response_model=TryOnHistoryResponse)
async def get_tryon_history(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve the authenticated user's try-on generation history.
    Returns paginated results sorted by creation date (newest first).
    """
    history = await tryon_service.get_user_history(
        db=db,
        user_id=user_id,
        page=page,
        per_page=per_page,
    )

    items = [
        TryOnHistoryItem(
            job_id=job.id,
            result_url=job.result.result_image_url if job.result else None,
            product_name=None,  # Populated via product join in production
            quality_score=job.result.overall_quality_score if job.result else None,
            status=job.status,
            created_at=job.created_at,
        )
        for job in history["items"]
    ]

    return TryOnHistoryResponse(
        items=items,
        pagination=history["pagination"],
    )
