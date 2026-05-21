/**
 * Product routes definition.
 * Maps HTTP endpoints to controller actions with request validation middleware.
 */
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const {
  createProductRules,
  updateProductRules,
  productIdRule,
  listProductsRules,
} = require('../validators/productValidator');

// GET /api/products/categories - list all distinct categories (must be before /:id route)
router.get('/categories', productController.getCategories);

// GET /api/products - list products with filtering, pagination, and sorting
router.get('/', listProductsRules, productController.getAllProducts);

// GET /api/products/:id - get a single product by UUID
router.get('/:id', productIdRule, productController.getProductById);

// POST /api/products - create a new product
router.post('/', createProductRules, productController.createProduct);

// PUT /api/products/:id - update an existing product
router.put('/:id', updateProductRules, productController.updateProduct);

// DELETE /api/products/:id - delete a product
router.delete('/:id', productIdRule, productController.deleteProduct);

module.exports = router;
