const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticate, adminOnly } = require('../middleware/auth');
const { productSchema } = require('../validation/schemas');

const router = express.Router();

// GET /api/products - List products with optional filtering and pagination
router.get('/', (req, res) => {
  const db = getDatabase();
  const { category_id, search, featured, page = 1, limit = 12, sort = 'created_at', order = 'DESC' } = req.query;

  let query = `
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  let countQuery = 'SELECT COUNT(*) as total FROM products p WHERE 1=1';
  const params = [];
  const countParams = [];

  // Filter by category
  if (category_id) {
    query += ' AND p.category_id = ?';
    countQuery += ' AND p.category_id = ?';
    params.push(category_id);
    countParams.push(category_id);
  }

  // Search by name or description
  if (search) {
    query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    countQuery += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
    countParams.push(searchTerm, searchTerm);
  }

  // Filter featured products only
  if (featured === 'true') {
    query += ' AND p.featured = 1';
    countQuery += ' AND p.featured = 1';
  }

  // Validate and apply sort order
  const allowedSorts = ['created_at', 'price', 'name'];
  const sortField = allowedSorts.includes(sort) ? sort : 'created_at';
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  query += ` ORDER BY p.${sortField} ${sortOrder}`;

  // Pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;
  query += ' LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  // Execute count and data queries
  db.get(countQuery, countParams, (err, countRow) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    db.all(query, params, (err, products) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: countRow.total,
          totalPages: Math.ceil(countRow.total / limitNum)
        }
      });
    });
  });
});

// GET /api/products/:id - Get a single product by ID
router.get('/:id', (req, res) => {
  const db = getDatabase();

  db.get(
    `SELECT p.*, c.name as category_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.id = ?`,
    [req.params.id],
    (err, product) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json({ product });
    }
  );
});

// POST /api/products - Create a new product (admin only)
router.post('/', authenticate, adminOnly, (req, res) => {
  const { error, value } = productSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { name, description, price, image_url, category_id, stock_quantity, featured } = value;
  const db = getDatabase();

  db.run(
    `INSERT INTO products (name, description, price, image_url, category_id, stock_quantity, featured)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, description, price, image_url, category_id, stock_quantity, featured ? 1 : 0],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create product' });
      }

      db.get('SELECT * FROM products WHERE id = ?', [this.lastID], (err, product) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({ message: 'Product created', product });
      });
    }
  );
});

// PUT /api/products/:id - Update a product (admin only)
router.put('/:id', authenticate, adminOnly, (req, res) => {
  const { error, value } = productSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { name, description, price, image_url, category_id, stock_quantity, featured } = value;
  const db = getDatabase();

  db.run(
    `UPDATE products SET name = ?, description = ?, price = ?, image_url = ?, category_id = ?,
     stock_quantity = ?, featured = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [name, description, price, image_url, category_id, stock_quantity, featured ? 1 : 0, req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update product' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, product) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Product updated', product });
      });
    }
  );
});

// DELETE /api/products/:id - Delete a product (admin only)
router.delete('/:id', authenticate, adminOnly, (req, res) => {
  const db = getDatabase();

  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete product' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted' });
  });
});

module.exports = router;
