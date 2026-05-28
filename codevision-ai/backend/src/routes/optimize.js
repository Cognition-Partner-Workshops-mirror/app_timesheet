/**
 * Code optimization route.
 * Analyzes code for inefficiencies and generates optimized versions
 * with before/after complexity comparisons.
 */
const express = require('express');
const router = express.Router();
const { chatCompletion } = require('../services/openai');
const { OPTIMIZE_CODE_PROMPT } = require('../prompts');
const { validate, codeSchema } = require('../middleware/validate');
const { getDatabase } = require('../database/init');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/optimize
 * Optimizes submitted code and returns before/after complexity analysis.
 */
router.post('/', validate(codeSchema), async (req, res) => {
  try {
    const { code, language, difficulty } = req.body;

    const userMessage = `Language: ${language}\nDifficulty Level: ${difficulty}\n\nCode to optimize:\n${code}`;
    const result = await chatCompletion(OPTIMIZE_CODE_PROMPT, userMessage);

    // Store optimization in database
    const db = getDatabase();
    const id = uuidv4();
    const sessionId = uuidv4();

    db.prepare(`
      INSERT INTO sessions (id, title, language, difficulty, code)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, 'Code Optimization', language, difficulty, code);

    db.prepare(`
      INSERT INTO optimizations (id, session_id, original_code, optimized_code, language, original_complexity, optimized_complexity, improvements)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, sessionId, code,
      result.optimizedCode || '',
      language,
      JSON.stringify(result.originalAnalysis) || '',
      JSON.stringify(result.optimizedAnalysis) || '',
      JSON.stringify(result.comparisonTable) || ''
    );

    res.json({ id, sessionId, ...result });
  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({ error: 'Failed to optimize code', message: error.message });
  }
});

module.exports = router;
