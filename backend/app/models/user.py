"""
User Model - Core authentication and identity model.
Supports role-based access control for Patient, Doctor, and Admin roles.
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Enum as SQLEnum, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from app.database import Base


class UserRole(str, enum.Enum):
    """User roles for RBAC - Patient, Doctor, or Admin."""
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"


class Gender(str, enum.Enum):
    """Gender options for user profile."""
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class User(Base):
    """
    Core User model - stores authentication and profile info.
    All platform users (patients, doctors, admins) share this table.
    Role-specific data is stored in related tables (e.g., DoctorProfile).
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.PATIENT, nullable=False)
    gender = Column(SQLEnum(Gender), nullable=True)
    date_of_birth = Column(DateTime, nullable=True)
    avatar_url = Column(String(512), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(10), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Account status fields
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_online = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)

    # Relationships
    doctor_profile = relationship("DoctorProfile", back_populates="user", uselist=False)
    appointments_as_patient = relationship("Appointment", back_populates="patient", foreign_keys="Appointment.patient_id")
    health_records = relationship("HealthRecord", back_populates="patient")
    notifications = relationship("Notification", back_populates="user")
    ai_interactions = relationship("AIInteraction", back_populates="user")
    payments = relationship("Payment", back_populates="patient", foreign_keys="Payment.patient_id")
