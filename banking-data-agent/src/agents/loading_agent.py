"""
Loading Agent — Handles bulk insertion of validated data into the PostgreSQL warehouse.
Supports batch inserts, upserts (ON CONFLICT), and transaction management.
"""

import logging
from datetime import datetime
from typing import Any

from src.database.connection import db_manager

logger = logging.getLogger(__name__)

# Column definitions for each table (order must match INSERT statements)
TABLE_COLUMNS: dict[str, list[str]] = {
    "customers": [
        "customer_id", "first_name", "last_name", "email", "phone",
        "date_of_birth", "pan_number", "aadhaar_hash", "address",
        "city", "state", "pincode", "kyc_status", "created_at",
    ],
    "accounts": [
        "account_id", "customer_id", "account_type", "balance",
        "currency", "branch_code", "ifsc_code", "is_active", "opened_date",
    ],
    "transactions": [
        "transaction_id", "account_id", "transaction_type", "amount",
        "currency", "description", "counterparty_account", "timestamp", "status",
    ],
    "payments": [
        "payment_id", "channel", "sender_account", "receiver_account",
        "amount", "currency", "reference_number", "status", "failure_reason", "timestamp",
    ],
    "card_transactions": [
        "transaction_id", "card_number_hash", "card_type",
        "merchant_name", "merchant_category", "amount", "currency",
        "location_city", "location_country", "is_international", "is_online", "timestamp",
    ],
    "loans": [
        "loan_id", "customer_id", "loan_type", "principal_amount",
        "interest_rate", "tenure_months", "emi_amount", "disbursement_date",
        "maturity_date", "outstanding_balance", "status", "collateral_type", "collateral_value",
    ],
    "emi_payments": [
        "emi_id", "loan_id", "installment_number", "due_date",
        "paid_date", "amount", "principal_component", "interest_component",
        "is_overdue", "penalty_amount",
    ],
    "risk_alerts": [
        "alert_id", "alert_type", "risk_level", "customer_id",
        "account_id", "transaction_id", "description", "rule_triggered",
        "amount_involved", "is_resolved", "resolution_notes", "detected_at", "resolved_at",
    ],
    "suspicious_transactions": [
        "str_id", "customer_id", "transaction_ids",
        "total_amount", "reason", "reported_to_fiu", "reporting_date", "created_at",
    ],
}


class LoadingAgent:
    """Agent responsible for loading validated data into the PostgreSQL warehouse."""

    def __init__(self, batch_size: int = 100) -> None:
        self._batch_size = batch_size

    def load_table(
        self,
        table_name: str,
        records: list[dict[str, Any]],
        upsert: bool = True,
    ) -> int:
        """
        Load records into a warehouse table.
        Uses ON CONFLICT DO UPDATE for idempotent upserts when upsert=True.
        Returns the number of records successfully loaded.
        """
        if not records:
            logger.info("No records to load for table '%s'", table_name)
            return 0

        columns = TABLE_COLUMNS.get(table_name)
        if not columns:
            raise ValueError(f"Unknown table: {table_name}")

        # Build the INSERT statement
        col_names = ", ".join(columns)
        placeholders = ", ".join(["%s"] * len(columns))
        pk = columns[0]  # First column is always the primary key

        if upsert:
            # Build SET clause for upsert (update all non-PK columns)
            update_cols = [c for c in columns if c != pk]
            set_clause = ", ".join(f"{c} = EXCLUDED.{c}" for c in update_cols)
            sql = (
                f"INSERT INTO {table_name} ({col_names}) VALUES ({placeholders}) "
                f"ON CONFLICT ({pk}) DO UPDATE SET {set_clause}"
            )
        else:
            sql = f"INSERT INTO {table_name} ({col_names}) VALUES ({placeholders})"

        loaded = 0

        # Process in batches
        for batch_start in range(0, len(records), self._batch_size):
            batch = records[batch_start : batch_start + self._batch_size]
            rows = []
            for record in batch:
                row = tuple(record.get(col) for col in columns)
                rows.append(row)

            try:
                with db_manager.cursor() as cur:
                    cur.executemany(sql, rows)
                loaded += len(rows)
                logger.debug(
                    "Loaded batch %d-%d into '%s'",
                    batch_start, batch_start + len(rows), table_name,
                )
            except Exception as e:
                logger.error(
                    "Failed to load batch %d-%d into '%s': %s",
                    batch_start, batch_start + len(rows), table_name, e,
                )
                # Try inserting records individually to isolate failures
                loaded += self._load_individually(sql, rows, columns, table_name)

        logger.info("Loaded %d/%d records into '%s'", loaded, len(records), table_name)
        return loaded

    def log_ingestion(
        self,
        batch_id: str,
        domain: str,
        table_name: str,
        records_received: int,
        records_valid: int,
        records_invalid: int,
        records_loaded: int,
        status: str = "COMPLETED",
        error_message: str | None = None,
        ai_insights: str | None = None,
    ) -> None:
        """Write an entry to the ingestion_log metadata table."""
        sql = """
            INSERT INTO ingestion_log
                (batch_id, domain, table_name, records_received, records_valid,
                 records_invalid, records_loaded, status, error_message, ai_insights, completed_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        with db_manager.cursor() as cur:
            cur.execute(sql, (
                batch_id, domain, table_name,
                records_received, records_valid, records_invalid, records_loaded,
                status, error_message, ai_insights,
                datetime.utcnow() if status in ("COMPLETED", "FAILED") else None,
            ))

    @staticmethod
    def _load_individually(
        sql: str,
        rows: list[tuple[Any, ...]],
        columns: list[str],
        table_name: str,
    ) -> int:
        """Insert records one by one to isolate failures."""
        loaded = 0
        for row in rows:
            try:
                with db_manager.cursor() as cur:
                    cur.execute(sql, row)
                loaded += 1
            except Exception as e:
                pk_value = row[0] if row else "unknown"
                logger.error(
                    "Failed to insert record %s into '%s': %s",
                    pk_value, table_name, e,
                )
        return loaded
