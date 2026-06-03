const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDatabase } = require('../database/init');
const { authenticateUser } = require('../middleware/auth');
const { upload, getFileType, uploadsDir } = require('../middleware/upload');
const { updateFileSchema, fileQuerySchema } = require('../validation/schemas');

// Apply auth to all file routes
router.use(authenticateUser);

/**
 * GET /api/files
 * List files with sorting, filtering, search, and pagination.
 */
router.get('/', (req, res) => {
  const { error, value } = fileQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { sort_by, sort_order, file_type, collection_id, favorites_only, search, page, limit } = value;
  const db = getDatabase();
  const offset = (page - 1) * limit;

  // Build dynamic WHERE clause based on filters
  let whereClause = 'WHERE f.user_email = ?';
  const params = [req.userEmail];

  if (file_type !== 'all') {
    whereClause += ' AND f.file_type = ?';
    params.push(file_type);
  }

  if (collection_id) {
    whereClause += ' AND f.collection_id = ?';
    params.push(collection_id);
  }

  if (favorites_only) {
    whereClause += ' AND f.is_favorite = 1';
  }

  if (search) {
    whereClause += ' AND f.original_name LIKE ?';
    params.push(`%${search}%`);
  }

  // Map sort_by to actual column names
  const sortMap = {
    name: 'f.original_name',
    date: 'f.created_at',
    size: 'f.size',
    type: 'f.file_type'
  };
  const orderBy = `${sortMap[sort_by]} ${sort_order.toUpperCase()}`;

  // Get total count for pagination metadata
  const countQuery = `SELECT COUNT(*) as total FROM files f ${whereClause}`;
  db.get(countQuery, params, (err, countRow) => {
    if (err) {
      console.error('Error counting files:', err);
      return res.status(500).json({ error: 'Failed to retrieve files' });
    }

    const total = countRow.total;

    // Fetch files with optional collection name join
    const query = `
      SELECT f.*, c.name as collection_name, c.color as collection_color
      FROM files f
      LEFT JOIN collections c ON f.collection_id = c.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
    const queryParams = [...params, limit, offset];

    db.all(query, queryParams, (err, files) => {
      if (err) {
        console.error('Error fetching files:', err);
        return res.status(500).json({ error: 'Failed to retrieve files' });
      }

      // Also fetch tags for each file
      const fileIds = files.map(f => f.id);
      if (fileIds.length === 0) {
        return res.json({
          files: [],
          pagination: { page, limit, total, totalPages: 0 }
        });
      }

      const tagQuery = `
        SELECT ft.file_id, t.id as tag_id, t.name as tag_name
        FROM file_tags ft
        JOIN tags t ON ft.tag_id = t.id
        WHERE ft.file_id IN (${fileIds.map(() => '?').join(',')})
      `;

      db.all(tagQuery, fileIds, (err, tagRows) => {
        if (err) {
          console.error('Error fetching tags:', err);
          return res.status(500).json({ error: 'Failed to retrieve file tags' });
        }

        // Group tags by file_id
        const tagMap = {};
        tagRows.forEach(row => {
          if (!tagMap[row.file_id]) tagMap[row.file_id] = [];
          tagMap[row.file_id].push({ id: row.tag_id, name: row.tag_name });
        });

        // Attach tags to file objects
        const filesWithTags = files.map(f => ({
          ...f,
          tags: tagMap[f.id] || []
        }));

        res.json({
          files: filesWithTags,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        });
      });
    });
  });
});

/**
 * GET /api/files/stats
 * Returns summary statistics for the user's library.
 */
router.get('/stats', (req, res) => {
  const db = getDatabase();

  db.get(
    `SELECT
       COUNT(*) as total_files,
       COALESCE(SUM(size), 0) as total_size,
       COUNT(CASE WHEN file_type = 'image' THEN 1 END) as image_count,
       COUNT(CASE WHEN file_type = 'pdf' THEN 1 END) as pdf_count,
       COUNT(CASE WHEN file_type = 'ebook' THEN 1 END) as ebook_count,
       COUNT(CASE WHEN file_type = 'document' THEN 1 END) as document_count,
       COUNT(CASE WHEN is_favorite = 1 THEN 1 END) as favorites_count
     FROM files WHERE user_email = ?`,
    [req.userEmail],
    (err, stats) => {
      if (err) {
        console.error('Error fetching stats:', err);
        return res.status(500).json({ error: 'Failed to retrieve statistics' });
      }
      res.json(stats);
    }
  );
});

/**
 * GET /api/files/:id
 * Get details of a single file including its tags.
 */
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const fileId = req.params.id;

  db.get(
    `SELECT f.*, c.name as collection_name, c.color as collection_color
     FROM files f
     LEFT JOIN collections c ON f.collection_id = c.id
     WHERE f.id = ? AND f.user_email = ?`,
    [fileId, req.userEmail],
    (err, file) => {
      if (err) {
        console.error('Error fetching file:', err);
        return res.status(500).json({ error: 'Failed to retrieve file' });
      }
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Fetch tags for this file
      db.all(
        `SELECT t.id, t.name FROM tags t
         JOIN file_tags ft ON t.id = ft.tag_id
         WHERE ft.file_id = ?`,
        [fileId],
        (err, tags) => {
          if (err) {
            console.error('Error fetching file tags:', err);
            return res.status(500).json({ error: 'Failed to retrieve file tags' });
          }
          res.json({ ...file, tags: tags || [] });
        }
      );
    }
  );
});

/**
 * POST /api/files/upload
 * Upload one or more files to the library.
 * Supports multipart form data with optional collection_id and tags.
 */
router.post('/upload', upload.array('files', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const db = getDatabase();
  const collectionId = req.body.collection_id || null;
  const tags = req.body.tags ? JSON.parse(req.body.tags || '[]') : [];
  const uploadedFiles = [];

  // Process each uploaded file sequentially
  let processed = 0;
  req.files.forEach((file) => {
    const fileType = getFileType(file.mimetype);

    db.run(
      `INSERT INTO files (user_email, original_name, stored_name, mime_type, file_type, size, collection_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.userEmail, file.originalname, file.filename, file.mimetype, fileType, file.size, collectionId],
      function (err) {
        if (err) {
          console.error('Error saving file record:', err);
          processed++;
          if (processed === req.files.length) {
            return res.status(207).json({ files: uploadedFiles, errors: ['Some files failed to save'] });
          }
          return;
        }

        const fileId = this.lastID;
        uploadedFiles.push({
          id: fileId,
          original_name: file.originalname,
          stored_name: file.filename,
          mime_type: file.mimetype,
          file_type: fileType,
          size: file.size,
          collection_id: collectionId
        });

        // Insert tags if provided
        if (tags.length > 0) {
          tags.forEach(tagName => {
            // Upsert tag and link to file
            db.run('INSERT OR IGNORE INTO tags (name) VALUES (?)', [tagName], function () {
              db.get('SELECT id FROM tags WHERE name = ?', [tagName], (err, tag) => {
                if (tag) {
                  db.run('INSERT OR IGNORE INTO file_tags (file_id, tag_id) VALUES (?, ?)', [fileId, tag.id]);
                }
              });
            });
          });
        }

        processed++;
        if (processed === req.files.length) {
          res.status(201).json({
            message: `${uploadedFiles.length} file(s) uploaded successfully`,
            files: uploadedFiles
          });
        }
      }
    );
  });
});

