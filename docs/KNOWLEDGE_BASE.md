# Knowledge Base — Employee Time Tracking Application

## 1. Architecture Overview

### System Diagram

```
┌──────────────────────────────────┐
│           Frontend               │
│  React 19 + TypeScript + Vite    │
│  Material UI 7 · TanStack Query  │
│  Port 5173 (dev) / static (prod) │
└──────────────┬───────────────────┘
               │  HTTP (Vite proxy /api → :3001)
               ▼
┌──────────────────────────────────┐
│           Backend                │
│  Node.js + Express 4             │
│  Port 3001                       │
│  Middleware: Helmet, CORS,       │
│    Rate-Limit, Morgan            │
└──────────────┬───────────────────┘
               │  sqlite3 driver (callback API)
               ▼
┌──────────────────────────────────┐
│         SQLite Database          │
│  In-memory (:memory:) — dev      │
│  File-based (/app/data/) — prod  │
└──────────────────────────────────┘
```

### Communication Pattern

| Path | Description |
|------|-------------|
| Frontend → Backend | REST over HTTP; Axios client with `x-user-email` header for auth |
| Backend → SQLite | Direct `sqlite3` callback API (no ORM) |
| Vite Dev Proxy | `/api/*` requests proxied from `:5173` → `:3001` |
| Docker (prod) | Backend serves the compiled React SPA from `public/` via Express static |

### Key Design Decisions

* **Password-less authentication** — identity is established by email only via `x-user-email` header. The README mentions JWT tokens, but the actual implementation uses a simple email-based header system.
* **In-memory SQLite** in development; file-based SQLite in the Docker production image (via `docker/overrides/`).
* **Row-level data isolation** — every query filters by `user_email` to scope data per user.
* **Monorepo layout** — `backend/` and `frontend/` directories at the repo root; no workspace manager (npm workspaces, Turborepo, etc.).

---

## 2. Data Models

### Entity-Relationship Diagram

```
┌────────────┐       ┌────────────────┐       ┌──────────────────┐
│   users     │ 1───* │    clients      │ 1───* │  work_entries     │
│             │       │                │       │                  │
│ email (PK)  │       │ id (PK, auto)  │       │ id (PK, auto)    │
│ created_at  │       │ name           │       │ client_id (FK)   │
└────────────┘       │ description    │       │ user_email (FK)  │
                      │ department     │       │ hours            │
                      │ email          │       │ description      │
                      │ user_email(FK) │       │ date             │
                      │ created_at     │       │ created_at       │
                      │ updated_at     │       │ updated_at       │
                      └────────────────┘       └──────────────────┘
```

### Table Details

| Table | Column | Type | Constraints | Notes |
|-------|--------|------|-------------|-------|
| **users** | email | TEXT | PRIMARY KEY | User identity |
| | created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| **clients** | id | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| | name | TEXT | NOT NULL | Max 255 chars (Joi) |
| | description | TEXT | nullable | Max 1000 chars (Joi) |
| | department | TEXT | nullable | Max 255 chars (Joi) |
| | email | TEXT | nullable | Contact email for the client |
| | user_email | TEXT | NOT NULL, FK → users(email) ON DELETE CASCADE | Owner |
| | created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| | updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| **work_entries** | id | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| | client_id | INTEGER | NOT NULL, FK → clients(id) ON DELETE CASCADE | |
| | user_email | TEXT | NOT NULL, FK → users(email) ON DELETE CASCADE | |
| | hours | DECIMAL(5,2) | NOT NULL | 0 < hours ≤ 24 (Joi) |
| | description | TEXT | nullable | Max 1000 chars (Joi) |
| | date | DATE | NOT NULL | ISO format required |
| | created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| | updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |

### Indexes

| Index Name | Table | Column(s) |
|-----------|-------|-----------|
| idx_clients_user_email | clients | user_email |
| idx_work_entries_client_id | work_entries | client_id |
| idx_work_entries_user_email | work_entries | user_email |
| idx_work_entries_date | work_entries | date |

### Cascade Behavior

* Deleting a **user** cascades to their **clients** and **work_entries**.
* Deleting a **client** cascades to its **work_entries**.

> **Note:** The development `init.js` does not enable `PRAGMA foreign_keys = ON`, so cascades are not enforced at runtime in dev. The Docker override (`docker/overrides/database/init.js`) does enable the pragma.

---

## 3. API Surface Map

**Base path:** `/api`
**Auth mechanism:** `x-user-email` header on all protected routes (every route except `POST /api/auth/login` and `GET /health`).

### Authentication (`backend/src/routes/auth.js`)

| Method | Endpoint | Auth | Request Body | Response (200/201) |
|--------|----------|------|--------------|-------------------|
| POST | `/api/auth/login` | None | `{ email: string }` | `{ message, user: { email, createdAt } }` |
| GET | `/api/auth/me` | Required | — | `{ user: { email, createdAt } }` |

### Clients (`backend/src/routes/clients.js`)

| Method | Endpoint | Auth | Request Body / Params | Response |
|--------|----------|------|----------------------|----------|
| GET | `/api/clients` | Required | — | `{ clients: Client[] }` |
| GET | `/api/clients/:id` | Required | `:id` (integer) | `{ client: Client }` |
| POST | `/api/clients` | Required | `{ name, description?, department?, email? }` | `201 { message, client: Client }` |
| PUT | `/api/clients/:id` | Required | partial `{ name?, description?, department?, email? }` | `{ message, client: Client }` |
| DELETE | `/api/clients` | Required | — | `{ message, deletedCount }` |
| DELETE | `/api/clients/:id` | Required | `:id` (integer) | `{ message }` |

