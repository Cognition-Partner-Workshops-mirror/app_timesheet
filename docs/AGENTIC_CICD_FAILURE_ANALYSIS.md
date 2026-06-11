# Agentic AI Approach for CI/CD Pipeline Failure Analysis

## Design Document & Architecture Plan

**Project**: Employee Time Tracking Application (`app-timesheet`)
**Author**: Devin (AI Software Engineering Assistant)
**Date**: June 2026
**Status**: Architecture Plan (no implementation)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [Architecture](#4-architecture)
5. [Agent Design](#5-agent-design)
6. [Failure Taxonomy](#6-failure-taxonomy)
7. [Integration with Existing CI/CD](#7-integration-with-existing-cicd)
8. [Data Flow & Sequence Diagrams](#8-data-flow--sequence-diagrams)
9. [LLM Strategy](#9-llm-strategy)
10. [Feedback Loop & Continuous Learning](#10-feedback-loop--continuous-learning)
11. [Technology Stack](#11-technology-stack)
12. [Security & Compliance](#12-security--compliance)
13. [Rollout Plan](#13-rollout-plan)
14. [Future Enhancements](#14-future-enhancements)
15. [Appendix: Current CI/CD Baseline](#15-appendix-current-cicd-baseline)

---

## 1. Executive Summary

This document proposes an **agentic AI system** for automated CI/CD pipeline failure analysis. The system uses autonomous AI agents that detect, classify, diagnose, and remediate CI/CD failures — reducing mean-time-to-resolution (MTTR) and developer toil.

Unlike traditional rule-based alerting, this approach uses **LLM-powered reasoning agents** that can:
- Parse unstructured log output and understand context
- Correlate failures across multiple pipeline stages
- Suggest or auto-apply targeted fixes
- Learn from past resolutions to improve over time

The design is tailored to the `app-timesheet` project's existing GitHub Actions pipeline (security audits, test coverage gates, Docker builds) but is **generalizable** to any CI/CD system.

---

## 2. Problem Statement

### Current Pain Points

| Problem | Impact |
|---------|--------|
| **Manual log triage** — Developers must read through raw CI logs to find the root cause | 15-30 min per failure |
| **Repetitive failures** — The same dependency/CVE/test issues recur across PRs | Duplicated effort |
| **Context switching** — Developers leave their coding flow to investigate CI | Lost productivity |
| **Delayed feedback** — Failures sit unresolved until someone actively checks the PR | Slower merge velocity |
| **Knowledge silos** — Only certain team members know how to fix specific CI failures | Bus-factor risk |

### Current CI/CD Pipeline (app-timesheet)

The project's existing pipeline (`pr-checks.yml`) runs these jobs on every PR:

```
PR Opened/Updated
  ├── security-audit       → npm audit for high/critical CVEs
  ├── test-coverage        → vitest with 80% coverage threshold
  └── trigger-devin-cve-fix → Auto-invokes Devin to fix CVEs (one-time)
```

**What's missing**: There is no generalized, intelligent failure analysis layer that spans all failure types (build errors, test regressions, dependency conflicts, Docker build failures, linting issues, etc.).

---

## 3. Solution Overview

### Core Idea: Multi-Agent Failure Analysis Pipeline

Deploy a system of **specialized AI agents**, each responsible for a phase of failure analysis. Agents communicate via a shared event bus and produce structured artifacts (diagnosis reports, fix suggestions, PRs).

```
┌─────────────────────────────────────────────────────────┐
│                   CI/CD Pipeline (GitHub Actions)        │
│                                                         │
│  [Build] → [Lint] → [Test] → [Security] → [Deploy]     │
└──────────┬──────────────────────────────────────────────┘
           │ failure event
           ▼
┌─────────────────────────────────────────────────────────┐
│              Agentic Failure Analysis System             │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ Collector │→ │Classifier│→ │ Diagnoser│→ │Remediator│ │
│  │  Agent   │  │  Agent   │  │  Agent   │  │  Agent  │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
│        ↑                                       │        │
│        │        ┌──────────┐                   │        │
│        └────────│ Memory   │←──────────────────┘        │
│                 │  Store   │                             │
│                 └──────────┘                             │
└─────────────────────────────────────────────────────────┘
           │
           ▼
  [PR Comment] [Slack Notification] [Auto-Fix PR]
```

---

## 4. Architecture

### 4.1 High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        GitHub Actions                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Security │ │   Test   │ │  Build   │ │      Lint        │  │
│  │  Audit   │ │ Coverage │ │  (Vite)  │ │    (ESLint)      │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘  │
│       │             │            │                 │            │
└───────┼─────────────┼────────────┼─────────────────┼────────────┘
        │             │            │                 │
        └─────────────┴────────────┴─────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Event Gateway    │
                    │  (GitHub Webhook   │
                    │   / Actions Job)   │
                    └─────────┬──────────┘
                              │
              ┌───────────────▼───────────────┐
              │     Agent Orchestrator        │
              │   (Coordinator / Router)      │
              └───┬───────┬──────────┬────────┘
                  │       │          │
          ┌───────▼──┐ ┌──▼──────┐ ┌─▼──────────┐
          │Collector  │ │Classifier│ │  Diagnoser │
          │Agent      │ │Agent     │ │  Agent     │
          └───────┬──┘ └──┬──────┘ └─┬──────────┘
                  │       │          │
                  └───────┴──────────┘
                          │
                  ┌───────▼──────────┐
                  │ Remediator Agent │
                  └───────┬──────────┘
                          │
              ┌───────────▼───────────┐
              │    Output Layer       │
              │ (PR Comment / Fix PR  │
              │  / Slack / Dashboard) │
              └───────────────────────┘
```

### 4.2 Component Descriptions

| Component | Role | Technology |
|-----------|------|------------|
| **Event Gateway** | Captures CI failure events via GitHub webhooks or workflow dispatch | GitHub Actions `workflow_run` trigger |
| **Agent Orchestrator** | Routes failures to appropriate agents, manages agent lifecycle, enforces retries/timeouts | Python (FastAPI) or Node.js service |
| **Collector Agent** | Fetches raw logs, artifacts, diffs from GitHub API | GitHub REST/GraphQL API |
| **Classifier Agent** | Categorizes failure type (build, test, security, lint, deploy) | LLM with few-shot classification |
| **Diagnoser Agent** | Performs root-cause analysis using logs + code context | LLM with RAG (retrieval-augmented generation) |
| **Remediator Agent** | Suggests or auto-applies fixes | LLM code generation + git operations |
| **Memory Store** | Stores past failures, resolutions, and embeddings for similarity search | PostgreSQL + pgvector (open-source) |

### 4.3 Deployment Model

```
┌──────────────────────────────────────────────┐
│              Self-Hosted Runner               │
│         (or GitHub Actions job)               │
│                                               │
│  ┌─────────────┐    ┌───────────────────┐     │
│  │  Agent      │    │  LLM Inference    │     │
│  │  Runtime    │    │  (Ollama/vLLM     │     │
│  │  (Python)   │◄──►│   or OpenAI API)  │     │
│  └──────┬──────┘    └───────────────────┘     │
│         │                                     │
│  ┌──────▼──────┐    ┌───────────────────┐     │
│  │  PostgreSQL │    │   Redis           │     │
│  │  + pgvector │    │   (Task Queue)    │     │
│  └─────────────┘    └───────────────────┘     │
└──────────────────────────────────────────────┘
```

**Option A — Lightweight (recommended for app-timesheet)**:
Run agents as a GitHub Actions job triggered by `workflow_run`. No persistent infrastructure needed.

**Option B — Full deployment**:
Run as a persistent service (Docker Compose / Kubernetes) with webhook ingestion for real-time processing.

---

## 5. Agent Design

### 5.1 Agent Architecture Pattern

Each agent follows a **ReAct (Reasoning + Acting)** loop:

```
┌─────────────────────────────────────┐
│            Agent Loop               │
│                                     │
│  1. OBSERVE  → Read input/context   │
│  2. THINK    → LLM reasoning step   │
│  3. ACT      → Tool call / API call │
│  4. REFLECT  → Evaluate result      │
│  5. REPEAT or FINISH                │
│                                     │
└─────────────────────────────────────┘
```

### 5.2 Collector Agent

**Purpose**: Gather all relevant data for failure analysis.

**Inputs**: `workflow_run` event payload (repo, run_id, PR number)

**Actions**:
1. Fetch failed job logs via GitHub Actions API (`GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs`)
2. Fetch the PR diff (`GET /repos/{owner}/{repo}/pulls/{pull_number}/files`)
3. Fetch recent commit messages
4. Fetch any existing CI comments on the PR
5. Fetch relevant config files (package.json, vite.config.ts, Dockerfile)

**Output** (structured):
```json
{
  "run_id": 12345,
  "pr_number": 42,
  "failed_jobs": [
    {
      "job_name": "test-coverage",
      "log_excerpt": "...(truncated to relevant lines)...",
      "exit_code": 1,
      "duration_seconds": 120
    }
  ],
  "changed_files": ["frontend/src/pages/DashboardPage.tsx"],
  "diff_summary": "Modified dashboard component, added new chart widget",
  "config_context": { ... }
}
```

### 5.3 Classifier Agent

**Purpose**: Categorize the failure into a known taxonomy (see Section 6).

**Approach**: Few-shot LLM classification with structured output.

**Prompt pattern**:
```
You are a CI/CD failure classifier. Given the following CI log excerpt
and job metadata, classify the failure into exactly one category.

Categories:
- BUILD_ERROR: Compilation/transpilation failure (TypeScript, Vite, etc.)
- TEST_FAILURE: Unit/integration test assertion failures
- TEST_COVERAGE: Coverage threshold not met
- SECURITY_CVE: npm audit found high/critical vulnerabilities
- LINT_ERROR: ESLint or formatting violations
- DEPENDENCY_ERROR: npm install failure, version conflicts
- DOCKER_BUILD: Dockerfile or container build failure
- INFRA_FLAKE: Network timeout, runner issue, transient failure
- UNKNOWN: Cannot classify

Log excerpt:
{log_excerpt}

Respond with JSON: {"category": "...", "confidence": 0.0-1.0, "evidence": "..."}
```

### 5.4 Diagnoser Agent

**Purpose**: Perform root-cause analysis using logs, code context, and historical data.

**Approach**: RAG (Retrieval-Augmented Generation) — retrieve similar past failures, plus the actual failing code, and reason about the root cause.

**Tool capabilities** the Diagnoser can invoke:
- `search_similar_failures(embedding)` → retrieve past failures with similar log patterns
- `read_file(path)` → read source code referenced in error messages
- `get_test_history(test_name)` → check if a test was previously flaky
- `get_dependency_tree(package)` → understand dependency relationships

**Output**:
```json
{
  "root_cause": "The new DashboardPage.tsx component imports 'chart.js' which is not
                 listed in package.json dependencies",
  "category": "DEPENDENCY_ERROR",
  "affected_files": ["frontend/src/pages/DashboardPage.tsx"],
  "related_past_failures": [
    {"run_id": 11000, "resolution": "Added chart.js to dependencies", "similarity": 0.92}
  ],
  "confidence": 0.88
}
```

### 5.5 Remediator Agent

**Purpose**: Generate fix suggestions or auto-apply fixes.

**Remediation modes**:

| Mode | Trigger | Action |
|------|---------|--------|
| **Suggest** | All failures | Post PR comment with diagnosis + fix instructions |
| **Auto-fix** | High-confidence, low-risk fixes | Create a commit on the PR branch |
| **Escalate** | Low confidence or high-risk | Tag maintainer in PR comment |

**Auto-fix eligibility criteria**:
- Confidence ≥ 0.85
- Category is in allow-list: `SECURITY_CVE`, `LINT_ERROR`, `DEPENDENCY_ERROR`, `TEST_COVERAGE` (add tests only)
- No changes to business logic
- Fix passes local validation (lint, build, test) before committing

**Safety guardrails**:
- Maximum 1 auto-fix attempt per PR per failure type
- All auto-fix commits are clearly labeled: `fix(ci-agent): <description>`
- Auto-fix creates a review-requested commit, not a force-push
- Rollback mechanism: if CI fails again after auto-fix, revert and escalate

---

## 6. Failure Taxonomy

A structured taxonomy for classifying CI/CD failures specific to the app-timesheet pipeline:

```
CI/CD Failure
├── Build Failures
│   ├── TypeScript Compilation Error     → tsc errors in frontend/
│   ├── Vite Build Error                 → Bundle/config issues
│   └── Docker Build Error               → Dockerfile / multi-stage failures
│
├── Test Failures
│   ├── Unit Test Assertion Failure      → Jest/Vitest test failures
│   ├── Test Coverage Below Threshold    → <80% coverage gate
│   └── Test Environment Error           → DB/mock setup issues
│
├── Security Failures
│   ├── High-Severity CVE               → npm audit high
│   └── Critical-Severity CVE           → npm audit critical
│
├── Code Quality Failures
│   ├── ESLint Violations                → Lint rule failures
│   ├── SonarQube Quality Gate           → Static analysis thresholds
│   └── Type Errors                      → Strict TS checks
│
├── Dependency Failures
│   ├── npm Install Failure              → Resolution/conflict errors
│   ├── Peer Dependency Conflict         → Incompatible versions
│   └── Missing Dependency               → Import without install
│
└── Infrastructure Failures
    ├── Runner Timeout                   → GitHub Actions timeout
    ├── Network Failure                  → Registry/CDN unavailable
    └── Resource Exhaustion              → OOM, disk full
```

### Per-Category Remediation Playbook

| Category | Auto-fixable? | Typical Resolution |
|----------|--------------|-------------------|
| TypeScript Error | ⚠️ Sometimes | Fix type annotations, add missing imports |
| Vite Build Error | ❌ Rarely | Config investigation, plugin updates |
| Unit Test Failure | ❌ No | Requires understanding test intent |
| Coverage Below Threshold | ⚠️ Sometimes | Generate additional test cases |
| High/Critical CVE | ✅ Yes | `npm audit fix` or targeted version bump |
| ESLint Violation | ✅ Yes | `npm run lint -- --fix` |
| npm Install Failure | ⚠️ Sometimes | Clear lockfile, resolve conflicts |
| Runner Timeout | ❌ No | Retry or investigate resource usage |

---

## 7. Integration with Existing CI/CD

### 7.1 GitHub Actions Integration

The agentic system hooks into the existing pipeline via the `workflow_run` event:

```yaml
# .github/workflows/failure-analysis.yml
name: Agentic CI/CD Failure Analysis

on:
  workflow_run:
    workflows: ["PR Quality Checks"]
    types: [completed]

jobs:
  analyze-failure:
    # Only run when the triggering workflow failed
    if: github.event.workflow_run.conclusion == 'failure'
    runs-on: ubuntu-latest

    steps:
      - name: Checkout analysis agent
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install agent dependencies
        run: pip install -r agents/requirements.txt

      - name: Run failure analysis pipeline
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
          RUN_ID: ${{ github.event.workflow_run.id }}
          REPO: ${{ github.repository }}
        run: python agents/orchestrator.py analyze --run-id $RUN_ID

      - name: Post analysis to PR
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: python agents/orchestrator.py report --run-id $RUN_ID
```

### 7.2 How It Fits with Existing Jobs

```
                    Existing Pipeline
                    ─────────────────
PR Event ──► security-audit ──► ✅/❌
         ──► test-coverage  ──► ✅/❌
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │   workflow_run event     │
                    │   conclusion: failure    │
                    └────────────┬────────────┘
                                 │
                    New: Agentic Analysis
                    ─────────────────────
                                 ▼
                    ┌─────────────────────────┐
                    │   failure-analysis job   │
                    │                         │
                    │ 1. Collect logs          │
                    │ 2. Classify failure      │
                    │ 3. Diagnose root cause   │
                    │ 4. Suggest/apply fix     │
                    │ 5. Comment on PR         │
                    └─────────────────────────┘
```

### 7.3 Coexistence with Existing Devin CVE Auto-Fix

The current pipeline already triggers Devin for CVE remediation. The agentic system complements this by:

| Existing (Devin CVE Fix) | Proposed (Agentic Analysis) |
|---|---|
| Triggered only for CVE failures | Triggered for **all** failure types |
| Specific to npm audit results | Analyzes build, test, lint, Docker, etc. |
| Creates a full Devin session | Lightweight: runs as a GitHub Actions job |
| One-time fix attempt | Iterative: can retry with different strategies |

**Deduplication rule**: If the failure is `SECURITY_CVE` and the existing Devin auto-fix is already triggered, the agentic system defers to Devin and only adds supplementary context (e.g., dependency tree analysis).

---

## 8. Data Flow & Sequence Diagrams

### 8.1 End-to-End Failure Analysis Flow

```
Developer          GitHub Actions         Agentic System          LLM             GitHub API
   │                    │                      │                   │                  │
   │── push to PR ─────►│                      │                   │                  │
   │                    │── run CI jobs ──────►│                   │                  │
   │                    │                      │                   │                  │
   │                    │◄── jobs complete ────│                   │                  │
   │                    │   (some failed)       │                   │                  │
   │                    │                      │                   │                  │
   │                    │── workflow_run ──────►│                   │                  │
   │                    │   event (failure)     │                   │                  │
   │                    │                      │                   │                  │
   │                    │                      │── fetch logs ────►│                  │
   │                    │                      │◄── raw logs ──────│                  │
   │                    │                      │                   │                  │
   │                    │                      │── classify ──────►│                  │
   │                    │                      │◄── category ──────│                  │
   │                    │                      │                   │                  │
   │                    │                      │── fetch code ────►│                  │
   │                    │                      │◄── file content ──│                  │
   │                    │                      │                   │                  │
   │                    │                      │── diagnose ──────►│                  │
   │                    │                      │◄── root cause ────│                  │
   │                    │                      │                   │                  │
   │                    │                      │── remediate ─────►│                  │
   │                    │                      │◄── fix suggestion─│                  │
   │                    │                      │                   │                  │
   │                    │                      │── post comment ──►│                  │
   │                    │                      │   (or push fix)   │                  │
   │                    │                      │                   │                  │
   │◄── PR notification─│                      │                   │                  │
   │   (diagnosis +     │                      │                   │                  │
   │    fix suggestion)  │                      │                   │                  │
```

### 8.2 Agent Orchestration Internal Flow

```
Orchestrator
     │
     ├── 1. Parse workflow_run event
     │       → extract run_id, repo, PR number
     │
     ├── 2. Invoke Collector Agent
     │       → fetch logs for each failed job
     │       → fetch PR diff and changed files
     │       → return FailureContext object
     │
     ├── 3. For each failed job:
     │       │
     │       ├── 3a. Invoke Classifier Agent
     │       │       → LLM classifies failure type
     │       │       → return (category, confidence)
     │       │
     │       ├── 3b. Invoke Diagnoser Agent
     │       │       → RAG: retrieve similar past failures
     │       │       → LLM analyzes logs + code + history
     │       │       → return RootCauseAnalysis
     │       │
     │       └── 3c. Invoke Remediator Agent
     │               → if auto-fixable: generate patch
     │               → if not: generate suggestion
     │               → return RemediationPlan
     │
     ├── 4. Aggregate results into AnalysisReport
     │
     ├── 5. Post report as PR comment
     │
     └── 6. Store results in Memory Store
             → for future similarity search
```

---

## 9. LLM Strategy

### 9.1 Model Selection (Open-Source Preferred)

Per organizational policy, open-source tools are preferred. Recommended models:

| Use Case | Recommended Model | Fallback |
|----------|------------------|----------|
| **Log Classification** | Llama 3.1 8B (via Ollama) | OpenAI GPT-4o-mini |
| **Root Cause Diagnosis** | Llama 3.1 70B (via vLLM) | OpenAI GPT-4o |
| **Code Fix Generation** | CodeLlama 34B or DeepSeek Coder V2 | OpenAI GPT-4o |
| **Embedding (similarity search)** | nomic-embed-text (via Ollama) | OpenAI text-embedding-3-small |

### 9.2 Prompt Engineering Strategy

**Structured output enforcement**: Use JSON schema validation to ensure agents produce parseable output.

**Chain-of-Thought (CoT)**: Diagnoser agent uses explicit reasoning steps:
```
1. What error messages appear in the log?
2. Which files are referenced in the errors?
3. Were those files changed in this PR?
4. What is the most likely root cause?
5. What fix would resolve this?
```

**Few-shot examples**: Each agent is primed with 5-10 examples from the project's actual CI history.

### 9.3 Context Window Management

CI logs can be very large. Strategy for managing context:

1. **Log truncation**: Extract only the last 200 lines of each failed step (most errors appear at the end)
2. **Error line extraction**: Regex-match lines containing `error`, `Error`, `FAIL`, `✗`, exit codes
3. **Hierarchical summarization**: For very long logs, first summarize with a fast model, then deep-analyze key sections with a powerful model
4. **Relevant file scoping**: Only include source files referenced in error messages or changed in the PR diff

---

## 10. Feedback Loop & Continuous Learning

### 10.1 Resolution Tracking

When a developer resolves a CI failure (by pushing a fix commit), the system:
1. Detects the fix (subsequent `workflow_run` with `conclusion: success`)
2. Extracts the fix diff
3. Correlates it with the original diagnosis
4. Stores the `(failure_pattern, diagnosis, resolution)` triple in the Memory Store

### 10.2 Accuracy Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Classification Accuracy** | % of failures correctly categorized | ≥ 90% |
| **Diagnosis Relevance** | % of root cause analyses rated helpful by devs | ≥ 75% |
| **Auto-fix Success Rate** | % of auto-fixes that pass CI on first attempt | ≥ 80% |
| **MTTR Reduction** | Reduction in time from failure to fix | ≥ 40% |

### 10.3 Developer Feedback Mechanism

PR comments from the agent include reaction-based feedback:
```markdown
## 🔍 CI Failure Analysis

**Category**: TEST_FAILURE
**Root Cause**: The `DashboardPage` component test fails because ...
**Suggested Fix**: Add missing mock for `useQuery` hook in ...

---
👍 Helpful  |  👎 Not helpful  |  🔧 I fixed it differently
```

Reactions are collected via GitHub webhook and used to:
- Retrain few-shot examples (replace low-quality examples with high-quality ones)
- Adjust confidence thresholds for auto-fix
- Identify failure categories where the agent underperforms

### 10.4 Knowledge Base Growth

```
Week 1:   Agent uses only LLM general knowledge
Week 4:   10-20 failure/resolution pairs in memory → similarity search improves
Week 12:  50+ pairs → agent can handle most recurring failures autonomously
Week 26:  Agent suggests proactive fixes (e.g., "this dependency will cause CVEs soon")
```

---

## 11. Technology Stack

All components use **open-source** technologies:

| Layer | Technology | License | Purpose |
|-------|-----------|---------|---------|
| **Orchestration** | Python 3.12 + LangGraph | MIT | Agent framework with graph-based orchestration |
| **LLM Runtime** | Ollama or vLLM | MIT / Apache 2.0 | Local LLM inference |
| **LLM Models** | Llama 3.1, CodeLlama, DeepSeek Coder | Open-source | Language models for analysis |
| **Embeddings** | nomic-embed-text | Apache 2.0 | Semantic similarity for past failures |
| **Vector Store** | PostgreSQL + pgvector | PostgreSQL License | Similarity search over failure embeddings |
| **Task Queue** | Redis + Celery | BSD / BSD | Async agent task execution |
| **CI Integration** | GitHub Actions | N/A | Trigger and execution environment |
| **API Client** | PyGithub / httpx | LGPL / BSD | GitHub API interaction |
| **Monitoring** | Prometheus + Grafana | Apache 2.0 | Agent performance dashboards |
| **Logging** | Structlog | MIT | Structured logging for agent traces |

### 11.1 Lightweight Alternative (No Infrastructure)

For teams that want to start without deploying databases or LLM servers:

```
GitHub Actions job
  └── Python script
        ├── Uses OpenAI API (GPT-4o-mini) for analysis
        ├── Stores history as JSON files in a GitHub repo
        └── Posts results as PR comments
```

This requires only an API key and runs entirely within GitHub Actions — no servers, databases, or Docker containers.

---

## 12. Security & Compliance

### 12.1 Data Handling

| Data Type | Handling |
|-----------|----------|
| CI logs | Processed in-memory, stored only as embeddings + summaries (no raw logs persisted) |
| Source code | Read-only access via GitHub API, never stored externally |
| Secrets | Never included in LLM prompts; logs are sanitized before analysis |
| LLM API calls | If using external API: ensure enterprise agreement; prefer self-hosted models |

### 12.2 Access Control

- Agent GitHub token: scoped to `repo` and `actions:read` only
- Auto-fix commits: require PR review before merge (no direct push to protected branches)
- Rate limiting: max 5 analysis runs per PR, max 1 auto-fix per failure type per PR

### 12.3 Audit Trail

Every agent action is logged:
```json
{
  "timestamp": "2026-06-11T10:00:00Z",
  "agent": "remediator",
  "action": "create_commit",
  "pr": 42,
  "category": "SECURITY_CVE",
  "confidence": 0.92,
  "description": "Bumped express from 4.18.2 to 4.21.0 to fix CVE-2024-XXXXX"
}
```

---

## 13. Rollout Plan

### Phase 1: Passive Analysis (Weeks 1-4)

**Goal**: Build confidence in the system without auto-fixing.

- Deploy `failure-analysis.yml` workflow
- Agent only **comments** on PRs with diagnosis and suggestions
- Collect developer feedback (👍/👎 reactions)
- Measure classification accuracy and diagnosis relevance
- Use OpenAI API for quick start; evaluate self-hosted Ollama in parallel

**Deliverables**:
- GitHub Actions workflow
- Collector + Classifier + Diagnoser agents
- PR comment templates

### Phase 2: Selective Auto-Fix (Weeks 5-12)

**Goal**: Enable auto-fix for high-confidence, low-risk categories.

- Enable auto-fix for: `SECURITY_CVE`, `LINT_ERROR`
- Require minimum confidence threshold of 0.90
- Add pre-commit validation (lint + build + test) before pushing fixes
- Track auto-fix success rate

**Deliverables**:
- Remediator agent with safety guardrails
- Auto-fix allow-list configuration
- Success rate dashboard

### Phase 3: Full Autonomy (Weeks 13-26)

**Goal**: Expand auto-fix to more categories, add proactive analysis.

- Expand auto-fix to: `DEPENDENCY_ERROR`, `TEST_COVERAGE` (add tests)
- Add proactive scanning: analyze PRs **before** CI runs to predict failures
- Deploy Memory Store for cross-PR learning
- Migrate to self-hosted LLM (Ollama/vLLM) if volume justifies it

**Deliverables**:
- Full agent suite with Memory Store
- Proactive failure prediction
- Self-hosted LLM deployment (optional)

### Phase 4: Platform Extension (Weeks 27+)

**Goal**: Generalize to other repositories and CI systems.

- Package agents as reusable GitHub Actions
- Support multiple CI systems (GitLab CI, Jenkins)
- Build cross-repo failure intelligence (shared Memory Store)
- Add Slack/Teams notifications

---

## 14. Future Enhancements

| Enhancement | Description | Priority |
|-------------|-------------|----------|
| **Proactive Analysis** | Analyze PR diff before CI runs; warn about likely failures | High |
| **Flaky Test Detection** | Identify and quarantine flaky tests automatically | High |
| **Dependency Upgrade Advisor** | Proactively suggest dependency updates before CVEs emerge | Medium |
| **Build Cache Optimization** | Agent suggests caching strategies to speed up CI | Medium |
| **Cross-Repo Intelligence** | Share failure patterns across multiple repositories | Low |
| **Natural Language CI Queries** | "Why did CI fail on my last 3 PRs?" via Slack/chat | Low |
| **Self-Healing Infra** | Auto-retry with different runner / config for infra failures | Low |

---

## 15. Appendix: Current CI/CD Baseline

### A. Existing Pipeline Structure (app-timesheet)

**File**: `.github/workflows/pr-checks.yml` (from LTIM-BFS-POC variant)

| Job | Purpose | Threshold | Auto-remediation |
|-----|---------|-----------|-----------------|
| `security-audit` | npm audit for CVEs | 0 high/critical | ✅ Devin auto-fix (one-time) |
| `test-coverage` | Vitest with coverage | 80% all metrics | ❌ Manual |
| `trigger-devin-cve-fix` | Invokes Devin API | On audit failure | ✅ Creates Devin session |

### B. Key Configuration Files

| File | Purpose |
|------|---------|
| `sonar-project.properties` | SonarQube static analysis config |
| `docker/Dockerfile` | Multi-stage production Docker build |
| `backend/package.json` | Backend deps (Express, SQLite, Jest) |
| `frontend/package.json` | Frontend deps (React 19, Vite 7, MUI 7) |

### C. Failure History Patterns (observed/anticipated)

| Pattern | Frequency | Resolution Complexity |
|---------|-----------|----------------------|
| npm audit CVE in transitive dep | High | Low (version bump) |
| Coverage drop below 80% on new component | Medium | Medium (write tests) |
| TypeScript strict mode errors | Medium | Low-Medium |
| ESLint violations on new code | High | Low (auto-fixable) |
| Docker build failure (dependency) | Low | Medium |
| Test regression from refactor | Low | High (requires understanding) |

---

## Summary

This agentic AI system transforms CI/CD failure analysis from a **manual, reactive** process into an **automated, intelligent** pipeline. By combining specialized AI agents with the project's existing GitHub Actions infrastructure, the system can:

1. **Detect** failures the moment CI completes
2. **Classify** them into a structured taxonomy
3. **Diagnose** root causes using LLM reasoning + historical context
4. **Remediate** automatically where safe, or suggest fixes where not
5. **Learn** from developer feedback to improve over time

The phased rollout (passive → selective auto-fix → full autonomy) minimizes risk while maximizing learning. The open-source technology stack aligns with organizational policy and avoids vendor lock-in.

---

*This design document is a living document and should be updated as the system evolves through implementation phases.*
