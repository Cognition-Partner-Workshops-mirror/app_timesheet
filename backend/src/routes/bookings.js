/**
 * Booking routes for the Event Services Marketplace.
 * Customers can create bookings; business users can manage booking status.
 * Bookings go through: pending -> confirmed -> completed (or cancelled).
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { getDatabase } = require('../database/init');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();

// Validation schema for creating a booking
const bookingSchema = Joi.object({
  service_id: Joi.string().required(),
  event_date: Joi.string().required(),
  event_type: Joi.string().allow('', null),
  guest_count: Joi.number().integer().positive().allow(null),
  special_requests: Joi.string().allow('', null),
  total_amount: Joi.number().positive().allow(null)
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

// POST /api/bookings - Create a new booking (customer only)
router.post('/', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const { error, value } = bookingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const db = getDatabase();
    const { service_id, event_date, event_type, guest_count, special_requests, total_amount } = value;

    // Verify service exists and is active
    const service = await dbGet(db, 'SELECT * FROM services WHERE id = ? AND is_active = 1', [service_id]);
    if (!service) {
      return res.status(404).json({ error: 'Service not found or inactive' });
    }

    const id = uuidv4();

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO bookings (id, service_id, customer_user_id, event_date, event_type, guest_count, special_requests, total_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, service_id, req.user.id, event_date, event_type || null, guest_count || null, special_requests || null, total_amount || service.price_min],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.status(201).json({ message: 'Booking created successfully', id });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/bookings - List bookings based on user role
// Customers see their own bookings; business users see bookings for their services
router.get('/', authenticate, async (req, res) => {
  try {
    const db = getDatabase();
    let sql, params;

    if (req.user.role === 'customer') {
      // Customer sees their own bookings
      sql = `
        SELECT b.*, s.name as service_name, s.image_url as service_image,
               sc.name as category_name, u.name as business_owner_name, u.business_name
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        JOIN service_categories sc ON s.category_id = sc.id
        JOIN users u ON s.business_user_id = u.id
        WHERE b.customer_user_id = ?
        ORDER BY b.created_at DESC
      `;
      params = [req.user.id];
    } else if (req.user.role === 'business') {
      // Business sees bookings for their services
      sql = `
        SELECT b.*, s.name as service_name, s.image_url as service_image,
               sc.name as category_name, cu.name as customer_name, cu.email as customer_email, cu.phone as customer_phone
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        JOIN service_categories sc ON s.category_id = sc.id
        JOIN users cu ON b.customer_user_id = cu.id
        WHERE s.business_user_id = ?
        ORDER BY b.created_at DESC
      `;
      params = [req.user.id];
    } else {
      // Admin sees all bookings
      sql = `
        SELECT b.*, s.name as service_name, s.image_url as service_image,
               sc.name as category_name,
               cu.name as customer_name, cu.email as customer_email,
               bu.name as business_owner_name, bu.business_name
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        JOIN service_categories sc ON s.category_id = sc.id
        JOIN users cu ON b.customer_user_id = cu.id
        JOIN users bu ON s.business_user_id = bu.id
        ORDER BY b.created_at DESC
      `;
      params = [];
    }

    const bookings = await dbAll(db, sql, params);
    res.json({ bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/bookings/:id - Get single booking details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const db = getDatabase();
    const booking = await dbGet(
      db,
      `SELECT b.*, s.name as service_name, s.description as service_description,
              s.image_url as service_image, s.price_min, s.price_max,
              sc.name as category_name,
              cu.name as customer_name, cu.email as customer_email, cu.phone as customer_phone,
              bu.name as business_owner_name, bu.business_name, bu.phone as business_phone
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN service_categories sc ON s.category_id = sc.id
       JOIN users cu ON b.customer_user_id = cu.id
       JOIN users bu ON s.business_user_id = bu.id
       WHERE b.id = ?`,
      [req.params.id]
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Access control: only involved parties or admin can view
    if (
      req.user.role !== 'admin' &&
      booking.customer_user_id !== req.user.id &&
      booking.business_user_id !== req.user.id
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/bookings/:id/status - Update booking status (business owner or admin)
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['confirmed', 'cancelled', 'completed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const db = getDatabase();

    // Fetch booking with service owner info
    const booking = await dbGet(
      db,
      `SELECT b.*, s.business_user_id
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       WHERE b.id = ?`,
      [req.params.id]
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Only the business owner, admin, or customer (for cancellation) can update status
    const isBusinessOwner = booking.business_user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isCustomer = booking.customer_user_id === req.user.id;

    if (!isBusinessOwner && !isAdmin && !(isCustomer && status === 'cancelled')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?`,
        [status, req.params.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ message: `Booking ${status} successfully` });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
