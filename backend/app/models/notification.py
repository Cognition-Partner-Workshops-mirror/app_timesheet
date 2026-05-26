"""
Notification Model - Push notifications, reminders, and alerts.
Supports different notification types and read/unread tracking.
"""

from sqlalchemy import Column, String, Integer, DateTime, Enum as SQLEnum, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from app.database import Base


class NotificationType(str, enum.Enum):
    """Types of notifications sent to users."""
    APPOINTMENT_REMINDER = "appointment_reminder"
    APPOINTMENT_CONFIRMED = "appointment_confirmed"
    APPOINTMENT_CANCELLED = "appointment_cancelled"
    CONSULTATION_STARTED = "consultation_started"
    PRESCRIPTION_READY = "prescription_ready"
    PAYMENT_RECEIVED = "payment_received"
    MEDICATION_REMINDER = "medication_reminder"
    HEALTH_TIP = "health_tip"
    SYSTEM = "system"


class Notification(Base):
    """
    Notification model - stores all user notifications.
    Used for appointment reminders, payment alerts, and health tips.
    """
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Notification content
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(SQLEnum(NotificationType), default=NotificationType.SYSTEM)

    # Status
    is_read = Column(Boolean, default=False)

    # Optional deep link for mobile app navigation
    action_url = Column(String(512), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    read_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="notifications")
