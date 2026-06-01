/**
 * Review routes for the Event Services Marketplace.
 * Customers can leave reviews only after a booking is completed.
 * Each booking can have at most one review.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { getDatabase } = require('../database/init');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();

// Validation schema for creating a review
const reviewSchema = Joi.object({
  booking_id: Joi.string().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().allow('', null)
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

// POST /api/reviews - Create a review for a completed booking
router.post('/', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const { error, value } = reviewSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const db = getDatabase();
    const { booking_id, rating, comment } = value;

    // Verify booking exists, belongs to this customer, and is completed
    const booking = await dbGet(
      db,
      'SELECT * FROM bookings WHERE id = ? AND customer_user_id = ?',
      [booking_id, req.user.id]
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'You can only review completed bookings' });
    }

    // Check if a review already exists for this booking
    const existingReview = await dbGet(db, 'SELECT id FROM reviews WHERE booking_id = ?', [booking_id]);
    if (existingReview) {
      return res.status(409).json({ error: 'Review already exists for this booking' });
    }

    const id = uuidv4();

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO reviews (id, booking_id, customer_user_id, service_id, rating, comment)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, booking_id, req.user.id, booking.service_id, rating, comment || null],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.status(201).json({ message: 'Review submitted successfully', id });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reviews/service/:serviceId - Get all reviews for a specific service
router.get('/service/:serviceId', async (req, res) => {
  try {
    const db = getDatabase();
    const reviews = await dbAll(
      db,
      `SELECT r.*, u.name as reviewer_name
       FROM reviews r
       JOIN users u ON r.customer_user_id = u.id
       WHERE r.service_id = ?
       ORDER BY r.created_at DESC`,
      [req.params.serviceId]
    );

    // Calculate average rating
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    res.json({ reviews, avg_rating: avgRating, total: reviews.length });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
