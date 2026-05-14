# RFQ Classification Agent — Azure Agentic Layer

A hybrid **Rules + LLM** classification system for Request for Quotation (RFQ) email processing. Part of a larger multi-agent orchestration architecture where a **Master Agent** (GPT-4o) coordinates specialized worker agents for classification, extraction, validation, and routing.

This repository implements **Agent 1: Classification Agent** — the first stage of the pipeline that categorizes incoming RFQs into predefined business categories using deterministic rules (fast path) and LLM-based semantic classification (fallback).

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Classification Agent                       │
│                                                              │
│  ┌─────────┐    ┌──────────────┐    ┌──────────┐            │
│  │Ingestion│───▶│Preprocessing │───▶│  Rules   │            │
│  │  Layer  │    │(clean, NER)  │    │  Engine  │            │
│  └─────────┘    └──────────────┘    └────┬─────┘            │
│   PDF/Email/                             │                   │
│   Form input                    ┌────────┴────────┐         │
│                                 │  Confidence?     │         │
│                                 └────────┬────────┘         │
│                          ≥0.90 │    0.70-0.89│    <0.70│    │
│                          ┌─────▼──┐  ┌──────▼───┐ ┌───▼──┐ │
│                          │ Return  │  │  LLM     │ │ LLM  │ │
│                          │ Rule    │  │ Validate │ │Classify││
│                          │ Result  │  │          │ │      │ │
│                          └─────────┘  └──────────┘ └──────┘ │
│                                              │         │     │
│                                        ┌─────▼─────────▼──┐ │
│                                        │  Classification   │ │
│                                        │    Result         │ │
│                                        └───────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Decision Logic

| Rule Confidence | Action | Method |
|---|---|---|
| ≥ 0.90 | Return immediately (no LLM call) | `rule` |
| 0.70 – 0.89 | LLM validates proposed category | `hybrid` |
| < 0.70 or no match | Full LLM classification | `llm` |
| Both low | Flag for manual review | `manual_review` |

## Business Categories

| # | Category | Example Keywords |
|---|---|---|
| 1 | Manufacturing - Metals | steel, aluminum, CNC machining, welding |
| 2 | Manufacturing - Electronics | PCB, circuit board, semiconductor, soldering |
| 3 | IT Services | cloud, software, SaaS, cybersecurity, DevOps |
| 4 | Construction Materials | concrete, rebar, insulation, building materials |
| 5 | Aerospace & Defense | aircraft, avionics, ITAR, MIL-SPEC, defense |
| 6 | Healthcare Equipment | medical device, surgical, diagnostic, FDA |
| 7 | Professional Services | consulting, advisory, audit, project management |
| 8 | Other | Catch-all for unmatched categories |

## Project Structure

```
rfq-classifier/
├── agents/
│   ├── classification_agent/        # Agent 1: Rules + LLM classification
│   │   ├── ingestion.py             # PDF, email, form handlers
│   │   ├── preprocessing.py         # Text cleaning & entity extraction
│   │   ├── rules_engine.py          # Configurable rules evaluation
│   │   ├── llm_classifier.py        # GPT-4o semantic classification
│   │   └── orchestrator.py          # Hybrid decision logic
│   ├── extraction_agent/            # Agent 2: Entity extraction (Phase 2)
│   ├── validation_agent/            # Agent 3: Business rules validation (Phase 3)
│   ├── email_tool_agent/            # Agent 4: Manual handover (Phase 4)
│   └── master_agent/                # Master Orchestrator (Phase 5)
├── shared/
│   ├── config/
│   │   ├── categories.yaml          # 8 business categories with keywords
│   │   ├── rules.yaml               # 15 classification rules by priority
│   │   └── prompts.yaml             # LLM prompt templates
│   ├── models.py                    # Data models (RFQDocument, ClassificationResult)
│   └── utils/
│       ├── logger.py                # JSON structured logging
│       └── validators.py            # Input/output validation
├── tests/
│   ├── unit/                        # Unit tests (157 tests, 93% coverage)
│   ├── integration/                 # Integration tests (pipeline tests)
│   ├── test_data/                   # 10 synthetic RFQ samples
│   │   ├── pdfs/                    # 5 PDF samples
│   │   ├── emails/                  # 3 email samples
│   │   ├── forms/                   # 2 JSON form samples
│   │   └── expected.json            # Expected classification results
│   └── generate_test_data.py        # Script to regenerate test data
├── docs/
│   └── agentic_layer_integration_plan.md  # Full 5-agent architecture plan
├── validate.py                      # End-to-end validation script
├── conftest.py                      # Pytest path configuration
├── requirements.txt                 # Python dependencies
├── .env.example                     # Environment variable template
└── .gitignore
```

