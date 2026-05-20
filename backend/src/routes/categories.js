const express = require('express');
const { getDatabase } = require('../database/init');

const router = express.Router();

// GET /api/categories - List all categories with product counts
router.get('/', (req, res) => {
  const db = getDatabase();

  db.all(
    `SELECT c.*, COUNT(p.id) as product_count
     FROM categories c
     LEFT JOIN products p ON c.id = p.category_id
     GROUP BY c.id
     ORDER BY c.name`,
    [],
    (err, categories) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ categories });
    }
  );
});

// GET /api/categories/:id - Get a single category with its products
router.get('/:id', (req, res) => {
  const db = getDatabase();

  db.get('SELECT * FROM categories WHERE id = ?', [req.params.id], (err, category) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ category });
  });
});

module.exports = router;
