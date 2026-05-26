"""
Admin Router - Dashboard analytics, user management, doctor onboarding,
and platform-wide statistics for admin users.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.models.user import User, UserRole
from app.models.doctor import DoctorProfile
from app.models.appointment import Appointment, AppointmentStatus
from app.models.billing import Payment, PaymentStatus
from app.schemas.user import UserResponse
from app.schemas.doctor import DoctorProfileResponse, SpecializationResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


async def verify_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to verify admin role access."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


@router.get("/dashboard")
async def admin_dashboard(
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin dashboard with platform-wide statistics.
    Returns counts and key metrics for users, doctors, appointments, and revenue.
    """
    # Count total users by role
    total_patients = await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.PATIENT)
    )
    total_doctors = await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.DOCTOR)
    )
    total_appointments = await db.execute(select(func.count(Appointment.id)))
    completed_appointments = await db.execute(
        select(func.count(Appointment.id)).where(Appointment.status == AppointmentStatus.COMPLETED)
    )

    # Revenue calculation
    total_revenue_result = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == PaymentStatus.COMPLETED)
    )

    # Monthly revenue (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    monthly_revenue_result = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.status == PaymentStatus.COMPLETED,
            Payment.created_at >= thirty_days_ago,
        )
    )

    # Pending doctor verifications
    pending_doctors = await db.execute(
        select(func.count(DoctorProfile.id)).where(DoctorProfile.is_verified == False)
    )

    # Today's appointments
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    todays_appointments = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.appointment_date >= today_start,
            Appointment.appointment_date < today_end,
        )
    )

    return {
        "total_patients": total_patients.scalar() or 0,
        "total_doctors": total_doctors.scalar() or 0,
        "total_appointments": total_appointments.scalar() or 0,
        "completed_appointments": completed_appointments.scalar() or 0,
        "total_revenue": float(total_revenue_result.scalar() or 0),
        "monthly_revenue": float(monthly_revenue_result.scalar() or 0),
        "pending_doctor_verifications": pending_doctors.scalar() or 0,
        "todays_appointments": todays_appointments.scalar() or 0,
    }


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    role: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all users with optional role and search filters."""
    query = select(User)
    if role:
        query = query.where(User.role == UserRole(role))
    if search:
        query = query.where(
            func.lower(User.full_name).contains(search.lower()) |
            func.lower(User.email).contains(search.lower())
        )
    query = query.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)

    return [
        UserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            phone=u.phone,
            role=u.role.value,
            gender=u.gender.value if u.gender else None,
            avatar_url=u.avatar_url,
            city=u.city,
            state=u.state,
            is_active=u.is_active,
            is_verified=u.is_verified,
            created_at=u.created_at,
        )
        for u in result.scalars().all()
    ]


@router.get("/doctors/pending", response_model=List[DoctorProfileResponse])
async def list_pending_doctors(
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """List doctors pending verification/onboarding approval."""
    result = await db.execute(
        select(DoctorProfile)
        .options(selectinload(DoctorProfile.user), selectinload(DoctorProfile.specializations))
        .where(DoctorProfile.is_verified == False)
    )
    doctors = result.scalars().all()

    return [
        DoctorProfileResponse(
            id=d.id,
            user_id=d.user_id,
            full_name=d.user.full_name if d.user else None,
            email=d.user.email if d.user else None,
            qualification=d.qualification,
            experience_years=d.experience_years,
            license_number=d.license_number,
            bio=d.bio,
            hospital_name=d.hospital_name,
            languages=d.languages,
            consultation_fee=d.consultation_fee,
            follow_up_fee=d.follow_up_fee,
            video_consultation=d.video_consultation,
            chat_consultation=d.chat_consultation,
            in_clinic=d.in_clinic,
            rating=d.rating,
            total_reviews=d.total_reviews,
            total_consultations=d.total_consultations,
            is_verified=d.is_verified,
            is_available=d.is_available,
            specializations=[
                SpecializationResponse(id=s.id, name=s.name, description=s.description, icon=s.icon)
                for s in d.specializations
            ],
        )
        for d in doctors
    ]


@router.post("/doctors/{doctor_id}/verify")
async def verify_doctor(
    doctor_id: int,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Approve/verify a doctor's profile for the platform."""
    result = await db.execute(select(DoctorProfile).where(DoctorProfile.id == doctor_id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    doctor.is_verified = True
    doctor.verified_at = datetime.now(timezone.utc)

    return {"message": f"Doctor {doctor_id} verified successfully"}


@router.post("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: int,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Activate or deactivate a user account."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_active = not user.is_active
    return {"message": f"User {'activated' if user.is_active else 'deactivated'} successfully", "is_active": user.is_active}


@router.get("/analytics")
async def get_analytics(
    days: int = Query(30, ge=1, le=365),
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Platform analytics for the specified time period.
    Returns appointment trends, revenue data, and growth metrics.
    """
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Appointments in period
    appointments_count = await db.execute(
        select(func.count(Appointment.id)).where(Appointment.created_at >= start_date)
    )

    # New users in period
    new_users = await db.execute(
        select(func.count(User.id)).where(User.created_at >= start_date)
    )

    # Revenue in period
    revenue = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.status == PaymentStatus.COMPLETED,
            Payment.created_at >= start_date,
        )
    )

    # Top specializations by appointments
    top_specs_query = (
        select(
            func.count(Appointment.id).label("count"),
        )
        .where(Appointment.created_at >= start_date)
        .group_by(Appointment.doctor_id)
        .order_by(func.count(Appointment.id).desc())
        .limit(5)
    )

    return {
        "period_days": days,
        "appointments": appointments_count.scalar() or 0,
        "new_users": new_users.scalar() or 0,
        "revenue": float(revenue.scalar() or 0),
        "average_daily_appointments": round((appointments_count.scalar() or 0) / days, 1),
    }