## Setup

### Prerequisites

- Python 3.10+
- OpenAI API key (for LLM classification)
- Optional: Azure Document Intelligence credentials (for production OCR)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd rfq-classifier

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key for GPT-4o |
| `LLM_MODEL` | No | `gpt-4o` | LLM model identifier |
| `OCR_PROVIDER` | No | `pytesseract` | OCR backend (`pytesseract` or `azure_di`) |
| `RULE_HIGH_CONFIDENCE_THRESHOLD` | No | `0.90` | Rule auto-classify threshold |
| `RULE_LOW_CONFIDENCE_THRESHOLD` | No | `0.70` | Rule → LLM validation threshold |
| `LLM_HIGH_CONFIDENCE_THRESHOLD` | No | `0.85` | LLM auto-classify threshold |
| `LLM_VALIDATION_CONFIDENCE_THRESHOLD` | No | `0.80` | LLM validation confirm threshold |
| `LOG_LEVEL` | No | `INFO` | Logging level |
| `LOG_FORMAT` | No | `json` | Log format (`json` or `text`) |

## Usage

### Classify a Single Document

```python
from agents.classification_agent.ingestion import PDFHandler, EmailHandler, FormHandler
from agents.classification_agent.orchestrator import ClassificationOrchestrator

# Initialize the orchestrator
orchestrator = ClassificationOrchestrator()

# Classify a PDF
pdf_handler = PDFHandler()
doc = pdf_handler.ingest("path/to/rfq.pdf")
result = orchestrator.classify(doc)

print(f"Category: {result.primary_category}")
print(f"Confidence: {result.confidence}")
print(f"Method: {result.method.value}")
print(f"Reasoning: {result.reasoning}")

# Classify an email
email_handler = EmailHandler()
doc = email_handler.ingest("path/to/rfq.eml")
result = orchestrator.classify(doc)

# Classify a JSON form
form_handler = FormHandler()
doc = form_handler.ingest("path/to/rfq.json")
result = orchestrator.classify(doc)
```

### Run Validation

```bash
# Generate test data (if not already generated)
python -m tests.generate_test_data

# Run validation against 10 test samples
python validate.py --test-data ./tests/test_data --expected-results ./tests/test_data/expected.json

# Save report to file
python validate.py --output validation_report.json
```

### Run Tests

```bash
# Run all tests
python -m pytest tests/ -v

# Run with coverage report
python -m pytest tests/ --cov=agents --cov=shared --cov-report=term-missing

# Run only unit tests
python -m pytest tests/unit/ -v

# Run only integration tests
python -m pytest tests/integration/ -v
```

## Configuration Guide

### Adding a New Category

Edit `shared/config/categories.yaml`:

```yaml
categories:
  - id: new-category
    name: "New Category Name"
    description: "Description of this category"
    keywords:
      - keyword1
      - keyword2
```

### Adding a New Rule

Edit `shared/config/rules.yaml`:

```yaml
rules:
  - rule_id: "R016"
    name: "New Rule Name"
    priority: 2          # 1=highest, 3=lowest
    conditions:
      type: keyword      # keyword, domain, field, or composite
      keywords: ["word1", "word2"]
      min_match: 2
    category: "New Category Name"
    confidence: 0.90
```

### Customizing LLM Prompts

Edit `shared/config/prompts.yaml` to modify the classification and validation prompt templates. Use `{category_list}`, `{rfq_text}`, and `{metadata}` as template variables.

## Rule Types

| Type | Description | Example |
|---|---|---|
| `keyword` | Match keyword count against threshold | 2+ of ["steel", "aluminum", "CNC"] |
| `domain` | Match sender email domain | `@aerospace.com`, `@boeing.com` |
| `field` | Match structured form field values | `product_category == "IT Services"` |
| `composite` | Combine rules with AND/OR logic | keyword match AND domain match |

## Multi-Agent Integration Plan

This Classification Agent is **Agent 1** in a 5-agent architecture:

1. **Classification Agent** (this repo) → Categorize incoming RFQs
2. **Entity Extraction Agent** → Extract vendor, pricing, materials data
3. **Validation Agent** → Validate data against business rules
4. **Email Tool Agent** → Handle manual review handover
5. **Master Agent** → Orchestrate all agents via GPT-4o

See `docs/agentic_layer_integration_plan.md` for the full integration plan.

## Test Results

- **157 tests passing** across unit and integration suites
- **93% code coverage** on core modules
- **10 synthetic RFQ samples** covering all 8 categories and 3 input types
- Rules engine: 98% coverage | LLM classifier: 96% | Orchestrator: 93%
