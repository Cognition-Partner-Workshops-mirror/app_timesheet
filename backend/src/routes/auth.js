const express = require('express');
const { getDatabase } = require('../database/init');
const { emailSchema } = require('../validation/schemas');
const { authenticateUser, validateAzureToken, extractEmailFromToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /login — authenticates the user and ensures they exist in the DB.
 *
 * Supports two modes:
 * 1. Bearer token (SSO): validates the Azure AD JWT, extracts email from claims,
 *    and creates/returns the user record.
 * 2. Email in body (legacy fallback): validates email via Joi schema and
 *    creates/returns the user. Only works when ENABLE_EMAIL_AUTH=true.
 */
router.post('/login', async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    // SSO path: Bearer token provided
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const decoded = await validateAzureToken(token);
        const email = extractEmailFromToken(decoded);

        if (!email) {
          return res.status(401).json({ error: 'No email claim found in token' });
        }

        const db = getDatabase();

        // Find or create user by email extracted from Azure AD token
        db.get('SELECT email, created_at FROM users WHERE email = ?', [email], (err, row) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }

          if (row) {
            return res.json({
              message: 'Login successful',
              user: { email: row.email, createdAt: row.created_at },
            });
          }

          // Auto-provision new SSO user
          db.run('INSERT INTO users (email) VALUES (?)', [email], function (err) {
            if (err) {
              console.error('Error creating user:', err);
              return res.status(500).json({ error: 'Failed to create user' });
            }

            res.status(201).json({
              message: 'User created and logged in successfully',
              user: { email: email, createdAt: new Date().toISOString() },
            });
          });
        });
      } catch (tokenErr) {
        console.error('Token validation failed:', tokenErr.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      return;
    }

    // Legacy email-based login fallback (requires ENABLE_EMAIL_AUTH=true)
    const enableEmailAuth = process.env.ENABLE_EMAIL_AUTH === 'true';
    if (!enableEmailAuth) {
      return res.status(401).json({ error: 'Email login is disabled. Use SSO authentication.' });
    }

    const { error, value } = emailSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { email } = value;
    const db = getDatabase();

    db.get('SELECT email, created_at FROM users WHERE email = ?', [email], (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (row) {
        return res.json({
          message: 'Login successful',
          user: { email: row.email, createdAt: row.created_at },
        });
      }

      // Create new user for legacy email login
      db.run('INSERT INTO users (email) VALUES (?)', [email], function (err) {
        if (err) {
          console.error('Error creating user:', err);
          return res.status(500).json({ error: 'Failed to create user' });
        }

        res.status(201).json({
          message: 'User created and logged in successfully',
          user: { email: email, createdAt: new Date().toISOString() },
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

/** GET /me — returns the current authenticated user's info */
router.get('/me', authenticateUser, (req, res) => {
  const db = getDatabase();
  
  db.get('SELECT email, created_at FROM users WHERE email = ?', [req.userEmail], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        email: row.email,
        createdAt: row.created_at
      }
    });
  });
});

module.exports = router;
