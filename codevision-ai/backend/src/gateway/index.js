/**
 * API Gateway (port 3002)
 * Central entry point for the CodeVision AI backend.
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
 * Benefits:
 *   - Single public endpoint (port 3002) for the frontend
 *   - Each downstream service scales independently
 *   - Gateway can add cross-cutting concerns (rate limiting, auth, logging)
 *   - Service failures are isolated — animation failing doesn't break interview
 */
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const http = require('http');
const { createServiceApp, startService } = require('../microservices/shared');
const sessionRoutes = require('../routes/session');
const { initializeDatabase } = require('../database/init');

const SERVICE_NAME = 'api-gateway';
const PORT = process.env.PORT || 3002;

// Downstream service URLs — configurable via env vars for container deployments
const ANIMATION_URL = process.env.ANIMATION_SERVICE_URL || 'http://localhost:3003';
const INTERVIEW_URL = process.env.INTERVIEW_SERVICE_URL || 'http://localhost:3004';
const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:3005';

const app = createServiceApp(SERVICE_NAME);

/**
 * Lightweight reverse proxy middleware.
 * Forwards the entire request body and headers to the target service,
 * then pipes the response back. Handles connection errors gracefully.
 * @param {string} targetBase - Base URL of the downstream service (e.g. http://localhost:3003)
 */
function proxyTo(targetBase) {
  return (req, res) => {
    const url = new URL(targetBase);
    const targetPath = req.originalUrl; // preserves /api/animation/generate etc.

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
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      console.error(`[gateway] Proxy error to ${targetBase}:`, err.message);
      if (!res.headersSent) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Service unavailable',
          message: `Downstream service at ${targetBase} is unreachable.`,
        }));
      }
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Gateway timeout' }));
      }
    });

    // Pipe request body to downstream service
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyStr = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyStr));
      proxyReq.write(bodyStr);
    }
    proxyReq.end();
  };
}

// --- Route requests to downstream microservices ---

// Animation service (animation generation + storyboard)
app.all('/api/animation/*', proxyTo(ANIMATION_URL));

// Interview service (questions + AI answers)
app.all('/api/interview/*', proxyTo(INTERVIEW_URL));

// AI service (analyze, explain, optimize, problem, playground)
app.all('/api/analyze/*', proxyTo(AI_URL));
app.all('/api/analyze', proxyTo(AI_URL));
app.all('/api/explain/*', proxyTo(AI_URL));
app.all('/api/explain', proxyTo(AI_URL));
app.all('/api/optimize/*', proxyTo(AI_URL));
app.all('/api/optimize', proxyTo(AI_URL));
app.all('/api/problem/*', proxyTo(AI_URL));
app.all('/api/problem', proxyTo(AI_URL));
app.all('/api/playground/*', proxyTo(AI_URL));
app.all('/api/playground', proxyTo(AI_URL));

// --- Local routes (lightweight, no need for separate service) ---
app.use('/api/session', sessionRoutes);

// --- Aggregated health check — reports status of all services ---
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
  });
});

// Initialize database (for session routes) and start gateway
initializeDatabase()
  .then(() => startService(app, PORT, SERVICE_NAME))
  .catch((err) => {
    console.error(`[${SERVICE_NAME}] Failed to start:`, err);
    process.exit(1);
  });
