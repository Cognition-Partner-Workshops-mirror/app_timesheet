"""
Appointment Schemas - Request/Response models for booking and scheduling.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AppointmentCreate(BaseModel):
    """Schema for creating a new appointment booking."""
    doctor_id: int
    appointment_date: datetime
    slot_time: str  # HH:MM format
    consultation_type: str = "video"  # video, chat, in_clinic
    reason: Optional[str] = None
    symptoms: Optional[str] = None


class AppointmentUpdate(BaseModel):
    """Schema for updating appointment status or details."""
    status: Optional[str] = None
    doctor_notes: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    cancelled_reason: Optional[str] = None


class AppointmentResponse(BaseModel):
    """Schema for appointment data in API responses."""
    id: int
    patient_id: int
    doctor_id: int
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_specialization: Optional[str] = None
    appointment_date: datetime
    slot_time: str
    duration: int
    consultation_type: str
    status: str
    reason: Optional[str] = None
    symptoms: Optional[str] = None
    fee: Optional[float] = None
    doctor_notes: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TimeSlotResponse(BaseModel):
    """Schema for available time slots on a given day."""
    time: str  # HH:MM format
    is_available: bool
