"""
Monitoring & Alerting Agent — Provides real-time visibility into the data pipeline.
Tracks ingestion metrics, data quality trends, and generates AI-powered insights.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Any

from openai import OpenAI

from src.config import config
from src.database.connection import db_manager

logger = logging.getLogger(__name__)


class MonitoringAgent:
    """Agent that monitors pipeline health, data quality, and generates insights."""

    def __init__(self) -> None:
        self._client = OpenAI(api_key=config.agent.openai_api_key) if config.agent.openai_api_key else None

    def get_pipeline_status(self) -> dict[str, Any]:
        """Retrieve current pipeline status: table counts, recent ingestions, and health."""
        table_counts = db_manager.get_table_counts()

        # Get recent ingestion logs
        recent_logs = self._get_recent_ingestion_logs(hours=24)

        # Calculate health metrics
        total_records = sum(table_counts.values()) - table_counts.get("ingestion_log", 0)
        total_ingestions = len(recent_logs)
        failed_ingestions = sum(1 for log in recent_logs if log.get("status") == "FAILED")
        total_received = sum(log.get("records_received", 0) for log in recent_logs)
        total_loaded = sum(log.get("records_loaded", 0) for log in recent_logs)
        load_rate = (total_loaded / total_received * 100) if total_received > 0 else 0

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "warehouse_status": {
                "table_counts": table_counts,
                "total_records_in_warehouse": total_records,
            },
            "pipeline_health": {
                "ingestions_last_24h": total_ingestions,
                "failed_ingestions": failed_ingestions,
                "records_received": total_received,
                "records_loaded": total_loaded,
                "load_success_rate": f"{load_rate:.1f}%",
                "health_status": self._classify_health(load_rate, failed_ingestions),
            },
            "recent_ingestion_logs": recent_logs[:10],
        }

    def generate_insights(self) -> str:
        """Use AI to generate actionable insights from current pipeline state."""
        status = self.get_pipeline_status()

        if not self._client:
            return self._generate_basic_insights(status)

        prompt = f"""You are a banking data warehouse monitoring agent. Analyze the current pipeline status and provide actionable insights.

Pipeline Status:
{json.dumps(status, default=str, indent=2)}

Provide:
1. Overall health assessment (1-2 sentences)
2. Key observations about data volumes and distribution
3. Any concerns or recommended actions
4. Data quality trends

