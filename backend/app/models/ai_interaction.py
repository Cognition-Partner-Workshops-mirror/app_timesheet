"""
AI Interaction Model - Logs all AI-powered interactions.
Tracks symptom checks, triage results, and AI recommendations
for audit trail and analytics purposes.
"""

from sqlalchemy import Column, String, Integer, DateTime, Enum as SQLEnum, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from app.database import Base


class AIInteractionType(str, enum.Enum):
    """Types of AI interactions available on the platform."""
    SYMPTOM_CHECK = "symptom_check"
    TRIAGE = "triage"
    DOCTOR_RECOMMENDATION = "doctor_recommendation"
    HEALTH_TIP = "health_tip"
    CONSULTATION_SUMMARY = "consultation_summary"
    CHATBOT = "chatbot"


class UrgencyLevel(str, enum.Enum):
    """Urgency levels from AI triage system."""
    EMERGENCY = "emergency"
    URGENT = "urgent"
    ROUTINE = "routine"
    SELF_CARE = "self_care"


class AIInteraction(Base):
    """
    AI Interaction log - records every AI feature usage.
    Provides audit trail and data for improving AI models.
    """
    __tablename__ = "ai_interactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Interaction details
    interaction_type = Column(SQLEnum(AIInteractionType), nullable=False)
    input_text = Column(Text, nullable=False)  # User's input (symptoms, questions)
    output_text = Column(Text, nullable=True)  # AI response

    # Triage-specific fields
    urgency_level = Column(SQLEnum(UrgencyLevel), nullable=True)
    confidence_score = Column(Float, nullable=True)  # AI confidence 0.0-1.0
    suggested_speciality = Column(String(100), nullable=True)
    suggested_action = Column(Text, nullable=True)

    # Model info for audit
    model_used = Column(String(100), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="ai_interactions")
