"""
Pipeline Orchestrator — Coordinates all agents to run the full data injection pipeline.
Manages the end-to-end flow: Generate/Extract → Transform/Validate → Load → Monitor.
"""

import logging
import uuid
from datetime import datetime
from typing import Any

from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn
from rich.table import Table

from src.agents.extraction_agent import ExtractionAgent
from src.agents.transformation_agent import TransformationAgent
from src.agents.loading_agent import LoadingAgent
from src.agents.monitoring_agent import MonitoringAgent
from src.data_generators.banking_data_generator import generate_all_sample_data
from src.database.connection import db_manager

logger = logging.getLogger(__name__)
console = Console()

# Ordered list of tables to load, respecting foreign key dependencies
LOAD_ORDER = [
    "customers",
    "accounts",
    "transactions",
    "payments",
    "card_transactions",
    "loans",
    "emi_payments",
    "risk_alerts",
    "suspicious_transactions",
]

# Map each table to its banking domain
TABLE_DOMAIN_MAP = {
    "customers": "CORE_BANKING",
    "accounts": "CORE_BANKING",
    "transactions": "CORE_BANKING",
    "payments": "PAYMENTS",
    "card_transactions": "PAYMENTS",
    "loans": "LENDING",
    "emi_payments": "LENDING",
    "risk_alerts": "RISK_COMPLIANCE",
    "suspicious_transactions": "RISK_COMPLIANCE",
}


