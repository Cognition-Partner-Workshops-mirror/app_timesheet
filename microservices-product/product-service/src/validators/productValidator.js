/**
 * Request validation rules for product endpoints.
 * Uses express-validator to validate and sanitize incoming request data.
 */
const { body, param, query } = require('express-validator');

// Validation rules for creating a new product
const createProductRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Product name must be between 2 and 255 characters'),

  body('description')
    .optional()
    .trim()
    .isString().withMessage('Description must be a string'),

  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),

  body('sku')
    .trim()
    .notEmpty().withMessage('SKU is required')
    .isLength({ max: 100 }).withMessage('SKU must not exceed 100 characters'),

  body('category')
    .trim()
    .notEmpty().withMessage('Category is required')
    .isLength({ max: 100 }).withMessage('Category must not exceed 100 characters'),

  body('quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),

  body('imageUrl')
    .optional()
    .trim()
    .isURL().withMessage('Image URL must be a valid URL'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean value'),
];

// Validation rules for updating an existing product (all fields optional)
const updateProductRules = [
  param('id')
    .isUUID(4).withMessage('Product ID must be a valid UUID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 }).withMessage('Product name must be between 2 and 255 characters'),

  body('description')
    .optional()
    .trim()
    .isString().withMessage('Description must be a string'),

  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),

  body('sku')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('SKU must not exceed 100 characters'),

  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Category must not exceed 100 characters'),

  body('quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),

  body('imageUrl')
    .optional()
    .trim()
    .isURL().withMessage('Image URL must be a valid URL'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean value'),
];

// Validation rule for product ID path parameter
const productIdRule = [
  param('id')
    .isUUID(4).withMessage('Product ID must be a valid UUID'),
];

// Validation rules for listing/searching products with pagination and filters
const listProductsRules = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('category')
    .optional()
    .trim()
    .isString().withMessage('Category must be a string'),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Minimum price must be a non-negative number'),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Maximum price must be a non-negative number'),

  query('search')
    .optional()
    .trim()
    .isString().withMessage('Search term must be a string'),

  query('sortBy')
    .optional()
    .isIn(['name', 'price', 'category', 'createdAt', 'quantity'])
    .withMessage('sortBy must be one of: name, price, category, createdAt, quantity'),

  query('order')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('Order must be ASC or DESC'),
];

module.exports = {
  createProductRules,
  updateProductRules,
  productIdRule,
  listProductsRules,
};
