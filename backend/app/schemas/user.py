"""
User Schemas - Request/Response models for authentication and user management.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserRegister(BaseModel):
    """Schema for user registration request."""
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    role: str = "patient"  # patient, doctor, admin


class UserLogin(BaseModel):
    """Schema for user login request."""
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    """Schema for user data in API responses."""
    id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    gender: Optional[str] = None
    avatar_url: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Schema for JWT token response after login."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    """Schema for decoded JWT token payload."""
    user_id: int
    email: str
    role: str