Keep it concise and professional (max 200 words). Focus on banking-specific insights."""

        try:
            response = self._client.chat.completions.create(
                model=config.agent.openai_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=400,
                temperature=0.3,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.warning("AI insights generation failed: %s", e)

        return self._generate_basic_insights(status)

    def check_data_freshness(self) -> dict[str, Any]:
        """Check how recent the data is in each warehouse table."""
        freshness: dict[str, Any] = {}
        tables_with_timestamp = {
            "customers": "created_at",
            "transactions": "timestamp",
            "payments": "timestamp",
            "card_transactions": "timestamp",
            "risk_alerts": "detected_at",
            "suspicious_transactions": "created_at",
        }

        for table, ts_col in tables_with_timestamp.items():
            try:
                with db_manager.cursor(dict_cursor=True) as cur:
                    cur.execute(f"SELECT MAX({ts_col}) as latest, MIN({ts_col}) as earliest, COUNT(*) as total FROM {table}")  # noqa: S608
                    row = cur.fetchone()
                    if row and row["latest"]:
                        freshness[table] = {
                            "latest_record": str(row["latest"]),
                            "earliest_record": str(row["earliest"]),
                            "total_records": row["total"],
                        }
                    else:
                        freshness[table] = {"latest_record": None, "total_records": 0}
            except Exception as e:
                freshness[table] = {"error": str(e)}

        return freshness

    def get_domain_summary(self) -> dict[str, Any]:
        """Generate a summary of data across all banking domains."""
        summary: dict[str, Any] = {}

        # Core Banking summary
        try:
            with db_manager.cursor(dict_cursor=True) as cur:
                cur.execute("SELECT COUNT(*) as total, COUNT(DISTINCT customer_id) as unique_customers FROM customers")
                row = cur.fetchone()
                cur.execute("SELECT account_type, COUNT(*) as count FROM accounts GROUP BY account_type")
                account_breakdown = {r["account_type"]: r["count"] for r in cur.fetchall()}
                summary["core_banking"] = {
                    "total_customers": row["total"] if row else 0,
                    "account_breakdown": account_breakdown,
                }
        except Exception as e:
            summary["core_banking"] = {"error": str(e)}

        # Payments summary
        try:
            with db_manager.cursor(dict_cursor=True) as cur:
                cur.execute("SELECT channel, COUNT(*) as count, SUM(amount) as total_amount FROM payments GROUP BY channel")
                rows = cur.fetchall()
                summary["payments"] = {
                    "by_channel": {r["channel"]: {"count": r["count"], "total_amount": float(r["total_amount"] or 0)} for r in rows},
                }
        except Exception as e:
            summary["payments"] = {"error": str(e)}

        # Lending summary
        try:
            with db_manager.cursor(dict_cursor=True) as cur:
                cur.execute("""
                    SELECT loan_type, status, COUNT(*) as count,
                           SUM(principal_amount) as total_principal,
                           SUM(outstanding_balance) as total_outstanding
                    FROM loans GROUP BY loan_type, status
                """)
                rows = cur.fetchall()
                summary["lending"] = {"loan_breakdown": [dict(r) for r in rows]}
        except Exception as e:
            summary["lending"] = {"error": str(e)}

        # Risk & Compliance summary
        try:
            with db_manager.cursor(dict_cursor=True) as cur:
                cur.execute("""
                    SELECT alert_type, risk_level, COUNT(*) as count,
                           SUM(CASE WHEN is_resolved THEN 1 ELSE 0 END) as resolved
                    FROM risk_alerts GROUP BY alert_type, risk_level
                """)
                rows = cur.fetchall()
                summary["risk_compliance"] = {"alert_breakdown": [dict(r) for r in rows]}
        except Exception as e:
            summary["risk_compliance"] = {"error": str(e)}

        return summary

    # ─── Internal Helpers ─────────────────────────────────────────────────

    @staticmethod
    def _get_recent_ingestion_logs(hours: int = 24) -> list[dict[str, Any]]:
        """Fetch recent ingestion log entries."""
        try:
            with db_manager.cursor(dict_cursor=True) as cur:
                cur.execute(
                    """
                    SELECT * FROM ingestion_log
                    WHERE started_at > NOW() - INTERVAL '%s hours'
                    ORDER BY started_at DESC
                    """,
                    (hours,),
                )
                return [dict(row) for row in cur.fetchall()]
        except Exception as e:
            logger.error("Failed to fetch ingestion logs: %s", e)
            return []

    @staticmethod
    def _classify_health(load_rate: float, failed_count: int) -> str:
        """Classify pipeline health based on metrics."""
        if load_rate >= 95 and failed_count == 0:
            return "HEALTHY"
        if load_rate >= 80 and failed_count <= 2:
            return "WARNING"
        return "CRITICAL"

    @staticmethod
    def _generate_basic_insights(status: dict[str, Any]) -> str:
        """Generate basic insights without AI."""
        wh = status.get("warehouse_status", {})
        ph = status.get("pipeline_health", {})
        total = wh.get("total_records_in_warehouse", 0)
        health = ph.get("health_status", "UNKNOWN")
        rate = ph.get("load_success_rate", "N/A")

        return (
            f"Pipeline Health: {health}\n"
            f"Total records in warehouse: {total:,}\n"
            f"Load success rate (24h): {rate}\n"
            f"Ingestions in last 24h: {ph.get('ingestions_last_24h', 0)}\n"
            f"Failed ingestions: {ph.get('failed_ingestions', 0)}\n"
        )
