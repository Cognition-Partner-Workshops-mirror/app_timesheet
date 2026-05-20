const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticate, adminOnly } = require('../middleware/auth');
const { checkoutSchema, orderStatusSchema } = require('../validation/schemas');

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

// POST /api/orders - Place an order from the current cart contents
router.post('/', (req, res) => {
  const { error, value } = checkoutSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const db = getDatabase();
  const userId = req.user.id;

  // Fetch cart items with product details
  db.all(
    `SELECT ci.quantity, p.id as product_id, p.name, p.price, p.stock_quantity
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     WHERE ci.user_id = ?`,
    [userId],
    (err, cartItems) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (cartItems.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
      }

      // Verify all items have sufficient stock
      const outOfStock = cartItems.find(item => item.stock_quantity < item.quantity);
      if (outOfStock) {
        return res.status(400).json({
          error: `Insufficient stock for "${outOfStock.name}". Available: ${outOfStock.stock_quantity}`
        });
      }

      // Calculate order total
      const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const { shipping_name, shipping_address, shipping_city, shipping_state, shipping_zip, shipping_phone, payment_method } = value;

      db.serialize(() => {
        // Create the order record
        db.run(
          `INSERT INTO orders (user_id, total_amount, shipping_name, shipping_address, shipping_city, shipping_state, shipping_zip, shipping_phone, payment_method)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, Math.round(totalAmount * 100) / 100, shipping_name, shipping_address, shipping_city, shipping_state, shipping_zip, shipping_phone, payment_method],
          function (err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to create order' });
            }

            const orderId = this.lastID;

            // Insert order line items and reduce product stock
            const itemStmt = db.prepare(
              'INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity) VALUES (?, ?, ?, ?, ?)'
            );
            const stockStmt = db.prepare(
              'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?'
            );

            cartItems.forEach(item => {
              itemStmt.run(orderId, item.product_id, item.name, item.price, item.quantity);
              stockStmt.run(item.quantity, item.product_id);
            });

            itemStmt.finalize();
            stockStmt.finalize();

            // Clear the user's cart after successful order
            db.run('DELETE FROM cart_items WHERE user_id = ?', [userId], (err) => {
              if (err) {
                console.error('Failed to clear cart after order:', err);
              }

              // Return complete order details
              db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
                if (err) {
                  return res.status(500).json({ error: 'Database error' });
                }
                res.status(201).json({
                  message: 'Order placed successfully',
                  order: {
                    ...order,
                    items: cartItems.map(item => ({
                      product_id: item.product_id,
                      product_name: item.name,
                      product_price: item.price,
                      quantity: item.quantity
                    }))
                  }
                });
              });
            });
          }
        );
      });
    }
  );
});

// GET /api/orders - List orders for the current user (or all orders for admin)
router.get('/', (req, res) => {
  const db = getDatabase();
  const isAdmin = req.user.role === 'admin';
  const { page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  // Admin sees all orders; customers see only their own
  const whereClause = isAdmin ? '' : 'WHERE o.user_id = ?';
  const params = isAdmin ? [] : [req.user.id];

  const countQuery = `SELECT COUNT(*) as total FROM orders o ${whereClause}`;
  const dataQuery = `
    SELECT o.*, u.name as customer_name, u.email as customer_email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `;

  db.get(countQuery, params, (err, countRow) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    db.all(dataQuery, [...params, limitNum, offset], (err, orders) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        orders,
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

// GET /api/orders/:id - Get detailed order information
router.get('/:id', (req, res) => {
  const db = getDatabase();

  db.get(
    `SELECT o.*, u.name as customer_name, u.email as customer_email
     FROM orders o
     JOIN users u ON o.user_id = u.id
     WHERE o.id = ?`,
    [req.params.id],
    (err, order) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Only allow access to own orders (or admin)
      if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Fetch order line items
      db.all(
        'SELECT * FROM order_items WHERE order_id = ?',
        [req.params.id],
        (err, items) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ order: { ...order, items } });
        }
      );
    }
  );
});

// PUT /api/orders/:id/status - Update order status (admin only)
router.put('/:id/status', adminOnly, (req, res) => {
  const { error, value } = orderStatusSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const db = getDatabase();

  db.run(
    'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [value.status, req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update order' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json({ message: 'Order status updated', status: value.status });
    }
  );
});

module.exports = router;
