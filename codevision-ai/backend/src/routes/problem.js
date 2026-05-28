/**
 * Problem-solving assistant route.
 * Provides comprehensive problem analysis with multiple approaches,
 * dry runs, edge cases, and interview tips.
 * Also handles: code generation from questions, progressive hints,
 * and interactive discussion for building problem-solving skills.
 */
const express = require('express');
const router = express.Router();
const { chatCompletion } = require('../services/openai');
const { PROBLEM_SOLVE_PROMPT, GENERATE_CODE_PROMPT, GENERATE_HINTS_PROMPT, DISCUSSION_PROMPT } = require('../prompts');
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

/**
 * POST /api/problem/generate-code
 * Generates code from a problem statement/question.
 * Returns complete working code with approach description and test input.
 */
router.post('/generate-code', validate(problemSchema), async (req, res) => {
  try {
    const { problem, language, difficulty } = req.body;

    const userMessage = `Language: ${language}\nDifficulty: ${difficulty}\n\nProblem/Question:\n${problem}`;
    const result = await chatCompletion(GENERATE_CODE_PROMPT, userMessage);

    res.json({
      code: result.code || '',
      approach: result.approach || '',
      dataStructures: result.dataStructures || [],
      algorithm: result.algorithm || '',
      timeComplexity: result.timeComplexity || '',
      spaceComplexity: result.spaceComplexity || '',
      testInput: result.testInput || '',
      expectedOutput: result.expectedOutput || '',
    });
  } catch (error) {
    console.error('Code generation error:', error);
    res.status(500).json({ error: 'Failed to generate code', message: error.message });
  }
});

/**
 * POST /api/problem/hints
 * Generates progressive hints for a coding problem.
 * Hints build on each other, guiding the student without giving the answer.
 */
router.post('/hints', validate(problemSchema), async (req, res) => {
  try {
    const { problem, language, difficulty } = req.body;

    const userMessage = `Language: ${language}\nDifficulty: ${difficulty}\n\nProblem:\n${problem}`;
    const result = await chatCompletion(GENERATE_HINTS_PROMPT, userMessage);

    res.json({
      hints: result.hints || [],
    });
  } catch (error) {
    console.error('Hints generation error:', error);
    res.status(500).json({ error: 'Failed to generate hints', message: error.message });
  }
});

/**
 * POST /api/problem/discuss
 * Interactive discussion about a coding problem.
 * Helps students think through solutions and build problem-solving skills.
 */
router.post('/discuss', async (req, res) => {
  try {
    const { problem, question, language, difficulty } = req.body;
    if (!problem || !question) {
      return res.status(400).json({ error: 'Both problem and question are required' });
    }

    // Inject the problem context into the discussion prompt
    const contextPrompt = DISCUSSION_PROMPT.replace('{PROBLEM}', problem);
    const userMessage = `Language: ${language || 'python'}\nDifficulty: ${difficulty || 'beginner'}\n\nStudent's question:\n${question}`;
    const result = await chatCompletion(contextPrompt, userMessage);

    res.json({
      response: result.response || '',
      followUpQuestion: result.followUpQuestion || '',
      relatedConcepts: result.relatedConcepts || [],
      encouragement: result.encouragement || '',
    });
  } catch (error) {
    console.error('Discussion error:', error);
    res.status(500).json({ error: 'Failed to process discussion', message: error.message });
  }
});

module.exports = router;
