const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// Require authentication for all admin routes
router.use(authenticateUser);

// GET /api/admin/employee-hours — returns all employees with aggregated hours
router.get('/employee-hours', (req, res) => {
  const db = getDatabase();

  // Aggregate total hours, entry count, and last entry date per employee
  db.all(
    `SELECT 
       u.email,
       u.created_at,
       COALESCE(SUM(we.hours), 0) as total_hours,
       COUNT(we.id) as total_entries,
       MAX(we.date) as last_entry_date
     FROM users u
     LEFT JOIN work_entries we ON u.email = we.user_email
     GROUP BY u.email
     ORDER BY total_hours DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json({ employees: rows });
    }
  );
});

module.exports = router;
