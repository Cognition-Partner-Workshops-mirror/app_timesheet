const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init');

/**
 * POST /api/auth/login
 * Simple email-based login for the digital library.
 * Creates a user record if one doesn't already exist.
 */
router.post('/login', (req, res) => {
  const { email, display_name } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const db = getDatabase();

  // Check if user exists
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (user) {
      // Existing user - update display_name if provided
      if (display_name && display_name !== user.display_name) {
        db.run('UPDATE users SET display_name = ? WHERE email = ?', [display_name, email]);
      }
      return res.json({
        message: 'Welcome back!',
        user: { email: user.email, display_name: display_name || user.display_name, created_at: user.created_at }
      });
    }

    // New user - create account
    db.run(
      'INSERT INTO users (email, display_name) VALUES (?, ?)',
      [email, display_name || email.split('@')[0]],
      function (err) {
        if (err) {
          console.error('Error creating user:', err);
          return res.status(500).json({ error: 'Failed to create user account' });
        }
        res.status(201).json({
          message: 'Welcome to your Digital Library!',
          user: { email, display_name: display_name || email.split('@')[0] }
        });
      }
    );
  });
});

/**
 * GET /api/auth/me
 * Get current user info using the x-user-email header.
 */
router.get('/me', (req, res) => {
  const userEmail = req.headers['x-user-email'];

  if (!userEmail) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDatabase();
  db.get('SELECT * FROM users WHERE email = ?', [userEmail], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  });
});

module.exports = router;
