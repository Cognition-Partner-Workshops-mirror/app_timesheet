/**
 * Shared utilities for microservices.
 * Provides common Express middleware setup, health check endpoint,
 * security middleware, and graceful shutdown with connection draining.
 *
 * Each microservice calls createServiceApp() to get a fully configured
 * Express app with all cross-cutting concerns applied.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { additionalSecurityHeaders, xssSanitize, sqlInjectionGuard } = require('../security');

/**
 * Creates a configured Express app with common middleware and security.
 * Each microservice calls this instead of duplicating setup.
 * @param {string} serviceName - Name for logging and health check
 * @returns {express.Application} Configured Express app
 */
function createServiceApp(serviceName) {
  const app = express();

  // Security headers via helmet (XSS protection, clickjacking, MIME sniffing, etc.)
  app.use(helmet());

  // Additional security headers not covered by default helmet config
  app.use(additionalSecurityHeaders);

  // CORS configuration — only allow requests from the configured frontend origin
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }));

  // Request logging
  app.use(morgan('dev'));

  // JSON body parsing with size limit (prevents payload bombs)
  app.use(express.json({ limit: '10mb' }));

  // XSS sanitization on all string inputs (defense-in-depth)
  app.use(xssSanitize);

  // SQL injection detection on non-code fields (defense-in-depth)
  app.use(sqlInjectionGuard);

  // Liveness probe — confirms the process is alive (for k8s auto-scaling)
  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'alive', service: serviceName });
  });

  // Readiness probe — confirms the service is ready to accept traffic
  app.get('/readyz', (_req, res) => {
    res.status(200).json({ status: 'ready', service: serviceName });
  });

  // Health check — used by gateway for service discovery and monitoring
  app.get('/health', (_req, res) => {
    const memUsage = process.memoryUsage();
    res.json({
      status: 'ok',
      service: serviceName,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
      },
    });
  });

  // Global error handler — catches unhandled errors from routes
  app.use((err, _req, res, _next) => {
    console.error(`[${serviceName}] Unhandled error:`, err);
    res.status(500).json({
      error: 'Internal server error',
      service: serviceName,
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    });
  });

  return app;
}

/**
 * Starts a service on the given port with graceful shutdown and connection draining.
 * Graceful shutdown ensures in-flight requests complete before the process exits.
 * This is critical for k8s auto-scaling — pods must drain connections before terminating.
 *
 * @param {express.Application} app - Express app
 * @param {number} port - Port number
 * @param {string} serviceName - Name for logging
 * @returns {http.Server} HTTP server instance
 */
function startService(app, port, serviceName) {
  const server = app.listen(port, () => {
    console.log(`[${serviceName}] running on port ${port}`);
  });

  // Track active connections for graceful drain
  let activeConnections = 0;
  server.on('connection', (socket) => {
    activeConnections++;
    socket.on('close', () => { activeConnections--; });
  });

  // Graceful shutdown: stop accepting new connections, drain existing ones
  const shutdown = (signal) => {
    console.log(`[${serviceName}] ${signal} received — starting graceful shutdown...`);
    console.log(`[${serviceName}] Draining ${activeConnections} active connections...`);

    // Stop accepting new connections
    server.close(() => {
      console.log(`[${serviceName}] All connections drained. Exiting.`);
      process.exit(0);
    });

    // Force exit after 10s if connections don't drain (prevents stuck pods)
    setTimeout(() => {
      console.error(`[${serviceName}] Force exit — ${activeConnections} connections still open`);
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

module.exports = { createServiceApp, startService };
