"""
Sample data generators for all banking domains.
Uses Faker to produce realistic banking data for demo and testing.
"""

import hashlib
import random
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any

from faker import Faker

fake = Faker("en_IN")  # Indian locale for realistic banking data


def _uid() -> str:
    return str(uuid.uuid4())[:12].upper()


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()[:32]


# ─── Core Banking ─────────────────────────────────────────────────────────

def generate_customers(count: int = 50) -> list[dict[str, Any]]:
    """Generate sample customer master data."""
    customers = []
    for _ in range(count):
        dob = fake.date_of_birth(minimum_age=21, maximum_age=70)
        # Generate a PAN-like number: 5 uppercase + 4 digits + 1 uppercase
        pan = (
            "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=5))
            + "".join(random.choices("0123456789", k=4))
            + random.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        )
        customers.append({
            "customer_id": f"CUST-{_uid()}",
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "email": fake.email(),
            "phone": fake.phone_number()[:15],
            "date_of_birth": dob.isoformat(),
            "pan_number": pan,
            "aadhaar_hash": _hash(fake.aadhaar_id()),
            "address": fake.address().replace("\n", ", "),
            "city": fake.city(),
            "state": fake.state(),
            "pincode": fake.postcode(),
            "kyc_status": random.choice(["VERIFIED", "VERIFIED", "VERIFIED", "PENDING", "REJECTED"]),
            "created_at": fake.date_time_between(start_date="-3y").isoformat(),
        })
    return customers


def generate_accounts(customers: list[dict[str, Any]], accounts_per_customer: int = 2) -> list[dict[str, Any]]:
    """Generate bank accounts for each customer."""
    account_types = ["SAVINGS", "CURRENT", "FIXED_DEPOSIT", "RECURRING_DEPOSIT"]
    accounts = []
    for customer in customers:
        num_accounts = random.randint(1, accounts_per_customer)
        chosen_types = random.sample(account_types, min(num_accounts, len(account_types)))
        for acc_type in chosen_types:
            balance = round(random.uniform(1000, 5000000), 2) if acc_type != "CURRENT" else round(random.uniform(50000, 20000000), 2)
            accounts.append({
                "account_id": f"ACC-{_uid()}",
                "customer_id": customer["customer_id"],
                "account_type": acc_type,
                "balance": str(balance),
                "currency": "INR",
                "branch_code": f"BR-{random.randint(100, 999)}",
                "ifsc_code": f"BANK0{random.randint(10000, 99999)}",
                "is_active": random.choice([True, True, True, False]),
                "opened_date": fake.date_between(start_date="-5y").isoformat(),
            })
    return accounts


