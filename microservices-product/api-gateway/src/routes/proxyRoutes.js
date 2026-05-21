/**
 * Proxy route configuration.
 * Sets up HTTP proxy middleware to forward requests to backend microservices.
 */
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('../config/services');
const logger = require('../config/logger');

/**
 * Registers proxy routes on the Express app for each configured microservice.
 * Requests matching a service's pathPrefix are forwarded to that service's URL.
 */
const setupProxyRoutes = (app) => {
  Object.entries(services).forEach(([serviceName, config]) => {
    const proxyOptions = {
      target: config.url,
      changeOrigin: true,       // Rewrite the Host header to match the target
      timeout: 30000,           // 30-second proxy timeout
      proxyTimeout: 30000,
      // Log proxy events for observability
      on: {
        proxyReq: (proxyReq, req) => {
          logger.info(`[PROXY] ${req.method} ${req.path} -> ${config.url}${req.path}`);
        },
        proxyRes: (proxyRes, req) => {
          logger.info(`[PROXY] ${req.method} ${req.path} <- ${proxyRes.statusCode}`);
        },
        error: (err, req, res) => {
          logger.error(`[PROXY] Error proxying to ${serviceName}: ${err.message}`);
          if (!res.headersSent) {
            res.status(503).json({
              success: false,
              message: `Service '${serviceName}' is temporarily unavailable`,
              service: serviceName,
            });
          }
        },
      },
    };

    // Mount the proxy middleware at the service's path prefix
    app.use(config.pathPrefix, createProxyMiddleware(proxyOptions));
    logger.info(`Proxy route registered: ${config.pathPrefix} -> ${config.url}`);
  });
};

module.exports = { setupProxyRoutes };
