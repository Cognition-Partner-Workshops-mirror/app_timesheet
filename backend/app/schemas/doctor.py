"""
Doctor Schemas - Request/Response models for doctor profiles and schedules.
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class DoctorProfileCreate(BaseModel):
    """Schema for creating a doctor profile during onboarding."""
    qualification: str
    experience_years: int = 0
    license_number: Optional[str] = None
    bio: Optional[str] = None
    hospital_name: Optional[str] = None
    hospital_address: Optional[str] = None
    languages: Optional[str] = None
    consultation_fee: float = 500.0
    follow_up_fee: float = 200.0
    video_consultation: bool = True
    chat_consultation: bool = True
    in_clinic: bool = True
    specialization_ids: List[int] = []


class DoctorProfileUpdate(BaseModel):
    """Schema for updating doctor profile details."""
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    bio: Optional[str] = None
    hospital_name: Optional[str] = None
    hospital_address: Optional[str] = None
    languages: Optional[str] = None
    consultation_fee: Optional[float] = None
    follow_up_fee: Optional[float] = None
    video_consultation: Optional[bool] = None
    chat_consultation: Optional[bool] = None
    in_clinic: Optional[bool] = None
    is_available: Optional[bool] = None


class SpecializationResponse(BaseModel):
    """Schema for specialization data in API responses."""
    id: int
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None

    class Config:
        from_attributes = True


class DoctorProfileResponse(BaseModel):
    """Schema for doctor profile data in API responses."""
    id: int
    user_id: int
    full_name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    qualification: str
    experience_years: int
    license_number: Optional[str] = None
    bio: Optional[str] = None
    hospital_name: Optional[str] = None
    languages: Optional[str] = None
    consultation_fee: float
    follow_up_fee: float
    video_consultation: bool
    chat_consultation: bool
    in_clinic: bool
    rating: float
    total_reviews: int
    total_consultations: int
    is_verified: bool
    is_available: bool
    specializations: List[SpecializationResponse] = []

    class Config:
        from_attributes = True


class DoctorScheduleCreate(BaseModel):
    """Schema for adding a doctor's availability schedule slot."""
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: str  # HH:MM
    end_time: str
    slot_duration: int = 30


class DoctorScheduleResponse(BaseModel):
    """Schema for doctor schedule data in API responses."""
    id: int
    day_of_week: int
    start_time: str
    end_time: str
    slot_duration: int
    is_active: bool

    class Config:
        from_attributes = True


class DoctorSearchQuery(BaseModel):
    """Schema for doctor search filters."""
    specialization: Optional[str] = None
    city: Optional[str] = None
    min_rating: Optional[float] = None
    max_fee: Optional[float] = None
    video_available: Optional[bool] = None
    name: Optional[str] = None
