"""
Doctor Router - Handles doctor profiles, search, schedules, and availability.
Supports both patient-facing search and doctor self-management endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.database import get_db
from app.models.user import User, UserRole
from app.models.doctor import DoctorProfile, Specialization, DoctorSchedule
from app.schemas.doctor import (
    DoctorProfileCreate,
    DoctorProfileUpdate,
    DoctorProfileResponse,
    DoctorScheduleCreate,
    DoctorScheduleResponse,
    SpecializationResponse,
)
from app.utils.auth import get_current_user

router = APIRouter(prefix="/doctors", tags=["Doctors"])


@router.get("/specializations", response_model=List[SpecializationResponse])
async def list_specializations(db: AsyncSession = Depends(get_db)):
    """Get all available medical specializations."""
    result = await db.execute(select(Specialization).order_by(Specialization.name))
    return result.scalars().all()


@router.get("/search", response_model=List[DoctorProfileResponse])
async def search_doctors(
    specialization: Optional[str] = None,
    city: Optional[str] = None,
    name: Optional[str] = None,
    min_rating: Optional[float] = None,
    max_fee: Optional[float] = None,
    video_available: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Search and filter doctors based on various criteria.
    Supports filtering by specialization, city, rating, fee, and name.
    """
    query = (
        select(DoctorProfile)
        .options(selectinload(DoctorProfile.specializations), selectinload(DoctorProfile.user))
        .where(DoctorProfile.is_verified == True, DoctorProfile.is_available == True)
    )

    # Apply search filters
    if specialization:
        query = query.join(DoctorProfile.specializations).where(
            func.lower(Specialization.name).contains(specialization.lower())
        )
    if city:
        query = query.join(DoctorProfile.user).where(func.lower(User.city).contains(city.lower()))
    if name:
        query = query.join(DoctorProfile.user, isouter=True).where(
            func.lower(User.full_name).contains(name.lower())
        )
    if min_rating:
        query = query.where(DoctorProfile.rating >= min_rating)
    if max_fee:
        query = query.where(DoctorProfile.consultation_fee <= max_fee)
    if video_available:
        query = query.where(DoctorProfile.video_consultation == True)

    # Pagination
    query = query.offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    doctors = result.scalars().unique().all()

    # Build response with user details merged in
    response = []
    for doc in doctors:
        response.append(DoctorProfileResponse(
            id=doc.id,
            user_id=doc.user_id,
            full_name=doc.user.full_name if doc.user else None,
            email=doc.user.email if doc.user else None,
            avatar_url=doc.user.avatar_url if doc.user else None,
            qualification=doc.qualification,
            experience_years=doc.experience_years,
            license_number=doc.license_number,
            bio=doc.bio,
            hospital_name=doc.hospital_name,
            languages=doc.languages,
            consultation_fee=doc.consultation_fee,
            follow_up_fee=doc.follow_up_fee,
            video_consultation=doc.video_consultation,
            chat_consultation=doc.chat_consultation,
            in_clinic=doc.in_clinic,
            rating=doc.rating,
            total_reviews=doc.total_reviews,
            total_consultations=doc.total_consultations,
            is_verified=doc.is_verified,
            is_available=doc.is_available,
            specializations=[
                SpecializationResponse(id=s.id, name=s.name, description=s.description, icon=s.icon)
                for s in doc.specializations
            ],
        ))

    return response