/**
 * PUT /api/files/:id
 * Update file metadata (name, collection, favorite status, notes, tags).
 */
router.put('/:id', (req, res) => {
  const { error, value } = updateFileSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const db = getDatabase();
  const fileId = req.params.id;

  // Verify file ownership
  db.get('SELECT id FROM files WHERE id = ? AND user_email = ?', [fileId, req.userEmail], (err, file) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Build dynamic UPDATE query from provided fields
    const updates = [];
    const params = [];

    if (value.original_name !== undefined) {
      updates.push('original_name = ?');
      params.push(value.original_name);
    }
    if (value.collection_id !== undefined) {
      updates.push('collection_id = ?');
      params.push(value.collection_id);
    }
    if (value.is_favorite !== undefined) {
      updates.push('is_favorite = ?');
      params.push(value.is_favorite ? 1 : 0);
    }
    if (value.notes !== undefined) {
      updates.push('notes = ?');
      params.push(value.notes);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(fileId, req.userEmail);

    const updateQuery = `UPDATE files SET ${updates.join(', ')} WHERE id = ? AND user_email = ?`;
    db.run(updateQuery, params, function (err) {
      if (err) {
        console.error('Error updating file:', err);
        return res.status(500).json({ error: 'Failed to update file' });
      }

      // Handle tag updates if tags array is provided
      if (value.tags !== undefined) {
        // Remove existing tags for this file
        db.run('DELETE FROM file_tags WHERE file_id = ?', [fileId], () => {
          // Insert new tags
          value.tags.forEach(tagName => {
            db.run('INSERT OR IGNORE INTO tags (name) VALUES (?)', [tagName], function () {
              db.get('SELECT id FROM tags WHERE name = ?', [tagName], (err, tag) => {
                if (tag) {
                  db.run('INSERT OR IGNORE INTO file_tags (file_id, tag_id) VALUES (?, ?)', [fileId, tag.id]);
                }
              });
            });
          });
        });
      }

      res.json({ message: 'File updated successfully' });
    });
  });
});

