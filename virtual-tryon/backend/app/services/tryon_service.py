"""
Virtual Try-On orchestration service.
Manages the try-on job lifecycle: creation, status tracking, and result retrieval.
Communicates with the AI Model Service via HTTP for inference operations.
"""

import json
import time
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

import httpx
import structlog
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.database.models import TryOnJob, TryOnResult, UserImage

logger = structlog.get_logger(__name__)


class TryOnService:
    """
    Orchestrates the virtual try-on generation pipeline.
    Creates jobs, delegates processing to the AI service, and manages results.
    """

    def __init__(self):
        """Initialize with AI service URL and HTTP client timeout."""
        self.ai_service_url = settings.AI_SERVICE_URL
        self.timeout = settings.AI_SERVICE_TIMEOUT

    async def create_job(
        self,
        db: AsyncSession,
        user_id: UUID,
        user_image_id: UUID,
        product_image_id: UUID,
        product_id: Optional[UUID] = None,
        options: Optional[dict] = None,
    ) -> TryOnJob:
        """
        Create a new try-on generation job in the database.
        The job starts in 'queued' status and will be picked up
        by the processing pipeline.
        """
        job = TryOnJob(
            user_id=user_id,
            user_image_id=user_image_id,
            product_image_id=product_image_id,
            product_id=product_id,
            status="queued",
            progress=0,
            options=options or {},
        )
        db.add(job)
        await db.flush()
        await db.refresh(job)

        logger.info("tryon_job_created", job_id=str(job.id), user_id=str(user_id))
        return job

    async def process_job(self, db: AsyncSession, job_id: UUID) -> TryOnJob:
        """
        Process a try-on job by calling the AI Model Service.
        Updates job status and progress at each pipeline stage.
        On completion, stores the result image metadata.
        """
        # Fetch the job record
        result = await db.execute(select(TryOnJob).where(TryOnJob.id == job_id))
        job = result.scalar_one_or_none()
        if not job:
            raise ValueError(f"Job {job_id} not found")

        # Mark job as processing
        job.status = "processing"
        job.started_at = datetime.now(timezone.utc)
        await db.flush()

        start_time = time.time()

        try:
            # Fetch user image path for the AI service
            img_result = await db.execute(
                select(UserImage).where(UserImage.id == job.user_image_id)
            )
            user_image = img_result.scalar_one_or_none()
            if not user_image:
                raise ValueError("User image not found")

            # Call the AI service inference endpoint
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Step 1: Pose estimation
                job.current_step = "pose_estimation"
                job.progress = 10
                await db.flush()

                response = await client.post(
                    f"{self.ai_service_url}/api/v1/inference/process",
                    json={
                        "job_id": str(job_id),
                        "user_image_path": user_image.storage_path,
                        "product_image_id": str(job.product_image_id),
                        "options": job.options,
                    },
                )
                response.raise_for_status()
                ai_result = response.json()

            # Calculate total processing time
            processing_time_ms = int((time.time() - start_time) * 1000)

            # Update job as completed
            job.status = "completed"
            job.progress = 100
            job.current_step = None
            job.processing_time_ms = processing_time_ms
            job.completed_at = datetime.now(timezone.utc)

            # Store the result
            tryon_result = TryOnResult(
                job_id=job.id,
                result_image_url=ai_result.get("result_image_url", ""),
                thumbnail_url=ai_result.get("thumbnail_url", ""),
                storage_path=ai_result.get("storage_path", ""),
                pose_confidence=ai_result.get("pose_confidence"),
                segmentation_quality=ai_result.get("segmentation_quality"),
                overall_quality_score=ai_result.get("overall_quality_score"),
                metadata_json=ai_result.get("metadata", {}),
            )
            db.add(tryon_result)
            await db.flush()

            logger.info(
                "tryon_job_completed",
                job_id=str(job_id),
                processing_time_ms=processing_time_ms,
                quality_score=ai_result.get("overall_quality_score"),
            )

        except Exception as e:
            # Mark job as failed with error details
            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = datetime.now(timezone.utc)
            logger.error("tryon_job_failed", job_id=str(job_id), error=str(e))

        await db.flush()
        return job

    async def get_job_status(self, db: AsyncSession, job_id: UUID) -> Optional[TryOnJob]:
        """Retrieve the current status of a try-on job with eager-loaded result."""
        result = await db.execute(
            select(TryOnJob)
            .where(TryOnJob.id == job_id)
            .options(selectinload(TryOnJob.result))
        )
        return result.scalar_one_or_none()

    async def get_job_result(self, db: AsyncSession, job_id: UUID) -> Optional[TryOnResult]:
        """Retrieve the result of a completed try-on job."""
        result = await db.execute(
            select(TryOnResult).where(TryOnResult.job_id == job_id)
        )
        return result.scalar_one_or_none()

    async def get_user_history(
        self,
        db: AsyncSession,
        user_id: UUID,
        page: int = 1,
        per_page: int = 20,
    ) -> dict:
        """
        Retrieve paginated try-on history for a user.
        Returns jobs sorted by creation date (newest first).
        """
        # Count total items
        count_query = select(TryOnJob).where(TryOnJob.user_id == user_id)
        count_result = await db.execute(count_query)
        total_items = len(count_result.scalars().all())

        # Fetch paginated results with eager-loaded result relationship
        offset = (page - 1) * per_page
        query = (
            select(TryOnJob)
            .where(TryOnJob.user_id == user_id)
            .options(selectinload(TryOnJob.result))
            .order_by(TryOnJob.created_at.desc())
            .offset(offset)
            .limit(per_page)
        )
        result = await db.execute(query)
        jobs = result.scalars().all()

        return {
            "items": jobs,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_items": total_items,
                "total_pages": (total_items + per_page - 1) // per_page,
            },
        }


# Singleton try-on service instance
tryon_service = TryOnService()
