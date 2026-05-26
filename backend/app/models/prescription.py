"""
Prescription Model - Digital prescriptions issued by doctors.
Supports itemized medications with dosage and duration details.
"""

from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class Prescription(Base):
    """
    Digital prescription linked to an appointment.
    Contains overall prescription details and diagnosis.
    """
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), unique=True, nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Diagnosis and notes
    diagnosis = Column(Text, nullable=False)
    clinical_notes = Column(Text, nullable=True)
    advice = Column(Text, nullable=True)  # General advice / lifestyle recommendations

    # Follow-up
    follow_up_days = Column(Integer, nullable=True)
    follow_up_notes = Column(Text, nullable=True)

    # Status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    appointment = relationship("Appointment", back_populates="prescription")
    doctor = relationship("DoctorProfile", back_populates="prescriptions")
    items = relationship("PrescriptionItem", back_populates="prescription", cascade="all, delete-orphan")


class PrescriptionItem(Base):
    """
    Individual medication item within a prescription.
    Stores drug name, dosage, frequency, and duration.
    """
    __tablename__ = "prescription_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"), nullable=False)

    # Medication details
    medicine_name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=False)  # e.g., "500mg"
    frequency = Column(String(100), nullable=False)  # e.g., "Twice daily"
    duration = Column(String(100), nullable=False)  # e.g., "7 days"
    timing = Column(String(100), nullable=True)  # e.g., "After meals"
    instructions = Column(Text, nullable=True)  # Additional notes

    # Relationship
    prescription = relationship("Prescription", back_populates="items")
