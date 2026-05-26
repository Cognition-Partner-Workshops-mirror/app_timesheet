"""
Notification Schemas - Request/Response models for user notifications.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationCreate(BaseModel):
    """Schema for creating a notification."""
    title: str
    message: str
    notification_type: str = "system"
    action_url: Optional[str] = None


class NotificationResponse(BaseModel):
    """Schema for notification data in API responses."""
    id: int
    title: str
    message: str
    notification_type: str
    is_read: bool
    action_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
