"""
Health Record Schemas - Request/Response models for medical records and vitals.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class HealthRecordCreate(BaseModel):
    """Schema for creating a new health record entry."""
    record_type: str = "other"
    title: str
    description: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    # Vitals
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    temperature: Optional[float] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    blood_sugar: Optional[float] = None
    oxygen_level: Optional[float] = None
    record_date: Optional[datetime] = None


class HealthRecordResponse(BaseModel):
    """Schema for health record data in API responses."""
    id: int
    patient_id: int
    record_type: str
    title: str
    description: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    temperature: Optional[float] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    blood_sugar: Optional[float] = None
    oxygen_level: Optional[float] = None
    bmi: Optional[float] = None
    record_date: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class VitalsUpdate(BaseModel):
    """Schema for quick vitals update (health tracking dashboard)."""
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    temperature: Optional[float] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    blood_sugar: Optional[float] = None
    oxygen_level: Optional[float] = None
