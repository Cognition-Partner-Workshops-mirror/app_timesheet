const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDatabase } = require('../database/init');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// File filter to allow common document types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'application/zip',
    'application/x-zip-compressed'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, PNG, JPG, GIF, WEBP, ZIP`), false);
  }
};

// Multer upload configuration with 50MB size limit
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  }
});

// All routes require authentication
router.use(authenticateUser);

// Get all files for authenticated user with optional search/filter
router.get('/', (req, res) => {
  const db = getDatabase();
  const { search, category, sort } = req.query;

  let query = 'SELECT id, original_name, file_name, file_size, mime_type, category, description, created_at, updated_at FROM files WHERE user_email = ?';
  const params = [req.userEmail];

  // Apply search filter on file name or description
  if (search) {
    query += ' AND (original_name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // Apply category filter
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  // Apply sorting (default: newest first)
  const sortOptions = {
    'name_asc': 'original_name ASC',
    'name_desc': 'original_name DESC',
    'date_asc': 'created_at ASC',
    'date_desc': 'created_at DESC',
    'size_asc': 'file_size ASC',
    'size_desc': 'file_size DESC'
  };
  const orderBy = sortOptions[sort] || 'created_at DESC';
  query += ` ORDER BY ${orderBy}`;

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    res.json({ files: rows });
  });
});

// Get file categories for the user (for filtering UI)
router.get('/categories', (req, res) => {
  const db = getDatabase();

  db.all(
    'SELECT DISTINCT category FROM files WHERE user_email = ? AND category IS NOT NULL ORDER BY category',
    [req.userEmail],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      const categories = rows.map(row => row.category);
      res.json({ categories });
    }
  );
});

// Get a specific file's metadata
router.get('/:id', (req, res) => {
  const fileId = parseInt(req.params.id);

  if (isNaN(fileId)) {
    return res.status(400).json({ error: 'Invalid file ID' });
  }

  const db = getDatabase();

  db.get(
    'SELECT id, original_name, file_name, file_size, mime_type, category, description, created_at, updated_at FROM files WHERE id = ? AND user_email = ?',
    [fileId, req.userEmail],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!row) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.json({ file: row });
    }
  );
});

// Download a file
router.get('/:id/download', (req, res) => {
  const fileId = parseInt(req.params.id);

  if (isNaN(fileId)) {
    return res.status(400).json({ error: 'Invalid file ID' });
  }

  const db = getDatabase();

  db.get(
    'SELECT file_name, original_name, mime_type FROM files WHERE id = ? AND user_email = ?',
    [fileId, req.userEmail],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!row) {
        return res.status(404).json({ error: 'File not found' });
      }

      const filePath = path.join(__dirname, '../../uploads', row.file_name);

      // Check if physical file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found on disk' });
      }

      // Set appropriate headers for download
      res.setHeader('Content-Type', row.mime_type);
      res.setHeader('Content-Disposition', `attachment; filename="${row.original_name}"`);
      res.sendFile(filePath);
    }
  );
});

// Upload a file
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { category, description } = req.body;
  const db = getDatabase();

  db.run(
    'INSERT INTO files (original_name, file_name, file_size, mime_type, category, description, user_email) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      req.file.originalname,
      req.file.filename,
      req.file.size,
      req.file.mimetype,
      category || null,
      description || null,
      req.userEmail
    ],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        // Clean up uploaded file on database error
        fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: 'Failed to save file metadata' });
      }

      // Return the created file metadata
      db.get(
        'SELECT id, original_name, file_name, file_size, mime_type, category, description, created_at, updated_at FROM files WHERE id = ?',
        [this.lastID],
        (err, row) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'File uploaded but failed to retrieve metadata' });
          }

          res.status(201).json({
            message: 'File uploaded successfully',
            file: row
          });
        }
      );
    }
  );
});

// Update file metadata (category, description)
router.put('/:id', (req, res) => {
  const fileId = parseInt(req.params.id);

  if (isNaN(fileId)) {
    return res.status(400).json({ error: 'Invalid file ID' });
  }

  const { category, description, original_name } = req.body;
  const db = getDatabase();

  // Check file exists and belongs to user
  db.get(
    'SELECT id FROM files WHERE id = ? AND user_email = ?',
    [fileId, req.userEmail],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!row) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Build update query dynamically based on provided fields
      const updates = [];
      const values = [];

      if (category !== undefined) {
        updates.push('category = ?');
        values.push(category || null);
      }

      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description || null);
      }

      if (original_name !== undefined) {
        updates.push('original_name = ?');
        values.push(original_name);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(fileId, req.userEmail);

      const query = `UPDATE files SET ${updates.join(', ')} WHERE id = ? AND user_email = ?`;

      db.run(query, values, function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to update file' });
        }

        // Return updated file metadata
        db.get(
          'SELECT id, original_name, file_name, file_size, mime_type, category, description, created_at, updated_at FROM files WHERE id = ?',
          [fileId],
          (err, row) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'File updated but failed to retrieve metadata' });
            }

            res.json({
              message: 'File updated successfully',
              file: row
            });
          }
        );
      });
    }
  );
});

// Delete a file
router.delete('/:id', (req, res) => {
  const fileId = parseInt(req.params.id);

  if (isNaN(fileId)) {
    return res.status(400).json({ error: 'Invalid file ID' });
  }

  const db = getDatabase();

  // Get file info for disk cleanup
  db.get(
    'SELECT file_name FROM files WHERE id = ? AND user_email = ?',
    [fileId, req.userEmail],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!row) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Delete from database
      db.run(
        'DELETE FROM files WHERE id = ? AND user_email = ?',
        [fileId, req.userEmail],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to delete file' });
          }

          // Delete physical file from disk
          const filePath = path.join(__dirname, '../../uploads', row.file_name);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }

          res.json({ message: 'File deleted successfully' });
        }
      );
    }
  );
});

// Delete all files for the user
router.delete('/', (req, res) => {
  const db = getDatabase();

  // Get all file names for disk cleanup
  db.all(
    'SELECT file_name FROM files WHERE user_email = ?',
    [req.userEmail],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Delete all records from database
      db.run(
        'DELETE FROM files WHERE user_email = ?',
        [req.userEmail],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to delete files' });
          }

          // Clean up physical files from disk
          const uploadDir = path.join(__dirname, '../../uploads');
          rows.forEach(row => {
            const filePath = path.join(uploadDir, row.file_name);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          });

          res.json({
            message: 'All files deleted successfully',
            deletedCount: this.changes
          });
        }
      );
    }
  );
});

module.exports = router;
