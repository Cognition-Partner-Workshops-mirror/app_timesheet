const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let db = null;
let isClosing = false;
let isClosed = false;

// Ensure data directory exists for file-based SQLite
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Returns the singleton SQLite database connection.
 * Uses a file-based database so library data persists across restarts.
 */
function getDatabase() {
  if (!db) {
    isClosing = false;
    isClosed = false;
    const dbPath = process.env.NODE_ENV === 'test' ? ':memory:' : path.join(dataDir, 'library.db');
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        throw err;
      }
      console.log(`Connected to SQLite database: ${dbPath}`);
    });
    // Enable WAL mode and foreign keys for better performance
    db.run('PRAGMA journal_mode=WAL');
    db.run('PRAGMA foreign_keys=ON');
  }
  return db;
}

/**
 * Creates all tables and indexes for the digital library.
 * Tables: users, collections, files, tags, file_tags
 */
async function initializeDatabase() {
  const database = getDatabase();

  return new Promise((resolve, reject) => {
    database.serialize(() => {
      // Users table - stores library members
      database.run(`
        CREATE TABLE IF NOT EXISTS users (
          email TEXT PRIMARY KEY,
          display_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Collections table - folders/categories for organizing files
      database.run(`
        CREATE TABLE IF NOT EXISTS collections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_email TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          color TEXT DEFAULT '#6366f1',
          icon TEXT DEFAULT 'folder',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE
        )
      `);

      // Files table - stores metadata for uploaded files
      database.run(`
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_email TEXT NOT NULL,
          original_name TEXT NOT NULL,
          stored_name TEXT NOT NULL UNIQUE,
          mime_type TEXT NOT NULL,
          file_type TEXT NOT NULL,
          size INTEGER NOT NULL,
          collection_id INTEGER,
          is_favorite INTEGER DEFAULT 0,
          notes TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE,
          FOREIGN KEY (collection_id) REFERENCES collections (id) ON DELETE SET NULL
        )
      `);

      // Tags table - reusable labels for files
      database.run(`
        CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // File-tags junction table - many-to-many relationship
      database.run(`
        CREATE TABLE IF NOT EXISTS file_tags (
          file_id INTEGER NOT NULL,
          tag_id INTEGER NOT NULL,
          PRIMARY KEY (file_id, tag_id),
          FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
        )
      `);

      // Indexes for fast lookups and filtering
      database.run(`CREATE INDEX IF NOT EXISTS idx_files_user_email ON files (user_email)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_files_collection_id ON files (collection_id)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_files_file_type ON files (file_type)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_files_is_favorite ON files (is_favorite)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_files_created_at ON files (created_at)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_collections_user_email ON collections (user_email)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_file_tags_file_id ON file_tags (file_id)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_file_tags_tag_id ON file_tags (tag_id)`);

      console.log('Digital Library database tables created successfully');
      resolve();
    });
  });
}

/**
 * Gracefully closes the database connection.
 */
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
