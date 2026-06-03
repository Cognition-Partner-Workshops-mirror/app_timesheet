const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed MIME types for the digital library
const ALLOWED_MIME_TYPES = {
  // Images
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  // PDFs
  'application/pdf': 'pdf',
  // eBooks
  'application/epub+zip': 'ebook',
  // Documents
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'text/plain': 'document',
  'application/rtf': 'document',
  // Spreadsheets
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  // Presentations
  'application/vnd.ms-powerpoint': 'document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
};

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Multer storage configuration.
 * Files are saved with UUID-based names to avoid collisions.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

/**
 * File filter that restricts uploads to allowed MIME types.
 */
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not supported. Allowed types: images, PDFs, eBooks, and documents.`), false);
  }
};

/**
 * Determines the file category from its MIME type.
 */
function getFileType(mimeType) {
  return ALLOWED_MIME_TYPES[mimeType] || 'other';
}

// Multer upload middleware instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10 // max 10 files per upload
  }
});

module.exports = {
  upload,
  getFileType,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  uploadsDir
};
