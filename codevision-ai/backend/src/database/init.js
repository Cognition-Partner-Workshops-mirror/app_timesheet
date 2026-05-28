/**
 * Database initialization module.
 * Creates SQLite database and sets up schema for storing
 * learning sessions, explanations, and user interactions.
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;

/**
 * Returns the singleton database instance, creating it if needed.
 */
function getDatabase() {
  if (db) return db;

  const dbDir = path.join(__dirname, '..', '..', 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = process.env.DB_PATH || path.join(dbDir, 'codevision.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

/**
 * Creates all tables for the CodeVision AI application.
 * Tables: sessions, explanations, optimizations, animations, problems
 */
async function initializeDatabase() {
  const database = getDatabase();

  // Sessions table - tracks user learning sessions
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'python',
      difficulty TEXT NOT NULL DEFAULT 'beginner',
      code TEXT,
      problem_statement TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Explanations table - stores AI-generated code explanations
  database.exec(`
    CREATE TABLE IF NOT EXISTS explanations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      code TEXT NOT NULL,
      language TEXT NOT NULL,
      explanation_type TEXT NOT NULL,
      content TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'beginner',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  // Optimizations table - stores code optimization results
  database.exec(`
    CREATE TABLE IF NOT EXISTS optimizations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      original_code TEXT NOT NULL,
      optimized_code TEXT NOT NULL,
      language TEXT NOT NULL,
      original_complexity TEXT,
      optimized_complexity TEXT,
      improvements TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  // Animations table - stores generated algorithm animation data
  database.exec(`
    CREATE TABLE IF NOT EXISTS animations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      algorithm_type TEXT NOT NULL,
      steps_json TEXT NOT NULL,
      metadata_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  // Problems table - stores problem analysis results
  database.exec(`
    CREATE TABLE IF NOT EXISTS problems (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      problem_statement TEXT NOT NULL,
      summary TEXT,
      approaches_json TEXT,
      edge_cases TEXT,
      complexity_analysis TEXT,
      interview_tips TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  console.log('Database initialized successfully');
}

module.exports = { initializeDatabase, getDatabase };
