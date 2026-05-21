/**
 * Product Service entry point.
 * Initializes Express server with middleware, routes, and database connection.
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./config/logger');
const { connectDatabase } = require('./config/database');
const productRoutes = require('./routes/productRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Security and parsing middleware
app.use(helmet());                           // Set security-related HTTP headers
app.use(cors());                             // Enable Cross-Origin Resource Sharing
app.use(express.json({ limit: '10mb' }));    // Parse JSON request bodies (10MB limit)
app.use(express.urlencoded({ extended: true }));

// HTTP request logging - concise output in dev, combined format in production
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health check endpoint for load balancers and container orchestration
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'product-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount product routes under /api/products prefix
app.use('/api/products', productRoutes);

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Centralized error handling
app.use(errorHandler);

/**
 * Starts the server after establishing the database connection.
 * Exports app for testing and server reference for graceful shutdown.
 */
const startServer = async () => {
  try {
    await connectDatabase();
    const server = app.listen(PORT, () => {
      logger.info(`Product Service running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API base URL: http://localhost:${PORT}/api/products`);
    });
    return server;
  } catch (error) {
    logger.error('Failed to start Product Service:', error.message);
    process.exit(1);
  }
};

// Start server only when run directly (not when imported for testing)
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
