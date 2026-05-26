"""
AI Services Router - AI-powered symptom checking, triage, doctor recommendations,
and health chatbot using OpenAI GPT-4 integration.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import json
import uuid

from app.database import get_db
from app.models.user import User
from app.models.ai_interaction import AIInteraction, AIInteractionType, UrgencyLevel
from app.schemas.ai_schemas import (
    SymptomCheckRequest,
    SymptomCheckResponse,
    ConditionSuggestion,
    ChatMessage,
    ChatResponse,
    HealthInsightResponse,
)
from app.utils.auth import get_current_user
from app.config import settings

router = APIRouter(prefix="/ai", tags=["AI Services"])


async def call_openai(prompt: str, system_message: str) -> str:
    """
    Call OpenAI API with the given prompt and system message.
    Falls back to a structured mock response if API key is not configured.
    """
    if not settings.OPENAI_API_KEY:
        return None

    try:
        import openai
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=1500,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return None


@router.post("/symptom-check", response_model=SymptomCheckResponse)
async def symptom_check(
    data: SymptomCheckRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    AI-powered symptom checker and triage system.
    Analyzes symptoms and returns urgency level, possible conditions,
    recommended speciality, and next-step guidance.
    """
    system_msg = """You are a medical triage AI assistant for CareAI healthcare platform.
    Analyze the patient's symptoms and provide a structured triage assessment.
    IMPORTANT: You are NOT diagnosing. You are providing triage guidance only.
    Always recommend consulting a qualified healthcare professional.

    Return your response as valid JSON with this exact structure:
    {
        "urgency_level": "emergency|urgent|routine|self_care",
        "risk_score": 0.0-1.0,
        "possible_conditions": [
            {"condition": "name", "probability": "High|Medium|Low", "description": "brief explanation"}
        ],
        "recommended_speciality": "speciality name",
        "recommended_action": "what the patient should do next",
        "precautions": ["precaution 1", "precaution 2"]
    }"""

    prompt = f"""Patient Details:
- Symptoms: {data.symptoms}
- Age: {data.age or 'Not specified'}
- Gender: {data.gender or 'Not specified'}
- Medical History: {data.medical_history or 'None provided'}
- Duration: {data.duration or 'Not specified'}

Provide triage assessment:"""

    ai_response = await call_openai(prompt, system_msg)

    if ai_response:
        try:
            # Parse AI response JSON
            result = json.loads(ai_response)
            response = SymptomCheckResponse(
                urgency_level=result.get("urgency_level", "routine"),
                risk_score=result.get("risk_score", 0.5),
                possible_conditions=[
                    ConditionSuggestion(**c) for c in result.get("possible_conditions", [])
                ],
                recommended_speciality=result.get("recommended_speciality", "General Medicine"),
                recommended_action=result.get("recommended_action", "Please consult a doctor"),
                precautions=result.get("precautions", []),
            )
        except (json.JSONDecodeError, KeyError):
            response = _get_fallback_triage(data.symptoms)
    else:
        # Fallback response when OpenAI is not available
        response = _get_fallback_triage(data.symptoms)

    # Log AI interaction for audit trail
    interaction = AIInteraction(
        user_id=current_user.id,
        interaction_type=AIInteractionType.SYMPTOM_CHECK,
        input_text=data.symptoms,
        output_text=json.dumps(response.model_dump()),
        urgency_level=UrgencyLevel(response.urgency_level),
        confidence_score=response.risk_score,
        suggested_speciality=response.recommended_speciality,
        suggested_action=response.recommended_action,
        model_used=settings.OPENAI_MODEL if settings.OPENAI_API_KEY else "fallback",
    )
    db.add(interaction)

    return response


