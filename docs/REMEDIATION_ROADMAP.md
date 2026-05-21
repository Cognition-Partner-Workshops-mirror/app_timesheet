# Remediation Roadmap — Employee Time Tracking Application

Gaps from the [Gap Analysis](./GAP_ANALYSIS.md) are prioritized into three phases based on severity and effort. Each item includes an actionable **Devin prompt** that can be executed directly.

---

## Phase 1 — Quick Wins (High Severity / Low Effort)

These items address critical or high-severity gaps with small implementation effort. Target: **1–2 weeks**.

### 1.1 Enable Foreign Keys in Development (`SE-7`)

> The main `database/init.js` does not enable `PRAGMA foreign_keys = ON`, so cascade deletes and referential integrity are silently ignored during development.

**Devin prompt:**
```
In backend/src/database/init.js, add `database.run('PRAGMA foreign_keys = ON');` as the first
statement inside the `database.serialize()` callback in `initializeDatabase()`. Update the
corresponding test in backend/src/__tests__/database/init.test.js to verify the pragma is called.
Run the tests with `cd backend && npm test` to confirm they pass.
```

### 1.2 Add Graceful Shutdown Handler (`RE-1`)

> The server has no `SIGTERM`/`SIGINT` handler. Abrupt exits can leave database connections open.

**Devin prompt:**
```
In backend/src/server.js, after `app.listen(...)`, add SIGTERM and SIGINT handlers that:
1. Log "Shutting down gracefully..."
2. Call server.close() to stop accepting new connections
3. Call closeDatabase() from ./database/init
4. Exit with code 0
Import closeDatabase at the top. Make sure the Docker override server.js gets the same treatment.
Run `cd backend && npm test` to confirm tests still pass.
```

### 1.3 Add Deep Health Check (`OB-4`)

> `/health` returns OK without verifying database connectivity, so a broken DB goes undetected.

**Devin prompt:**
```
Update the GET /health endpoint in backend/src/server.js to run a simple
`SELECT 1` query against the database (via getDatabase()). If the query fails, return
status 503 with { status: "DEGRADED", database: "unreachable" }. If it succeeds, return
status 200 with { status: "OK", database: "connected", timestamp }. Apply the same change
to docker/overrides/server.js. Add a test for both healthy and unhealthy states.
Run `cd backend && npm test`.
```

### 1.4 Add Unhandled Rejection Handler (`EH-4`)

> Unhandled promise rejections can silently crash the process.

**Devin prompt:**
```
In backend/src/server.js, add process-level handlers before startServer():
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });
Apply the same to docker/overrides/server.js. Run `cd backend && npm test`.
```

### 1.5 Introduce Structured Logging (`OB-1`)

> All logging is `console.log`/`console.error` with no structure, levels, or context.

**Devin prompt:**
```
Install Pino as a dependency in backend/ (`npm install pino`). Create backend/src/utils/logger.js
that exports a Pino logger instance with level based on NODE_ENV (debug in dev, info in prod).
Replace all console.log and console.error calls across the backend with logger.info / logger.error.
Replace Morgan with pino-http (`npm install pino-http`) in server.js for HTTP request logging.
Run `cd backend && npm test` and fix any test adjustments needed.
```

### 1.6 Add Request Timeout Middleware (`RE-3`)

> No server-side request timeout; long requests could block indefinitely.

**Devin prompt:**
```
In backend/src/server.js, add `app.use((req, res, next) => { req.setTimeout(30000); next(); });`
before the route mounts. This enforces a 30-second timeout on all requests. Also set
`server.keepAliveTimeout = 65000;` and `server.headersTimeout = 66000;` after the app.listen call.
Apply to docker/overrides/server.js as well. Run `cd backend && npm test`.
```

### 1.7 Add Date-Range Filtering to Reports (`AD-5`)

> Reports only filter by client. Date-range filtering is essential for time-tracking.

**Devin prompt:**
```
Update GET /api/reports/client/:clientId in backend/src/routes/reports.js to accept optional
query params `startDate` and `endDate` (ISO date strings). Add WHERE clauses
`AND date >= ? AND date <= ?` when provided. Add Joi validation for these params. Update the
CSV and PDF export endpoints to also accept the same date range filters. Add tests for filtered
and unfiltered report queries. Run `cd backend && npm test`.
```

### 1.8 Add Dependency Vulnerability Scanning (`SE-6`)

> No npm audit step or Dependabot configuration.