@router.get("/{doctor_id}", response_model=DoctorProfileResponse)
async def get_doctor(doctor_id: int, db: AsyncSession = Depends(get_db)):
    """Get detailed doctor profile by ID."""
    result = await db.execute(
        select(DoctorProfile)
        .options(selectinload(DoctorProfile.specializations), selectinload(DoctorProfile.user))
        .where(DoctorProfile.id == doctor_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    return DoctorProfileResponse(
        id=doc.id,
        user_id=doc.user_id,
        full_name=doc.user.full_name if doc.user else None,
        email=doc.user.email if doc.user else None,
        avatar_url=doc.user.avatar_url if doc.user else None,
        qualification=doc.qualification,
        experience_years=doc.experience_years,
        license_number=doc.license_number,
        bio=doc.bio,
        hospital_name=doc.hospital_name,
        languages=doc.languages,
        consultation_fee=doc.consultation_fee,
        follow_up_fee=doc.follow_up_fee,
        video_consultation=doc.video_consultation,
        chat_consultation=doc.chat_consultation,
        in_clinic=doc.in_clinic,
        rating=doc.rating,
        total_reviews=doc.total_reviews,
        total_consultations=doc.total_consultations,
        is_verified=doc.is_verified,
        is_available=doc.is_available,
        specializations=[
            SpecializationResponse(id=s.id, name=s.name, description=s.description, icon=s.icon)
            for s in doc.specializations
        ],
    )


@router.post("/profile", response_model=DoctorProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_doctor_profile(
    profile_data: DoctorProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a doctor profile for the current user (doctor role required)."""
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only doctors can create profiles")

    # Check if profile already exists
    result = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == current_user.id))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Profile already exists")

    # Create profile
    profile = DoctorProfile(
        user_id=current_user.id,
        qualification=profile_data.qualification,
        experience_years=profile_data.experience_years,
        license_number=profile_data.license_number,
        bio=profile_data.bio,
        hospital_name=profile_data.hospital_name,
        hospital_address=profile_data.hospital_address,
        languages=profile_data.languages,
        consultation_fee=profile_data.consultation_fee,
        follow_up_fee=profile_data.follow_up_fee,
        video_consultation=profile_data.video_consultation,
        chat_consultation=profile_data.chat_consultation,
        in_clinic=profile_data.in_clinic,
    )
    db.add(profile)
    await db.flush()

    # Link specializations
    if profile_data.specialization_ids:
        result = await db.execute(
            select(Specialization).where(Specialization.id.in_(profile_data.specialization_ids))
        )
        specs = result.scalars().all()
        profile.specializations = list(specs)

    return DoctorProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        full_name=current_user.full_name,
        email=current_user.email,
        avatar_url=current_user.avatar_url,
        qualification=profile.qualification,
        experience_years=profile.experience_years,
        license_number=profile.license_number,
        bio=profile.bio,
        hospital_name=profile.hospital_name,
        languages=profile.languages,
        consultation_fee=profile.consultation_fee,
        follow_up_fee=profile.follow_up_fee,
        video_consultation=profile.video_consultation,
        chat_consultation=profile.chat_consultation,
        in_clinic=profile.in_clinic,
        rating=profile.rating,
        total_reviews=profile.total_reviews,
        total_consultations=profile.total_consultations,
        is_verified=profile.is_verified,
        is_available=profile.is_available,
        specializations=[
            SpecializationResponse(id=s.id, name=s.name, description=s.description, icon=s.icon)
            for s in profile.specializations
        ],
    )


@router.get("/{doctor_id}/schedule", response_model=List[DoctorScheduleResponse])
async def get_doctor_schedule(doctor_id: int, db: AsyncSession = Depends(get_db)):
    """Get a doctor's weekly availability schedule."""
    result = await db.execute(
        select(DoctorSchedule)
        .where(DoctorSchedule.doctor_id == doctor_id, DoctorSchedule.is_active == True)
        .order_by(DoctorSchedule.day_of_week, DoctorSchedule.start_time)
    )
    return result.scalars().all()


@router.post("/{doctor_id}/schedule", response_model=DoctorScheduleResponse, status_code=status.HTTP_201_CREATED)
async def add_schedule(
    doctor_id: int,
    schedule_data: DoctorScheduleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a new schedule slot for a doctor (doctor role required)."""
    # Verify the doctor profile belongs to current user
    result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.id == doctor_id, DoctorProfile.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    schedule = DoctorSchedule(
        doctor_id=doctor_id,
        day_of_week=schedule_data.day_of_week,
        start_time=schedule_data.start_time,
        end_time=schedule_data.end_time,
        slot_duration=schedule_data.slot_duration,
    )
    db.add(schedule)
    await db.flush()
    return schedule
