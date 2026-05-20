const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');
const { authenticate, JWT_SECRET } = require('../middleware/auth');
const { registerSchema, loginSchema } = require('../validation/schemas');

const router = express.Router();

// Hash password using PBKDF2 with random salt
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Verify password against stored hash
function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// POST /api/auth/register - Create a new user account
router.post('/register', (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { name, email, password } = value;
  const db = getDatabase();

  // Check if email already exists
  db.get('SELECT id FROM users WHERE email = ?', [email], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = hashPassword(password);

    db.run(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, passwordHash],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create account' });
        }

        // Generate JWT token for immediate login after registration
        const token = jwt.sign({ userId: this.lastID }, JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({
          message: 'Account created successfully',
          token,
          user: { id: this.lastID, name, email, role: 'customer' }
        });
      }
    );
  });
});

// POST /api/auth/login - Authenticate user and return JWT token
router.post('/login', (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { email, password } = value;
  const db = getDatabase();

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  });
});

// GET /api/auth/me - Get current authenticated user info
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