**Devin prompt:**
```
Create .github/dependabot.yml with weekly update checks for both backend/ and frontend/
npm ecosystems. Also add an npm audit check script in backend/package.json:
  "audit": "npm audit --audit-level=high"
and in frontend/package.json:
  "audit": "npm audit --audit-level=high"
```

---

## Phase 2 — Important (High Severity / Medium Effort)

These items require more work but address significant architectural gaps. Target: **3–6 weeks**.

### 2.1 Implement Proper Authentication (`SE-1`)

> The current email-header auth provides zero security. Any client can impersonate any user.

**Devin prompt:**
```
Implement JWT-based authentication for the backend:
1. In POST /api/auth/login, after validating/creating the user, generate a JWT token using
   jsonwebtoken (already a dependency) signed with process.env.JWT_SECRET. Return it in the
   response as { message, user, token }.
2. Create a new middleware `authenticateJwt` in backend/src/middleware/auth.js that:
   - Reads the Authorization header (Bearer <token>)
   - Verifies the token with jsonwebtoken
   - Sets req.userEmail from the token payload
   - Returns 401 if missing or invalid
3. Replace all uses of the existing authenticateUser middleware with authenticateJwt on
   protected routes.
4. Keep the old x-user-email middleware as a fallback for development (behind NODE_ENV check).
5. Update the frontend ApiClient to store the JWT in localStorage and send it as
   Authorization: Bearer <token> instead of x-user-email header.
6. Update all backend tests to use JWT auth mocking.
Run `cd backend && npm test` and `cd frontend && npm run build`.
```

### 2.2 Extract Service Layer (`CO-1`)

> Route handlers contain SQL queries, business logic, and response formatting. This violates SoC.

**Devin prompt:**
```
Create a backend/src/services/ directory with three files:
- clientService.js: getAllClients(userEmail), getClientById(id, userEmail),
  createClient(data, userEmail), updateClient(id, data, userEmail),
  deleteClient(id, userEmail), deleteAllClients(userEmail)
- workEntryService.js: similar CRUD functions for work entries
- reportService.js: getClientReport(clientId, userEmail), generateCsvReport(clientId, userEmail),
  generatePdfReport(clientId, userEmail)

Move all database queries and business logic from the route files into these services.
Route handlers should only: parse request, call service, format response.
Update all existing tests to still pass. Run `cd backend && npm test`.
```

### 2.3 Add Pagination to List Endpoints (`AD-1`)

> List endpoints return all records, which will degrade at scale.

**Devin prompt:**
```
Add pagination support to GET /api/clients and GET /api/work-entries:
1. Accept query params: page (default 1), limit (default 20, max 100).
2. Return response with: { data: [...], meta: { page, limit, total, totalPages } }.
3. Add Joi validation for pagination params.
4. Update existing tests and add pagination-specific tests.
5. Update frontend API client and list pages to use pagination (add "Load More" or page controls).
Run `cd backend && npm test` and `cd frontend && npm run build`.
```

### 2.4 Add Frontend Unit Tests (`TE-1`)

> Zero frontend tests exist. This is the highest-severity testing gap.

**Devin prompt:**
```
Set up frontend testing infrastructure:
1. Install Vitest, @testing-library/react, @testing-library/jest-dom, and msw (Mock Service Worker).
2. Add a vitest.config.ts with jsdom environment.
3. Add scripts to frontend/package.json: "test": "vitest", "test:coverage": "vitest --coverage".
4. Write tests for:
   - LoginPage: renders form, handles submission, shows errors
   - ClientsPage: renders client list, handles CRUD dialogs
   - WorkEntriesPage: renders entries, handles create/edit/delete
   - ReportsPage: renders report data, handles export buttons
   - AuthContext: login/logout state management
   - ApiClient: request interceptors, error handling
Target minimum 60% coverage. Run `cd frontend && npm test`.
```

### 2.5 Add Backend Integration Tests (`TE-2`)

> All tests mock SQLite. Real SQL bugs are invisible.

**Devin prompt:**
```
Create a backend/src/__tests__/integration/ directory. Add integration tests that use a real
in-memory SQLite database (not mocked):
1. Create a test helper that initializes a fresh in-memory DB before each test suite.
2. Write integration tests for the complete request lifecycle:
   - Login → create client → create work entry → get report → export CSV
3. Test foreign key cascades (delete client → verify entries are gone).
4. Test concurrent user data isolation.
Add a separate Jest config or test script: "test:integration": "jest --config jest.integration.config.js".
Run `cd backend && npm run test:integration`.
```

