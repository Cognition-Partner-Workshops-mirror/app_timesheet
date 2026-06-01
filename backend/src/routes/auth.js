/**
 * Authentication routes for the Event Services Marketplace.
 * Handles user registration (with role selection), login, and profile retrieval.
 * Business users require admin approval before they can list services.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { getDatabase } = require('../database/init');
const { authenticate, generateToken } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().allow('', null),
  role: Joi.string().valid('customer', 'business').required(),
  business_name: Joi.string().allow('', null),
  business_description: Joi.string().allow('', null)
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// POST /api/auth/register - Register a new user with role selection
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, name, phone, role, business_name, business_description } = value;
    const db = getDatabase();

    // Check if email already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password and create user
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    // Customers are auto-approved; business users need admin approval
    const isApproved = role === 'customer' ? 1 : 0;

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (id, email, password_hash, name, phone, role, is_approved, business_name, business_description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, email, passwordHash, name, phone || null, role, isApproved, business_name || null, business_description || null],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    const user = { id, email, name, role };
    const token = generateToken(user);

    res.status(201).json({
      message: role === 'business'
        ? 'Registration successful. Your business account is pending admin approval.'
        : 'Registration successful.',
      token,
      user: { id, email, name, phone, role, is_approved: isApproved, business_name, business_description }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login - Authenticate user and return JWT
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;
    const db = getDatabase();

    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password against stored hash
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        is_approved: user.is_approved,
        business_name: user.business_name,
        business_description: user.business_description
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me - Get current authenticated user's profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const db = getDatabase();
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, email, name, phone, role, is_approved, business_name, business_description, avatar_url, created_at FROM users WHERE id = ?',
        [req.user.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/auth/profile - Update current user's profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone, business_name, business_description } = req.body;
    const db = getDatabase();

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone),
         business_name = COALESCE(?, business_name), business_description = COALESCE(?, business_description),
         updated_at = datetime('now') WHERE id = ?`,
        [name, phone, business_name, business_description, req.user.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
