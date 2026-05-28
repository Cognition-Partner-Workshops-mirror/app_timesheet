/**
 * Animation Microservice (port 3003)
 * Handles algorithm animation generation and storyboard creation.
 * Uses local animation engine for common algorithms (no AI key needed)
 * and falls back to AI for custom/unknown algorithms.
 * Separated from monolith for independent scaling — animation requests
 * are CPU-bound (local engine) so this service can scale horizontally.
 */
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), override: true });

const { createServiceApp, startService } = require('./shared');
const animationRoutes = require('../routes/animation');

const SERVICE_NAME = 'animation-service';
const PORT = process.env.ANIMATION_SERVICE_PORT || 3003;

const app = createServiceApp(SERVICE_NAME);

// Mount animation routes at root /api/animation path
app.use('/api/animation', animationRoutes);

// Initialize database (needed for storing animation sessions)
const { initializeDatabase } = require('../database/init');
initializeDatabase()
  .then(() => startService(app, PORT, SERVICE_NAME))
  .catch((err) => {
    console.error(`[${SERVICE_NAME}] Failed to start:`, err);
    process.exit(1);
  });
