"""
Prescription Schemas - Request/Response models for digital prescriptions.
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PrescriptionItemCreate(BaseModel):
    """Schema for a single medication item in a prescription."""
    medicine_name: str
    dosage: str
    frequency: str
    duration: str
    timing: Optional[str] = None
    instructions: Optional[str] = None


class PrescriptionCreate(BaseModel):
    """Schema for creating a new prescription."""
    appointment_id: int
    patient_id: int
    diagnosis: str
    clinical_notes: Optional[str] = None
    advice: Optional[str] = None
    follow_up_days: Optional[int] = None
    follow_up_notes: Optional[str] = None
    items: List[PrescriptionItemCreate] = []


class PrescriptionItemResponse(BaseModel):
    """Schema for prescription item data in API responses."""
    id: int
    medicine_name: str
    dosage: str
    frequency: str
    duration: str
    timing: Optional[str] = None
    instructions: Optional[str] = None

    class Config:
        from_attributes = True


class PrescriptionResponse(BaseModel):
    """Schema for prescription data in API responses."""
    id: int
    appointment_id: int
    doctor_id: int
    patient_id: int
    diagnosis: str
    clinical_notes: Optional[str] = None
    advice: Optional[str] = None
    follow_up_days: Optional[int] = None
    follow_up_notes: Optional[str] = None
    is_active: bool
    items: List[PrescriptionItemResponse] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
