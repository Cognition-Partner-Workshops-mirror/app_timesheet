const Joi = require('joi');

/**
 * Validation schema for creating a new collection.
 */
const createCollectionSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required()
    .messages({ 'string.empty': 'Collection name is required' }),
  description: Joi.string().trim().max(500).allow('').default(''),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#6366f1')
    .messages({ 'string.pattern.base': 'Color must be a valid hex color (e.g., #6366f1)' }),
  icon: Joi.string().trim().max(50).default('folder')
});

/**
 * Validation schema for updating an existing collection.
 */
const updateCollectionSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  description: Joi.string().trim().max(500).allow(''),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
  icon: Joi.string().trim().max(50)
}).min(1).messages({ 'object.min': 'At least one field must be provided for update' });

/**
 * Validation schema for updating file metadata.
 */
const updateFileSchema = Joi.object({
  original_name: Joi.string().trim().min(1).max(255),
  collection_id: Joi.number().integer().positive().allow(null),
  is_favorite: Joi.boolean(),
  notes: Joi.string().trim().max(2000).allow(''),
  tags: Joi.array().items(Joi.string().trim().min(1).max(50)).max(20)
}).min(1).messages({ 'object.min': 'At least one field must be provided for update' });

/**
 * Validation schema for file listing query parameters.
 */
const fileQuerySchema = Joi.object({
  sort_by: Joi.string().valid('name', 'date', 'size', 'type').default('date'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc'),
  file_type: Joi.string().valid('all', 'image', 'pdf', 'ebook', 'document').default('all'),
  collection_id: Joi.number().integer().positive().allow(null),
  favorites_only: Joi.boolean().default(false),
  search: Joi.string().trim().max(200).allow(''),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

module.exports = {
  createCollectionSchema,
  updateCollectionSchema,
  updateFileSchema,
  fileQuerySchema
};
