/**
 * Database configuration module.
 * Sets up Sequelize ORM connection to PostgreSQL with environment-based settings.
 */
const { Sequelize } = require('sequelize');
const logger = require('./logger');

// Database connection configuration sourced from environment variables
const sequelize = new Sequelize(
  process.env.DB_NAME || 'product_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg),
    pool: {
      max: 10,       // Maximum number of connections in pool
      min: 2,        // Minimum number of connections in pool
      acquire: 30000, // Max time (ms) to acquire a connection before throwing error
      idle: 10000,   // Max time (ms) a connection can be idle before being released
    },
    define: {
      timestamps: true,    // Automatically add createdAt and updatedAt fields
      underscored: true,   // Use snake_case for auto-generated fields
    },
  },
);

/**
 * Tests the database connection and syncs models.
 * Creates tables if they do not exist (alter: false in production).
 */
const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    logger.info('PostgreSQL database connection established successfully');

    // Sync models - creates tables if they don't exist
    const syncOptions = process.env.NODE_ENV === 'production'
      ? { alter: false }
      : { alter: true };
    await sequelize.sync(syncOptions);
    logger.info('Database models synchronized');
  } catch (error) {
    logger.error('Unable to connect to PostgreSQL database:', error.message);
    throw error;
  }
};

module.exports = { sequelize, connectDatabase };
