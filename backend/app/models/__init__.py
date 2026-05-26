"""
CareAI Database Models Package
All SQLAlchemy ORM models for the healthcare platform.
"""

from app.models.user import User
from app.models.doctor import DoctorProfile, DoctorSchedule, Specialization
from app.models.appointment import Appointment
from app.models.consultation import Consultation, ConsultationNote
from app.models.prescription import Prescription, PrescriptionItem
from app.models.health_record import HealthRecord
from app.models.billing import Payment, Invoice
from app.models.notification import Notification
from app.models.ai_interaction import AIInteraction

__all__ = [
    "User",
    "DoctorProfile",
    "DoctorSchedule",
    "Specialization",
    "Appointment",
    "Consultation",
    "ConsultationNote",
    "Prescription",
    "PrescriptionItem",
    "HealthRecord",
    "Payment",
    "Invoice",
    "Notification",
    "AIInteraction",
]
