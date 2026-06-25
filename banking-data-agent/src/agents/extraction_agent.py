"""
Extraction Agent — Handles data extraction from multiple source types.
Supports CSV files, JSON files, API endpoints, and in-memory data.
Uses AI to auto-detect schemas and map source fields to warehouse columns.
"""

import csv
import io
import json
import logging
from pathlib import Path
from typing import Any

from openai import OpenAI

from src.config import config

logger = logging.getLogger(__name__)


class ExtractionAgent:
    """AI-powered agent that extracts and normalizes data from various sources."""

    def __init__(self) -> None:
        self._client = OpenAI(api_key=config.agent.openai_api_key) if config.agent.openai_api_key else None

    def extract_from_csv(self, file_path: str) -> list[dict[str, Any]]:
        """Extract records from a CSV file."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"CSV file not found: {file_path}")

        logger.info("Extracting data from CSV: %s", file_path)
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            records = list(reader)

        logger.info("Extracted %d records from CSV", len(records))
        return records

    def extract_from_json(self, file_path: str) -> list[dict[str, Any]]:
        """Extract records from a JSON file (expects a list of objects or an object with a data key)."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"JSON file not found: {file_path}")

        logger.info("Extracting data from JSON: %s", file_path)
        with open(path, encoding="utf-8") as f:
            raw = json.load(f)

        # Handle both list and dict-with-data-key formats
        if isinstance(raw, list):
            records = raw
        elif isinstance(raw, dict):
            # Look for a common data key
            for key in ("data", "records", "results", "items", "rows"):
                if key in raw and isinstance(raw[key], list):
                    records = raw[key]
                    break
            else:
                records = [raw]
        else:
            raise ValueError(f"Unexpected JSON structure in {file_path}")

        logger.info("Extracted %d records from JSON", len(records))
        return records

    def extract_from_memory(self, data: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Pass-through for in-memory data (e.g., from data generators)."""
        logger.info("Extracting %d records from in-memory source", len(data))
        return data

    def auto_detect_domain(self, sample_records: list[dict[str, Any]]) -> str:
        """
        Use AI to detect which banking domain a dataset belongs to
        based on its field names and sample values.
        """
        if not self._client:
            return self._rule_based_domain_detection(sample_records)

        # Take a small sample to send to the AI
        sample = sample_records[:3]
        fields = list(sample[0].keys()) if sample else []

        prompt = f"""Analyze these banking data fields and classify the dataset into exactly one domain.

Fields: {fields}
Sample record: {json.dumps(sample[0], default=str) if sample else "{}"}

Domains to choose from:
- CORE_BANKING (customers, accounts, transactions)
- PAYMENTS (payment channels, UPI, NEFT, card transactions)
- LENDING (loans, EMIs, disbursements)
- RISK_COMPLIANCE (AML alerts, fraud, suspicious transactions)

Reply with ONLY the domain name, nothing else."""

        try:
            response = self._client.chat.completions.create(
                model=config.agent.openai_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=20,
                temperature=0,
            )
            domain = response.choices[0].message.content.strip().upper()
            # Validate the response is one of the expected domains
            valid_domains = {"CORE_BANKING", "PAYMENTS", "LENDING", "RISK_COMPLIANCE"}
            if domain in valid_domains:
                logger.info("AI detected domain: %s", domain)
                return domain
        except Exception as e:
            logger.warning("AI domain detection failed, falling back to rules: %s", e)

        return self._rule_based_domain_detection(sample_records)

    def auto_map_fields(self, source_fields: list[str], target_table: str) -> dict[str, str]:
        """
        Use AI to map source field names to warehouse column names.
        Returns a mapping dict: {source_field: target_column}.
        """
        # Target schemas for each table
        target_schemas = {
            "customers": ["customer_id", "first_name", "last_name", "email", "phone",
                          "date_of_birth", "pan_number", "aadhaar_hash", "address",
                          "city", "state", "pincode", "kyc_status", "created_at"],
            "accounts": ["account_id", "customer_id", "account_type", "balance",
                         "currency", "branch_code", "ifsc_code", "is_active", "opened_date"],
            "transactions": ["transaction_id", "account_id", "transaction_type", "amount",
                             "currency", "description", "counterparty_account", "timestamp", "status"],
            "payments": ["payment_id", "channel", "sender_account", "receiver_account",
                         "amount", "currency", "reference_number", "status", "failure_reason", "timestamp"],
            "card_transactions": ["transaction_id", "card_number_hash", "card_type",
                                  "merchant_name", "merchant_category", "amount", "currency",
                                  "location_city", "location_country", "is_international", "is_online", "timestamp"],
            "loans": ["loan_id", "customer_id", "loan_type", "principal_amount",
                      "interest_rate", "tenure_months", "emi_amount", "disbursement_date",
                      "maturity_date", "outstanding_balance", "status", "collateral_type", "collateral_value"],
            "emi_payments": ["emi_id", "loan_id", "installment_number", "due_date",
                             "paid_date", "amount", "principal_component", "interest_component",
                             "is_overdue", "penalty_amount"],
            "risk_alerts": ["alert_id", "alert_type", "risk_level", "customer_id",
                            "account_id", "transaction_id", "description", "rule_triggered",
                            "amount_involved", "is_resolved", "resolution_notes", "detected_at", "resolved_at"],
            "suspicious_transactions": ["str_id", "customer_id", "transaction_ids",
                                        "total_amount", "reason", "reported_to_fiu", "reporting_date", "created_at"],
        }

        target_columns = target_schemas.get(target_table, [])

        if not self._client:
            return self._rule_based_field_mapping(source_fields, target_columns)

        prompt = f"""Map these source fields to target warehouse columns.

Source fields: {source_fields}
Target columns: {target_columns}

Return a JSON object mapping each source field to its best matching target column.
If no match exists, map it to null.
Only return valid JSON, nothing else."""

        try:
            response = self._client.chat.completions.create(
                model=config.agent.openai_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0,
            )
            content = response.choices[0].message.content.strip()
            # Strip markdown code fences if present
            if content.startswith("```"):
                content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            mapping = json.loads(content)
            logger.info("AI field mapping generated for table '%s'", target_table)
            return {k: v for k, v in mapping.items() if v is not None}
        except Exception as e:
            logger.warning("AI field mapping failed, falling back to rules: %s", e)

        return self._rule_based_field_mapping(source_fields, target_columns)

    @staticmethod
    def _rule_based_domain_detection(records: list[dict[str, Any]]) -> str:
        """Fallback rule-based domain detection using field name heuristics."""
        if not records:
            return "CORE_BANKING"

        fields = set(records[0].keys())
        fields_lower = {f.lower() for f in fields}

        # Check for domain-specific indicator fields
        if fields_lower & {"loan_id", "loan_type", "emi_amount", "principal_amount", "tenure_months"}:
            return "LENDING"
        if fields_lower & {"emi_id", "installment_number", "principal_component", "interest_component"}:
            return "LENDING"
        if fields_lower & {"alert_id", "alert_type", "risk_level", "rule_triggered"}:
            return "RISK_COMPLIANCE"
        if fields_lower & {"str_id", "reported_to_fiu", "suspicious"}:
            return "RISK_COMPLIANCE"
        if fields_lower & {"payment_id", "channel", "sender_account", "receiver_account"}:
            return "PAYMENTS"
        if fields_lower & {"card_number_hash", "merchant_name", "merchant_category", "is_international"}:
            return "PAYMENTS"
        if fields_lower & {"customer_id", "pan_number", "aadhaar_hash", "kyc_status"}:
            return "CORE_BANKING"
        if fields_lower & {"account_id", "account_type", "balance", "ifsc_code"}:
            return "CORE_BANKING"
        if fields_lower & {"transaction_id", "transaction_type", "counterparty_account"}:
            return "CORE_BANKING"

        return "CORE_BANKING"

    @staticmethod
    def _rule_based_field_mapping(source_fields: list[str], target_columns: list[str]) -> dict[str, str]:
        """Fallback exact/normalized name matching for field mapping."""
        mapping: dict[str, str] = {}
        target_set = set(target_columns)
        target_lower = {t.lower(): t for t in target_columns}

        for field in source_fields:
            # Exact match
            if field in target_set:
                mapping[field] = field
            # Case-insensitive match
            elif field.lower() in target_lower:
                mapping[field] = target_lower[field.lower()]

        return mapping
