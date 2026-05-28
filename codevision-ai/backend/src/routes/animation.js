/**
 * Algorithm animation route.
 * Generates step-by-step animation data for algorithms and
 * teaching storyboards for slide-based video explanations.
 */
const express = require('express');
const router = express.Router();
const { chatCompletion } = require('../services/openai');
const { ANIMATION_STEPS_PROMPT, STORYBOARD_PROMPT } = require('../prompts');
const { validate, animationSchema, codeSchema } = require('../middleware/validate');
const { getDatabase } = require('../database/init');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/animation/generate
 * Generates algorithm animation steps from code or algorithm description.
 * Returns step-by-step state changes for frontend visualization.
 */
router.post('/generate', validate(animationSchema), async (req, res) => {
  try {
    const { code, algorithmType, inputData, language, difficulty } = req.body;

    const userMessage = `Algorithm: ${algorithmType}
Language: ${language}
Difficulty: ${difficulty}
${inputData ? `Input Data: ${JSON.stringify(inputData)}` : ''}
${code ? `Code:\n${code}` : ''}

Generate detailed animation steps for visualizing this algorithm.`;

    const result = await chatCompletion(ANIMATION_STEPS_PROMPT, userMessage);

    // Store animation data
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
