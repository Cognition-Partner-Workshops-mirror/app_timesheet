"""
AI Schemas - Request/Response models for AI-powered features.
Covers symptom checking, triage, doctor recommendations, and chatbot.
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SymptomCheckRequest(BaseModel):
    """Schema for AI symptom checker input."""
    symptoms: str  # Free text symptoms description
    age: Optional[int] = None
    gender: Optional[str] = None
    medical_history: Optional[str] = None
    duration: Optional[str] = None  # How long symptoms have persisted


class ConditionSuggestion(BaseModel):
    """Schema for a single condition suggestion from AI."""
    condition: str
    probability: str  # "High", "Medium", "Low"
    description: str


class SymptomCheckResponse(BaseModel):
    """Schema for AI symptom checker response with triage results."""
    urgency_level: str  # emergency, urgent, routine, self_care
    risk_score: float  # 0.0 - 1.0
    possible_conditions: List[ConditionSuggestion]
    recommended_speciality: str
    recommended_action: str
    precautions: List[str]
    disclaimer: str = "This is AI-assisted triage only. Please consult a qualified doctor for diagnosis."


class DoctorRecommendationRequest(BaseModel):
    """Schema for AI doctor recommendation input."""
    symptoms: Optional[str] = None
    specialization: Optional[str] = None
    preferred_consultation_type: Optional[str] = None
    max_fee: Optional[float] = None
    city: Optional[str] = None


class ChatMessage(BaseModel):
    """Schema for AI chatbot message."""
    message: str
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    """Schema for AI chatbot response."""
    response: str
    conversation_id: str
    suggestions: List[str] = []  # Quick reply suggestions


class HealthInsightResponse(BaseModel):
    """Schema for AI-generated health insights based on patient data."""
    insights: List[str]
    risk_factors: List[str]
    recommendations: List[str]
    health_score: float  # 0-100 overall health score
