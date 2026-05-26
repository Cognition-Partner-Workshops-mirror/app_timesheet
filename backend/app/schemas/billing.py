"""
Billing Schemas - Request/Response models for payments and invoices.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PaymentCreate(BaseModel):
    """Schema for initiating a payment."""
    amount: float
    payment_method: Optional[str] = None
    description: Optional[str] = None


class PaymentResponse(BaseModel):
    """Schema for payment data in API responses."""
    id: int
    patient_id: int
    amount: float
    currency: str
    payment_method: Optional[str] = None
    status: str
    transaction_id: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RevenueStats(BaseModel):
    """Schema for admin revenue analytics."""
    total_revenue: float
    monthly_revenue: float
    total_transactions: int
    pending_payments: int
    average_consultation_fee: float
