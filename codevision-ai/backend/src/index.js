/**
 * CodeVision AI Backend Server
 * Main entry point - sets up Express server with all middleware and routes.
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

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware setup
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'codevision-ai-backend', timestamp: new Date().toISOString() });
});

// API routes - each handles a major feature area
app.use('/api/analyze', analyzeRoutes);
app.use('/api/explain', explainRoutes);
app.use('/api/optimize', optimizeRoutes);
app.use('/api/animation', animationRoutes);
app.use('/api/problem', problemRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/playground', playgroundRoutes);
app.use('/api/interview', interviewRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Initialize database and start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`CodeVision AI Backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = app;
