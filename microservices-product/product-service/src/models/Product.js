/**
 * Product model definition.
 * Represents a product in the catalog with pricing, inventory, and categorization.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  // UUID primary key for distributed-friendly unique identification
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
    comment: 'Unique product identifier (UUID v4)',
  },
  // Product name - required, must be between 2 and 255 characters
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Product name cannot be empty' },
      len: { args: [2, 255], msg: 'Product name must be between 2 and 255 characters' },
    },
    comment: 'Display name of the product',
  },
  // Detailed product description (optional)
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Detailed product description',
  },
  // Product price - must be non-negative with 2 decimal places
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Price must be a non-negative number' },
    },
    comment: 'Product price in base currency',
  },
  // SKU (Stock Keeping Unit) - unique identifier for inventory tracking
  sku: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: { msg: 'SKU must be unique' },
    validate: {
      notEmpty: { msg: 'SKU cannot be empty' },
    },
    comment: 'Stock Keeping Unit - unique inventory identifier',
  },
  // Product category for catalog organization
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Category cannot be empty' },
    },
    comment: 'Product category for catalog organization',
  },
  // Available stock quantity
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Quantity must be a non-negative integer' },
    },
    comment: 'Available stock quantity',
  },
  // Product image URL (optional)
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: { msg: 'Image URL must be a valid URL' },
    },
    comment: 'URL to the product image',
  },
  // Product active/inactive status for soft-delete pattern
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether the product is active and visible in the catalog',
  },
}, {
  tableName: 'products',
  timestamps: true,       // Adds createdAt and updatedAt columns
  underscored: true,      // Uses snake_case column names (e.g., created_at)
  paranoid: false,         // No soft-delete via deletedAt (using isActive flag instead)
  indexes: [
    { fields: ['category'] },   // Index for category-based queries
    { fields: ['sku'], unique: true },  // Unique index on SKU
    { fields: ['is_active'] },  // Index for active product filtering
    { fields: ['price'] },      // Index for price range queries
  ],
});

module.exports = Product;
