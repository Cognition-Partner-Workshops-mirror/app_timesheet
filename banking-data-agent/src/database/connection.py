"""
PostgreSQL connection manager with connection pooling and schema initialization.
"""

import logging
from contextlib import contextmanager
from typing import Generator

import psycopg2
from psycopg2.extras import RealDictCursor

from src.config import config
from src.database.schema import SCHEMA_SQL

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Manages PostgreSQL connections and schema lifecycle."""

    def __init__(self) -> None:
        self._conn_params = {
            "host": config.db.host,
            "port": config.db.port,
            "dbname": config.db.name,
            "user": config.db.user,
            "password": config.db.password,
        }

    def get_connection(self) -> psycopg2.extensions.connection:
        """Create and return a new database connection."""
        return psycopg2.connect(**self._conn_params)

    @contextmanager
    def cursor(self, dict_cursor: bool = False) -> Generator:
        """Context manager yielding a database cursor with auto-commit."""
        conn = self.get_connection()
        try:
            cursor_factory = RealDictCursor if dict_cursor else None
            cur = conn.cursor(cursor_factory=cursor_factory)
            yield cur
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def initialize_schema(self) -> None:
        """Create all warehouse tables if they don't exist."""
        logger.info("Initializing banking warehouse schema...")
        with self.cursor() as cur:
            cur.execute(SCHEMA_SQL)
        logger.info("Schema initialization complete.")

    def get_table_counts(self) -> dict[str, int]:
        """Return row counts for all warehouse tables."""
        tables = [
            "customers", "accounts", "transactions",
            "payments", "card_transactions",
            "loans", "emi_payments",
            "risk_alerts", "suspicious_transactions",
            "ingestion_log",
        ]
        counts: dict[str, int] = {}
        with self.cursor() as cur:
            for table in tables:
                cur.execute(f"SELECT COUNT(*) FROM {table}")  # noqa: S608 — table names are hardcoded
                row = cur.fetchone()
                counts[table] = row[0] if row else 0
        return counts

    def truncate_all(self) -> None:
        """Truncate all warehouse tables (for testing/reset)."""
        logger.warning("Truncating all warehouse tables!")
        with self.cursor() as cur:
            cur.execute("""
                TRUNCATE TABLE suspicious_transactions, risk_alerts,
                    emi_payments, loans,
                    card_transactions, payments,
                    transactions, accounts, customers,
                    ingestion_log
                CASCADE
            """)
        logger.info("All tables truncated.")


# Singleton instance
db_manager = DatabaseManager()