def _get_fallback_triage(symptoms: str) -> SymptomCheckResponse:
    """
    Provide a structured fallback triage response when AI is unavailable.
    Uses keyword matching for basic symptom categorization.
    """
    symptoms_lower = symptoms.lower()

    # Emergency keywords detection
    emergency_keywords = ["chest pain", "breathing difficulty", "unconscious", "severe bleeding", "stroke", "heart attack"]
    urgent_keywords = ["high fever", "severe pain", "vomiting blood", "head injury", "fracture"]

    if any(kw in symptoms_lower for kw in emergency_keywords):
        urgency = "emergency"
        risk = 0.9
        action = "Seek immediate emergency medical attention. Call emergency services."
        speciality = "Emergency Medicine"
    elif any(kw in symptoms_lower for kw in urgent_keywords):
        urgency = "urgent"
        risk = 0.7
        action = "Schedule an urgent appointment with a doctor within 24 hours."
        speciality = "General Medicine"
    elif any(kw in symptoms_lower for kw in ["fever", "cold", "cough", "headache", "fatigue"]):
        urgency = "routine"
        risk = 0.3
        action = "Schedule a regular consultation. Rest and stay hydrated in the meantime."
        speciality = "General Medicine"
    else:
        urgency = "routine"
        risk = 0.3
        action = "Schedule a consultation with a doctor for proper evaluation."
        speciality = "General Medicine"

    return SymptomCheckResponse(
        urgency_level=urgency,
        risk_score=risk,
        possible_conditions=[
            ConditionSuggestion(
                condition="Assessment Pending",
                probability="Medium",
                description="A detailed assessment requires consultation with a healthcare professional.",
            )
        ],
        recommended_speciality=speciality,
        recommended_action=action,
        precautions=[
            "Stay hydrated and rest",
            "Monitor your symptoms",
            "Seek immediate help if symptoms worsen",
        ],
    )


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(
    data: ChatMessage,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    AI health chatbot - 24/7 health assistant for general queries.
    Provides health tips, medication reminders, and guidance.
    """
    system_msg = """You are CareAI's friendly health assistant chatbot.
    Provide helpful, accurate health information and guidance.
    Always recommend consulting a real doctor for medical decisions.
    Keep responses concise and easy to understand.
    Suggest follow-up actions when appropriate."""

    conversation_id = data.conversation_id or str(uuid.uuid4())

    ai_response = await call_openai(data.message, system_msg)

    if ai_response:
        response_text = ai_response
    else:
        # Fallback chatbot responses
        response_text = _get_chatbot_fallback(data.message)

    # Log interaction
    interaction = AIInteraction(
        user_id=current_user.id,
        interaction_type=AIInteractionType.CHATBOT,
        input_text=data.message,
        output_text=response_text,
        model_used=settings.OPENAI_MODEL if settings.OPENAI_API_KEY else "fallback",
    )
    db.add(interaction)

    return ChatResponse(
        response=response_text,
        conversation_id=conversation_id,
        suggestions=["Book a doctor", "Check symptoms", "View health tips", "My health records"],
    )


def _get_chatbot_fallback(message: str) -> str:
    """Provide helpful fallback responses when AI is unavailable."""
    msg_lower = message.lower()

    if any(w in msg_lower for w in ["hello", "hi", "hey"]):
        return "Hello! I'm CareAI's health assistant. How can I help you today? You can ask me about symptoms, book a doctor, or get health tips."
    elif any(w in msg_lower for w in ["fever", "temperature"]):
        return "For fever, rest well and stay hydrated. Take paracetamol if needed. If fever persists above 102°F for more than 2 days, consult a doctor. Would you like to book a consultation?"
    elif any(w in msg_lower for w in ["headache", "head pain"]):
        return "For headaches, try resting in a quiet, dark room. Stay hydrated and avoid screen time. If headaches are frequent or severe, I recommend consulting a doctor."
    elif any(w in msg_lower for w in ["cold", "cough", "flu"]):
        return "For cold/cough, drink warm fluids, rest well, and use steam inhalation. If symptoms persist for more than a week, please consult a doctor."
    elif any(w in msg_lower for w in ["book", "appointment", "doctor"]):
        return "I can help you find the right doctor! Use our doctor search to find specialists near you, or I can recommend one based on your symptoms."
    else:
        return "Thank you for your question. For personalized medical advice, I recommend consulting with one of our qualified doctors. You can search for doctors by specialization or describe your symptoms for AI-assisted triage."


@router.get("/health-insights", response_model=HealthInsightResponse)
async def get_health_insights(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    AI-generated health insights based on patient's health records and history.
    Provides personalized health score, risk factors, and recommendations.
    """
    # Fetch user's recent health records for analysis
    from app.models.health_record import HealthRecord
    result = await db.execute(
        select(HealthRecord)
        .where(HealthRecord.patient_id == current_user.id)
        .order_by(HealthRecord.created_at.desc())
        .limit(10)
    )
    records = result.scalars().all()

    # Build context from health records
    if records:
        vitals_data = []
        for r in records:
            if r.weight:
                vitals_data.append(f"Weight: {r.weight}kg")
            if r.blood_pressure_systolic:
                vitals_data.append(f"BP: {r.blood_pressure_systolic}/{r.blood_pressure_diastolic}")
            if r.blood_sugar:
                vitals_data.append(f"Blood Sugar: {r.blood_sugar} mg/dL")
            if r.heart_rate:
                vitals_data.append(f"Heart Rate: {r.heart_rate} bpm")

        if vitals_data and settings.OPENAI_API_KEY:
            prompt = f"Based on these health metrics: {', '.join(vitals_data)}, provide health insights."
            system_msg = "You are a health analytics AI. Provide health insights as JSON with keys: insights, risk_factors, recommendations, health_score (0-100)."
            ai_response = await call_openai(prompt, system_msg)
            if ai_response:
                try:
                    data = json.loads(ai_response)
                    return HealthInsightResponse(**data)
                except (json.JSONDecodeError, KeyError):
                    pass

    # Default insights when no data or AI unavailable
    return HealthInsightResponse(
        insights=[
            "Welcome to CareAI! Start tracking your vitals for personalized insights.",
            "Regular health check-ups are recommended every 6 months.",
            "Maintain a balanced diet and exercise routine for optimal health.",
        ],
        risk_factors=[
            "Incomplete health profile - add your vitals for better analysis",
        ],
        recommendations=[
            "Complete your health profile with current vitals",
            "Schedule a routine health check-up",
            "Track your daily water intake and exercise",
            "Get adequate sleep (7-8 hours daily)",
        ],
        health_score=75.0,
    )
