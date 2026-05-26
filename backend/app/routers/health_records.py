"""
Health Records Router - Manages patient medical records, vitals tracking,
and file uploads for lab reports, scans, and prescriptions.
Supports AWS S3 / MinIO file storage with local fallback.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models.user import User, UserRole
from app.models.health_record import HealthRecord, RecordType
from app.schemas.health_record import HealthRecordCreate, HealthRecordResponse, VitalsUpdate
from app.utils.auth import get_current_user
from app.services.storage_service import storage_service
from app.config import settings

router = APIRouter(prefix="/health-records", tags=["Health Records"])


@router.post("/", response_model=HealthRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_health_record(
    data: HealthRecordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new health record entry.
    Supports lab reports, vitals, scans, and other medical documents.
    Auto-calculates BMI when weight and height are provided.
    """
    # Auto-calculate BMI if weight and height are provided
    bmi = None
    if data.weight and data.height and data.height > 0:
        height_m = data.height / 100  # Convert cm to meters
        bmi = round(data.weight / (height_m ** 2), 1)

    record = HealthRecord(
        patient_id=current_user.id,
        record_type=RecordType(data.record_type),
        title=data.title,
        description=data.description,
        file_url=data.file_url,
        file_name=data.file_name,
        file_type=data.file_type,
        blood_pressure_systolic=data.blood_pressure_systolic,
        blood_pressure_diastolic=data.blood_pressure_diastolic,
        heart_rate=data.heart_rate,
        temperature=data.temperature,
        weight=data.weight,
        height=data.height,
        blood_sugar=data.blood_sugar,
        oxygen_level=data.oxygen_level,
        bmi=bmi,
        record_date=data.record_date or datetime.now(timezone.utc),
    )
    db.add(record)
    await db.flush()

    return HealthRecordResponse.model_validate(record)


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_health_record_file(
    file: UploadFile = File(...),
    record_type: str = "other",
    title: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a file (lab report, scan, prescription PDF) to S3 or local storage.
    Creates a health record entry linked to the uploaded file.
    Supports images (JPEG, PNG), PDFs, and common medical file formats.
    """
    # Validate file size
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE // (1024*1024)}MB",
        )

    # Determine S3 folder based on record type
    folder = f"health-records/{current_user.id}"

    # Upload file to S3 or local storage
    upload_result = await storage_service.upload_file(
        file_content=content,
        filename=file.filename or "upload",
        content_type=file.content_type or "application/octet-stream",
        folder=folder,
    )

    # Create the health record entry linked to the uploaded file
    record = HealthRecord(
        patient_id=current_user.id,
        record_type=RecordType(record_type),
        title=title or file.filename or "Uploaded Record",
        file_url=upload_result["file_url"],
        file_name=file.filename,
        file_type=file.content_type,
    )
    db.add(record)
    await db.flush()

    return {
        "record_id": record.id,
        "file_url": upload_result["file_url"],
        "storage_type": upload_result["storage_type"],
        "message": "File uploaded successfully",
    }


@router.get("/", response_model=List[HealthRecordResponse])
async def get_health_records(
    record_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all health records for the current patient, with optional type filter."""
    query = select(HealthRecord).where(HealthRecord.patient_id == current_user.id)

    if record_type:
        query = query.where(HealthRecord.record_type == RecordType(record_type))

    query = query.order_by(HealthRecord.record_date.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)

    return [HealthRecordResponse.model_validate(r) for r in result.scalars().all()]


@router.get("/vitals/latest", response_model=HealthRecordResponse)
async def get_latest_vitals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the most recent vitals record for the current patient."""
    result = await db.execute(
        select(HealthRecord)
        .where(
            HealthRecord.patient_id == current_user.id,
            HealthRecord.record_type == RecordType.VITALS,
        )
        .order_by(HealthRecord.record_date.desc())
        .limit(1)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No vitals records found")
    return HealthRecordResponse.model_validate(record)


@router.post("/vitals", response_model=HealthRecordResponse, status_code=status.HTTP_201_CREATED)
async def quick_vitals_update(
    data: VitalsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Quick vitals entry for the health tracking dashboard.
    Creates a vitals-type health record with the provided measurements.
    """
    bmi = None
    if data.weight and data.height and data.height > 0:
        height_m = data.height / 100
        bmi = round(data.weight / (height_m ** 2), 1)

    record = HealthRecord(
        patient_id=current_user.id,
        record_type=RecordType.VITALS,
        title="Vitals Check",
        blood_pressure_systolic=data.blood_pressure_systolic,
        blood_pressure_diastolic=data.blood_pressure_diastolic,
        heart_rate=data.heart_rate,
        temperature=data.temperature,
        weight=data.weight,
        height=data.height,
        blood_sugar=data.blood_sugar,
        oxygen_level=data.oxygen_level,
        bmi=bmi,
    )
    db.add(record)
    await db.flush()

    return HealthRecordResponse.model_validate(record)


@router.get("/file/{record_id}/download")
async def get_file_download_url(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a secure presigned download URL for a health record file.
    Uses S3 presigned URLs for secure, time-limited access (1 hour).
    Falls back to the direct file URL for local storage.
    """
    result = await db.execute(
        select(HealthRecord).where(
            HealthRecord.id == record_id,
            HealthRecord.patient_id == current_user.id,
        )
    )
    record = result.scalar_one_or_none()
    if not record or not record.file_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    # Generate presigned URL if using S3 storage
    if storage_service.is_s3_enabled and record.file_url.startswith("http"):
        # Extract S3 key from the full URL
        s3_key = record.file_url.split(f"{settings.S3_BUCKET_NAME}/")[-1]
        presigned_url = await storage_service.get_presigned_url(s3_key)
        if presigned_url:
            return {"download_url": presigned_url, "expires_in": 3600}

    # Return direct URL for local storage
    return {"download_url": record.file_url, "expires_in": None}


@router.get("/{record_id}", response_model=HealthRecordResponse)
async def get_health_record(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific health record by ID."""
    result = await db.execute(
        select(HealthRecord).where(
            HealthRecord.id == record_id,
            HealthRecord.patient_id == current_user.id,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    return HealthRecordResponse.model_validate(record)


@router.delete("/{record_id}")
async def delete_health_record(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a health record by ID (only record owner can delete).
    Also removes the associated file from S3/local storage.
    """
    result = await db.execute(
        select(HealthRecord).where(
            HealthRecord.id == record_id,
            HealthRecord.patient_id == current_user.id,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")

    # Delete associated file from storage if exists
    if record.file_url:
        storage_type = "s3" if record.file_url.startswith("http") else "local"
        file_key = record.file_url
        if storage_type == "s3":
            file_key = record.file_url.split(f"{settings.S3_BUCKET_NAME}/")[-1]
        await storage_service.delete_file(file_key, storage_type)

    await db.delete(record)
    return {"message": "Record deleted successfully"}
