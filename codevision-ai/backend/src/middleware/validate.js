/**
 * Request validation middleware using Joi schemas.
 * Validates request body against provided schema and returns
 * 400 with detailed error messages on validation failure.
 */
const Joi = require('joi');

// Supported programming languages
const SUPPORTED_LANGUAGES = ['python', 'javascript', 'java', 'cpp'];

// Supported difficulty levels
const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'];

/**
 * Creates Express middleware that validates req.body against the given Joi schema.
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message);
      return res.status(400).json({ error: 'Validation error', details: messages });
    }
    req.body = value;
    next();
  };
}

// Common schema building blocks for reuse across routes
const codeSchema = Joi.object({
  code: Joi.string().required().max(50000),
  language: Joi.string().valid(...SUPPORTED_LANGUAGES).default('python'),
  difficulty: Joi.string().valid(...DIFFICULTY_LEVELS).default('beginner')
});

const problemSchema = Joi.object({
  problem: Joi.string().required().max(10000),
  language: Joi.string().valid(...SUPPORTED_LANGUAGES).default('python'),
  difficulty: Joi.string().valid(...DIFFICULTY_LEVELS).default('beginner')
});

const animationSchema = Joi.object({
  code: Joi.string().max(50000),
  algorithmType: Joi.string().required(),
  inputData: Joi.alternatives().try(Joi.array(), Joi.string(), Joi.object()).optional(),
  language: Joi.string().valid(...SUPPORTED_LANGUAGES).default('python'),
  difficulty: Joi.string().valid(...DIFFICULTY_LEVELS).default('beginner')
});

const playgroundSchema = Joi.object({
  dataStructure: Joi.string().required().valid(
    'array', 'string', 'linkedList', 'stack', 'queue',
    'hashMap', 'tree', 'graph', 'heap'
  ),
  operation: Joi.string().required(),
  params: Joi.object().optional(),
  language: Joi.string().valid(...SUPPORTED_LANGUAGES).default('python'),
  difficulty: Joi.string().valid(...DIFFICULTY_LEVELS).default('beginner')
});

module.exports = {
  validate,
  codeSchema,
  problemSchema,
  animationSchema,
  playgroundSchema,
  SUPPORTED_LANGUAGES,
  DIFFICULTY_LEVELS
};
