/**
 * Interview Microservice (port 3004)
 * Handles interview preparation — serving curated questions
 * and generating AI-powered answers for DSA, System Design,
 * and Production categories.
 * Separated from monolith to isolate AI-heavy Q&A workload
 * from the main application. Can scale independently when
 * interview traffic spikes (e.g. during placement season).
 */
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const { createServiceApp, startService } = require('./shared');
const interviewRoutes = require('../routes/interview');

const SERVICE_NAME = 'interview-service';
const PORT = process.env.INTERVIEW_SERVICE_PORT || 3004;

const app = createServiceApp(SERVICE_NAME);

// Mount interview routes at root /api/interview path
app.use('/api/interview', interviewRoutes);

startService(app, PORT, SERVICE_NAME);
