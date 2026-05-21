/**
 * API Gateway entry point.
 * Central entry point for all client requests, providing:
 * - Request routing/proxying to downstream microservices
 * - Rate limiting and security headers
 * - Health monitoring and service registry info
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./config/logger');
const services = require('./config/services');
const { globalLimiter } = require('./middleware/rateLimiter');
const { setupProxyRoutes } = require('./routes/proxyRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and utility middleware
app.use(helmet());
app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(globalLimiter);

// Gateway health check - reports status of the gateway itself
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Service registry endpoint - lists all registered microservices and their routes
app.get('/api/services', (req, res) => {
  const serviceList = Object.entries(services).map(([name, config]) => ({
    name,
    path: config.pathPrefix,
    description: config.description,
    status: 'registered',
  }));

  res.json({
    success: true,
    gateway: 'api-gateway',
    services: serviceList,
  });
});

// Register proxy routes for all downstream microservices
setupProxyRoutes(app);

// 404 handler for routes not matching any registered service
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Gateway: Route ${req.method} ${req.path} not found. Use GET /api/services to see available routes.`,
  });
});

// Start the gateway server
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`Service registry: http://localhost:${PORT}/api/services`);
  logger.info('Registered services:');
  Object.entries(services).forEach(([name, config]) => {
    logger.info(`  - ${name}: ${config.pathPrefix} -> ${config.url}`);
  });
});

module.exports = app;
