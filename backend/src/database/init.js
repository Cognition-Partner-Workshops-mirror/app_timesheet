/**
 * Database initialization module for Event Services Marketplace.
 * Uses SQLite in-memory database. Creates schema tables and seeds
 * default categories + admin user on startup.
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { SCHEMA_STATEMENTS, SEED_CATEGORIES } = require('./schema');

let db = null;
let isClosing = false;
let isClosed = false;

// Returns singleton database connection
function getDatabase() {
  if (!db) {
    isClosing = false;
    isClosed = false;
    db = new sqlite3.Database(':memory:', (err) => {
      if (err) {
        console.error('Error opening database:', err);
        throw err;
      }
      console.log('Connected to SQLite in-memory database');
    });
  }
  return db;
}

// Wraps db.run in a promise for async/await usage
function runAsync(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Initialize all schema tables, seed categories, and create default admin
async function initializeDatabase() {
  const database = getDatabase();

  return new Promise((resolve, reject) => {
    database.serialize(async () => {
      try {
        // Enable foreign keys
        database.run('PRAGMA foreign_keys = ON');

        // Create all schema tables
        for (const stmt of SCHEMA_STATEMENTS) {
          database.run(stmt);
        }

        // Seed default service categories
        const catStmt = database.prepare(
          'INSERT OR IGNORE INTO service_categories (id, name, description, icon) VALUES (?, ?, ?, ?)'
        );
        for (const cat of SEED_CATEGORIES) {
          catStmt.run(cat.id, cat.name, cat.description, cat.icon);
        }
        catStmt.finalize();

        // Create default admin user (admin@eventmarket.com / admin123)
        const adminId = 'admin-default';
        const adminHash = bcrypt.hashSync('admin123', 10);
        database.run(
          `INSERT OR IGNORE INTO users (id, email, password_hash, name, role, is_approved)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [adminId, 'admin@eventmarket.com', adminHash, 'Platform Admin', 'admin', 1]
        );

        // Create indexes for query performance
        database.run('CREATE INDEX IF NOT EXISTS idx_services_business ON services(business_user_id)');
        database.run('CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id)');
        database.run('CREATE INDEX IF NOT EXISTS idx_services_city ON services(city)');
        database.run('CREATE INDEX IF NOT EXISTS idx_bookings_service ON bookings(service_id)');
        database.run('CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_user_id)');
        database.run('CREATE INDEX IF NOT EXISTS idx_reviews_service ON reviews(service_id)');

        console.log('Database tables and seed data created successfully');
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Gracefully close database connection
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (isClosed) {
      resolve();
      return;
    }
    if (isClosing) {
      const checkClosed = setInterval(() => {
        if (isClosed) {
          clearInterval(checkClosed);
          resolve();
        }
      }, 10);
      return;
    }
    if (!db) {
      resolve();
      return;
    }

    isClosing = true;
    db.close((err) => {
      isClosed = true;
      isClosing = false;
      db = null;
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
      resolve();
    });
  });
}

module.exports = {
  getDatabase,
  initializeDatabase,
  closeDatabase
};
