/**
 * Problem-solving assistant route.
 * Provides comprehensive problem analysis with multiple approaches,
 * dry runs, edge cases, and interview tips.
 */
const express = require('express');
const router = express.Router();
const { chatCompletion } = require('../services/openai');
const { PROBLEM_SOLVE_PROMPT } = require('../prompts');
const { validate, problemSchema } = require('../middleware/validate');
const { getDatabase } = require('../database/init');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/problem/solve
 * Analyzes a coding problem and returns multiple solution approaches
 * with complexity analysis, dry runs, and interview guidance.
 */
router.post('/solve', validate(problemSchema), async (req, res) => {
  try {
    const { problem, language, difficulty } = req.body;

    const userMessage = `Target Language: ${language}\nDifficulty Level: ${difficulty}\n\nProblem:\n${problem}`;
    const result = await chatCompletion(PROBLEM_SOLVE_PROMPT, userMessage);

    // Store problem analysis
    const db = getDatabase();
    const id = uuidv4();
    const sessionId = uuidv4();

    db.prepare(`
      INSERT INTO sessions (id, title, language, difficulty, problem_statement)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, result.problemSummary?.substring(0, 100) || 'Problem Analysis', language, difficulty, problem);

    db.prepare(`
      INSERT INTO problems (id, session_id, problem_statement, summary, approaches_json, edge_cases, complexity_analysis, interview_tips)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, sessionId, problem,
      result.problemSummary || '',
      JSON.stringify(result.approaches) || '[]',
      JSON.stringify(result.edgeCases) || '[]',
      JSON.stringify(result.dryRun) || '{}',
      JSON.stringify(result.interviewTips) || '[]'
    );

    res.json({ id, sessionId, ...result });
  } catch (error) {
    console.error('Problem solving error:', error);
    res.status(500).json({ error: 'Failed to analyze problem', message: error.message });
  }
});

module.exports = router;
