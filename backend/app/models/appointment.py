"""
Appointment Model - Manages booking between patients and doctors.
Supports multiple consultation types and status tracking.
"""

from sqlalchemy import Column, String, Integer, DateTime, Enum as SQLEnum, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from app.database import Base


class AppointmentStatus(str, enum.Enum):
    """Appointment lifecycle states."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class ConsultationType(str, enum.Enum):
    """Type of consultation for the appointment."""
    VIDEO = "video"
    CHAT = "chat"
    IN_CLINIC = "in_clinic"


class Appointment(Base):
    """
    Appointment model - core entity linking patients and doctors.
    Tracks booking details, status, and consultation type.
    """
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id"), nullable=False)

    # Appointment details
    appointment_date = Column(DateTime, nullable=False)
    slot_time = Column(String(5), nullable=False)  # HH:MM format
    duration = Column(Integer, default=30)  # Duration in minutes
    consultation_type = Column(SQLEnum(ConsultationType), default=ConsultationType.VIDEO)
    status = Column(SQLEnum(AppointmentStatus), default=AppointmentStatus.PENDING)

    # Patient-provided info (symptoms, reason for visit)
    reason = Column(Text, nullable=True)
    symptoms = Column(Text, nullable=True)  # Comma-separated symptoms or JSON

    # Fee and payment reference
    fee = Column(Float, nullable=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True)

    # Notes and follow-up
    doctor_notes = Column(Text, nullable=True)
    follow_up_date = Column(DateTime, nullable=True)
    cancelled_reason = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    patient = relationship("User", back_populates="appointments_as_patient", foreign_keys=[patient_id])
    doctor = relationship("DoctorProfile", back_populates="appointments")
    consultation = relationship("Consultation", back_populates="appointment", uselist=False)
    prescription = relationship("Prescription", back_populates="appointment", uselist=False)
    payment = relationship("Payment", back_populates="appointment", foreign_keys=[payment_id])
