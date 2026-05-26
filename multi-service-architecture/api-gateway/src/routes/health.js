/**
 * Health check routes for the API Gateway.
 * Provides endpoints to verify gateway and downstream service connectivity.
 */

const express = require('express');

/**
 * Creates health check router with gRPC client dependency injection.
 * @param {GrpcClients} grpcClients - Initialized gRPC client connections
 */
module.exports = function healthRoutes(grpcClients) {
  const router = express.Router();

  /**
   * GET /api/v1/health
   * Returns the health status of the API Gateway and all downstream services.
   * Used by Docker health checks and load balancers.
   */
  router.get('/', async (req, res) => {
    const startTime = Date.now();

    // Check connectivity to each downstream service
    const services = {
      'api-gateway': { status: 'healthy', latency_ms: 0 },
      'business-logic': { status: 'unknown', latency_ms: null },
      'fraud-detection': { status: 'unknown', latency_ms: null },
      'logging-service': { status: 'unknown', latency_ms: null },
    };

    // Check Java business service via gRPC health check
    try {
      const bizStart = Date.now();
      await new Promise((resolve, reject) => {
        grpcClients.businessClient.HealthCheck({}, (err, response) => {
          if (err) reject(err);
          else resolve(response);
        });
      });
      services['business-logic'] = {
        status: 'healthy',
        latency_ms: Date.now() - bizStart,
      };
    } catch (err) {
      services['business-logic'] = { status: 'unhealthy', error: err.message };
    }

    // Check Python fraud detection service
    try {
      const fraudStart = Date.now();
      await new Promise((resolve, reject) => {
        grpcClients.fraudClient.GetModelInfo({}, (err, response) => {
          if (err) reject(err);
          else resolve(response);
        });
      });
      services['fraud-detection'] = {
        status: 'healthy',
        latency_ms: Date.now() - fraudStart,
      };
    } catch (err) {
      services['fraud-detection'] = { status: 'unhealthy', error: err.message };
    }

    // Check Go logging service
    try {
      const logStart = Date.now();
      await new Promise((resolve, reject) => {
        grpcClients.loggingClient.SendLog({
          service_name: 'api-gateway',
          level: 'DEBUG',
          message: 'Health check ping',
          timestamp: new Date().toISOString(),
        }, (err, response) => {
          if (err) reject(err);
          else resolve(response);
        });
      });
      services['logging-service'] = {
        status: 'healthy',
        latency_ms: Date.now() - logStart,
      };
    } catch (err) {
      services['logging-service'] = { status: 'unhealthy', error: err.message };
    }

    // Determine overall health
    const allHealthy = Object.values(services).every(s => s.status === 'healthy');
    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      total_latency_ms: Date.now() - startTime,
      services,
    });
  });

  return router;
};
