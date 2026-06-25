# Banking Data Injection AI Agent

An AI-powered agent that extracts, transforms, validates, and loads banking data into a PostgreSQL data warehouse. Covers all major banking domains with GPT-4 powered schema detection, anomaly detection, and data quality reporting.

## Banking Domains Covered

| Domain | Tables | Description |
|--------|--------|-------------|
| **Core Banking** | `customers`, `accounts`, `transactions` | Customer KYC, account management, transaction history |
| **Payments** | `payments`, `card_transactions` | UPI/NEFT/RTGS/IMPS payments, credit/debit card transactions |
| **Lending** | `loans`, `emi_payments` | Loan portfolio, EMI tracking, disbursements |
| **Risk & Compliance** | `risk_alerts`, `suspicious_transactions` | AML alerts, fraud detection, STR reporting |

## Architecture

```
Sources (CSV/JSON/API/Generated)
        │
        ▼
┌─────────────────────┐
│  Extraction Agent    │  ← AI-powered schema detection & field mapping
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Transformation Agent │  ← Pydantic validation, dedup, AI anomaly detection
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│   Loading Agent      │  ← Batch upserts into PostgreSQL with retry logic
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  Monitoring Agent    │  ← Pipeline health, data freshness, AI insights
└─────────────────────┘
```

## Agent Capabilities

### Extraction Agent
- Extracts data from CSV, JSON, and in-memory sources
- AI-powered domain auto-detection (identifies which banking area the data belongs to)
- AI-powered field mapping (maps source columns to warehouse schema)
- Fallback rule-based detection when AI is unavailable

### Transformation Agent
- Pydantic model validation for all banking data types
- Automatic deduplication by primary key
- Data cleaning (whitespace trimming, null normalization)
- AI-powered anomaly detection (outliers, suspicious patterns)
- AI-generated data quality reports

### Loading Agent
- Batch inserts with configurable batch size
- Idempotent upserts (ON CONFLICT DO UPDATE)
- Individual record retry on batch failures
- Ingestion metadata logging for auditability

### Monitoring Agent
- Real-time pipeline health status
- Data freshness tracking across all tables
- Domain-level summaries with aggregated metrics
- AI-generated actionable insights

## Setup

### Prerequisites
- Python 3.12+
- PostgreSQL 14+

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd banking-data-agent

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your OpenAI API key and PostgreSQL credentials

# Set up PostgreSQL database
sudo -u postgres psql -c "CREATE USER banking_agent WITH PASSWORD 'banking_agent_pass';"
sudo -u postgres psql -c "CREATE DATABASE banking_warehouse OWNER banking_agent;"
```

## Usage

### Run Full Pipeline (with generated sample data)
```bash
python main.py run
```

### Ingest from CSV/JSON
```bash
python main.py run --source csv --file /path/to/data.csv
python main.py run --source json --file /path/to/data.json
```

### Reset warehouse and reload
```bash
python main.py run --reset
```

### Check pipeline status
```bash
python main.py status
```

### Generate AI insights
```bash
python main.py insights
```

### View domain summary
```bash
python main.py summary
```

### Reset warehouse
```bash
python main.py reset
```

## Project Structure

```
banking-data-agent/
├── main.py                          # CLI entry point
├── requirements.txt                 # Python dependencies
├── .env.example                     # Environment variable template
├── README.md
└── src/
    ├── config.py                    # Centralized configuration
    ├── agents/
    │   ├── extraction_agent.py      # Data extraction & schema detection
    │   ├── transformation_agent.py  # Validation, cleaning & anomaly detection
    │   ├── loading_agent.py         # PostgreSQL bulk loading
    │   ├── monitoring_agent.py      # Pipeline health & AI insights
    │   └── orchestrator.py          # Pipeline coordination
    ├── data_generators/
    │   └── banking_data_generator.py # Sample data generation (Faker)
    ├── database/
    │   ├── connection.py            # PostgreSQL connection manager
    │   └── schema.py                # Warehouse DDL
    └── models/
        └── banking_models.py        # Pydantic data models
```

## Configuration

All configuration is via environment variables (or `.env` file):

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | (required) | OpenAI API key for AI features |
| `OPENAI_MODEL` | `gpt-4` | OpenAI model to use |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `banking_warehouse` | Database name |
| `DB_USER` | `banking_agent` | Database user |
| `DB_PASSWORD` | `banking_agent_pass` | Database password |
| `BATCH_SIZE` | `100` | Records per batch insert |
| `LOG_LEVEL` | `INFO` | Logging level |

## AI Features

The agent uses GPT-4 (configurable) for:
1. **Schema Detection** — Automatically identifies which banking domain incoming data belongs to
2. **Field Mapping** — Maps arbitrary source columns to warehouse schema
3. **Anomaly Detection** — Identifies outliers, suspicious patterns, and data quality issues
4. **Quality Reports** — Generates human-readable data quality assessments
5. **Pipeline Insights** — Provides actionable recommendations based on pipeline state

All AI features gracefully fall back to rule-based alternatives when the API is unavailable.
