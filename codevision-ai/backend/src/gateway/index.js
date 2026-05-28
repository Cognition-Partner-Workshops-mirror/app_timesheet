/**
 * API Gateway (port 3002)
 * Central entry point for the CodeVision AI backend.
 *
 * Routes incoming requests to the appropriate microservice:
 *   - /api/animation/*  → Animation Service (port 3003)
 *   - /api/interview/*  → Interview Service (port 3004)
 *   - /api/analyze/*    → AI Service (port 3005)
 *   - /api/explain/*    → AI Service (port 3005)
 *   - /api/optimize/*   → AI Service (port 3005)
 *   - /api/problem/*    → AI Service (port 3005)
 *   - /api/playground/* → AI Service (port 3005)
 *   - /api/session/*    → handled locally (lightweight DB reads)
 *
 * Resilience patterns applied:
 *   - Circuit Breaker: per-service, fails fast when service is down
 *   - Retry with Exponential Backoff: transient failures retried automatically
 *   - Fallback Cache (Write-Back): serves stale data when live service fails
 *   - Event-Driven: emits events for async processing, avoids deadlocks
 *   - Dead-Letter Queue: failed events queued for inspection/replay
 *
 * Security:
 *   - XSS sanitization, SQL injection detection, CSRF protection
 *   - Rate limiting (general + stricter for AI endpoints)
 *   - Security headers, request size guards
 */
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), override: true });

const http = require('http');
const { createServiceApp, startService } = require('../microservices/shared');
const sessionRoutes = require('../routes/session');
const { initializeDatabase } = require('../database/init');

// Resilience modules
const { withRetry } = require('../resilience/retry');
const { getCircuitBreaker, getAllBreakerStatuses } = require('../resilience/circuitBreaker');
const { getCache, getAllCacheStats, Cache } = require('../resilience/cache');

// Event bus for async event-driven communication
const { eventBus, EVENTS } = require('../events/eventBus');

// Security middleware stack
const { applySecurityMiddleware, aiRateLimiter } = require('../security');

const SERVICE_NAME = 'api-gateway';
const PORT = process.env.PORT || 3002;

// Downstream service URLs — configurable via env vars for container deployments
const ANIMATION_URL = process.env.ANIMATION_SERVICE_URL || 'http://localhost:3003';
const INTERVIEW_URL = process.env.INTERVIEW_SERVICE_URL || 'http://localhost:3004';
const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:3005';

const app = createServiceApp(SERVICE_NAME);

// --- Apply security middleware (XSS, SQL injection, CSRF, rate limiting) ---
applySecurityMiddleware(app);

// --- Stricter rate limit on AI-heavy endpoints (30 req/min vs 100 general) ---
app.use('/api/analyze', aiRateLimiter);
app.use('/api/explain', aiRateLimiter);
app.use('/api/optimize', aiRateLimiter);
app.use('/api/problem', aiRateLimiter);
app.use('/api/interview/answer', aiRateLimiter);

// --- Initialize circuit breakers for each downstream service ---
const animationBreaker = getCircuitBreaker('animation', { failureThreshold: 5, resetTimeout: 30000 });
const interviewBreaker = getCircuitBreaker('interview', { failureThreshold: 5, resetTimeout: 30000 });
const aiBreaker = getCircuitBreaker('ai-service', { failureThreshold: 3, resetTimeout: 45000 });

// --- Initialize caches for each service (write-back fallback) ---
const animationCache = getCache('animation', { defaultTTL: 600000 });  // 10 min TTL
const interviewCache = getCache('interview', { defaultTTL: 900000 });  // 15 min TTL
const aiCache = getCache('ai-service', { defaultTTL: 300000 });        // 5 min TTL

// --- Event listeners for monitoring and async processing ---

// Log circuit state changes for alerting/monitoring
eventBus.on(EVENTS.CIRCUIT_OPENED, (data) => {
  console.error(`[gateway] ALERT: Circuit opened for ${data.service} — requests will fail fast`);
});
eventBus.on(EVENTS.CIRCUIT_CLOSED, (data) => {
  console.log(`[gateway] Circuit closed for ${data.service} — service recovered`);
});

// Track service errors for eventual consistency and metrics
eventBus.on(EVENTS.SERVICE_ERROR, (data) => {
  console.error(`[gateway] Service error on ${data.service}: ${data.error}`);
});

