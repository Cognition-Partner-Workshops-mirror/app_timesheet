"""
Doctor-specific Models - Profile, Schedule, and Specialization.
Extended doctor information linked to the User model.
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Float, Text, ForeignKey, Table
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base

# Many-to-many relationship between doctors and specializations
doctor_specializations = Table(
    "doctor_specializations",
    Base.metadata,
    Column("doctor_id", Integer, ForeignKey("doctor_profiles.id"), primary_key=True),
    Column("specialization_id", Integer, ForeignKey("specializations.id"), primary_key=True),
)


class Specialization(Base):
    """Medical specializations (e.g., Cardiology, Dermatology, General Medicine)."""
    __tablename__ = "specializations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(100), nullable=True)  # Icon name/path for UI display

    # Relationship to doctors
    doctors = relationship("DoctorProfile", secondary=doctor_specializations, back_populates="specializations")


class DoctorProfile(Base):
    """
    Extended profile for doctor users.
    Contains professional info, fees, ratings, and verification status.
    """
    __tablename__ = "doctor_profiles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Professional details
    license_number = Column(String(100), nullable=True)
    qualification = Column(String(500), nullable=False)
    experience_years = Column(Integer, default=0)
    bio = Column(Text, nullable=True)
    hospital_name = Column(String(255), nullable=True)
    hospital_address = Column(Text, nullable=True)
    languages = Column(String(500), nullable=True)  # Comma-separated language list

    # Consultation settings
    consultation_fee = Column(Float, default=500.0)  # Default fee in INR
    follow_up_fee = Column(Float, default=200.0)
    video_consultation = Column(Boolean, default=True)
    chat_consultation = Column(Boolean, default=True)
    in_clinic = Column(Boolean, default=True)

    # Ratings and reviews
    rating = Column(Float, default=0.0)
    total_reviews = Column(Integer, default=0)
    total_consultations = Column(Integer, default=0)

    # Verification and status
    is_verified = Column(Boolean, default=False)
    is_available = Column(Boolean, default=True)
    verified_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="doctor_profile")
    specializations = relationship("Specialization", secondary=doctor_specializations, back_populates="doctors")
    schedules = relationship("DoctorSchedule", back_populates="doctor")
    appointments = relationship("Appointment", back_populates="doctor")
    prescriptions = relationship("Prescription", back_populates="doctor")


class DoctorSchedule(Base):
    """
    Doctor availability schedule - defines time slots for each day.
    Used for appointment booking calendar.
    """
    __tablename__ = "doctor_schedules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = Column(String(5), nullable=False)  # HH:MM format
    end_time = Column(String(5), nullable=False)
    slot_duration = Column(Integer, default=30)  # Duration in minutes per slot
    is_active = Column(Boolean, default=True)

    # Relationship
    doctor = relationship("DoctorProfile", back_populates="schedules")