def generate_transactions(accounts: list[dict[str, Any]], per_account: int = 10) -> list[dict[str, Any]]:
    """Generate transaction records for each account."""
    txn_types = ["CREDIT", "DEBIT", "TRANSFER", "DEBIT", "CREDIT"]
    descriptions = [
        "Salary credit", "ATM withdrawal", "Online purchase", "UPI transfer",
        "Bill payment", "EMI deduction", "Interest credit", "Refund",
        "Insurance premium", "Mutual fund SIP", "Rent payment", "Grocery purchase",
    ]
    transactions = []
    for account in accounts:
        count = random.randint(max(1, per_account // 2), per_account)
        for _ in range(count):
            txn_type = random.choice(txn_types)
            amount = round(random.uniform(100, 500000), 2)
            transactions.append({
                "transaction_id": f"TXN-{_uid()}",
                "account_id": account["account_id"],
                "transaction_type": txn_type,
                "amount": str(amount),
                "currency": "INR",
                "description": random.choice(descriptions),
                "counterparty_account": f"ACC-{_uid()}" if txn_type == "TRANSFER" else None,
                "timestamp": fake.date_time_between(start_date="-1y").isoformat(),
                "status": random.choice(["COMPLETED", "COMPLETED", "COMPLETED", "PENDING", "FAILED"]),
            })
    return transactions


# ─── Payments ─────────────────────────────────────────────────────────────

def generate_payments(accounts: list[dict[str, Any]], count: int = 200) -> list[dict[str, Any]]:
    """Generate payment records across all channels."""
    channels = ["UPI", "NEFT", "RTGS", "IMPS", "CHEQUE"]
    failure_reasons = [
        "Insufficient funds", "Invalid beneficiary", "Network timeout",
        "Account frozen", "Daily limit exceeded",
    ]
    payments = []
    for _ in range(count):
        sender = random.choice(accounts)
        status = random.choices(["SUCCESS", "FAILED", "PENDING"], weights=[85, 10, 5])[0]
        channel = random.choice(channels)
        # RTGS for larger amounts
        amount = round(random.uniform(200000, 10000000), 2) if channel == "RTGS" else round(random.uniform(100, 500000), 2)
        payments.append({
            "payment_id": f"PAY-{_uid()}",
            "channel": channel,
            "sender_account": sender["account_id"],
            "receiver_account": f"ACC-{_uid()}",
            "amount": str(amount),
            "currency": "INR",
            "reference_number": f"REF-{_uid()}",
            "status": status,
            "failure_reason": random.choice(failure_reasons) if status == "FAILED" else None,
            "timestamp": fake.date_time_between(start_date="-6m").isoformat(),
        })
    return payments


def generate_card_transactions(count: int = 200) -> list[dict[str, Any]]:
    """Generate credit/debit card transaction data."""
    merchant_categories = [
        "GROCERY", "ELECTRONICS", "FUEL", "RESTAURANT", "TRAVEL",
        "HEALTHCARE", "EDUCATION", "ENTERTAINMENT", "CLOTHING", "UTILITIES",
    ]
    merchant_names = [
        "BigBasket", "Amazon India", "Flipkart", "Swiggy", "Zomato",
        "IRCTC", "MakeMyTrip", "BookMyShow", "Reliance Fresh", "DMart",
        "HP Fuel Station", "Apollo Pharmacy", "Myntra", "Jio Mart",
    ]
    cities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune", "Kolkata", "Ahmedabad"]
    card_txns = []
    for _ in range(count):
        is_international = random.random() < 0.05
        card_txns.append({
            "transaction_id": f"CARD-{_uid()}",
            "card_number_hash": _hash(fake.credit_card_number()),
            "card_type": random.choice(["DEBIT", "DEBIT", "CREDIT"]),
            "merchant_name": random.choice(merchant_names) if not is_international else fake.company(),
            "merchant_category": random.choice(merchant_categories),
            "amount": str(round(random.uniform(50, 200000), 2)),
            "currency": "INR" if not is_international else random.choice(["USD", "EUR", "GBP"]),
            "location_city": random.choice(cities) if not is_international else fake.city(),
            "location_country": "IN" if not is_international else random.choice(["US", "GB", "SG", "AE"]),
            "is_international": is_international,
            "is_online": random.choice([True, False]),
            "timestamp": fake.date_time_between(start_date="-6m").isoformat(),
        })
    return card_txns


# ─── Lending ──────────────────────────────────────────────────────────────

def generate_loans(customers: list[dict[str, Any]], count: int = 30) -> list[dict[str, Any]]:
    """Generate loan portfolio data."""
    loan_configs = {
        "HOME": {"min": 1000000, "max": 50000000, "rate_min": 7.5, "rate_max": 10.5, "tenure": (120, 360)},
        "PERSONAL": {"min": 50000, "max": 2000000, "rate_min": 10.0, "rate_max": 18.0, "tenure": (12, 60)},
        "AUTO": {"min": 200000, "max": 5000000, "rate_min": 8.0, "rate_max": 12.0, "tenure": (24, 84)},
        "EDUCATION": {"min": 100000, "max": 3000000, "rate_min": 8.5, "rate_max": 12.0, "tenure": (36, 120)},
        "BUSINESS": {"min": 500000, "max": 20000000, "rate_min": 9.0, "rate_max": 15.0, "tenure": (12, 120)},
        "GOLD": {"min": 50000, "max": 2000000, "rate_min": 7.0, "rate_max": 10.0, "tenure": (6, 36)},
    }
    loans = []
    for _ in range(count):
        loan_type = random.choice(list(loan_configs.keys()))
        cfg = loan_configs[loan_type]
        principal = round(random.uniform(cfg["min"], cfg["max"]), 2)
        rate = round(random.uniform(cfg["rate_min"], cfg["rate_max"]), 2)
        tenure = random.randint(*cfg["tenure"])
        # Simple EMI calculation
        monthly_rate = rate / 12 / 100
        emi = principal * monthly_rate * ((1 + monthly_rate) ** tenure) / (((1 + monthly_rate) ** tenure) - 1)
        disbursement = fake.date_between(start_date="-3y", end_date="-6m")
        maturity = disbursement + timedelta(days=tenure * 30)
        outstanding = round(random.uniform(0, float(principal)), 2)
        status = random.choices(
            ["ACTIVE", "CLOSED", "DEFAULT", "RESTRUCTURED"],
            weights=[60, 20, 10, 10],
        )[0]
        loans.append({
            "loan_id": f"LOAN-{_uid()}",
            "customer_id": random.choice(customers)["customer_id"],
            "loan_type": loan_type,
            "principal_amount": str(principal),
            "interest_rate": str(rate),
            "tenure_months": tenure,
            "emi_amount": str(round(emi, 2)),
            "disbursement_date": disbursement.isoformat(),
            "maturity_date": maturity.isoformat(),
            "outstanding_balance": str(outstanding),
            "status": status,
            "collateral_type": loan_type if loan_type in ("HOME", "AUTO", "GOLD") else None,
            "collateral_value": str(round(float(principal) * 1.2, 2)) if loan_type in ("HOME", "AUTO", "GOLD") else None,
        })
    return loans


def generate_emi_payments(loans: list[dict[str, Any]], emis_per_loan: int = 6) -> list[dict[str, Any]]:
    """Generate EMI payment history for each loan."""
    emi_payments = []
    for loan in loans:
        emi_amount = float(loan["emi_amount"])
        # Rough split: 60% interest early on, shifting to 60% principal later
        for i in range(1, emis_per_loan + 1):
            interest_ratio = max(0.2, 0.7 - (i * 0.05))
            interest_component = round(emi_amount * interest_ratio, 2)
            principal_component = round(emi_amount - interest_component, 2)
            due = date.fromisoformat(loan["disbursement_date"]) + timedelta(days=30 * i)
            is_overdue = random.random() < 0.08
            paid_date = due + timedelta(days=random.randint(1, 30)) if is_overdue else due - timedelta(days=random.randint(0, 5))
            emi_payments.append({
                "emi_id": f"EMI-{_uid()}",
                "loan_id": loan["loan_id"],
                "installment_number": i,
                "due_date": due.isoformat(),
                "paid_date": paid_date.isoformat() if loan["status"] != "DEFAULT" or i < emis_per_loan - 1 else None,
                "amount": str(emi_amount),
                "principal_component": str(principal_component),
                "interest_component": str(interest_component),
                "is_overdue": is_overdue,
                "penalty_amount": str(round(emi_amount * 0.02, 2)) if is_overdue else "0",
            })
    return emi_payments


# ─── Risk & Compliance ───────────────────────────────────────────────────

def generate_risk_alerts(customers: list[dict[str, Any]], accounts: list[dict[str, Any]], count: int = 40) -> list[dict[str, Any]]:
    """Generate AML/Fraud/Compliance alerts."""
    alert_rules = {
        "AML": [
            "Large cash deposit exceeding threshold",
            "Rapid movement of funds (structuring)",
            "Transactions with sanctioned country",
            "Unusual pattern: round-amount transfers",
        ],
        "FRAUD": [
            "Multiple failed login attempts",
            "Card used in two countries within 1 hour",
            "Sudden high-value transaction from dormant account",
            "Beneficiary change followed by large transfer",
        ],
        "SANCTIONS": [
            "Name match on OFAC SDN list",
            "Beneficiary bank in sanctioned jurisdiction",
            "Trade finance involving restricted goods",
        ],
        "UNUSUAL_ACTIVITY": [
            "Transaction velocity spike (5x normal)",
            "First-time international transfer over threshold",
            "Account accessed from new device + location",
        ],
        "THRESHOLD_BREACH": [
            "Single transaction exceeds INR 10,00,000",
            "Aggregate cash deposits exceed INR 50,00,000 in month",
            "Wire transfer exceeds daily limit",
        ],
    }
    risk_levels = {"AML": "HIGH", "FRAUD": "CRITICAL", "SANCTIONS": "CRITICAL", "UNUSUAL_ACTIVITY": "MEDIUM", "THRESHOLD_BREACH": "HIGH"}
    alerts = []
    for _ in range(count):
        alert_type = random.choice(list(alert_rules.keys()))
        customer = random.choice(customers)
        account = random.choice(accounts)
        is_resolved = random.random() < 0.4
        detected = fake.date_time_between(start_date="-6m")
        alerts.append({
            "alert_id": f"ALT-{_uid()}",
            "alert_type": alert_type,
            "risk_level": risk_levels[alert_type],
            "customer_id": customer["customer_id"],
            "account_id": account["account_id"],
            "transaction_id": f"TXN-{_uid()}",
            "description": random.choice(alert_rules[alert_type]),
            "rule_triggered": f"RULE-{alert_type}-{random.randint(100, 999)}",
            "amount_involved": str(round(random.uniform(100000, 10000000), 2)),
            "is_resolved": is_resolved,
            "resolution_notes": "Investigated and cleared - legitimate transaction" if is_resolved else None,
            "detected_at": detected.isoformat(),
            "resolved_at": (detected + timedelta(days=random.randint(1, 14))).isoformat() if is_resolved else None,
        })
    return alerts


def generate_suspicious_transactions(customers: list[dict[str, Any]], count: int = 15) -> list[dict[str, Any]]:
    """Generate Suspicious Transaction Reports (STRs)."""
    reasons = [
        "Multiple high-value cash deposits below reporting threshold (structuring)",
        "Frequent transfers to high-risk jurisdiction",
        "Sudden increase in transaction volume inconsistent with profile",
        "Circular fund movement between related accounts",
        "Large cash withdrawal followed by immediate deposit in different branch",
        "Trade-based money laundering indicators",
    ]
    strs = []
    for _ in range(count):
        customer = random.choice(customers)
        txn_ids = [f"TXN-{_uid()}" for _ in range(random.randint(2, 8))]
        reported = random.random() < 0.6
        strs.append({
            "str_id": f"STR-{_uid()}",
            "customer_id": customer["customer_id"],
            "transaction_ids": ",".join(txn_ids),
            "total_amount": str(round(random.uniform(500000, 50000000), 2)),
            "reason": random.choice(reasons),
            "reported_to_fiu": reported,
            "reporting_date": fake.date_between(start_date="-3m").isoformat() if reported else None,
            "created_at": fake.date_time_between(start_date="-6m").isoformat(),
        })
    return strs


def generate_all_sample_data(
    num_customers: int = 50,
    transactions_per_account: int = 10,
    num_payments: int = 200,
    num_card_txns: int = 200,
    num_loans: int = 30,
    emis_per_loan: int = 6,
    num_alerts: int = 40,
    num_strs: int = 15,
) -> dict[str, list[dict[str, Any]]]:
    """Generate a complete set of sample banking data across all domains."""
    customers = generate_customers(num_customers)
    accounts = generate_accounts(customers)
    transactions = generate_transactions(accounts, transactions_per_account)
    payments = generate_payments(accounts, num_payments)
    card_transactions = generate_card_transactions(num_card_txns)
    loans = generate_loans(customers, num_loans)
    emi_payments = generate_emi_payments(loans, emis_per_loan)
    risk_alerts = generate_risk_alerts(customers, accounts, num_alerts)
    suspicious_transactions = generate_suspicious_transactions(customers, num_strs)

    return {
        "customers": customers,
        "accounts": accounts,
        "transactions": transactions,
        "payments": payments,
        "card_transactions": card_transactions,
        "loans": loans,
        "emi_payments": emi_payments,
        "risk_alerts": risk_alerts,
        "suspicious_transactions": suspicious_transactions,
    }
