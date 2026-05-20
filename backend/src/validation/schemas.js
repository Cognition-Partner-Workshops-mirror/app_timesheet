const Joi = require('joi');

// Validation schemas for all ecommerce API request bodies

// User registration schema
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required()
});

// User login schema
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Product creation/update schema (admin only)
const productSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(2000).allow('', null),
  price: Joi.number().positive().precision(2).required(),
  image_url: Joi.string().uri().allow('', null),
  category_id: Joi.number().integer().positive().allow(null),
  stock_quantity: Joi.number().integer().min(0).default(0),
  featured: Joi.boolean().default(false)
});

// Cart item schema
const cartItemSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().min(1).max(99).required()
});

// Cart item update schema (quantity only)
const cartUpdateSchema = Joi.object({
  quantity: Joi.number().integer().min(1).max(99).required()
});

// Shipping/checkout schema
const checkoutSchema = Joi.object({
  shipping_name: Joi.string().min(2).max(100).required(),
  shipping_address: Joi.string().min(5).max(200).required(),
  shipping_city: Joi.string().min(2).max(100).required(),
  shipping_state: Joi.string().min(2).max(100).required(),
  shipping_zip: Joi.string().min(3).max(20).required(),
  shipping_phone: Joi.string().max(20).allow('', null),
  payment_method: Joi.string().valid('credit_card', 'debit_card', 'paypal').default('credit_card')
});

// Order status update schema (admin only)
const orderStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'processing', 'shipped', 'delivered', 'cancelled').required()
});

module.exports = {
  registerSchema,
  loginSchema,
  productSchema,
  cartItemSchema,
  cartUpdateSchema,
  checkoutSchema,
  orderStatusSchema
};
