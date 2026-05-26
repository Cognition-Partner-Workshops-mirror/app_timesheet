"""
Pydantic schemas for request validation and response serialization.
Defines all DTOs (Data Transfer Objects) used across the API endpoints.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ──────────────────────────────────────────────
# User Schemas
# ──────────────────────────────────────────────

class UserRegisterRequest(BaseModel):
    """Schema for user registration request."""
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    password: Optional[str] = Field(None, min_length=6, max_length=128)


class UserLoginRequest(BaseModel):
    """Schema for user login request (email-only auth supported)."""
    email: EmailStr
    password: Optional[str] = None


class UserResponse(BaseModel):
    """Schema for user profile response."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    name: str
    avatar_url: Optional[str] = None
    created_at: datetime


class TokenResponse(BaseModel):
    """Schema for JWT token response after login/register."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ──────────────────────────────────────────────
# Image Schemas
# ──────────────────────────────────────────────

class ImageDimensions(BaseModel):
    """Width and height of an image."""
    width: int
    height: int


class ImageUploadResponse(BaseModel):
    """Schema for successful image upload response."""
    model_config = ConfigDict(from_attributes=True)

    image_id: UUID
    url: str
    thumbnail_url: Optional[str] = None
    image_type: str
    dimensions: ImageDimensions
    file_size_bytes: int
    created_at: datetime


class ImageMetadataResponse(BaseModel):
    """Schema for image metadata retrieval."""
    model_config = ConfigDict(from_attributes=True)

    image_id: UUID
    url: str
    thumbnail_url: Optional[str] = None
    image_type: str
    dimensions: ImageDimensions
    created_at: datetime


# ──────────────────────────────────────────────
# Product Schemas
# ──────────────────────────────────────────────

class ProductCreateRequest(BaseModel):
    """Schema for creating a new product."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    price: float = Field(..., gt=0)
    sizes: List[str] = Field(default_factory=list)
    colors: List[str] = Field(default_factory=list)
    garment_type: str = Field(default="upper_body")
    garment_metadata: dict = Field(default_factory=dict)


class ProductResponse(BaseModel):
    """Schema for product detail response."""
    model_config = ConfigDict(from_attributes=True)

    product_id: UUID
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    price: float
    sizes: List[str] = []
    colors: List[str] = []
    tryon_compatible: bool = True
    garment_type: str
    images: List[dict] = []


class ProductListResponse(BaseModel):
    """Schema for paginated product list response."""
    items: List[ProductResponse]
    pagination: dict


# ──────────────────────────────────────────────
# Try-On Schemas
# ──────────────────────────────────────────────

class TryOnGenerateRequest(BaseModel):
    """Schema for initiating a virtual try-on generation job."""
    user_image_id: UUID
    product_image_id: UUID
    product_id: Optional[UUID] = None
    options: Optional[dict] = Field(default_factory=lambda: {
        "output_resolution": "high",
        "preserve_background": True,
        "adjust_lighting": True
    })


class TryOnJobResponse(BaseModel):
    """Schema for try-on job creation response (accepted for processing)."""
    job_id: UUID
    status: str
    estimated_time_seconds: int = 15
    created_at: datetime
    poll_url: str


class TryOnStepStatus(BaseModel):
    """Status of an individual processing step in the try-on pipeline."""
    name: str
    status: str
    duration_ms: Optional[int] = None


class TryOnStatusResponse(BaseModel):
    """Schema for try-on job status polling response."""
    job_id: UUID
    status: str
    progress: int
    current_step: Optional[str] = None
    steps: List[TryOnStepStatus] = []
    result: Optional[dict] = None
    processing_time_ms: Optional[int] = None
    completed_at: Optional[datetime] = None


class TryOnResultResponse(BaseModel):
    """Schema for completed try-on result."""
    job_id: UUID
    result_url: str
    thumbnail_url: Optional[str] = None
    user_image_url: str
    product_image_url: str
    quality_score: Optional[float] = None
    created_at: datetime


class TryOnHistoryItem(BaseModel):
    """Schema for a single item in the try-on history list."""
    job_id: UUID
    result_url: Optional[str] = None
    product_name: Optional[str] = None
    quality_score: Optional[float] = None
    status: str
    created_at: datetime


class TryOnHistoryResponse(BaseModel):
    """Schema for paginated try-on history response."""
    items: List[TryOnHistoryItem]
    pagination: dict


# ──────────────────────────────────────────────
# Common Schemas
# ──────────────────────────────────────────────

class APIResponse(BaseModel):
    """Standard API response wrapper."""
    status: str = "success"
    data: Optional[dict] = None
    message: Optional[str] = None


class ErrorDetail(BaseModel):
    """Detailed error information."""
    code: str
    message: str
    details: Optional[dict] = None


class ErrorResponse(BaseModel):
    """Standard API error response wrapper."""
    status: str = "error"
    error: ErrorDetail


class PaginationParams(BaseModel):
    """Common pagination parameters."""
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)
