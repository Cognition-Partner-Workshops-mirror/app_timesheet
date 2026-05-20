const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticate } = require('../middleware/auth');
const { cartItemSchema, cartUpdateSchema } = require('../validation/schemas');

const router = express.Router();

// All cart routes require authentication
router.use(authenticate);

// GET /api/cart - Get the current user's cart with product details
router.get('/', (req, res) => {
  const db = getDatabase();

  db.all(
    `SELECT ci.id, ci.quantity, ci.product_id,
            p.name, p.price, p.image_url, p.stock_quantity
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     WHERE ci.user_id = ?
     ORDER BY ci.created_at DESC`,
    [req.user.id],
    (err, items) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Calculate cart totals
      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

      res.json({
        items,
        summary: {
          itemCount,
          total: Math.round(total * 100) / 100
        }
      });
    }
  );
});

// POST /api/cart - Add an item to the cart (or increment quantity if it exists)
router.post('/', (req, res) => {
  const { error, value } = cartItemSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { product_id, quantity } = value;
  const db = getDatabase();

  // Verify product exists and has enough stock
  db.get('SELECT * FROM products WHERE id = ?', [product_id], (err, product) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (product.stock_quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Upsert: insert or update quantity if item already in cart
    db.run(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, product_id)
       DO UPDATE SET quantity = quantity + ?`,
      [req.user.id, product_id, quantity, quantity],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to add to cart' });
        }
        res.status(201).json({ message: 'Item added to cart' });
      }
    );
  });
});

// PUT /api/cart/:id - Update cart item quantity
router.put('/:id', (req, res) => {
  const { error, value } = cartUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { quantity } = value;
  const db = getDatabase();

  // Verify ownership and check stock
  db.get(
    `SELECT ci.*, p.stock_quantity
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     WHERE ci.id = ? AND ci.user_id = ?`,
    [req.params.id, req.user.id],
    (err, item) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!item) {
        return res.status(404).json({ error: 'Cart item not found' });
      }
      if (item.stock_quantity < quantity) {
        return res.status(400).json({ error: 'Insufficient stock' });
      }

      db.run(
        'UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?',
        [quantity, req.params.id, req.user.id],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to update cart' });
          }
          res.json({ message: 'Cart updated' });
        }
      );
    }
  );
});

// DELETE /api/cart/:id - Remove an item from the cart
router.delete('/:id', (req, res) => {
  const db = getDatabase();

  db.run(
    'DELETE FROM cart_items WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to remove from cart' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Cart item not found' });
      }
      res.json({ message: 'Item removed from cart' });
    }
  );
});

// DELETE /api/cart - Clear the entire cart
router.delete('/', (req, res) => {
  const db = getDatabase();

  db.run('DELETE FROM cart_items WHERE user_id = ?', [req.user.id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to clear cart' });
    }
    res.json({ message: 'Cart cleared' });
  });
});

module.exports = router;
