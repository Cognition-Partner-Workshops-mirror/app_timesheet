# Azure Agentic Layer — High-Level Integration Plan

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    EMAIL PROCESSING PIPELINE                             │
│                                                                          │
│  ┌─────────┐    ┌──────────────────────────────────────────────────┐     │
│  │  Email   │    │           AGENTIC LAYER                         │     │
│  │  Input   │───▶│                                                 │     │
│  │ (Logic   │    │  ┌─────────────────────────────────────────┐    │     │
│  │  App)    │    │  │      MASTER AGENT (Orchestrator)        │    │     │
│  └─────────┘    │  │      Azure OpenAI GPT-4o                │    │     │
│                  │  │      "Brain" - Sequential Decision      │    │     │
│                  │  └──┬──────┬──────────┬──────────┬─────────┘    │     │
│                  │     │      │          │          │               │     │
│                  │     ▼      ▼          ▼          ▼               │     │
│                  │  ┌──────┐┌─────┐ ┌────────┐ ┌────────┐         │     │
│                  │  │Agent1││Agnt2│ │ Agent3 │ │Agent n │         │     │
│                  │  │Class.││Extr.│ │ Valid. │ │Email   │         │     │
│                  │  │Agent ││Agent│ │ Agent  │ │Tool    │         │     │
│                  │  └──┬───┘└──┬──┘ └───┬────┘ └───┬────┘         │     │
│                  │     │       │        │          │               │     │
│                  └─────┼───────┼────────┼──────────┼───────────────┘     │
│                        │       │        │          │                      │
│                        ▼       ▼        ▼          ▼                      │
│                  ┌──────────────────────────────────────────┐            │
│                  │           AZURE SQL DB                    │            │
│                  │  • Agent Registry  • Classification Res.  │            │
│                  │  • Extracted Data   • Validation Rules    │            │
│                  │  • Processing State • Audit Trail         │            │
│                  └──────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Agent Specifications

### Agent 1: Classification Agent (PRIORITY — Build First)
| Attribute | Value |
|-----------|-------|
| **Azure Service** | Azure Function (HTTP Trigger) + Azure OpenAI |
| **Purpose** | Classify supplier emails into business categories using Rules + LLM hybrid |
| **Input** | Email ID, subject, body, preprocessed text, sender, attachments |
| **Output** | Classification label(s), confidence scores, requires_human_review flag, evidence |
| **Confidence Threshold** | ≥0.85 auto-classify, <0.85 flag for human review |
| **Multi-label** | Yes — can return multiple categories |
| **Implementation** | Rules engine (fast path) → LLM fallback (semantic understanding) |

### Agent 2: Entity Extraction Agent
| Attribute | Value |
|-----------|-------|
| **Azure Service** | Azure Function + Azure AI Document Intelligence + Azure OpenAI |
| **Purpose** | Extract structured quote data from emails and attachments |
| **Input** | Email ID, classification, email body, attachment blob URIs |
| **Output** | Vendor info, material details, pricing, lead times, source evidence |
| **Strategy** | Document Intelligence for structured docs, OpenAI for unstructured text |

### Agent 3: Validation Agent
| Attribute | Value |
|-----------|-------|
| **Azure Service** | Azure Function + Azure SQL DB (Business Rules) |
| **Purpose** | Validate extracted entities against business rules and data consistency |
| **Input** | Email ID, classification, extracted entities |
| **Output** | Validation status (passed/failed/warning), error list, review requirement |
| **Rules** | Data type, range, cross-field, external reference, completeness |

### Agent 4: Email Tool Agent (Manual Handover)
| Attribute | Value |
|-----------|-------|
| **Azure Service** | Azure Logic App (HTTP Trigger) |
| **Purpose** | Route emails requiring human review, send notifications |
| **Input** | Email ID, validation errors, extracted entities, original email metadata |
| **Output** | Notification sent confirmation, review URL |

### Master Agent (Orchestrator)
| Attribute | Value |
|-----------|-------|
| **Azure Service** | Azure Function + Azure OpenAI GPT-4o |
| **Purpose** | Central "Brain" coordinating all worker agents sequentially |
| **Flow** | Receive email → Agent 1 (Classify) → Agent 2 (Extract) → Agent 3 (Validate) → Agent 4 (if needed) |
| **State** | Persisted in Azure SQL DB per email_id |
| **Retry** | Max iterations configurable per agent |

---

## Integration Flow (Sequential Pipeline)