### 2.6 Add Database Migrations (`RE-6`)

> Schema changes require manual DDL edits. No version tracking or rollback capability.

**Devin prompt:**
```
Install knex as a dependency in backend/ (`npm install knex`). Set up a migration system:
1. Create knexfile.js with SQLite configuration (in-memory for dev, file-based for production).
2. Create an initial migration that produces the same schema as the current init.js tables.
3. Update database/init.js to use knex for both connection management and schema creation.
4. Add scripts: "migrate": "knex migrate:latest", "migrate:make": "knex migrate:make".
5. Update tests to use the knex-based initialization.
Run `cd backend && npm test`.
```

### 2.7 Add OpenAPI Documentation (`AD-3`)

> No machine-readable API specification exists.

**Devin prompt:**
```
Install swagger-jsdoc and swagger-ui-express in the backend.
1. Add JSDoc-style OpenAPI annotations to every route handler.
2. Create backend/src/swagger.js that configures swagger-jsdoc with the project info.
3. Mount swagger-ui-express at /api-docs in server.js (development only).
4. Generate an openapi.json file and commit it to docs/.
Run `cd backend && npm run dev` and verify /api-docs renders the Swagger UI.
```

---

## Phase 3 — Polish (Medium/Low Severity)

These items improve maintainability and developer experience. Target: **ongoing**.

### 3.1 Unify Docker Overrides with Environment Variables (`CO-2`)

> Docker overrides duplicate server.js and init.js with minor diffs.

**Devin prompt:**
```
Refactor the main backend/src/server.js and backend/src/database/init.js to be
environment-aware so the Docker overrides are no longer needed:
1. In init.js: use process.env.DATABASE_PATH (default ':memory:') to determine DB type.
   Add PRAGMA foreign_keys = ON unconditionally.
2. In server.js: conditionally serve static files when NODE_ENV=production.
   Use environment-aware Helmet config.
3. Update the Dockerfile to remove the COPY overrides steps and use the main source files directly.
4. Delete docker/overrides/ directory.
Run `cd backend && npm test` and verify Docker build still works.
```

### 3.2 Add Centralized Error Constants (`CO-3`)

> Error messages and HTTP status codes are scattered across route files.

**Devin prompt:**
```
Create backend/src/constants/errors.js exporting error objects:
  { NOT_FOUND: { status: 404, message: 'Resource not found' }, ... }
Create a helper function throwAppError(errorConstant) that creates an Error with status property.
Update all route handlers to use these constants instead of inline status/message pairs.
Update the errorHandler middleware to handle AppError instances.
Run `cd backend && npm test`.
```

### 3.3 Add API Versioning (`AD-2`)

> No version prefix makes breaking changes risky.

**Devin prompt:**
```
1. Create backend/src/routes/v1/ directory.
2. Move all current route files into v1/.
3. Create backend/src/routes/v1/index.js that mounts all v1 routes.
4. In server.js, mount routes as app.use('/api/v1', v1Routes).
5. Add a redirect from /api/clients → /api/v1/clients (etc.) for backwards compatibility.
6. Update frontend API client baseURL to use /api/v1.
7. Update all tests. Run `cd backend && npm test` and `cd frontend && npm run build`.
```

### 3.4 Add Frontend Error Boundary (`EH-5`)

> No React Error Boundary catches rendering failures.

**Devin prompt:**
```
Create frontend/src/components/ErrorBoundary.tsx — a class component that:
1. Catches render errors via componentDidCatch.
2. Displays a user-friendly fallback UI with a "Reload" button.
3. Logs the error to console (and optionally to a future error tracking service).
Wrap the main <AppContent /> in App.tsx with this ErrorBoundary.
Also add a typed error interceptor in the Axios response interceptor that parses API error
responses into a consistent ApiError type.
Run `cd frontend && npm run build`.
```

### 3.5 Add E2E Tests with Playwright (`TE-3`)

> No automated end-to-end testing of user flows.

**Devin prompt:**
```
Set up Playwright for E2E testing:
1. Install @playwright/test in the project root.
2. Create playwright.config.ts with:
   - baseURL: http://localhost:5173
   - webServer commands to start both backend and frontend
3. Write E2E tests for:
   - Login flow (enter email, see dashboard)
   - Create a client, verify it appears in the list
   - Add a work entry for the client
   - View the report, verify hours are correct
   - Export CSV and PDF (verify downloads)
4. Add script: "test:e2e": "playwright test".
Run `npx playwright test`.
```

