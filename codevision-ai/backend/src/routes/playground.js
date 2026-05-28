/**
 * Data structure playground route.
 * Provides interactive data structure operations with
 * AI-generated explanations and code mapping.
 */
const express = require('express');
const router = express.Router();
const { chatCompletion } = require('../services/openai');
const { DATA_STRUCTURE_PROMPT, VISUAL_TO_CODE_PROMPT } = require('../prompts');
const { validate, playgroundSchema } = require('../middleware/validate');
const Joi = require('joi');

/**
 * POST /api/playground/operate
 * Performs a data structure operation and returns step-by-step
 * animation data with code mapping.
 */
router.post('/operate', validate(playgroundSchema), async (req, res) => {
  try {
    const { dataStructure, operation, params, language, difficulty } = req.body;

    const userMessage = `Data Structure: ${dataStructure}
Operation: ${operation}
Parameters: ${JSON.stringify(params || {})}
Language: ${language}
Difficulty: ${difficulty}

Explain and animate this data structure operation step by step.`;

    const result = await chatCompletion(DATA_STRUCTURE_PROMPT, userMessage);
    res.json(result);
  } catch (error) {
    console.error('Playground operation error:', error);
    res.status(500).json({ error: 'Failed to process operation', message: error.message });
  }
});

// Schema for visual-to-code conversion requests
const visualToCodeSchema = Joi.object({
  blocks: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    type: Joi.string().required(),
    label: Joi.string().required(),
    connections: Joi.array().items(Joi.string()).optional(),
    params: Joi.object().optional()
  })).required(),
  language: Joi.string().valid('python', 'javascript', 'java', 'cpp').default('python')
});

/**
 * POST /api/playground/visual-to-code
 * Converts visual logic blocks (from the Logic Builder) into
 * working source code in the specified language.
 */
router.post('/visual-to-code', validate(visualToCodeSchema), async (req, res) => {
  try {
    const { blocks, language } = req.body;

    const userMessage = `Target Language: ${language}

Visual Logic Blocks:
${JSON.stringify(blocks, null, 2)}

Convert these visual logic blocks into working source code.`;

    const result = await chatCompletion(VISUAL_TO_CODE_PROMPT, userMessage);
    res.json(result);
  } catch (error) {
    console.error('Visual to code error:', error);
    res.status(500).json({ error: 'Failed to convert visual to code', message: error.message });
  }
});

module.exports = router;
