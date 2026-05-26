"""
Health Record Model - Patient medical records and uploaded reports.
Supports various record types (lab reports, prescriptions, vitals, etc.)
"""

from sqlalchemy import Column, String, Integer, DateTime, Enum as SQLEnum, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from app.database import Base


class RecordType(str, enum.Enum):
    """Types of health records that can be stored."""
    LAB_REPORT = "lab_report"
    PRESCRIPTION = "prescription"
    SCAN = "scan"
    VITALS = "vitals"
    VACCINATION = "vaccination"
    DISCHARGE_SUMMARY = "discharge_summary"
    OTHER = "other"


class HealthRecord(Base):
    """
    Patient health record - stores medical documents and health data.
    Supports file uploads and structured vital sign data.
    """
    __tablename__ = "health_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Record metadata
    record_type = Column(SQLEnum(RecordType), default=RecordType.OTHER)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # File attachment
    file_url = Column(String(512), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_type = Column(String(50), nullable=True)  # MIME type

    # Vitals data (when record_type is VITALS)
    blood_pressure_systolic = Column(Integer, nullable=True)
    blood_pressure_diastolic = Column(Integer, nullable=True)
    heart_rate = Column(Integer, nullable=True)
    temperature = Column(Float, nullable=True)  # In Celsius
    weight = Column(Float, nullable=True)  # In kg
    height = Column(Float, nullable=True)  # In cm
    blood_sugar = Column(Float, nullable=True)  # mg/dL
    oxygen_level = Column(Float, nullable=True)  # SpO2 %
    bmi = Column(Float, nullable=True)

    # Record date (when the test/measurement was taken)
    record_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    patient = relationship("User", back_populates="health_records")
