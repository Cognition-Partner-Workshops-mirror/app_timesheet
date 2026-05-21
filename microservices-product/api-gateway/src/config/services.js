/**
 * Microservice registry configuration.
 * Defines backend service URLs and their API path prefixes for proxy routing.
 * Add new microservices here as the architecture grows.
 */
const services = {
  // Product Service - handles product catalog operations
  products: {
    url: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001',
    pathPrefix: '/api/products',
    description: 'Product catalog management service',
  },
  // Future services can be registered here, e.g.:
  // orders: {
  //   url: process.env.ORDER_SERVICE_URL || 'http://localhost:3002',
  //   pathPrefix: '/api/orders',
  //   description: 'Order management service',
  // },
  // inventory: {
  //   url: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003',
  //   pathPrefix: '/api/inventory',
  //   description: 'Inventory tracking service',
  // },
};

module.exports = services;
