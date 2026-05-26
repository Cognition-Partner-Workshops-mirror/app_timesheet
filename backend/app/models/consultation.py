"""
Consultation Model - Video/chat session management.
Tracks consultation sessions and associated clinical notes.
"""

from sqlalchemy import Column, String, Integer, DateTime, Enum as SQLEnum, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from app.database import Base


class ConsultationStatus(str, enum.Enum):
    """Consultation session lifecycle states."""
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DISCONNECTED = "disconnected"


class Consultation(Base):
    """
    Consultation session model - tracks live video/chat sessions.
    Contains session metadata and timing information.
    """
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), unique=True, nullable=False)

    # Session details
    session_token = Column(String(255), unique=True, nullable=True)  # WebRTC room token
    status = Column(SQLEnum(ConsultationStatus), default=ConsultationStatus.WAITING)

    # Timing
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)

    # AI features during consultation
    ai_suggestions_enabled = Column(Boolean, default=True)
    ai_summary = Column(Text, nullable=True)  # AI-generated consultation summary

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    appointment = relationship("Appointment", back_populates="consultation")
    notes = relationship("ConsultationNote", back_populates="consultation")


class ConsultationNote(Base):
    """
    Clinical notes added during or after consultation.
    Supports doctor notes and AI-generated summaries.
    """
    __tablename__ = "consultation_notes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    consultation_id = Column(Integer, ForeignKey("consultations.id"), nullable=False)
    note_type = Column(String(50), default="doctor")  # 'doctor', 'ai_summary', 'follow_up'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship
    consultation = relationship("Consultation", back_populates="notes")
