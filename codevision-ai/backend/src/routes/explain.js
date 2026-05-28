/**
 * Line-by-line code explanation route.
 * Uses AI to provide detailed, beginner-friendly explanations
 * of each line of code with data state tracking.
 */
const express = require('express');
const router = express.Router();
const { chatCompletion } = require('../services/openai');
const { EXPLAIN_CODE_PROMPT } = require('../prompts');
const { validate, codeSchema } = require('../middleware/validate');
const { getDatabase } = require('../database/init');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/explain
 * Generates line-by-line explanation of code with data state tracking,
 * analogies, and key concept identification.
 */
router.post('/', validate(codeSchema), async (req, res) => {
  try {
    const { code, language, difficulty } = req.body;

    const userMessage = `Language: ${language}\nDifficulty Level: ${difficulty}\n\nCode to explain:\n${code}`;
    const result = await chatCompletion(EXPLAIN_CODE_PROMPT, userMessage);

    // Store explanation in database
    const db = getDatabase();
    const id = uuidv4();
    const sessionId = uuidv4();

    db.prepare(`
      INSERT INTO sessions (id, title, language, difficulty, code)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, result.title || 'Code Explanation', language, difficulty, code);

    db.prepare(`
      INSERT INTO explanations (id, session_id, code, language, explanation_type, content, difficulty)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, sessionId, code, language, 'line-by-line', JSON.stringify(result), difficulty);

    res.json({ id, sessionId, ...result });
  } catch (error) {
    console.error('Explanation error:', error);
    res.status(500).json({ error: 'Failed to explain code', message: error.message });
  }
});

module.exports = router;
