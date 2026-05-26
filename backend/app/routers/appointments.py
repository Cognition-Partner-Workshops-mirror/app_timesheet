"""
Appointment Router - Handles booking, scheduling, and appointment management.
Supports patient booking and doctor appointment management workflows.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models.user import User, UserRole
from app.models.appointment import Appointment, AppointmentStatus, ConsultationType
from app.models.doctor import DoctorProfile
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    data: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Book a new appointment with a doctor.
    Patient role required. Sets fee from doctor's profile.
    """
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only patients can book appointments")

    # Verify doctor exists and is available
    result = await db.execute(
        select(DoctorProfile).options(selectinload(DoctorProfile.user))
        .where(DoctorProfile.id == data.doctor_id)
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    if not doctor.is_available:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor is not available")

    # Create appointment
    appointment = Appointment(
        patient_id=current_user.id,
        doctor_id=data.doctor_id,
        appointment_date=data.appointment_date,
        slot_time=data.slot_time,
        consultation_type=ConsultationType(data.consultation_type),
        reason=data.reason,
        symptoms=data.symptoms,
        fee=doctor.consultation_fee,
        status=AppointmentStatus.PENDING,
    )
    db.add(appointment)
    await db.flush()

    return AppointmentResponse(
        id=appointment.id,
        patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id,
        patient_name=current_user.full_name,
        doctor_name=doctor.user.full_name if doctor.user else None,
        appointment_date=appointment.appointment_date,
        slot_time=appointment.slot_time,
        duration=appointment.duration,
        consultation_type=appointment.consultation_type.value,
        status=appointment.status.value,
        reason=appointment.reason,
        symptoms=appointment.symptoms,
        fee=appointment.fee,
        created_at=appointment.created_at,
    )


@router.get("/my", response_model=List[AppointmentResponse])
async def get_my_appointments(
    status_filter: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get appointments for the current user.
    Returns patient's bookings or doctor's appointments based on role.
    """
    if current_user.role == UserRole.PATIENT:
        query = select(Appointment).where(Appointment.patient_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        # Get doctor profile first
        result = await db.execute(
            select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
        )
        doc_profile = result.scalar_one_or_none()
        if not doc_profile:
            return []
        query = select(Appointment).where(Appointment.doctor_id == doc_profile.id)
    else:
        # Admin sees all appointments
        query = select(Appointment)

    if status_filter:
        query = query.where(Appointment.status == AppointmentStatus(status_filter))

    query = query.order_by(Appointment.appointment_date.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    appointments = result.scalars().all()

    # Build response with related names
    response = []
    for apt in appointments:
        # Fetch patient and doctor names
        patient_result = await db.execute(select(User).where(User.id == apt.patient_id))
        patient = patient_result.scalar_one_or_none()
        doctor_result = await db.execute(
            select(DoctorProfile).options(selectinload(DoctorProfile.user), selectinload(DoctorProfile.specializations))
            .where(DoctorProfile.id == apt.doctor_id)
        )
        doctor = doctor_result.scalar_one_or_none()

        response.append(AppointmentResponse(
            id=apt.id,
            patient_id=apt.patient_id,
            doctor_id=apt.doctor_id,
            patient_name=patient.full_name if patient else None,
            doctor_name=doctor.user.full_name if doctor and doctor.user else None,
            doctor_specialization=doctor.specializations[0].name if doctor and doctor.specializations else None,
            appointment_date=apt.appointment_date,
            slot_time=apt.slot_time,
            duration=apt.duration,
            consultation_type=apt.consultation_type.value,
            status=apt.status.value,
            reason=apt.reason,
            symptoms=apt.symptoms,
            fee=apt.fee,
            doctor_notes=apt.doctor_notes,
            follow_up_date=apt.follow_up_date,
            created_at=apt.created_at,
        ))

    return response


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed appointment information by ID."""
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    apt = result.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    # Fetch related data
    patient_result = await db.execute(select(User).where(User.id == apt.patient_id))
    patient = patient_result.scalar_one_or_none()
    doctor_result = await db.execute(
        select(DoctorProfile).options(selectinload(DoctorProfile.user), selectinload(DoctorProfile.specializations))
        .where(DoctorProfile.id == apt.doctor_id)
    )
    doctor = doctor_result.scalar_one_or_none()

    return AppointmentResponse(
        id=apt.id,
        patient_id=apt.patient_id,
        doctor_id=apt.doctor_id,
        patient_name=patient.full_name if patient else None,
        doctor_name=doctor.user.full_name if doctor and doctor.user else None,
        doctor_specialization=doctor.specializations[0].name if doctor and doctor.specializations else None,
        appointment_date=apt.appointment_date,
        slot_time=apt.slot_time,
        duration=apt.duration,
        consultation_type=apt.consultation_type.value,
        status=apt.status.value,
        reason=apt.reason,
        symptoms=apt.symptoms,
        fee=apt.fee,
        doctor_notes=apt.doctor_notes,
        follow_up_date=apt.follow_up_date,
        created_at=apt.created_at,
    )


@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: int,
    data: AppointmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update appointment status or details (e.g., confirm, cancel, add notes)."""
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    apt = result.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    # Update fields
    if data.status:
        apt.status = AppointmentStatus(data.status)
    if data.doctor_notes:
        apt.doctor_notes = data.doctor_notes
    if data.follow_up_date:
        apt.follow_up_date = data.follow_up_date
    if data.cancelled_reason:
        apt.cancelled_reason = data.cancelled_reason

    apt.updated_at = datetime.now(timezone.utc)

    # Return updated appointment
    patient_result = await db.execute(select(User).where(User.id == apt.patient_id))
    patient = patient_result.scalar_one_or_none()
    doctor_result = await db.execute(
        select(DoctorProfile).options(selectinload(DoctorProfile.user))
        .where(DoctorProfile.id == apt.doctor_id)
    )
    doctor = doctor_result.scalar_one_or_none()

    return AppointmentResponse(
        id=apt.id,
        patient_id=apt.patient_id,
        doctor_id=apt.doctor_id,
        patient_name=patient.full_name if patient else None,
        doctor_name=doctor.user.full_name if doctor and doctor.user else None,
        appointment_date=apt.appointment_date,
        slot_time=apt.slot_time,
        duration=apt.duration,
        consultation_type=apt.consultation_type.value,
        status=apt.status.value,
        reason=apt.reason,
        symptoms=apt.symptoms,
        fee=apt.fee,
        doctor_notes=apt.doctor_notes,
        follow_up_date=apt.follow_up_date,
        created_at=apt.created_at,
    )


@router.post("/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: int,
    reason: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel an appointment with optional reason."""
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    apt = result.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    apt.status = AppointmentStatus.CANCELLED
    apt.cancelled_reason = reason
    apt.updated_at = datetime.now(timezone.utc)

    return {"message": "Appointment cancelled successfully"}
