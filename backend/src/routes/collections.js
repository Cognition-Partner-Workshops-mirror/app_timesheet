const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init');
const { authenticateUser } = require('../middleware/auth');
const { createCollectionSchema, updateCollectionSchema } = require('../validation/schemas');

// Apply auth to all collection routes
router.use(authenticateUser);

/**
 * GET /api/collections
 * List all collections for the authenticated user, with file counts.
 */
router.get('/', (req, res) => {
  const db = getDatabase();

  db.all(
    `SELECT c.*, COUNT(f.id) as file_count
     FROM collections c
     LEFT JOIN files f ON c.id = f.collection_id
     WHERE c.user_email = ?
     GROUP BY c.id
     ORDER BY c.name ASC`,
    [req.userEmail],
    (err, collections) => {
      if (err) {
        console.error('Error fetching collections:', err);
        return res.status(500).json({ error: 'Failed to retrieve collections' });
      }
      res.json(collections);
    }
  );
});

/**
 * GET /api/collections/:id
 * Get a single collection with its file count.
 */
router.get('/:id', (req, res) => {
  const db = getDatabase();

  db.get(
    `SELECT c.*, COUNT(f.id) as file_count
     FROM collections c
     LEFT JOIN files f ON c.id = f.collection_id
     WHERE c.id = ? AND c.user_email = ?
     GROUP BY c.id`,
    [req.params.id, req.userEmail],
    (err, collection) => {
      if (err) {
        console.error('Error fetching collection:', err);
        return res.status(500).json({ error: 'Failed to retrieve collection' });
      }
      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }
      res.json(collection);
    }
  );
});

/**
 * POST /api/collections
 * Create a new collection.
 */
router.post('/', (req, res) => {
  const { error, value } = createCollectionSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const db = getDatabase();
  const { name, description, color, icon } = value;

  db.run(
    `INSERT INTO collections (user_email, name, description, color, icon) VALUES (?, ?, ?, ?, ?)`,
    [req.userEmail, name, description, color, icon],
    function (err) {
      if (err) {
        console.error('Error creating collection:', err);
        return res.status(500).json({ error: 'Failed to create collection' });
      }
      res.status(201).json({
        id: this.lastID,
        user_email: req.userEmail,
        name,
        description,
        color,
        icon,
        file_count: 0
      });
    }
  );
});

/**
 * PUT /api/collections/:id
 * Update an existing collection.
 */
router.put('/:id', (req, res) => {
  const { error, value } = updateCollectionSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const db = getDatabase();
  const collectionId = req.params.id;

  // Verify ownership
  db.get('SELECT id FROM collections WHERE id = ? AND user_email = ?', [collectionId, req.userEmail], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Build dynamic UPDATE from provided fields
    const updates = [];
    const params = [];

    if (value.name !== undefined) {
      updates.push('name = ?');
      params.push(value.name);
    }
    if (value.description !== undefined) {
      updates.push('description = ?');
      params.push(value.description);
    }
    if (value.color !== undefined) {
      updates.push('color = ?');
      params.push(value.color);
    }
    if (value.icon !== undefined) {
      updates.push('icon = ?');
      params.push(value.icon);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(collectionId, req.userEmail);

    db.run(
      `UPDATE collections SET ${updates.join(', ')} WHERE id = ? AND user_email = ?`,
      params,
      function (err) {
        if (err) {
          console.error('Error updating collection:', err);
          return res.status(500).json({ error: 'Failed to update collection' });
        }
        res.json({ message: 'Collection updated successfully' });
      }
    );
  });
});

/**
 * DELETE /api/collections/:id
 * Delete a collection. Files in this collection will have collection_id set to NULL.
 */
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  const collectionId = req.params.id;

  db.get('SELECT id FROM collections WHERE id = ? AND user_email = ?', [collectionId, req.userEmail], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    db.run('DELETE FROM collections WHERE id = ? AND user_email = ?', [collectionId, req.userEmail], function (err) {
      if (err) {
        console.error('Error deleting collection:', err);
        return res.status(500).json({ error: 'Failed to delete collection' });
      }
      res.json({ message: 'Collection deleted successfully' });
    });
  });
});

module.exports = router;
