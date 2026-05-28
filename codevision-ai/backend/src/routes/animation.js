/**
 * Algorithm animation route.
 * Uses local animation engine for common algorithms (no API key needed).
 * Falls back to OpenAI for custom/unknown algorithms.
 */
const express = require('express');
const router = express.Router();
const { chatCompletion } = require('../services/openai');
const { ANIMATION_STEPS_PROMPT, STORYBOARD_PROMPT } = require('../prompts');
const { validate, animationSchema, codeSchema } = require('../middleware/validate');
const { getDatabase } = require('../database/init');
const { v4: uuidv4 } = require('uuid');
const { generateLocalAnimation } = require('../services/animationEngine');

/**
 * POST /api/animation/generate
 * Generates algorithm animation steps. Uses local engine for known algorithms
 * (bubble sort, binary search, etc.) and falls back to AI for custom ones.
 */
router.post('/generate', validate(animationSchema), async (req, res) => {
  try {
    const { code, algorithmType, inputData, language, difficulty } = req.body;

    // Try local animation engine first — works without OpenAI API key
    const localResult = generateLocalAnimation(algorithmType, inputData);
    if (localResult) {
      // Store animation data in DB
      const db = getDatabase();
      const id = uuidv4();
      const sessionId = uuidv4();
      db.prepare(`
        INSERT INTO sessions (id, title, language, difficulty, code)
        VALUES (?, ?, ?, ?, ?)
      `).run(sessionId, `${localResult.algorithmName} Animation`, language, difficulty, code || '');
      db.prepare(`
        INSERT INTO animations (id, session_id, algorithm_type, steps_json, metadata_json)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, sessionId, algorithmType, JSON.stringify(localResult.steps), JSON.stringify(localResult));

      return res.json({ id, sessionId, ...localResult });
    }

    // Fall back to AI for unknown algorithm types
    const userMessage = `Algorithm: ${algorithmType}
Language: ${language}
Difficulty: ${difficulty}
${inputData ? `Input Data: ${JSON.stringify(inputData)}` : ''}
${code ? `Code:\n${code}` : ''}

Generate detailed animation steps for visualizing this algorithm.`;

    const result = await chatCompletion(ANIMATION_STEPS_PROMPT, userMessage);

    const db = getDatabase();
    const id = uuidv4();
    const sessionId = uuidv4();
    db.prepare(`
      INSERT INTO sessions (id, title, language, difficulty, code)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, `${algorithmType} Animation`, language, difficulty, code || '');
    db.prepare(`
      INSERT INTO animations (id, session_id, algorithm_type, steps_json, metadata_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, sessionId, algorithmType, JSON.stringify(result.steps), JSON.stringify(result));

    res.json({ id, sessionId, ...result });
  } catch (error) {
    console.error('Animation generation error:', error);
    res.status(500).json({ error: 'Failed to generate animation', message: error.message });
  }
});

/**
 * POST /api/animation/storyboard
 * Generates a teaching storyboard (slide-based animated explanation)
 * from code analysis. Acts as a video-like learning experience.
 */
router.post('/storyboard', validate(codeSchema), async (req, res) => {
  try {
    const { code, language, difficulty } = req.body;

    const userMessage = `Language: ${language}\nDifficulty Level: ${difficulty}\n\nCode to create teaching storyboard for:\n${code}`;
    const result = await chatCompletion(STORYBOARD_PROMPT, userMessage);

    res.json(result);
  } catch (error) {
    console.error('Storyboard generation error:', error);
    res.status(500).json({ error: 'Failed to generate storyboard', message: error.message });
  }
});

module.exports = router;
