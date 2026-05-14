"""
Structured JSON logging for the RFQ Classification Agent.
Provides consistent log formatting across all modules with
RFQ ID tracking and event-based log entries.
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone


class JSONFormatter(logging.Formatter):
    """
    Custom log formatter that outputs structured JSON log entries.
    Each log line includes timestamp, level, module, message, and any extra fields.
    """

    def format(self, record: logging.LogRecord) -> str:
        """Format a log record as a JSON string with structured fields."""
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "module": record.module,
            "message": record.getMessage(),
        }

        # Include any extra fields passed via the 'extra' parameter
        if hasattr(record, "rfq_id"):
            log_entry["rfq_id"] = record.rfq_id
        if hasattr(record, "event"):
            log_entry["event"] = record.event
        if hasattr(record, "details"):
            log_entry["details"] = record.details

        # Include exception info if present
        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry)


def setup_logger(
    name: str = "rfq_classifier",
    level: str | None = None,
    log_format: str | None = None,
) -> logging.Logger:
    """
    Set up and return a configured logger instance.

    Args:
        name: Logger name (used as the logger identifier)
        level: Log level string (DEBUG, INFO, WARNING, ERROR). Falls back to LOG_LEVEL env var, then INFO.
        log_format: Output format - 'json' for structured JSON, 'text' for human-readable. Falls back to LOG_FORMAT env var, then 'json'.

    Returns:
        Configured logging.Logger instance
    """
    # Resolve configuration from args, env vars, or defaults
    level = level or os.environ.get("LOG_LEVEL", "INFO")
    log_format = log_format or os.environ.get("LOG_FORMAT", "json")

    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Avoid adding duplicate handlers if logger already configured
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)

        if log_format == "json":
            handler.setFormatter(JSONFormatter())
        else:
            # Human-readable text format for development
            handler.setFormatter(
                logging.Formatter(
                    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
                )
            )

        logger.addHandler(handler)

    return logger
