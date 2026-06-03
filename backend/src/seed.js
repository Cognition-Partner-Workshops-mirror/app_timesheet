/**
 * Seed script to populate the library with dummy PDF/document entries.
 * Creates sample files so the bookshelf UI has content to display.
 * Run: node src/seed.js
 */
const { getDatabase, initializeDatabase } = require('./database/init');
const path = require('path');
const fs = require('fs');

// Dummy file entries representing a realistic library
const DUMMY_FILES = [
  { name: 'JavaScript - The Good Parts.pdf',     type: 'pdf',      size: 2_400_000 },
  { name: 'Clean Code.pdf',                       type: 'pdf',      size: 5_100_000 },
  { name: 'Design Patterns.pdf',                  type: 'pdf',      size: 3_800_000 },
  { name: 'The Pragmatic Programmer.pdf',          type: 'pdf',      size: 4_200_000 },
  { name: 'React Handbook.pdf',                    type: 'pdf',      size: 1_900_000 },
  { name: 'Node.js in Action.pdf',                type: 'pdf',      size: 6_300_000 },
  { name: 'Learning TypeScript.epub',              type: 'ebook',    size: 2_800_000 },
  { name: 'Python Crash Course.epub',              type: 'ebook',    size: 3_500_000 },
  { name: 'Project Architecture.docx',             type: 'document', size: 450_000 },
  { name: 'Meeting Notes - Q4 Review.txt',         type: 'document', size: 12_000 },
  { name: 'API Reference Guide.pdf',               type: 'pdf',      size: 1_500_000 },
  { name: 'UI Mockup - Dashboard.png',             type: 'image',    size: 820_000 },
  { name: 'Team Photo 2024.jpg',                   type: 'image',    size: 1_200_000 },
  { name: 'Database Schema Diagram.png',            type: 'image',    size: 340_000 },
  { name: 'Budget Report 2024.xlsx',                type: 'document', size: 280_000 },
  { name: 'Algorithms Explained.pdf',               type: 'pdf',      size: 7_100_000 },
];

// Mime types for generating stored file stubs
const MIME_MAP = {
  pdf: 'application/pdf',
  ebook: 'application/epub+zip',
  document: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  image: 'image/png',
};

// Collections to create
const COLLECTIONS = [
  { name: 'Programming Books', description: 'Software engineering books and references', color: '#6366f1' },
  { name: 'Work Documents',    description: 'Office documents and spreadsheets',        color: '#22c55e' },
  { name: 'Design Assets',     description: 'Images and mockups',                       color: '#ec4899' },
];

const USER_EMAIL = 'demo@library.com';

async function seed() {
  await initializeDatabase();
  const db = getDatabase();

  // Ensure uploads directory exists for dummy file stubs
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Ensure user exists
  await new Promise((resolve, reject) => {
    db.run(
      'INSERT OR IGNORE INTO users (email, display_name) VALUES (?, ?)',
      [USER_EMAIL, 'Ganesh'],
      (err) => err ? reject(err) : resolve()
    );
  });

  // Create collections
  const collectionIds = [];
  for (const col of COLLECTIONS) {
    const id = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO collections (user_email, name, description, color) VALUES (?, ?, ?, ?)',
        [USER_EMAIL, col.name, col.description, col.color],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
    collectionIds.push(id);
    console.log(`  Created collection: ${col.name} (id=${id})`);
  }

  // Insert dummy files with small placeholder stubs on disk
  for (const file of DUMMY_FILES) {
    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/\s+/g, '_')}`;
    const mimeType = MIME_MAP[file.type] || 'application/octet-stream';

    // Write a tiny stub so the file entry is valid
    fs.writeFileSync(path.join(uploadsDir, storedName), `Dummy file: ${file.name}`);

    // Pick a collection based on file type
    let collectionId = null;
    if (file.type === 'pdf' || file.type === 'ebook') collectionId = collectionIds[0]; // Programming Books
    else if (file.type === 'document')                 collectionId = collectionIds[1]; // Work Documents
    else if (file.type === 'image')                    collectionId = collectionIds[2]; // Design Assets

    // Mark some as favorites for variety
    const isFavorite = ['Clean Code.pdf', 'React Handbook.pdf', 'Learning TypeScript.epub'].includes(file.name) ? 1 : 0;

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO files (user_email, original_name, stored_name, mime_type, file_type, size, collection_id, is_favorite)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [USER_EMAIL, file.name, storedName, mimeType, file.type, file.size, collectionId, isFavorite],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    console.log(`  Added file: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(1)} MB)`);
  }

  // Add some tags (tags table has no user_email column)
  const tagNames = ['programming', 'reference', 'design', 'important', 'review'];
  for (const tag of tagNames) {
    await new Promise((resolve, reject) => {
      db.run('INSERT OR IGNORE INTO tags (name) VALUES (?)', [tag], (err) => err ? reject(err) : resolve());
    });
  }

  console.log('\nSeed complete! Library populated with dummy files.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
