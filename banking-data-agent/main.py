#!/usr/bin/env python3
"""
Banking Data Injection AI Agent — Main CLI Entry Point

An AI-powered agent that extracts, transforms, validates, and loads
banking data into a PostgreSQL data warehouse. Covers all major banking
domains: Core Banking, Payments, Lending, and Risk & Compliance.

Usage:
    python main.py                          # Run full pipeline with sample data
    python main.py --source csv --file data.csv   # Ingest from CSV
    python main.py --source json --file data.json  # Ingest from JSON
    python main.py --reset                  # Reset warehouse before loading
    python main.py --status                 # Show pipeline status only
    python main.py --insights               # Generate AI insights only
"""

import argparse
import json
import logging
import sys

from rich.console import Console
from rich.panel import Panel
from rich.logging import RichHandler

from src.agents.orchestrator import PipelineOrchestrator
from src.agents.monitoring_agent import MonitoringAgent
from src.database.connection import db_manager

console = Console()


def setup_logging(level: str = "INFO") -> None:
    """Configure structured logging with Rich handler."""
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(message)s",
        handlers=[RichHandler(console=console, rich_tracebacks=True)],
    )


def cmd_run(args: argparse.Namespace) -> None:
    """Execute the full data injection pipeline."""
    orchestrator = PipelineOrchestrator()
    orchestrator.run_full_pipeline(
        source=args.source,
        source_path=args.file,
        reset_warehouse=args.reset,
    )


def cmd_status(args: argparse.Namespace) -> None:
    """Display current pipeline and warehouse status."""
    # Ensure schema exists before querying
    db_manager.initialize_schema()
    monitor = MonitoringAgent()
    status = monitor.get_pipeline_status()
    console.print(Panel(
        json.dumps(status, indent=2, default=str),
        title="Pipeline Status",
        border_style="cyan",
    ))


def cmd_insights(args: argparse.Namespace) -> None:
    """Generate AI-powered pipeline insights."""
    db_manager.initialize_schema()
    monitor = MonitoringAgent()
    insights = monitor.generate_insights()
    console.print(Panel(insights, title="AI Pipeline Insights", border_style="cyan"))

    # Also show data freshness
    freshness = monitor.check_data_freshness()
    console.print(Panel(
        json.dumps(freshness, indent=2, default=str),
        title="Data Freshness",
        border_style="yellow",
    ))


def cmd_summary(args: argparse.Namespace) -> None:
    """Show domain-level data summary."""
    db_manager.initialize_schema()
    monitor = MonitoringAgent()
    summary = monitor.get_domain_summary()
    console.print(Panel(
        json.dumps(summary, indent=2, default=str),
        title="Banking Domain Summary",
        border_style="green",
    ))


def cmd_reset(args: argparse.Namespace) -> None:
    """Reset the warehouse by truncating all tables."""
    db_manager.initialize_schema()
    console.print("[yellow]Resetting warehouse — all data will be deleted![/yellow]")
    db_manager.truncate_all()
    console.print("[green]Warehouse reset complete.[/green]")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Banking Data Injection AI Agent",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Run command (default)
    run_parser = subparsers.add_parser("run", help="Run the full data injection pipeline")
    run_parser.add_argument(
        "--source", choices=["generate", "csv", "json"], default="generate",
        help="Data source type (default: generate sample data)",
    )
    run_parser.add_argument("--file", help="Path to CSV/JSON source file")
    run_parser.add_argument("--reset", action="store_true", help="Reset warehouse before loading")
    run_parser.set_defaults(func=cmd_run)

    # Status command
    status_parser = subparsers.add_parser("status", help="Show pipeline status")
    status_parser.set_defaults(func=cmd_status)

    # Insights command
    insights_parser = subparsers.add_parser("insights", help="Generate AI insights")
    insights_parser.set_defaults(func=cmd_insights)

    # Summary command
    summary_parser = subparsers.add_parser("summary", help="Show domain data summary")
    summary_parser.set_defaults(func=cmd_summary)

    # Reset command
    reset_parser = subparsers.add_parser("reset", help="Reset/truncate the warehouse")
    reset_parser.set_defaults(func=cmd_reset)

    args = parser.parse_args()

    # Default to 'run' if no command specified
    if not args.command:
        args.source = "generate"
        args.file = None
        args.reset = False
        args.func = cmd_run

    setup_logging()

    try:
        args.func(args)
    except KeyboardInterrupt:
        console.print("\n[yellow]Pipeline interrupted by user.[/yellow]")
        sys.exit(1)
    except Exception as e:
        console.print(f"\n[red]Pipeline failed: {e}[/red]")
        logger = logging.getLogger(__name__)
        logger.exception("Unhandled error")
        sys.exit(1)


if __name__ == "__main__":
    main()
