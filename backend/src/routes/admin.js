/**
 * Admin routes for the Event Services Marketplace.
 * Only accessible by users with the 'admin' role.
 * Provides user management, business approval, and platform statistics.
 */

const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(requireRole('admin'));

// Helper to run db.all as a promise
function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Helper to run db.get as a promise
function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// GET /api/admin/dashboard - Platform overview stats
router.get('/dashboard', async (req, res) => {
  try {
    const db = getDatabase();

    // Aggregate platform statistics
    const [totalUsers, totalBusinesses, pendingApprovals, totalServices, totalBookings, totalRevenue] = await Promise.all([
      dbGet(db, 'SELECT COUNT(*) as count FROM users'),
      dbGet(db, "SELECT COUNT(*) as count FROM users WHERE role = 'business'"),
      dbGet(db, "SELECT COUNT(*) as count FROM users WHERE role = 'business' AND is_approved = 0"),
      dbGet(db, 'SELECT COUNT(*) as count FROM services'),
      dbGet(db, 'SELECT COUNT(*) as count FROM bookings'),
      dbGet(db, 'SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings WHERE status = \'completed\'')
    ]);

    // Recent bookings for dashboard feed
    const recentBookings = await dbAll(
      db,
      `SELECT b.id, b.status, b.total_amount, b.created_at,
              s.name as service_name, cu.name as customer_name
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN users cu ON b.customer_user_id = cu.id
       ORDER BY b.created_at DESC
       LIMIT 10`
    );

    res.json({
      stats: {
        total_users: totalUsers.count,
        total_businesses: totalBusinesses.count,
        pending_approvals: pendingApprovals.count,
        total_services: totalServices.count,
        total_bookings: totalBookings.count,
        total_revenue: totalRevenue.total
      },
      recent_bookings: recentBookings
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/users - List all users with optional role filter
router.get('/users', async (req, res) => {
  try {
    const db = getDatabase();
    const { role, approved } = req.query;

    let sql = 'SELECT id, email, name, phone, role, is_approved, business_name, business_description, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    if (approved !== undefined) {
      sql += ' AND is_approved = ?';
      params.push(approved === 'true' ? 1 : 0);
    }

    sql += ' ORDER BY created_at DESC';

    const users = await dbAll(db, sql, params);
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id/approve - Approve or reject a business user
router.put('/users/:id/approve', async (req, res) => {
  try {
    const { approved } = req.body;
    if (typeof approved !== 'boolean') {
      return res.status(400).json({ error: 'approved must be a boolean' });
    }

    const db = getDatabase();

    const user = await dbGet(db, 'SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.role !== 'business') {
      return res.status(400).json({ error: 'Only business users can be approved/rejected' });
    }

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET is_approved = ?, updated_at = datetime('now') WHERE id = ?`,
        [approved ? 1 : 0, req.params.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ message: `Business user ${approved ? 'approved' : 'rejected'} successfully` });
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id/role - Change a user's role
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['admin', 'business', 'customer'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` });
    }

    const db = getDatabase();
    const user = await dbGet(db, 'SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`,
        [role, req.params.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ message: `User role changed to ${role} successfully` });
  } catch (error) {
    console.error('Error changing role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/users/:id - Delete a user (cascade deletes their services/bookings)
router.delete('/users/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const user = await dbGet(db, 'SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting yourself
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await new Promise((resolve, reject) => {
      db.run('DELETE FROM users WHERE id = ?', [req.params.id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/services - List all services (for admin oversight)
router.get('/services', async (req, res) => {
  try {
    const db = getDatabase();
    const services = await dbAll(
      db,
      `SELECT s.*, sc.name as category_name, u.name as business_owner_name, u.business_name, u.is_approved as business_approved
       FROM services s
       JOIN service_categories sc ON s.category_id = sc.id
       JOIN users u ON s.business_user_id = u.id
       ORDER BY s.created_at DESC`
    );
    res.json({ services });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