```
1. Logic App receives email
   └── Preprocesses: extract subject, body, sender, attachments
   └── Stores in Azure Data Lake + Azure SQL DB
   └── Triggers Master Agent via HTTP

2. Master Agent receives preprocessed email
   └── Step 1: Call Classification Agent
       ├── Rules engine evaluates keywords, sender domain, form fields
       ├── If rules confident (≥0.90) → return immediately
       ├── If rules uncertain (0.70-0.89) → call LLM for validation
       └── If no rules match → full LLM classification
   
   └── Step 2: Call Entity Extraction Agent
       ├── Use classification to select extraction strategy
       ├── Azure Doc Intelligence for PDF/structured attachments
       ├── Azure OpenAI for unstructured email body
       └── Merge and return consolidated entities
   
   └── Step 3: Call Validation Agent
       ├── Load rules for this classification type
       ├── Validate data types, ranges, cross-references
       └── Determine if human review needed
   
   └── Step 4 (conditional): Call Email Tool Agent
       ├── If requires_human_review = true
       ├── Send notification email to reviewer
       └── Update status to pending_human_review
   
   └── Step 5: Store final results in Azure SQL DB
       └── Return processing summary
```

---

## Data Flow Schemas

### Inter-Agent Message Format
```json
{
  "email_id": "string",
  "correlation_id": "string (for tracing)",
  "timestamp": "ISO 8601",
  "source_agent": "string",
  "target_agent": "string",
  "payload": { ... },
  "metadata": {
    "retry_count": 0,
    "max_retries": 3,
    "timeout_ms": 30000
  }
}
```

### Classification Agent Output (Agent 1)
```json
{
  "email_id": "string",
  "classifications": [
    {"category": "string", "confidence": 0.0-1.0}
  ],
  "primary_classification": "string",
  "primary_confidence": 0.0-1.0,
  "method": "rule|llm|hybrid",
  "requires_extraction": true,
  "requires_human_review": false,
  "evidence": "string",
  "reasoning": "string"
}
```

### Entity Extraction Agent Output (Agent 2)
```json
{
  "email_id": "string",
  "extraction_results": [{
    "vendor_number": "string|null",
    "vendor_name": "string|null",
    "supplier_email": "string|null",
    "material_number": "string|null",
    "item_description": "string|null",
    "manufacturer": "string|null",
    "manufacturer_part_number": "string|null",
    "quantity": "string|null",
    "unit_of_measure": "string|null",
    "unit_price": "string|null",
    "currency": "string|null",
    "lead_time": "string|null",
    "plant": "string|null",
    "supplier_comments": "string|null",
    "source": "email_body|attachment|table|both",
    "evidence": "string"
  }],
  "extraction_source": ["document_intelligence", "openai"]
}
```

---

## Implementation Phases

### Phase 1: Classification Agent (Current Sprint)
- Rules engine with configurable YAML rules
- LLM classifier with GPT-4o (OpenAI API)
- Hybrid orchestration logic (rules → LLM fallback)
- Ingestion layer (PDF, email, forms)
- Preprocessing (text cleaning, entity extraction)
- Unit + integration tests, validate.py script
- 10 synthetic RFQ test samples

### Phase 2: Entity Extraction Agent
- Azure Document Intelligence integration
- GPT-4o extraction prompts for unstructured text
- Field mapping to extraction schema
- Source evidence tracking

### Phase 3: Validation Agent
- Business rules engine (configurable in DB/YAML)
- Data type, range, cross-field validation
- Human review trigger logic

### Phase 4: Email Tool Agent
- Logic App workflow for manual handover
- Notification email templates
- Review portal integration

### Phase 5: Master Agent Integration
- Central orchestrator function
- Agent registry and routing
- State management (Azure SQL DB)
- Retry and error handling
- End-to-end pipeline testing

---

## Azure Resource Requirements

| Resource | Purpose | SKU/Tier |
|----------|---------|----------|
| Azure OpenAI | Master Agent + Classification LLM | Standard (GPT-4o) |
| Azure Functions | Worker agents (Classification, Extraction, Validation) | Consumption/Premium |
| Azure AI Document Intelligence | OCR + document extraction | S0 |
| Azure SQL Database | State, rules, agent registry | Standard S1 |
| Azure Data Lake Gen2 | Email attachments, blob storage | Standard |
| Azure Logic App | Email trigger, manual handover | Standard |
| Azure Content Safety | Content filtering | Standard |
