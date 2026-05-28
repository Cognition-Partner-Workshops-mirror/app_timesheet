/**
 * Code analysis route.
 * Provides comprehensive code analysis including logic explanation,
 * inefficiency detection, and improvement suggestions.
 */
const express = require('express');
const router = express.Router();
const { chatCompletion } = require('../services/openai');
const { validate, codeSchema } = require('../middleware/validate');
const { getDatabase } = require('../database/init');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/analyze
 * Analyzes submitted code: detects language, explains logic,
 * finds inefficiencies, and suggests improvements.
 */
router.post('/', validate(codeSchema), async (req, res) => {
  try {
    const { code, language, difficulty } = req.body;

    const systemPrompt = `You are an expert code analyst for CodeVision AI. Analyze the given code comprehensively.

Provide analysis adjusted for ${difficulty} level users.

Respond in JSON format:
{
  "language": "detected language",
  "title": "what the code does",
  "logic": "explanation of the code's logic",
  "inefficiencies": [{"issue": "description", "severity": "low|medium|high", "suggestion": "how to fix"}],
  "codeSmells": [{"smell": "description", "location": "where in code"}],
  "bestPractices": ["suggestions for better code"],
  "complexity": {"time": "O(?)", "space": "O(?)"},
  "overallScore": 75,
  "summary": "brief summary of analysis"
}`;

    const result = await chatCompletion(systemPrompt, `Language: ${language}\nDifficulty: ${difficulty}\n\nCode:\n${code}`);

    // Store the analysis in the database
    const db = getDatabase();
    const sessionId = uuidv4();
    db.prepare(`
      INSERT INTO sessions (id, title, language, difficulty, code)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, result.title || 'Code Analysis', language, difficulty, code);

    res.json({ sessionId, ...result });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze code', message: error.message });
  }
});

module.exports = router;
