"""
Transformation & Validation Agent — AI-powered data cleaning, enrichment, and validation.
Validates records against Pydantic models, flags anomalies, and uses GPT-4
for intelligent data quality assessment.
"""

import json
import logging
from typing import Any

from pydantic import ValidationError
from openai import OpenAI

from src.config import config
from src.models.banking_models import (
    Account, CardTransaction, Customer, EMIPayment,
    Loan, Payment, RiskAlert, SuspiciousTransaction, Transaction,
)

logger = logging.getLogger(__name__)

# Map table names to their Pydantic model classes
TABLE_MODEL_MAP: dict[str, type] = {
    "customers": Customer,
    "accounts": Account,
    "transactions": Transaction,
    "payments": Payment,
    "card_transactions": CardTransaction,
    "loans": Loan,
    "emi_payments": EMIPayment,
    "risk_alerts": RiskAlert,
    "suspicious_transactions": SuspiciousTransaction,
}


class TransformationAgent:
    """AI-powered agent that validates, transforms, and enriches banking data."""

    def __init__(self) -> None:
        self._client = OpenAI(api_key=config.agent.openai_api_key) if config.agent.openai_api_key else None

    def validate_records(
        self, records: list[dict[str, Any]], table_name: str
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """
        Validate records against the Pydantic model for the given table.
        Returns (valid_records, invalid_records_with_errors).
        """
        model_class = TABLE_MODEL_MAP.get(table_name)
        if not model_class:
            logger.warning("No validation model for table '%s', passing all records through", table_name)
            return records, []

        valid: list[dict[str, Any]] = []
        invalid: list[dict[str, Any]] = []

        for record in records:
            try:
                # Pre-process: convert comma-separated strings to lists where needed
                prepared = self._prepare_record(record, table_name)
                validated = model_class(**prepared)
                # Convert back to dict for loading, handling Decimal → str
                dumped = json.loads(validated.model_dump_json())
                # Post-process: convert lists back to comma-separated for DB storage
                dumped = self._post_process_record(dumped, table_name)
                valid.append(dumped)
            except ValidationError as e:
                invalid.append({
                    "record": record,
                    "errors": e.errors(),
                })

        logger.info(
            "Validation for '%s': %d valid, %d invalid out of %d total",
            table_name, len(valid), len(invalid), len(records),
        )
        return valid, invalid

    def clean_and_transform(
        self, records: list[dict[str, Any]], table_name: str
    ) -> list[dict[str, Any]]:
        """
        Apply data cleaning transformations:
        - Strip whitespace from strings
        - Normalize empty values to None
        - Standardize date formats
        - Remove duplicate IDs
        """
        cleaned = []
        seen_ids: set[str] = set()

        # Detect the primary key field for dedup
        pk_field = self._get_primary_key(table_name)

        for record in records:
            # Deduplication by primary key
            pk_value = record.get(pk_field, "")
            if pk_value in seen_ids:
                logger.debug("Duplicate record skipped: %s=%s", pk_field, pk_value)
                continue
            seen_ids.add(pk_value)

            # Clean each field
            cleaned_record: dict[str, Any] = {}
            for key, value in record.items():
                cleaned_record[key] = self._clean_value(value)
            cleaned.append(cleaned_record)

        logger.info(
            "Cleaned '%s': %d records → %d (removed %d duplicates)",
            table_name, len(records), len(cleaned), len(records) - len(cleaned),
        )
        return cleaned

    def detect_anomalies(self, records: list[dict[str, Any]], table_name: str) -> list[dict[str, Any]]:
        """
        Use AI to detect data quality anomalies in a batch of records.
        Returns a list of anomaly descriptions.
        """
        if not self._client or not records:
            return self._rule_based_anomaly_detection(records, table_name)

        # Send a sample to AI for analysis
        sample = records[:10]
        sample_json = json.dumps(sample, default=str, indent=2)

        prompt = f"""Analyze this sample of banking data from the '{table_name}' table for data quality issues.

Sample data ({len(sample)} of {len(records)} total records):
{sample_json}

Look for:
1. Suspicious patterns (e.g., unusually large amounts, invalid dates)
2. Data consistency issues (e.g., mismatched fields)
3. Potential data quality concerns
4. Any anomalies specific to banking/financial data

Return a JSON array of anomaly objects, each with:
- "severity": "LOW" | "MEDIUM" | "HIGH"
- "field": the field name involved
- "description": brief description of the issue
- "affected_records": estimated count of affected records

If no anomalies found, return an empty array [].
Only return valid JSON, nothing else."""

        try:
            response = self._client.chat.completions.create(
                model=config.agent.openai_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1000,
                temperature=0.1,
            )
            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            anomalies = json.loads(content)
            logger.info("AI detected %d anomalies in '%s'", len(anomalies), table_name)
            return anomalies
        except Exception as e:
            logger.warning("AI anomaly detection failed, using rules: %s", e)

        return self._rule_based_anomaly_detection(records, table_name)

    def generate_data_quality_report(
        self,
        table_name: str,
        total_records: int,
        valid_count: int,
        invalid_count: int,
        anomalies: list[dict[str, Any]],
    ) -> str:
        """Use AI to generate a human-readable data quality report."""
        if not self._client:
            return self._generate_basic_report(
                table_name, total_records, valid_count, invalid_count, anomalies
            )

        anomaly_summary = json.dumps(anomalies, default=str) if anomalies else "No anomalies detected"

        prompt = f"""Generate a concise data quality report for a banking data warehouse ingestion.

Table: {table_name}
Total records: {total_records}
Valid records: {valid_count}
Invalid records: {invalid_count}
Anomalies detected: {anomaly_summary}

Write a brief professional report (3-5 sentences) summarizing the data quality,
highlighting any concerns, and recommending actions if needed."""

        try:
            response = self._client.chat.completions.create(
                model=config.agent.openai_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.3,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.warning("AI report generation failed: %s", e)

        return self._generate_basic_report(
            table_name, total_records, valid_count, invalid_count, anomalies
        )

    # ─── Internal Helpers ─────────────────────────────────────────────────

    @staticmethod
    def _get_primary_key(table_name: str) -> str:
        """Return the primary key field name for a given table."""
        pk_map = {
            "customers": "customer_id",
            "accounts": "account_id",
            "transactions": "transaction_id",
            "payments": "payment_id",
            "card_transactions": "transaction_id",
            "loans": "loan_id",
            "emi_payments": "emi_id",
            "risk_alerts": "alert_id",
            "suspicious_transactions": "str_id",
        }
        return pk_map.get(table_name, "id")

    @staticmethod
    def _prepare_record(record: dict[str, Any], table_name: str) -> dict[str, Any]:
        """Pre-process a record before Pydantic validation (e.g., type coercion)."""
        prepared = dict(record)
        if table_name == "suspicious_transactions":
            # Convert comma-separated transaction_ids string to a list
            txn_ids = prepared.get("transaction_ids", "")
            if isinstance(txn_ids, str):
                prepared["transaction_ids"] = [t.strip() for t in txn_ids.split(",") if t.strip()]
        return prepared

    @staticmethod
    def _post_process_record(record: dict[str, Any], table_name: str) -> dict[str, Any]:
        """Post-process a validated record before DB insertion (e.g., list → string)."""
        processed = dict(record)
        if table_name == "suspicious_transactions":
            # Convert list back to comma-separated string for TEXT column storage
            txn_ids = processed.get("transaction_ids", [])
            if isinstance(txn_ids, list):
                processed["transaction_ids"] = ",".join(txn_ids)
        return processed

    @staticmethod
    def _clean_value(value: Any) -> Any:
        """Clean an individual field value."""
        if isinstance(value, str):
            value = value.strip()
            if value in ("", "null", "None", "N/A", "NA", "n/a"):
                return None
        return value

    @staticmethod
    def _rule_based_anomaly_detection(records: list[dict[str, Any]], table_name: str) -> list[dict[str, Any]]:
        """Fallback rule-based anomaly detection for common banking data issues."""
        anomalies: list[dict[str, Any]] = []
        if not records:
            return anomalies

        # Check for amount-related anomalies
        amount_fields = ["amount", "balance", "principal_amount", "total_amount", "emi_amount"]
        for field in amount_fields:
            values = [float(r[field]) for r in records if r.get(field) is not None]
            if values:
                max_val = max(values)
                avg_val = sum(values) / len(values)
                if max_val > avg_val * 10:
                    anomalies.append({
                        "severity": "MEDIUM",
                        "field": field,
                        "description": f"Outlier detected: max {field} ({max_val:,.2f}) is >10x the average ({avg_val:,.2f})",
                        "affected_records": sum(1 for v in values if v > avg_val * 5),
                    })

        # Check for null ratio
        for field in records[0].keys():
            null_count = sum(1 for r in records if r.get(field) is None or r.get(field) == "")
            null_ratio = null_count / len(records)
            if null_ratio > 0.5 and field not in ("failure_reason", "resolution_notes", "resolved_at",
                                                    "counterparty_account", "collateral_type",
                                                    "collateral_value", "paid_date", "reporting_date"):
                anomalies.append({
                    "severity": "LOW",
                    "field": field,
                    "description": f"High null ratio ({null_ratio:.0%}) in field '{field}'",
                    "affected_records": null_count,
                })

        return anomalies

    @staticmethod
    def _generate_basic_report(
        table_name: str,
        total_records: int,
        valid_count: int,
        invalid_count: int,
        anomalies: list[dict[str, Any]],
    ) -> str:
        """Generate a basic text report without AI."""
        validity_rate = (valid_count / total_records * 100) if total_records > 0 else 0
        report = (
            f"Data Quality Report — {table_name}\n"
            f"{'=' * 50}\n"
            f"Total records: {total_records}\n"
            f"Valid: {valid_count} ({validity_rate:.1f}%)\n"
            f"Invalid: {invalid_count}\n"
            f"Anomalies detected: {len(anomalies)}\n"
        )
        if anomalies:
            report += "\nAnomalies:\n"
            for a in anomalies:
                report += f"  [{a.get('severity', 'INFO')}] {a.get('field', '?')}: {a.get('description', '')}\n"
        return report
