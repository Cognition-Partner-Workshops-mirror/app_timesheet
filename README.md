# HLD/LLD Generator

AI-powered High-Level Design (HLD) and Low-Level Design (LLD) document generator for microservices architectures.

## Features

- **Upload UI Design Images**: Drag-and-drop UI mockups for AI-powered analysis — the system extracts endpoints, components, and data models from your designs
- **Requirements Management**: Add requirements via text input or file upload (TXT, MD, PDF, DOCX)
- **AI-Generated HLD**: Generates comprehensive High-Level Design documents including:
  - System overview and architecture description
  - Microservice definitions with endpoints, tech stacks, and dependencies
  - Design pattern recommendations (API Gateway, Circuit Breaker, CQRS, Saga, etc.)
  - Scalability, security, reliability, communication, and deployment strategies
- **AI-Generated LLD**: Generates detailed Low-Level Design for each service including:
  - Component diagrams and class design
  - Database schemas with indexes and constraints
  - API contracts with request/response schemas
  - Sequence flows, error handling, caching, logging, and security details
- **Interactive Editing**: Edit any section of HLD/LLD in real-time with Markdown support
- **Service-to-LLD Navigation**: Click any service in the HLD to navigate directly to its LLD
- **Add/Remove Services**: Dynamically add or remove services from the architecture
- **Project Management**: Create multiple projects with different configurations

## Tech Stack

| Layer     | Technology                                |
|-----------|-------------------------------------------|
| Frontend  | React 19, TypeScript, Material UI, Vite   |
| Backend   | Python, FastAPI, Uvicorn                  |
| AI        | OpenAI GPT-4o (vision + text generation)  |
| Storage   | File-based JSON persistence               |

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **OpenAI API Key** (GPT-4o access required for image analysis)

## Quick Start

### 1. Clone and set up the backend

```bash
cd backend
pip install -r requirements.txt

# Set your OpenAI API key
export OPENAI_API_KEY="your-api-key-here"

# Start the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Set up the frontend

```bash
cd frontend
npm install

# Start the development server
npm run dev
```

### 3. Open the application

Navigate to `http://localhost:5173` in your browser.

## Usage Guide

1. **Create a Project**: Click "New Project" on the dashboard. Configure target scale, primary language, and cloud provider.

2. **Upload UI Designs**: In the project workspace, drag & drop UI design images. Each image is automatically analyzed by AI to extract endpoints and components. You can tag each image with the endpoint name it represents.

3. **Add Requirements**: Switch to the Requirements tab to add text requirements or upload requirement documents.

4. **Generate HLD**: Click "Generate HLD" — the AI analyzes all your images and requirements to produce a comprehensive architecture design following microservices best practices.

5. **Review & Edit HLD**: Navigate through the HLD tabs (Overview, Services, Design Patterns, Strategies, Full Document). Click the edit icon on any section to modify content inline.

6. **Generate LLDs**: On each service card, click "Generate LLD" to create a detailed low-level design. Each LLD includes components, class design, database schema, API contracts, and more.

7. **Edit LLDs**: Navigate to any LLD and edit individual sections (Components, Database Schema, API Contracts, etc.) using the edit button.

## Project Structure

```
hld-lld-generator/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── projects.py        # REST API endpoints
│   │   ├── core/
│   │   │   └── config.py          # Application configuration
│   │   ├── models/
│   │   │   └── schemas.py         # Pydantic data models
│   │   ├── services/
│   │   │   ├── ai_service.py      # OpenAI integration
│   │   │   └── storage.py         # JSON file persistence
│   │   └── main.py                # FastAPI application entry
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts          # API client functions
│   │   ├── components/
│   │   │   └── Layout.tsx         # Global layout
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx      # Project listing & creation
│   │   │   ├── ProjectView.tsx    # Project workspace
│   │   │   ├── HLDView.tsx        # HLD viewer/editor
│   │   │   └── LLDView.tsx        # LLD viewer/editor
│   │   ├── types/
│   │   │   └── index.ts           # TypeScript type definitions
│   │   ├── App.tsx                # Root component with routing
│   │   └── main.tsx               # Entry point
│   └── package.json
└── README.md
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create a new project |
| GET | `/api/projects/{id}` | Get project details |
| PUT | `/api/projects/{id}` | Update project |
| DELETE | `/api/projects/{id}` | Delete project |
| POST | `/api/projects/{id}/images` | Upload UI design image |
| POST | `/api/projects/{id}/requirements` | Add requirements |
| POST | `/api/projects/{id}/hld/generate` | Generate HLD |
| PUT | `/api/projects/{id}/hld` | Update HLD |
| POST | `/api/projects/{id}/lld/generate` | Generate LLD |
| PUT | `/api/projects/{id}/lld/{service_id}` | Update LLD |
| POST | `/api/projects/{id}/services` | Add service to HLD |
| DELETE | `/api/projects/{id}/services/{service_id}` | Remove service |

## Design Patterns Applied

The AI recommends and documents these microservice patterns when applicable:

- **API Gateway**: Unified entry point for client traffic
- **Service Discovery**: Dynamic service registration and lookup
- **Circuit Breaker**: Fault tolerance for inter-service calls
- **CQRS**: Separate read/write models for performance
- **Event Sourcing**: Event-based state management
- **Saga Pattern**: Distributed transaction coordination
- **Database per Service**: Isolated data ownership
- **BFF (Backend for Frontend)**: Tailored API layers per client
- **Sidecar / Ambassador**: Cross-cutting concerns injection
- **Strangler Fig**: Incremental migration strategy

## License

MIT
