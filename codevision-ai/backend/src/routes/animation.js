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
const { generateLocalAnimation, analyzeCodeForDS } = require('../services/animationEngine');

/**
 * Extract numeric array from code (e.g. [64, 34, 25, 12]).
 * Falls back to a default array if none found.
 */
function extractInputFromCode(code) {
  if (!code) return undefined;
  const match = code.match(/\[(\s*\d+\s*(?:,\s*\d+\s*)*)\]/);
  if (match) {
    return match[1].split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
  }
  return undefined;
}

/**
 * Detect algorithm type from code using the universal code analyzer.
 * First tries the AI-powered pattern matching from codeAnalyzer, then
 * falls back to keyword-based heuristics for edge cases.
 * Returns a local engine key (e.g. 'bubble_sort', 'bfs', 'dp_fibonacci').
 */
function detectAlgorithmFromCode(code) {
  // Use the universal code analyzer for comprehensive detection
  const analysis = analyzeCodeForDS(code);
  if (analysis.algorithm && analysis.algorithm.key && analysis.algorithm.confidence >= 1) {
    // Map analyzer keys to ALGORITHM_MAP keys where they differ
    const keyMap = {
      dp: 'dp_fibonacci',
      postorder_traversal: 'preorder_traversal', // fallback until postorder is implemented
    };
    return keyMap[analysis.algorithm.key] || analysis.algorithm.key;
  }

  // Fallback: keyword-based heuristics for cases the analyzer might miss
  const lower = code.toLowerCase();
  if (lower.includes('bubble') || (lower.includes('swap') && lower.includes('for') && lower.includes('> arr'))) return 'bubble_sort';
  if (lower.includes('selection') || (lower.includes('min') && lower.includes('for') && lower.includes('swap'))) return 'selection_sort';
  if (lower.includes('insertion') || (lower.includes('key') && lower.includes('while') && lower.includes('> key'))) return 'insertion_sort';
  if (lower.includes('merge_sort') || lower.includes('mergesort') || (lower.includes('merge') && lower.includes('left') && lower.includes('right'))) return 'merge_sort';
  if (lower.includes('quick_sort') || lower.includes('quicksort') || (lower.includes('pivot') && lower.includes('partition'))) return 'quick_sort';
  if (lower.includes('binary_search') || lower.includes('binarysearch') || (lower.includes('mid') && lower.includes('left') && lower.includes('right') && !lower.includes('merge'))) return 'binary_search';
  if (lower.includes('linear_search') || lower.includes('linearsearch')) return 'linear_search';
  // Linked list reversal
  if ((lower.includes('listnode') || lower.includes('linkedlist') || lower.includes('linked_list')) &&
      (lower.includes('reverse') || (lower.includes('prev') && lower.includes('curr') && lower.includes('next')))) return 'linked_list_reversal';
  if (lower.includes('listnode') && lower.includes('prev') && lower.includes('.next') && lower.includes('while')) return 'linked_list_reversal';
  // BFS / DFS detection
  if ((lower.includes('queue') || lower.includes('poll') || lower.includes('offer')) && lower.includes('visited')) return 'bfs';
  if ((lower.includes('stack') && lower.includes('visited')) || (lower.includes('dfs') && !lower.includes('bfs'))) return 'dfs';
  // DP detection
  if (lower.includes('dp[') || lower.includes('memo[') || lower.includes('fibonacci') || lower.includes('fib(')) return 'dp_fibonacci';
  // Two pointer
  if ((lower.includes('left') && lower.includes('right') && lower.includes('while') && lower.includes('left') && lower.includes('<') && lower.includes('right')) && !lower.includes('merge') && !lower.includes('binary')) return 'two_pointer';
  // Sliding window
  if (lower.includes('window') && (lower.includes('start') || lower.includes('end') || lower.includes('size'))) return 'sliding_window';
  // HashMap / frequency
  if (lower.includes('hashmap') || lower.includes('getordefault') || lower.includes('frequency') || lower.includes('freq')) return 'hashmap_count';
  if ((lower.includes('map') || lower.includes('dict')) && lower.includes('put')) return 'hashmap_count';
  // Set
  if (lower.includes('hashset') || lower.includes('new set') || lower.includes('set()')) return 'set_operations';
  // String operations
  if ((lower.includes('charat') || lower.includes('tochararray') || lower.includes('stringbuilder')) && (lower.includes('reverse') || lower.includes('palindrome'))) return 'string_reverse';
  // Tree traversals
  if ((lower.includes('inorder') || lower.includes('in_order') || lower.includes('in-order')) && (lower.includes('tree') || lower.includes('treenode'))) return 'inorder_traversal';
  if ((lower.includes('preorder') || lower.includes('pre_order') || lower.includes('pre-order')) && (lower.includes('tree') || lower.includes('treenode'))) return 'preorder_traversal';
  if (lower.includes('treenode') && lower.includes('stack') && (lower.includes('.push') || lower.includes('.pop'))) return 'inorder_traversal';
  if (lower.includes('stack') || lower.includes('.push') && lower.includes('.pop')) return 'stack_operations';
  if (lower.includes('queue') || lower.includes('enqueue') || lower.includes('dequeue')) return 'queue_operations';
  if (lower.includes('sort')) return 'bubble_sort';
  return 'auto_detect';
}

/**
 * POST /api/animation/generate
 * Generates algorithm animation steps. Uses local engine for known algorithms
 * (bubble sort, binary search, etc.) and falls back to AI for custom ones.
 */
router.post('/generate', validate(animationSchema), async (req, res) => {
  try {
    const { code, algorithmType: rawType, inputData, language, difficulty } = req.body;

    // Auto-detect algorithm from code when type is 'auto_detect'
    const algorithmType = rawType === 'auto_detect' && code
      ? detectAlgorithmFromCode(code)
      : rawType;

    // Extract input data from code if none provided
    const resolvedInput = inputData || extractInputFromCode(code);

    // Analyze code for detected data structures (included in response)
    const codeAnalysis = code ? analyzeCodeForDS(code) : null;

    // Try local animation engine first — works without OpenAI API key
    const localResult = generateLocalAnimation(algorithmType, resolvedInput);
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

      // Include detected data structures in the response
      return res.json({ id, sessionId, ...localResult, codeAnalysis });
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
