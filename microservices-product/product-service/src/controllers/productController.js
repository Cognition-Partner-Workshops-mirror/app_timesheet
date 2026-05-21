/**
 * Product controller - handles HTTP request/response logic for product operations.
 * Delegates business logic to the Product model and returns standardized JSON responses.
 */
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const Product = require('../models/Product');
const logger = require('../config/logger');

/**
 * GET /products
 * List products with pagination, filtering, search, and sorting.
 */
const getAllProducts = async (req, res, next) => {
  try {
    // Extract and parse query parameters with defaults
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const { category, minPrice, maxPrice, search, sortBy, order } = req.query;

    // Build dynamic filter conditions
    const where = { isActive: true };

    if (category) {
      where.category = category;
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }
    // Search across name and description fields
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Build sort order - defaults to newest first
    const orderClause = [];
    if (sortBy) {
      orderClause.push([sortBy, (order || 'ASC').toUpperCase()]);
    } else {
      orderClause.push(['createdAt', 'DESC']);
    }

    const { rows: products, count: total } = await Product.findAndCountAll({
      where,
      limit,
      offset,
      order: orderClause,
    });

    logger.info(`Fetched ${products.length} products (page ${page})`);

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /products/:id
 * Retrieve a single product by its UUID.
 */
const getProductById = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const product = await Product.findByPk(req.params.id);

    if (!product) {
      logger.warn(`Product not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    logger.info(`Fetched product: ${product.id}`);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /products
 * Create a new product in the catalog.
 */
const createProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, description, price, sku, category, quantity, imageUrl, isActive } = req.body;

    const product = await Product.create({
      name,
      description,
      price,
      sku,
      category,
      quantity: quantity || 0,
      imageUrl,
      isActive: isActive !== undefined ? isActive : true,
    });

    logger.info(`Created product: ${product.id} (${product.name})`);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    // Handle unique constraint violation for SKU
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'A product with this SKU already exists',
      });
    }
    next(error);
  }
};

/**
 * PUT /products/:id
 * Update an existing product by its UUID (partial updates supported).
 */
const updateProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const product = await Product.findByPk(req.params.id);

    if (!product) {
      logger.warn(`Product not found for update: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Only update fields that are provided in the request body
    const allowedFields = ['name', 'description', 'price', 'sku', 'category', 'quantity', 'imageUrl', 'isActive'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    await product.update(updates);

    logger.info(`Updated product: ${product.id}`);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    // Handle unique constraint violation for SKU during update
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'A product with this SKU already exists',
      });
    }
    next(error);
  }
};

/**
 * DELETE /products/:id
 * Remove a product by its UUID (hard delete).
 */
const deleteProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const product = await Product.findByPk(req.params.id);

    if (!product) {
      logger.warn(`Product not found for deletion: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    await product.destroy();

    logger.info(`Deleted product: ${req.params.id}`);

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /products/categories
 * Retrieve a list of all distinct product categories.
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await Product.findAll({
      attributes: ['category'],
      where: { isActive: true },
      group: ['category'],
      order: [['category', 'ASC']],
      raw: true,
    });

    const categoryList = categories.map((c) => c.category);

    logger.info(`Fetched ${categoryList.length} categories`);

    res.json({
      success: true,
      data: categoryList,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
};
