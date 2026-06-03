const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Route handlers for the digital library API
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const collectionRoutes = require('./routes/collections');

const { initializeDatabase } = require('./database/init');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' } // Allow file previews from frontend
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting - higher limit for file operations
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500 // Higher limit since file operations are frequent
});
app.use(limiter);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing with larger limits for file metadata
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    app: 'Digital Library',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/collections', collectionRoutes);

// Multer error handling for file size and type errors
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Too many files. Maximum is 10 per upload.' });
  }
  if (err.message && err.message.includes('File type')) {
    return res.status(415).json({ error: err.message });
  }
  next(err);
});

// Global error handler
app.use(errorHandler);

// 404 handler for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Digital Library API running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
