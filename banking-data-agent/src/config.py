"""
Configuration module for the Banking Data Injection AI Agent.
Loads environment variables and provides centralized config access.
"""

import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()


@dataclass
class DatabaseConfig:
    """PostgreSQL connection configuration."""
    host: str = field(default_factory=lambda: os.getenv("DB_HOST", "localhost"))
    port: int = field(default_factory=lambda: int(os.getenv("DB_PORT", "5432")))
    name: str = field(default_factory=lambda: os.getenv("DB_NAME", "banking_warehouse"))
    user: str = field(default_factory=lambda: os.getenv("DB_USER", "banking_agent"))
    password: str = field(default_factory=lambda: os.getenv("DB_PASSWORD", "banking_agent_pass"))

    @property
    def connection_string(self) -> str:
        return f"host={self.host} port={self.port} dbname={self.name} user={self.user} password={self.password}"


@dataclass
class AgentConfig:
    """AI Agent configuration."""
    openai_api_key: str = field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))
    openai_model: str = field(default_factory=lambda: os.getenv("OPENAI_MODEL", "gpt-4"))
    batch_size: int = field(default_factory=lambda: int(os.getenv("BATCH_SIZE", "100")))
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))


@dataclass
class AppConfig:
    """Top-level application configuration."""
    db: DatabaseConfig = field(default_factory=DatabaseConfig)
    agent: AgentConfig = field(default_factory=AgentConfig)


# Singleton config instance
config = AppConfig()