/**
 * DELETE /api/files/:id
 * Delete a file from the library and remove it from disk.
 */
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  const fileId = req.params.id;

  // Get file info before deleting to remove from disk
  db.get('SELECT stored_name FROM files WHERE id = ? AND user_email = ?', [fileId, req.userEmail], (err, file) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete file record from database
    db.run('DELETE FROM files WHERE id = ? AND user_email = ?', [fileId, req.userEmail], function (err) {
      if (err) {
        console.error('Error deleting file:', err);
        return res.status(500).json({ error: 'Failed to delete file' });
      }

      // Remove physical file from disk
      const filePath = path.join(uploadsDir, file.stored_name);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Warning: failed to delete physical file:', err);
        }
      });

      res.json({ message: 'File deleted successfully' });
    });
  });
});

/**
 * GET /api/files/:id/download
 * Download a file by its ID.
 */
router.get('/:id/download', (req, res) => {
  const db = getDatabase();
  const fileId = req.params.id;

  db.get(
    'SELECT stored_name, original_name, mime_type FROM files WHERE id = ? AND user_email = ?',
    [fileId, req.userEmail],
    (err, file) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      const filePath = path.join(uploadsDir, file.stored_name);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Physical file not found' });
      }

      res.setHeader('Content-Type', file.mime_type);
      res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  );
});

/**
 * GET /api/files/:id/preview
 * Serve a file for inline preview (images and PDFs).
 */
router.get('/:id/preview', (req, res) => {
  const db = getDatabase();
  const fileId = req.params.id;

  db.get(
    'SELECT stored_name, original_name, mime_type, file_type FROM files WHERE id = ? AND user_email = ?',
    [fileId, req.userEmail],
    (err, file) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      const filePath = path.join(uploadsDir, file.stored_name);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Physical file not found' });
      }

      // Serve inline for preview
      res.setHeader('Content-Type', file.mime_type);
      res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  );
});

/**
 * POST /api/files/:id/favorite
 * Toggle favorite status for a file.
 */
router.post('/:id/favorite', (req, res) => {
  const db = getDatabase();
  const fileId = req.params.id;

  db.get('SELECT id, is_favorite FROM files WHERE id = ? AND user_email = ?', [fileId, req.userEmail], (err, file) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const newFavorite = file.is_favorite ? 0 : 1;
    db.run(
      'UPDATE files SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newFavorite, fileId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update favorite status' });
        }
        res.json({ is_favorite: !!newFavorite });
      }
    );
  });
});

module.exports = router;
