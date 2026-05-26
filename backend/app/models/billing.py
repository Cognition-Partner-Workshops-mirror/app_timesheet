"""
Billing Models - Payment and Invoice management.
Handles consultation fees, refunds, and payment tracking.
"""

from sqlalchemy import Column, String, Integer, DateTime, Enum as SQLEnum, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from app.database import Base


class PaymentStatus(str, enum.Enum):
    """Payment lifecycle states."""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentMethod(str, enum.Enum):
    """Supported payment methods."""
    UPI = "upi"
    CARD = "card"
    NET_BANKING = "net_banking"
    WALLET = "wallet"
    CASH = "cash"


class Payment(Base):
    """
    Payment model - tracks financial transactions for consultations.
    Linked to patient and appointment.
    """
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="INR")
    payment_method = Column(SQLEnum(PaymentMethod), nullable=True)
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)

    # Payment gateway reference
    transaction_id = Column(String(255), unique=True, nullable=True)
    gateway_response = Column(Text, nullable=True)

    # Description
    description = Column(String(500), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    patient = relationship("User", back_populates="payments", foreign_keys=[patient_id])
    appointment = relationship("Appointment", back_populates="payment", foreign_keys="Appointment.payment_id")


class Invoice(Base):
    """
    Invoice model - formal billing document generated after payment.
    Contains itemized breakdown of charges.
    """
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)
    invoice_number = Column(String(50), unique=True, nullable=False)

    # Invoice details
    subtotal = Column(Float, nullable=False)
    tax = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    total = Column(Float, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