class PipelineOrchestrator:
    """
    Coordinates the full ETL pipeline across all banking domains.
    Manages agent lifecycle, error handling, and reporting.
    """

    def __init__(self) -> None:
        self.extraction_agent = ExtractionAgent()
        self.transformation_agent = TransformationAgent()
        self.loading_agent = LoadingAgent()
        self.monitoring_agent = MonitoringAgent()
        self.batch_id = f"BATCH-{uuid.uuid4().hex[:8].upper()}"

    def run_full_pipeline(
        self,
        source: str = "generate",
        source_path: str | None = None,
        reset_warehouse: bool = False,
    ) -> dict[str, Any]:
        """
        Execute the complete data injection pipeline.

        Args:
            source: Data source type — "generate" for sample data,
                    "csv" or "json" for file-based extraction.
            source_path: File path when source is "csv" or "json".
            reset_warehouse: If True, truncate all tables before loading.
        """
        console.print(Panel(
            f"[bold cyan]Banking Data Injection AI Agent[/bold cyan]\n"
            f"Batch ID: {self.batch_id}\n"
            f"Source: {source}\n"
            f"Started: {datetime.utcnow().isoformat()}",
            title="Pipeline Start",
        ))

        # Step 1: Initialize warehouse schema
        console.print("\n[bold]Step 1:[/bold] Initializing warehouse schema...")
        db_manager.initialize_schema()
        if reset_warehouse:
            console.print("[yellow]Resetting warehouse (truncating all tables)...[/yellow]")
            db_manager.truncate_all()
        console.print("[green]Schema ready.[/green]")

        # Step 2: Extract data
        console.print("\n[bold]Step 2:[/bold] Extracting data...")
        raw_data = self._extract_data(source, source_path)
        self._print_extraction_summary(raw_data)

        # Step 3: Transform, validate, and load each table
        console.print("\n[bold]Step 3:[/bold] Processing and loading data...\n")
        pipeline_results: dict[str, dict[str, Any]] = {}

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            console=console,
        ) as progress:
            task = progress.add_task("Loading tables...", total=len(LOAD_ORDER))

            for table_name in LOAD_ORDER:
                records = raw_data.get(table_name, [])
                if not records:
                    progress.update(task, advance=1, description=f"Skipping {table_name} (no data)")
                    continue

                progress.update(task, description=f"Processing {table_name}...")
                result = self._process_table(table_name, records)
                pipeline_results[table_name] = result
                progress.update(task, advance=1)

        # Step 4: Generate monitoring report
        console.print("\n[bold]Step 4:[/bold] Generating pipeline report...\n")
        self._print_results_table(pipeline_results)

        # Step 5: AI insights
        console.print("\n[bold]Step 5:[/bold] Generating AI insights...\n")
        insights = self.monitoring_agent.generate_insights()
        console.print(Panel(insights, title="AI Pipeline Insights", border_style="cyan"))

        # Step 6: Domain summary
        console.print("\n[bold]Step 6:[/bold] Domain summary...\n")
        domain_summary = self.monitoring_agent.get_domain_summary()
        self._print_domain_summary(domain_summary)

        console.print(Panel(
            f"[bold green]Pipeline completed successfully![/bold green]\n"
            f"Batch ID: {self.batch_id}\n"
            f"Completed: {datetime.utcnow().isoformat()}",
            title="Pipeline Complete",
        ))

        return {
            "batch_id": self.batch_id,
            "results": pipeline_results,
            "insights": insights,
            "domain_summary": domain_summary,
        }

    def _extract_data(self, source: str, source_path: str | None) -> dict[str, list[dict[str, Any]]]:
        """Extract data based on the specified source type."""
        if source == "generate":
            console.print("[cyan]Generating sample banking data...[/cyan]")
            return generate_all_sample_data()
        elif source == "csv" and source_path:
            records = self.extraction_agent.extract_from_csv(source_path)
            domain = self.extraction_agent.auto_detect_domain(records)
            table = self._domain_to_default_table(domain)
            return {table: records}
        elif source == "json" and source_path:
            records = self.extraction_agent.extract_from_json(source_path)
            domain = self.extraction_agent.auto_detect_domain(records)
            table = self._domain_to_default_table(domain)
            return {table: records}
        else:
            raise ValueError(f"Invalid source: {source}. Use 'generate', 'csv', or 'json'.")

    def _process_table(self, table_name: str, records: list[dict[str, Any]]) -> dict[str, Any]:
        """Run the full transform → validate → load pipeline for one table."""
        domain = TABLE_DOMAIN_MAP.get(table_name, "UNKNOWN")
        total = len(records)

        try:
            # Clean and transform
            cleaned = self.transformation_agent.clean_and_transform(records, table_name)

            # Validate against Pydantic models
            valid, invalid = self.transformation_agent.validate_records(cleaned, table_name)

            # Detect anomalies
            anomalies = self.transformation_agent.detect_anomalies(valid, table_name)

            # Generate quality report
            quality_report = self.transformation_agent.generate_data_quality_report(
                table_name, total, len(valid), len(invalid), anomalies,
            )

            # Load into warehouse
            loaded = self.loading_agent.load_table(table_name, valid)

            # Log ingestion metadata
            self.loading_agent.log_ingestion(
                batch_id=self.batch_id,
                domain=domain,
                table_name=table_name,
                records_received=total,
                records_valid=len(valid),
                records_invalid=len(invalid),
                records_loaded=loaded,
                status="COMPLETED",
                ai_insights=quality_report,
            )

            return {
                "domain": domain,
                "records_received": total,
                "records_valid": len(valid),
                "records_invalid": len(invalid),
                "records_loaded": loaded,
                "anomalies": len(anomalies),
                "quality_report": quality_report,
                "status": "COMPLETED",
            }

        except Exception as e:
            logger.error("Failed to process table '%s': %s", table_name, e)
            self.loading_agent.log_ingestion(
                batch_id=self.batch_id,
                domain=domain,
                table_name=table_name,
                records_received=total,
                records_valid=0,
                records_invalid=total,
                records_loaded=0,
                status="FAILED",
                error_message=str(e),
            )
            return {
                "domain": domain,
                "records_received": total,
                "records_valid": 0,
                "records_invalid": total,
                "records_loaded": 0,
                "anomalies": 0,
                "quality_report": f"FAILED: {e}",
                "status": "FAILED",
            }

    # ─── Display Helpers ──────────────────────────────────────────────────

    @staticmethod
    def _print_extraction_summary(data: dict[str, list[dict[str, Any]]]) -> None:
        """Print a summary of extracted data."""
        table = Table(title="Extracted Data Summary")
        table.add_column("Table", style="cyan")
        table.add_column("Records", justify="right", style="green")
        table.add_column("Domain", style="yellow")

        total = 0
        for tbl_name in LOAD_ORDER:
            records = data.get(tbl_name, [])
            count = len(records)
            total += count
            domain = TABLE_DOMAIN_MAP.get(tbl_name, "UNKNOWN")
            table.add_row(tbl_name, str(count), domain)

        table.add_row("[bold]TOTAL[/bold]", f"[bold]{total}[/bold]", "")
        console.print(table)

    @staticmethod
    def _print_results_table(results: dict[str, dict[str, Any]]) -> None:
        """Print a formatted results table."""
        table = Table(title="Pipeline Results")
        table.add_column("Table", style="cyan")
        table.add_column("Received", justify="right")
        table.add_column("Valid", justify="right", style="green")
        table.add_column("Invalid", justify="right", style="red")
        table.add_column("Loaded", justify="right", style="bold green")
        table.add_column("Anomalies", justify="right", style="yellow")
        table.add_column("Status", justify="center")

        for tbl_name, result in results.items():
            status_style = "green" if result["status"] == "COMPLETED" else "red"
            table.add_row(
                tbl_name,
                str(result["records_received"]),
                str(result["records_valid"]),
                str(result["records_invalid"]),
                str(result["records_loaded"]),
                str(result["anomalies"]),
                f"[{status_style}]{result['status']}[/{status_style}]",
            )

        console.print(table)

    @staticmethod
    def _print_domain_summary(summary: dict[str, Any]) -> None:
        """Print formatted domain summary."""
        for domain, data in summary.items():
            if "error" in data:
                console.print(f"[red]{domain}: Error — {data['error']}[/red]")
                continue

            panel_content = ""
            for key, value in data.items():
                if isinstance(value, dict):
                    panel_content += f"{key}:\n"
                    for k, v in value.items():
                        panel_content += f"  {k}: {v}\n"
                elif isinstance(value, list):
                    panel_content += f"{key}: {len(value)} entries\n"
                else:
                    panel_content += f"{key}: {value}\n"

            console.print(Panel(panel_content.strip(), title=domain.replace("_", " ").title()))

    @staticmethod
    def _domain_to_default_table(domain: str) -> str:
        """Map a domain name to its primary table for file-based imports."""
        domain_table_map = {
            "CORE_BANKING": "transactions",
            "PAYMENTS": "payments",
            "LENDING": "loans",
            "RISK_COMPLIANCE": "risk_alerts",
        }
        return domain_table_map.get(domain, "transactions")
