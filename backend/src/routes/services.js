/**
 * Service routes for the Event Services Marketplace.
 * Business users can create/update/delete their service listings.
 * All users can browse and search services.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { getDatabase } = require('../database/init');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();

// Validation schema for creating/updating a service
const serviceSchema = Joi.object({
  category_id: Joi.string().required(),
  name: Joi.string().min(3).max(200).required(),
  description: Joi.string().allow('', null),
  price_min: Joi.number().positive().required(),
  price_max: Joi.number().positive().allow(null),
  location: Joi.string().allow('', null),
  city: Joi.string().allow('', null),
  image_url: Joi.string().uri().allow('', null),
  is_active: Joi.boolean(),
  capacity_min: Joi.number().integer().positive().allow(null),
  capacity_max: Joi.number().integer().positive().allow(null)
});

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

// GET /api/services - Browse all active services with optional filters
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { category, city, search, min_price, max_price } = req.query;

    let sql = `
      SELECT s.*, sc.name as category_name, sc.icon as category_icon,
             u.name as business_owner_name, u.business_name,
             COALESCE(AVG(r.rating), 0) as avg_rating,
             COUNT(r.id) as review_count
      FROM services s
      JOIN service_categories sc ON s.category_id = sc.id
      JOIN users u ON s.business_user_id = u.id
      LEFT JOIN reviews r ON s.id = r.service_id
      WHERE s.is_active = 1 AND u.is_approved = 1
    `;
    const params = [];

    // Apply optional filters
    if (category) {
      sql += ' AND s.category_id = ?';
      params.push(category);
    }
    if (city) {
      sql += ' AND LOWER(s.city) LIKE LOWER(?)';
      params.push(`%${city}%`);
    }
    if (search) {
      sql += ' AND (LOWER(s.name) LIKE LOWER(?) OR LOWER(s.description) LIKE LOWER(?))';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (min_price) {
      sql += ' AND s.price_min >= ?';
      params.push(Number(min_price));
    }
    if (max_price) {
      sql += ' AND s.price_min <= ?';
      params.push(Number(max_price));
    }

    sql += ' GROUP BY s.id ORDER BY s.created_at DESC';

    const services = await dbAll(db, sql, params);
    res.json({ services });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/services/categories - List all service categories
router.get('/categories', async (req, res) => {
  try {
    const db = getDatabase();
    const categories = await dbAll(db, 'SELECT * FROM service_categories ORDER BY name');
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/services/my - Get services owned by the logged-in business user
router.get('/my', authenticate, requireRole('business'), async (req, res) => {
  try {
    const db = getDatabase();
    const services = await dbAll(
      db,
      `SELECT s.*, sc.name as category_name, sc.icon as category_icon,
              COALESCE(AVG(r.rating), 0) as avg_rating,
              COUNT(r.id) as review_count
       FROM services s
       JOIN service_categories sc ON s.category_id = sc.id
       LEFT JOIN reviews r ON s.id = r.service_id
       WHERE s.business_user_id = ?
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json({ services });
  } catch (error) {
    console.error('Error fetching my services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/services/:id - Get a single service by ID with reviews
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const service = await dbGet(
      db,
      `SELECT s.*, sc.name as category_name, sc.icon as category_icon,
              u.name as business_owner_name, u.business_name, u.phone as business_phone,
              COALESCE(AVG(r.rating), 0) as avg_rating,
              COUNT(r.id) as review_count
       FROM services s
       JOIN service_categories sc ON s.category_id = sc.id
       JOIN users u ON s.business_user_id = u.id
       LEFT JOIN reviews r ON s.id = r.service_id
       WHERE s.id = ?
       GROUP BY s.id`,
      [req.params.id]
    );

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Fetch reviews for this service
    const reviews = await dbAll(
      db,
      `SELECT r.*, u.name as reviewer_name
       FROM reviews r
       JOIN users u ON r.customer_user_id = u.id
       WHERE r.service_id = ?
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );

    res.json({ service, reviews });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/services - Create a new service listing (business users only)
router.post('/', authenticate, requireRole('business'), async (req, res) => {
  try {
    const { error, value } = serviceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const db = getDatabase();

    // Verify business user is approved before allowing service creation
    const user = await dbGet(db, 'SELECT is_approved FROM users WHERE id = ?', [req.user.id]);
    if (!user || !user.is_approved) {
      return res.status(403).json({ error: 'Your business account is not yet approved by admin' });
    }

    const id = uuidv4();
    const { category_id, name, description, price_min, price_max, location, city, image_url, capacity_min, capacity_max } = value;

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO services (id, business_user_id, category_id, name, description, price_min, price_max, location, city, image_url, capacity_min, capacity_max)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, req.user.id, category_id, name, description || null, price_min, price_max || null, location || null, city || null, image_url || null, capacity_min || null, capacity_max || null],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.status(201).json({ message: 'Service created successfully', id });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/services/:id - Update an existing service (owner only)
router.put('/:id', authenticate, requireRole('business'), async (req, res) => {
  try {
    const { error, value } = serviceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const db = getDatabase();

    // Verify ownership of the service
    const service = await dbGet(db, 'SELECT business_user_id FROM services WHERE id = ?', [req.params.id]);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    if (service.business_user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your own services' });
    }

    const { category_id, name, description, price_min, price_max, location, city, image_url, is_active, capacity_min, capacity_max } = value;

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE services SET category_id = ?, name = ?, description = ?, price_min = ?, price_max = ?,
         location = ?, city = ?, image_url = ?, is_active = COALESCE(?, is_active),
         capacity_min = ?, capacity_max = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [category_id, name, description, price_min, price_max, location, city, image_url, is_active != null ? (is_active ? 1 : 0) : null, capacity_min, capacity_max, req.params.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ message: 'Service updated successfully' });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/services/:id - Delete a service (owner or admin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const db = getDatabase();
    const service = await dbGet(db, 'SELECT business_user_id FROM services WHERE id = ?', [req.params.id]);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Allow deletion by owner or admin
    if (service.business_user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own services' });
    }

    await new Promise((resolve, reject) => {
      db.run('DELETE FROM services WHERE id = ?', [req.params.id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
