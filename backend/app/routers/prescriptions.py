"""
Prescription Router - Manages digital prescriptions created by doctors.
Supports creating, viewing, and listing prescriptions with itemized medications.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.models.user import User, UserRole
from app.models.doctor import DoctorProfile
from app.models.prescription import Prescription, PrescriptionItem
from app.schemas.prescription import PrescriptionCreate, PrescriptionResponse, PrescriptionItemResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])


@router.post("/", response_model=PrescriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_prescription(
    data: PrescriptionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new digital prescription (doctor role required).
    Includes diagnosis, medications list, and follow-up instructions.
    """
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only doctors can create prescriptions")

    # Get doctor profile
    result = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == current_user.id))
    doc_profile = result.scalar_one_or_none()
    if not doc_profile:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor profile not found")

    # Create prescription
    prescription = Prescription(
        appointment_id=data.appointment_id,
        doctor_id=doc_profile.id,
        patient_id=data.patient_id,
        diagnosis=data.diagnosis,
        clinical_notes=data.clinical_notes,
        advice=data.advice,
        follow_up_days=data.follow_up_days,
        follow_up_notes=data.follow_up_notes,
    )
    db.add(prescription)
    await db.flush()

    # Add prescription items (medications)
    for item_data in data.items:
        item = PrescriptionItem(
            prescription_id=prescription.id,
            medicine_name=item_data.medicine_name,
            dosage=item_data.dosage,
            frequency=item_data.frequency,
            duration=item_data.duration,
            timing=item_data.timing,
            instructions=item_data.instructions,
        )
        db.add(item)

    await db.flush()

    # Reload with items
    result = await db.execute(
        select(Prescription)
        .options(selectinload(Prescription.items))
        .where(Prescription.id == prescription.id)
    )
    prescription = result.scalar_one()

    return PrescriptionResponse(
        id=prescription.id,
        appointment_id=prescription.appointment_id,
        doctor_id=prescription.doctor_id,
        patient_id=prescription.patient_id,
        diagnosis=prescription.diagnosis,
        clinical_notes=prescription.clinical_notes,
        advice=prescription.advice,
        follow_up_days=prescription.follow_up_days,
        follow_up_notes=prescription.follow_up_notes,
        is_active=prescription.is_active,
        items=[PrescriptionItemResponse.model_validate(i) for i in prescription.items],
        created_at=prescription.created_at,
    )


@router.get("/my", response_model=List[PrescriptionResponse])
async def get_my_prescriptions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get prescriptions for the current user.
    Patients see their prescriptions, doctors see prescriptions they created.
    """
    if current_user.role == UserRole.PATIENT:
        query = select(Prescription).where(Prescription.patient_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        result = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == current_user.id))
        doc = result.scalar_one_or_none()
        if not doc:
            return []
        query = select(Prescription).where(Prescription.doctor_id == doc.id)
    else:
        query = select(Prescription)

    query = (
        query.options(selectinload(Prescription.items))
        .order_by(Prescription.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await db.execute(query)
    prescriptions = result.scalars().all()

    return [
        PrescriptionResponse(
            id=p.id,
            appointment_id=p.appointment_id,
            doctor_id=p.doctor_id,
            patient_id=p.patient_id,
            diagnosis=p.diagnosis,
            clinical_notes=p.clinical_notes,
            advice=p.advice,
            follow_up_days=p.follow_up_days,
            follow_up_notes=p.follow_up_notes,
            is_active=p.is_active,
            items=[PrescriptionItemResponse.model_validate(i) for i in p.items],
            created_at=p.created_at,
        )
        for p in prescriptions
    ]


@router.get("/{prescription_id}", response_model=PrescriptionResponse)
async def get_prescription(
    prescription_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed prescription by ID."""
    result = await db.execute(
        select(Prescription)
        .options(selectinload(Prescription.items))
        .where(Prescription.id == prescription_id)
    )
    prescription = result.scalar_one_or_none()
    if not prescription:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prescription not found")

    return PrescriptionResponse(
        id=prescription.id,
        appointment_id=prescription.appointment_id,
        doctor_id=prescription.doctor_id,
        patient_id=prescription.patient_id,
        diagnosis=prescription.diagnosis,
        clinical_notes=prescription.clinical_notes,
        advice=prescription.advice,
        follow_up_days=prescription.follow_up_days,
        follow_up_notes=prescription.follow_up_notes,
        is_active=prescription.is_active,
        items=[PrescriptionItemResponse.model_validate(i) for i in prescription.items],
        created_at=prescription.created_at,
    )