### Work Entries (`backend/src/routes/workEntries.js`)

| Method | Endpoint | Auth | Request Body / Params | Response |
|--------|----------|------|----------------------|----------|
| GET | `/api/work-entries` | Required | `?clientId` (optional filter) | `{ workEntries: WorkEntry[] }` |
| GET | `/api/work-entries/:id` | Required | `:id` (integer) | `{ workEntry: WorkEntry }` |
| POST | `/api/work-entries` | Required | `{ clientId, hours, description?, date }` | `201 { message, workEntry }` |
| PUT | `/api/work-entries/:id` | Required | partial `{ clientId?, hours?, description?, date? }` | `{ message, workEntry }` |
| DELETE | `/api/work-entries/:id` | Required | `:id` (integer) | `{ message }` |

### Reports (`backend/src/routes/reports.js`)

| Method | Endpoint | Auth | Response |
|--------|----------|------|----------|
| GET | `/api/reports/client/:clientId` | Required | `{ client, workEntries, totalHours, entryCount }` |
| GET | `/api/reports/export/csv/:clientId` | Required | CSV file download |
| GET | `/api/reports/export/pdf/:clientId` | Required | PDF file download |

### Infrastructure

| Method | Endpoint | Auth | Response |
|--------|----------|------|----------|
| GET | `/health` | None | `{ status: "OK", timestamp }` |

---

## 4. Business Logic Inventory

### Authentication Flow

1. **Login (`POST /api/auth/login`)** — validates email via Joi schema. If user exists, returns user object. If not, inserts a new row into `users` and returns `201`.
2. **Auth middleware (`authenticateUser`)** — reads `x-user-email` header; validates email format with regex; checks user existence in DB; auto-creates user if missing; sets `req.userEmail` for downstream handlers.

### Client Management

* Full CRUD scoped to `user_email`.
* Bulk delete (`DELETE /api/clients`) removes all clients for the authenticated user.
* Validation via Joi: `name` required (1-255 chars); `description` optional (max 1000); `department` optional (max 255); `email` optional (valid email format).
* Update builds SQL dynamically based on provided fields.

### Work Entry Management

* Full CRUD scoped to `user_email`.
* On create/update, the backend verifies the referenced `client_id` belongs to the authenticated user.
* Hours validated: positive number ≤ 24 with up to 2 decimal places.
* Date must be ISO format.

### Reporting

* **JSON report** — aggregates work entries per client, computes `totalHours` and `entryCount`.
* **CSV export** — writes a temporary CSV file using `csv-writer`, streams it as a download, then deletes the temp file.
* **PDF export** — generates a PDF in-memory using `pdfkit`, piped directly to the HTTP response.

### Frontend State Management

* **Auth state** — React Context (`AuthContext`) backed by `localStorage` for `userEmail` persistence.
* **Server state** — TanStack Query (`@tanstack/react-query`) with query invalidation after mutations.
* **Routing** — React Router v7; unauthenticated users redirected to `/login`; authenticated users see a sidebar layout with Dashboard, Clients, Work Entries, Reports pages.

---

## 5. Integration Points

| Integration | Technology | Details |
|-------------|-----------|---------|
| Database | SQLite via `sqlite3` npm package | Callback-based API; singleton pattern in `database/init.js` |
| HTTP Client | Axios | Request interceptor adds `x-user-email`; response interceptor handles 401 → redirect to `/login` |
| PDF Generation | PDFKit | Streamed directly to HTTP response |
| CSV Generation | csv-writer | Writes to temp file, sends via `res.download()`, cleans up |
| Logging | Morgan (`combined` format) | Stdout only; no structured logging or external log aggregation |
| Security Headers | Helmet | Default config in dev; custom CSP in Docker prod override |
| Rate Limiting | express-rate-limit | 100 requests per 15 min per IP (global); no per-route config |
| Static Analysis | SonarQube | `sonar-project.properties` configured; sources = `backend/src`, `frontend/src` |

---

## 6. Build and Deployment Summary

### Development

```bash
# Backend
cd backend && npm install && cp .env.example .env && npm run dev  # nodemon on :3001

# Frontend
cd frontend && npm install && npm run dev  # Vite dev server on :5173
```

### Testing

```bash
cd backend && npm test          # Jest — 161 tests across 8 suites
cd backend && npm run test:coverage  # Coverage report
```

* All tests mock `sqlite3` and use `supertest` for HTTP assertions.
* Coverage thresholds: branches 60%, functions 65%, lines 60%, statements 60%.
* **No frontend tests exist.**

### Linting

```bash
cd frontend && npm run lint     # ESLint (flat config) for TypeScript
```

* No backend linter configured.

### Production Build

```bash
cd frontend && npm run build    # tsc -b && vite build → frontend/dist/
```

### Docker

```bash
docker build -f docker/Dockerfile -t timesheet-app .
docker run -p 3001:3001 -v timesheet-data:/app/data timesheet-app
```

* Multi-stage Dockerfile: frontend build → backend deps → production image (Node 20 Alpine).
* Production overrides: file-based SQLite (`/app/data/timesheet.db`), custom Helmet CSP, `express.static` to serve the React SPA.
* Non-root user (`nodejs:1001`), `dumb-init` for signal handling.
* Built-in `HEALTHCHECK` on `/health`.

### CI/CD

* No CI/CD pipeline files found in the repository (no `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, etc.).
* SonarQube integration configured via `sonar-project.properties` but no pipeline invocation is present.
