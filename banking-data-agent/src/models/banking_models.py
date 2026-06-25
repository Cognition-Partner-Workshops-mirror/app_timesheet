"""
Pydantic models for all banking data domains.
These models define the schema for data validation before warehouse ingestion.
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator


# ─── Enums ────────────────────────────────────────────────────────────────────

class AccountType(str, Enum):
    SAVINGS = "SAVINGS"
    CURRENT = "CURRENT"
    FIXED_DEPOSIT = "FIXED_DEPOSIT"
    RECURRING_DEPOSIT = "RECURRING_DEPOSIT"
    NRE = "NRE"
    NRO = "NRO"


class TransactionType(str, Enum):
    CREDIT = "CREDIT"
    DEBIT = "DEBIT"
    TRANSFER = "TRANSFER"
    REVERSAL = "REVERSAL"


class PaymentChannel(str, Enum):
    UPI = "UPI"
    NEFT = "NEFT"
    RTGS = "RTGS"
    IMPS = "IMPS"
    CARD_POS = "CARD_POS"
    CARD_ONLINE = "CARD_ONLINE"
    ATM = "ATM"
    CHEQUE = "CHEQUE"


class LoanType(str, Enum):
    HOME = "HOME"
    PERSONAL = "PERSONAL"
    AUTO = "AUTO"
    EDUCATION = "EDUCATION"
    BUSINESS = "BUSINESS"
    GOLD = "GOLD"


class LoanStatus(str, Enum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    DEFAULT = "DEFAULT"
    RESTRUCTURED = "RESTRUCTURED"
    WRITTEN_OFF = "WRITTEN_OFF"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertType(str, Enum):
    AML = "AML"
    FRAUD = "FRAUD"
    SANCTIONS = "SANCTIONS"
    UNUSUAL_ACTIVITY = "UNUSUAL_ACTIVITY"
    THRESHOLD_BREACH = "THRESHOLD_BREACH"


# ─── Core Banking Models ─────────────────────────────────────────────────────

class Customer(BaseModel):
    """Customer master data from Core Banking System."""
    customer_id: str = Field(..., min_length=1, description="Unique customer identifier")
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: Optional[str] = None
    phone: str = Field(..., min_length=10)
    date_of_birth: date
    pan_number: Optional[str] = Field(None, pattern=r"^[A-Z]{5}[0-9]{4}[A-Z]$")
    aadhaar_hash: Optional[str] = None  # Hashed for security
    address: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""
    kyc_status: str = "PENDING"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Account(BaseModel):
    """Bank account linked to a customer."""
    account_id: str = Field(..., min_length=1)
    customer_id: str = Field(..., min_length=1)
    account_type: AccountType
    balance: Decimal = Field(..., ge=0)
    currency: str = Field(default="INR", max_length=3)
    branch_code: str = ""
    ifsc_code: str = ""
    is_active: bool = True
    opened_date: date = Field(default_factory=date.today)

    @field_validator("balance", mode="before")
    @classmethod
    def coerce_balance(cls, v: object) -> Decimal:
        return Decimal(str(v))


class Transaction(BaseModel):
    """Individual banking transaction record."""
    transaction_id: str = Field(..., min_length=1)
    account_id: str = Field(..., min_length=1)
    transaction_type: TransactionType
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="INR", max_length=3)
    description: str = ""
    counterparty_account: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: str = "COMPLETED"

    @field_validator("amount", mode="before")
    @classmethod
    def coerce_amount(cls, v: object) -> Decimal:
        return Decimal(str(v))


# ─── Payment Models ──────────────────────────────────────────────────────────

class Payment(BaseModel):
    """Payment transaction across various channels."""
    payment_id: str = Field(..., min_length=1)
    channel: PaymentChannel
    sender_account: str
    receiver_account: str
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="INR", max_length=3)
    reference_number: str = ""
    status: str = "SUCCESS"
    failure_reason: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("amount", mode="before")
    @classmethod
    def coerce_amount(cls, v: object) -> Decimal:
        return Decimal(str(v))


class CardTransaction(BaseModel):
    """Credit/debit card transaction for fraud detection."""
    transaction_id: str = Field(..., min_length=1)
    card_number_hash: str  # Hashed card number
    card_type: str = "DEBIT"  # DEBIT or CREDIT
    merchant_name: str = ""
    merchant_category: str = ""
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="INR", max_length=3)
    location_city: str = ""
    location_country: str = "IN"
    is_international: bool = False
    is_online: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("amount", mode="before")
    @classmethod
    def coerce_amount(cls, v: object) -> Decimal:
        return Decimal(str(v))


# ─── Lending Models ──────────────────────────────────────────────────────────

class Loan(BaseModel):
    """Loan account with disbursement and repayment tracking."""
    loan_id: str = Field(..., min_length=1)
    customer_id: str = Field(..., min_length=1)
    loan_type: LoanType
    principal_amount: Decimal = Field(..., gt=0)
    interest_rate: Decimal = Field(..., ge=0, le=100)
    tenure_months: int = Field(..., gt=0)
    emi_amount: Decimal = Field(..., gt=0)
    disbursement_date: date
    maturity_date: date
    outstanding_balance: Decimal = Field(..., ge=0)
    status: LoanStatus = LoanStatus.ACTIVE
    collateral_type: Optional[str] = None
    collateral_value: Optional[Decimal] = None

    @field_validator("principal_amount", "interest_rate", "emi_amount", "outstanding_balance", mode="before")
    @classmethod
    def coerce_decimal(cls, v: object) -> Decimal:
        return Decimal(str(v))


class EMIPayment(BaseModel):
    """Individual EMI payment record."""
    emi_id: str = Field(..., min_length=1)
    loan_id: str = Field(..., min_length=1)
    installment_number: int = Field(..., gt=0)
    due_date: date
    paid_date: Optional[date] = None
    amount: Decimal = Field(..., gt=0)
    principal_component: Decimal = Field(..., ge=0)
    interest_component: Decimal = Field(..., ge=0)
    is_overdue: bool = False
    penalty_amount: Decimal = Field(default=Decimal("0"))

    @field_validator("amount", "principal_component", "interest_component", "penalty_amount", mode="before")
    @classmethod
    def coerce_decimal(cls, v: object) -> Decimal:
        return Decimal(str(v))


# ─── Risk & Compliance Models ────────────────────────────────────────────────

class RiskAlert(BaseModel):
    """AML/Fraud/Compliance alert generated by monitoring systems."""
    alert_id: str = Field(..., min_length=1)
    alert_type: AlertType
    risk_level: RiskLevel
    customer_id: str = Field(..., min_length=1)
    account_id: Optional[str] = None
    transaction_id: Optional[str] = None
    description: str = ""
    rule_triggered: str = ""
    amount_involved: Optional[Decimal] = None
    is_resolved: bool = False
    resolution_notes: Optional[str] = None
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None

    @field_validator("amount_involved", mode="before")
    @classmethod
    def coerce_decimal(cls, v: object) -> Optional[Decimal]:
        if v is None:
            return None
        return Decimal(str(v))


class SuspiciousTransaction(BaseModel):
    """Suspicious Transaction Report (STR) data."""
    str_id: str = Field(..., min_length=1)
    customer_id: str = Field(..., min_length=1)
    transaction_ids: list[str] = Field(default_factory=list)
    total_amount: Decimal = Field(..., gt=0)
    reason: str = ""
    reported_to_fiu: bool = False
    reporting_date: Optional[date] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("total_amount", mode="before")
    @classmethod
    def coerce_decimal(cls, v: object) -> Decimal:
        return Decimal(str(v))
