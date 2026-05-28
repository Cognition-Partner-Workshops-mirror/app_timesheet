/**
 * Shared utilities for microservices.
 * Provides common Express middleware setup and health check endpoint
 * so each service doesn't duplicate boilerplate.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

/**
 * Creates a configured Express app with common middleware.
 * Each microservice calls this instead of duplicating setup.
 * @param {string} serviceName - Name for logging and health check
 * @returns {express.Application} Configured Express app
 */
function createServiceApp(serviceName) {
  const app = express();

  // Security and parsing middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }));
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));

  // Health check — used by gateway for service discovery
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: serviceName,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage().heapUsed,
    });
  });

  // Global error handler
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
 * Starts a service on the given port with graceful shutdown support.
 * @param {express.Application} app - Express app
 * @param {number} port - Port number
 * @param {string} serviceName - Name for logging
 */
function startService(app, port, serviceName) {
  const server = app.listen(port, () => {
    console.log(`[${serviceName}] running on port ${port}`);
  });

  // Graceful shutdown on SIGTERM/SIGINT
  const shutdown = () => {
    console.log(`[${serviceName}] shutting down...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return server;
}

module.exports = { createServiceApp, startService };