### 3.6 Add Application Metrics (`OB-2`)

> No metrics endpoint for monitoring request rates, latencies, or business KPIs.

**Devin prompt:**
```
Install prom-client in the backend. Create backend/src/middleware/metrics.js that:
1. Collects default Node.js metrics (memory, CPU, event loop lag).
2. Creates a histogram for HTTP request duration, labeled by method, route, status.
3. Creates counters for business events: clients_created_total, work_entries_created_total,
   reports_exported_total.
4. Exposes GET /metrics endpoint (Prometheus format).
Mount the middleware in server.js. Add the business counters in the appropriate route handlers.
Run `cd backend && npm test`.
```

### 3.7 Add Frontend Error Tracking (`OB-5`)

> Frontend errors are only visible in the browser console.

**Devin prompt:**
```
Install @sentry/react in the frontend. Create frontend/src/utils/errorTracking.ts that:
1. Initializes Sentry with a DSN from VITE_SENTRY_DSN env var (no-op if not set).
2. Exports a captureError(error) function.
3. Integrate with the ErrorBoundary from 3.4 to auto-report render errors.
4. Add captureError calls in the Axios error interceptor.
Run `cd frontend && npm run build`.
```

### 3.8 Convert Backend to TypeScript (`CO-5`)

> Backend uses plain JS, losing compile-time safety.

**Devin prompt:**
```
Convert the backend to TypeScript:
1. Install typescript, @types/express, @types/node, ts-node, and other needed @types packages.
2. Create backend/tsconfig.json with strict mode.
3. Rename all .js files to .ts, add type annotations to all functions and variables.
4. Create type interfaces for all entities (User, Client, WorkEntry) and request/response shapes.
5. Update package.json scripts to use ts-node for dev and tsc for build.
6. Update Jest config for TypeScript (ts-jest).
Run `cd backend && npm run build && npm test`.
```

### 3.9 Stream CSV Export (`SE-5`)

> CSV export writes a temp file, risking orphan files on crashes.

**Devin prompt:**
```
Refactor the CSV export endpoint in backend/src/routes/reports.js to stream CSV data directly
to the response without creating a temp file:
1. Replace csv-writer with csv-stringify (npm install csv-stringify).
2. Pipe the CSV stream directly to res with appropriate Content-Type and Content-Disposition headers.
3. Remove the temp file creation, download, and cleanup logic.
4. Update the corresponding tests.
Run `cd backend && npm test`.
```

### 3.10 Add Request ID Middleware (`EH-2`)

> No request correlation for debugging.

**Devin prompt:**
```
Create backend/src/middleware/requestId.js that:
1. Reads X-Request-Id from incoming headers (if present) or generates a UUID.
2. Attaches it to req.id.
3. Sets it on the response header X-Request-Id.
4. Makes it available to the logger (from 1.5) for all log entries in that request scope.
Mount it as the first middleware in server.js.
Run `cd backend && npm test`.
```

---

## Priority Matrix

```
                ┌─────────────────────────────────────────────┐
                │                  EFFORT                      │
                │     Small          Medium          Large      │
  ┌─────────────┼─────────────────┬───────────────┬───────────┤
  │ Critical    │ SE-7 (1.1)      │ SE-1 (2.1)    │ TE-1(2.4) │
S │             │                 │               │           │
E │ High        │ RE-1 (1.2)      │ CO-1 (2.2)    │ TE-3(3.5) │
V │             │ OB-4 (1.3)      │ AD-1 (2.3)    │           │
E │             │ EH-4 (1.4)      │ TE-2 (2.5)    │           │
R │             │ OB-1 (1.5)      │ RE-6 (2.6)    │           │
I │             │ SE-2 (1.8)      │               │           │
T │             │ AD-5 (1.7)      │               │           │
Y │ Medium      │ EH-2 (3.10)     │ AD-3 (2.7)    │ CO-5(3.8) │
  │             │ EH-3, EH-5      │ SE-3, AD-4    │           │
  │             │ SE-4, SE-6      │ OB-2, OB-3    │           │
  │             │ RE-3 (1.6)      │               │           │
  │ Low         │ RE-5            │ CO-4, RE-4    │           │
  │             │ TE-4, SE-5(3.9) │               │           │
  └─────────────┴─────────────────┴───────────────┴───────────┘
```
