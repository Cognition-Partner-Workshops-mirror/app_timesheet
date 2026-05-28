/**
 * CodeVision AI Backend Server (Monolith Mode)
 * Main entry point — sets up Express server with all middleware, routes,
 * security protections, and resilience patterns.
 *
 * This is the single-process mode. For microservices mode, use start-services.js.
 *
 * Security: XSS sanitization, SQL injection detection, CSRF protection,
 *           rate limiting, security headers, input validation (Joi).
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { initializeDatabase } = require('./database/init');
const analyzeRoutes = require('./routes/analyze');
const explainRoutes = require('./routes/explain');
const optimizeRoutes = require('./routes/optimize');
const animationRoutes = require('./routes/animation');
const problemRoutes = require('./routes/problem');
const sessionRoutes = require('./routes/session');
const playgroundRoutes = require('./routes/playground');
const interviewRoutes = require('./routes/interview');

// Security middleware (XSS, SQL injection, CSRF, rate limiting)
const {
  applySecurityMiddleware,
  aiRateLimiter,
} = require('./security');

const app = express();
const PORT = process.env.PORT || 3002;

// --- Core middleware ---
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// --- Apply full security stack (XSS, SQL injection, CSRF, rate limiting, headers) ---
applySecurityMiddleware(app);

// --- Stricter rate limit on AI-powered endpoints (30 req/min vs 100 general) ---
app.use('/api/analyze', aiRateLimiter);
app.use('/api/explain', aiRateLimiter);
app.use('/api/optimize', aiRateLimiter);
app.use('/api/problem', aiRateLimiter);
app.use('/api/interview/answer', aiRateLimiter);

// --- Health / readiness / liveness probes (for k8s auto-scaling) ---
app.get('/health', (_req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'ok',
    service: 'codevision-ai-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: { heapUsed: mem.heapUsed, heapTotal: mem.heapTotal, rss: mem.rss },
  });
});

// Liveness: process is alive (k8s restarts pod if this fails)
app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness: service can accept traffic
app.get('/readyz', (_req, res) => {
  res.status(200).json({ status: 'ready' });
});

// --- API routes — each handles a major feature area ---
app.use('/api/analyze', analyzeRoutes);
app.use('/api/explain', explainRoutes);
app.use('/api/optimize', optimizeRoutes);
app.use('/api/animation', animationRoutes);
app.use('/api/problem', problemRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/playground', playgroundRoutes);
app.use('/api/interview', interviewRoutes);

// --- Global error handler ---
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// --- Initialize database and start server with graceful shutdown ---
initializeDatabase()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`CodeVision AI Backend running on port ${PORT}`);
    });

    // Track active connections for graceful shutdown (k8s auto-scaling support)
    let activeConnections = 0;
    server.on('connection', (socket) => {
      activeConnections++;
      socket.on('close', () => { activeConnections--; });
    });

    // Graceful shutdown: drain connections before exiting
    const shutdown = (signal) => {
      console.log(`${signal} received — draining ${activeConnections} connections...`);
      server.close(() => {
        console.log('All connections drained. Exiting.');
        process.exit(0);
      });
      // Force exit after 10s to prevent stuck pods
      setTimeout(() => process.exit(1), 10000);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = app;