/**
 * Resilient reverse proxy with circuit breaker, retry, and cache fallback.
 *
 * Request flow:
 *   1. Check cache — return immediately on hit
 *   2. Circuit breaker check — fail fast if service is down
 *   3. Forward request with retry (exponential backoff)
 *   4. On success: cache response (write-back) + emit event
 *   5. On failure: serve stale cache if available, otherwise 503
 *
 * @param {string} targetBase - Downstream service URL
 * @param {string} serviceName - Service name for circuit breaker / cache lookup
 * @param {import('../resilience/circuitBreaker').CircuitBreaker} breaker - Circuit breaker instance
 * @param {import('../resilience/cache').Cache} cache - Cache instance
 */
function resilientProxy(targetBase, serviceName, breaker, cache) {
  return async (req, res) => {
    const cacheKey = Cache.keyFromRequest(req.method, req.originalUrl, req.body);

    // Step 1: Check fresh cache first (reduces latency for repeated requests)
    if (req.method === 'GET') {
      const cached = cache.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Service', serviceName);
        return res.json(cached);
      }
    }

    // Step 2 + 3: Circuit breaker wrapping retry + proxy
    try {
      const result = await breaker.execute(
        // Primary function: retry-wrapped HTTP proxy call
        () => withRetry(
          () => proxyRequest(targetBase, req),
          { maxRetries: 2, baseDelay: 500 },
          serviceName
        ),
        // Fallback function: serve stale cache when circuit is open
        () => {
          const stale = cache.getStale(cacheKey);
          if (stale) {
            console.log(`[gateway] Serving cached fallback for ${serviceName}: ${req.originalUrl}`);
            return { __fallback: true, data: stale };
          }
          return null;
        }
      );

      // Handle fallback response (stale cache)
      if (result && result.__fallback) {
        if (result.data) {
          res.setHeader('X-Cache', 'STALE-FALLBACK');
          res.setHeader('X-Service', serviceName);
          return res.json(result.data);
        }
        // No cache available — service is truly down
        return res.status(503).json({
          error: 'Service unavailable',
          message: `${serviceName} is temporarily down and no cached data is available.`,
        });
      }

      // Step 4: Success — cache the response and emit event
      if (result && result.body) {
        // Cache the parsed response body for future requests
        try {
          const parsed = JSON.parse(result.body);
          cache.set(cacheKey, parsed);
          // Emit success event for async processing (eventual consistency)
          eventBus.emit(EVENTS.SESSION_CREATED, {
            service: serviceName,
            path: req.originalUrl,
            timestamp: new Date().toISOString(),
          });
          res.setHeader('X-Cache', 'MISS');
          res.setHeader('X-Service', serviceName);
          // Forward original status code and headers
          res.status(result.statusCode || 200).json(parsed);
        } catch {
          // Non-JSON response — forward raw
          res.setHeader('X-Cache', 'MISS');
          res.writeHead(result.statusCode || 200, result.headers || {});
          res.end(result.body);
        }
      } else {
        res.status(502).json({ error: 'Empty response from downstream service' });
      }
    } catch (error) {
      // Step 5: All retries + circuit breaker exhausted — try stale cache
      const stale = cache.getStale(cacheKey);
      if (stale) {
        res.setHeader('X-Cache', 'STALE-FALLBACK');
        res.setHeader('X-Service', serviceName);
        // Emit error event to DLQ for later inspection
        eventBus.emit(EVENTS.SERVICE_ERROR, {
          service: serviceName,
          path: req.originalUrl,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        return res.json(stale);
      }

      // No cache, no service — return error
      console.error(`[gateway] ${serviceName} unavailable, no fallback:`, error.message);
      eventBus.emit(EVENTS.SERVICE_ERROR, {
        service: serviceName,
        path: req.originalUrl,
        error: error.message,
      });
      res.status(503).json({
        error: 'Service unavailable',
        message: `${serviceName} is temporarily down. Please try again later.`,
      });
    }
  };
}

/**
 * Makes an HTTP request to a downstream service and returns the response.
 * Used by the resilient proxy as the core network call (wrapped in retry + breaker).
 *
 * @param {string} targetBase - Base URL of downstream service
 * @param {import('express').Request} req - Express request
 * @returns {Promise<{statusCode: number, headers: object, body: string}>}
 */
function proxyRequest(targetBase, req) {
  return new Promise((resolve, reject) => {
    const url = new URL(targetBase);
    const targetPath = req.originalUrl;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: targetPath,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${url.hostname}:${url.port}`,
      },
      timeout: 60000,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      let body = '';
      proxyRes.on('data', (chunk) => { body += chunk; });
      proxyRes.on('end', () => {
        // Treat 5xx as errors so retry/circuit-breaker can handle them
        if (proxyRes.statusCode >= 500) {
          const err = new Error(`Upstream ${proxyRes.statusCode}: ${body.slice(0, 200)}`);
          err.status = proxyRes.statusCode;
          return reject(err);
        }
        resolve({ statusCode: proxyRes.statusCode, headers: proxyRes.headers, body });
      });
    });

    proxyReq.on('error', (err) => reject(err));

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      const err = new Error('Request timeout');
      err.code = 'ETIMEDOUT';
      reject(err);
    });

    // Send request body to downstream service
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyStr = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyStr));
      proxyReq.write(bodyStr);
    }
    proxyReq.end();
  });
}

// --- Route requests through resilient proxy to downstream microservices ---

// Animation service (animation generation + storyboard)
app.all('/api/animation/*', resilientProxy(ANIMATION_URL, 'animation', animationBreaker, animationCache));

// Interview service (questions + AI answers)
app.all('/api/interview/*', resilientProxy(INTERVIEW_URL, 'interview', interviewBreaker, interviewCache));

// AI service (analyze, explain, optimize, problem, playground)
const aiProxyHandler = resilientProxy(AI_URL, 'ai-service', aiBreaker, aiCache);
app.all('/api/analyze/*', aiProxyHandler);
app.all('/api/analyze', aiProxyHandler);
app.all('/api/explain/*', aiProxyHandler);
app.all('/api/explain', aiProxyHandler);
app.all('/api/optimize/*', aiProxyHandler);
app.all('/api/optimize', aiProxyHandler);
app.all('/api/problem/*', aiProxyHandler);
app.all('/api/problem', aiProxyHandler);
app.all('/api/playground/*', aiProxyHandler);
app.all('/api/playground', aiProxyHandler);

// --- Local routes (lightweight, no need for separate service) ---
app.use('/api/session', sessionRoutes);

// --- Aggregated health check with resilience status ---
app.get('/api/health', async (_req, res) => {
  const services = [
    { name: 'animation', url: `${ANIMATION_URL}/health` },
    { name: 'interview', url: `${INTERVIEW_URL}/health` },
    { name: 'ai', url: `${AI_URL}/health` },
  ];

  const results = await Promise.allSettled(
    services.map(async (s) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        const r = await fetch(s.url, { signal: controller.signal });
        clearTimeout(timeout);
        return { name: s.name, status: r.ok ? 'healthy' : 'unhealthy' };
      } catch {
        clearTimeout(timeout);
        return { name: s.name, status: 'unreachable' };
      }
    })
  );

  const health = results.map((r) => r.status === 'fulfilled' ? r.value : { name: 'unknown', status: 'error' });
  const allHealthy = health.every((h) => h.status === 'healthy');

  res.status(allHealthy ? 200 : 207).json({
    status: allHealthy ? 'ok' : 'degraded',
    gateway: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    services: health,
    // Include resilience status for monitoring dashboards
    circuitBreakers: getAllBreakerStatuses(),
    caches: getAllCacheStats(),
    eventBus: eventBus.getStats(),
  });
});

// --- Dead-letter queue inspection endpoints ---
app.get('/api/admin/dlq', (_req, res) => {
  res.json({ dlq: eventBus.getDLQ(), stats: eventBus.getStats() });
});

// Replay a specific DLQ entry
app.post('/api/admin/dlq/:eventId/replay', (req, res) => {
  const replayed = eventBus.replayDLQ(req.params.eventId);
  res.json({ replayed, eventId: req.params.eventId });
});

// Clear the DLQ
app.delete('/api/admin/dlq', (_req, res) => {
  const cleared = eventBus.clearDLQ();
  res.json({ cleared });
});

// --- Liveness probe (for k8s auto-scaling) ---
app.get('/healthz', (_req, res) => {
  // Liveness: returns 200 if process is alive (used by k8s to restart dead pods)
  res.status(200).json({ status: 'alive' });
});

// --- Readiness probe (for k8s auto-scaling) ---
app.get('/readyz', async (_req, res) => {
  // Readiness: returns 200 only if at least one downstream service is reachable
  // If not ready, k8s removes this pod from the load balancer
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const r = await fetch(`${ANIMATION_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (r.ok) return res.status(200).json({ status: 'ready' });
  } catch { /* fall through */ }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const r = await fetch(`${AI_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (r.ok) return res.status(200).json({ status: 'ready' });
  } catch { /* fall through */ }

  res.status(503).json({ status: 'not-ready', message: 'No downstream services reachable' });
});

// Initialize database (for session routes) and start gateway
initializeDatabase()
  .then(() => startService(app, PORT, SERVICE_NAME))
  .catch((err) => {
    console.error(`[${SERVICE_NAME}] Failed to start:`, err);
    process.exit(1);
  });
