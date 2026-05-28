/**
 * AI/Analysis Microservice (port 3005)
 * Handles all AI-powered code analysis endpoints:
 *   - /api/analyze   → code analysis (logic, inefficiencies, score)
 *   - /api/explain   → line-by-line code explanation
 *   - /api/optimize  → code optimization with complexity comparison
 *   - /api/problem   → problem solving with multiple approaches
 *   - /api/playground → data structure operations and visual-to-code
 *
 * Separated from monolith because AI requests are I/O-bound (waiting on
 * Groq/OpenAI API responses). This service can have its own connection
 * pool and rate limiting independent of animation/interview traffic.
 */
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), override: true });

const { createServiceApp, startService } = require('./shared');
const analyzeRoutes = require('../routes/analyze');
const explainRoutes = require('../routes/explain');
const optimizeRoutes = require('../routes/optimize');
const problemRoutes = require('../routes/problem');
const playgroundRoutes = require('../routes/playground');

const SERVICE_NAME = 'ai-service';
const PORT = process.env.AI_SERVICE_PORT || 3005;

const app = createServiceApp(SERVICE_NAME);

// Mount all AI-powered routes
app.use('/api/analyze', analyzeRoutes);
app.use('/api/explain', explainRoutes);
app.use('/api/optimize', optimizeRoutes);
app.use('/api/problem', problemRoutes);
app.use('/api/playground', playgroundRoutes);

// Initialize database (needed for storing sessions)
const { initializeDatabase } = require('../database/init');
initializeDatabase()
  .then(() => startService(app, PORT, SERVICE_NAME))
  .catch((err) => {
    console.error(`[${SERVICE_NAME}] Failed to start:`, err);
    process.exit(1);
  });
