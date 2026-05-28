/**
 * Session management route.
 * Handles CRUD operations for learning sessions,
 * allowing users to save and revisit their analyses.
 */
const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init');

/**
 * GET /api/session
 * Returns all learning sessions ordered by most recent first.
 */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const sessions = db.prepare(`
      SELECT * FROM sessions ORDER BY created_at DESC LIMIT 50
    `).all();
    res.json(sessions);
  } catch (error) {
    console.error('Session fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * GET /api/session/:id
 * Returns a specific session with all related data (explanations,
 * optimizations, animations, and problem analyses).
 */
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Fetch all related data for this session
    const explanations = db.prepare('SELECT * FROM explanations WHERE session_id = ?').all(req.params.id);
    const optimizations = db.prepare('SELECT * FROM optimizations WHERE session_id = ?').all(req.params.id);
    const animations = db.prepare('SELECT * FROM animations WHERE session_id = ?').all(req.params.id);
    const problems = db.prepare('SELECT * FROM problems WHERE session_id = ?').all(req.params.id);

    res.json({
      ...session,
      explanations,
      optimizations,
      animations,
      problems
    });
  } catch (error) {
    console.error('Session detail error:', error);
    res.status(500).json({ error: 'Failed to fetch session details' });
  }
});

/**
 * DELETE /api/session/:id
 * Deletes a session and all related data (cascade delete).
 */
router.delete('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Session delete error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

module.exports = router;
