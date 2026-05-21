/**
 * Product Service API integration tests.
 * Tests all CRUD endpoints with validation, error handling, and edge cases.
 * Uses mocked Sequelize models for isolated, fast test execution.
 */
const request = require('supertest');

// In-memory product store used by mocked model methods (prefixed with "mock" for Jest)
let mockProductStore = [];

// Simple UUID generator for test isolation (avoids external dependency in mock scope)
const mockUuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Mock the database config to avoid real PostgreSQL connection
jest.mock('../src/config/database', () => ({
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(true),
    sync: jest.fn().mockResolvedValue(true),
    define: jest.fn(),
  },
  connectDatabase: jest.fn().mockResolvedValue(true),
}));

// Mock the Product model with in-memory CRUD operations
jest.mock('../src/models/Product', () => {
  const mockProduct = {
    // Simulates Sequelize findAndCountAll with filtering/pagination
    findAndCountAll: jest.fn(async ({ where = {}, limit = 10, offset = 0, order = [] }) => {
      let filtered = [...mockProductStore].filter((p) => {
        if (where.isActive !== undefined && p.isActive !== where.isActive) return false;
        if (where.category && p.category !== where.category) return false;
        if (where.price) {
          const price = parseFloat(p.price);
          const gteKey = Symbol.for('gte');
          const lteKey = Symbol.for('lte');
          if (where.price[gteKey] !== undefined && price < where.price[gteKey]) return false;
          if (where.price[lteKey] !== undefined && price > where.price[lteKey]) return false;
        }
        // Handle Op.or for search
        const orKey = Symbol.for('or');
        if (where[orKey]) {
          const searchConditions = where[orKey];
          const nameCondition = searchConditions.find((c) => c.name);
          if (nameCondition) {
            const iLikeKey = Symbol.for('iLike');
            const searchTerm = nameCondition.name[iLikeKey];
            if (searchTerm) {
              const term = searchTerm.replace(/%/g, '').toLowerCase();
              if (!p.name.toLowerCase().includes(term) &&
                  !(p.description && p.description.toLowerCase().includes(term))) {
                return false;
              }
            }
          }
        }
        return true;
      });

      // Apply sorting
      if (order.length > 0) {
        const [sortField, sortDir] = order[0];
        filtered.sort((a, b) => {
          const valA = a[sortField];
          const valB = b[sortField];
          const cmp = typeof valA === 'string' ? valA.localeCompare(valB) : valA - valB;
          return sortDir === 'DESC' ? -cmp : cmp;
        });
      }

      const rows = filtered.slice(offset, offset + limit);
      return { rows, count: filtered.length };
    }),

    // Simulates Sequelize findByPk
    findByPk: jest.fn(async (id) => {
      const product = mockProductStore.find((p) => p.id === id);
      if (!product) return null;
      return {
        ...product,
        update: jest.fn(async (updates) => {
          Object.assign(product, updates);
          return product;
        }),
        destroy: jest.fn(async () => {
          mockProductStore = mockProductStore.filter((p) => p.id !== id);
        }),
        toJSON: () => ({ ...product }),
      };
    }),

    // Simulates Sequelize create
    create: jest.fn(async (data) => {
      const existing = mockProductStore.find((p) => p.sku === data.sku);
      if (existing) {
        const error = new Error('Validation error');
        error.name = 'SequelizeUniqueConstraintError';
        throw error;
      }
      const product = {
        id: mockUuidv4(),
        ...data,
        quantity: data.quantity || 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockProductStore.push(product);
      return { ...product, toJSON: () => ({ ...product }) };
    }),

    // Simulates Sequelize findAll for categories query
    findAll: jest.fn(async ({ attributes }) => {
      if (attributes && attributes.includes('category')) {
        const categories = [...new Set(
          mockProductStore
            .filter((p) => p.isActive)
            .map((p) => p.category),
        )].sort();
        return categories.map((c) => ({ category: c }));
      }
      return mockProductStore.filter((p) => p.isActive);
    }),

    // Simulates Sequelize destroy for table truncation
    destroy: jest.fn(async () => {
      mockProductStore = [];
    }),
  };

  return mockProduct;
});

// Mock the logger to suppress console output during tests
jest.mock('../src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Import the app after mocks are set up
const { app } = require('../src/index');

// Clear the in-memory store between tests for isolation
beforeEach(() => {
  mockProductStore = [];
});

// Sample product data for test fixtures
const sampleProduct = {
  name: 'Test Widget',
  description: 'A high-quality test widget for unit testing',
  price: 29.99,
  sku: 'TEST-WIDGET-001',
  category: 'Electronics',
  quantity: 100,
};

const secondProduct = {
  name: 'Premium Gadget',
  description: 'A premium gadget for advanced testing',
  price: 59.99,
  sku: 'PREM-GADGET-001',
  category: 'Electronics',
  quantity: 50,
};

const thirdProduct = {
  name: 'Basic Tool',
  description: 'A basic tool for everyday use',
  price: 9.99,
  sku: 'BASIC-TOOL-001',
  category: 'Tools',
  quantity: 200,
};

// ============================================
// Health Check Tests
// ============================================
describe('Health Check', () => {
  test('GET /health should return service status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('product-service');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
  });
});

// ============================================
// POST /api/products - Create Product Tests
// ============================================
describe('POST /api/products', () => {
  test('should create a new product with valid data', async () => {
    const res = await request(app)
      .post('/api/products')
      .send(sampleProduct);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(sampleProduct.name);
    expect(res.body.data.sku).toBe(sampleProduct.sku);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('createdAt');
  });

  test('should reject creation with missing required fields', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: 'Incomplete Product' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('should reject creation with invalid price', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ ...sampleProduct, price: -10, sku: 'NEG-PRICE-001' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('should reject creation with duplicate SKU', async () => {
    await request(app).post('/api/products').send(sampleProduct);
    const res = await request(app)
      .post('/api/products')
      .send({ ...sampleProduct, name: 'Duplicate SKU Product' });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('SKU already exists');
  });

  test('should reject creation with empty name', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ ...sampleProduct, name: '', sku: 'EMPTY-NAME-001' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// GET /api/products - List Products Tests
// ============================================
describe('GET /api/products', () => {
  beforeEach(async () => {
    await request(app).post('/api/products').send(sampleProduct);
    await request(app).post('/api/products').send(secondProduct);
    await request(app).post('/api/products').send(thirdProduct);
  });

  test('should return paginated list of products', async () => {
    const res = await request(app).get('/api/products');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.pagination).toHaveProperty('total', 3);
    expect(res.body.pagination).toHaveProperty('page', 1);
    expect(res.body.pagination).toHaveProperty('totalPages');
  });

  test('should support pagination with page and limit', async () => {
    const res = await request(app).get('/api/products?page=1&limit=2');

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.totalPages).toBe(2);
  });

  test('should filter products by category', async () => {
    const res = await request(app).get('/api/products?category=Tools');

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].category).toBe('Tools');
  });

  test('should search products by name', async () => {
    const res = await request(app).get('/api/products?search=Widget');

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].name).toContain('Widget');
  });

  test('should sort products by price ascending', async () => {
    const res = await request(app).get('/api/products?sortBy=price&order=ASC');

    expect(res.statusCode).toBe(200);
    const prices = res.body.data.map((p) => parseFloat(p.price));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});

// ============================================
// GET /api/products/:id - Get Product Tests
// ============================================
describe('GET /api/products/:id', () => {
  test('should return a product by valid ID', async () => {
    const createRes = await request(app)
      .post('/api/products')
      .send(sampleProduct);
    const productId = createRes.body.data.id;

    const res = await request(app).get(`/api/products/${productId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(productId);
    expect(res.body.data.name).toBe(sampleProduct.name);
  });

  test('should return 404 for non-existent product ID', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000000';
    const res = await request(app).get(`/api/products/${fakeId}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Product not found');
  });

  test('should return 400 for invalid UUID format', async () => {
    const res = await request(app).get('/api/products/invalid-id');

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// PUT /api/products/:id - Update Product Tests
// ============================================
describe('PUT /api/products/:id', () => {
  test('should update a product with valid data', async () => {
    const createRes = await request(app)
      .post('/api/products')
      .send(sampleProduct);
    const productId = createRes.body.data.id;

    const res = await request(app)
      .put(`/api/products/${productId}`)
      .send({ name: 'Updated Widget', price: 39.99 });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated Widget');
  });

  test('should return 404 when updating non-existent product', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000000';
    const res = await request(app)
      .put(`/api/products/${fakeId}`)
      .send({ name: 'Ghost Product' });

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('should reject update with invalid price', async () => {
    const createRes = await request(app)
      .post('/api/products')
      .send(sampleProduct);
    const productId = createRes.body.data.id;

    const res = await request(app)
      .put(`/api/products/${productId}`)
      .send({ price: -5 });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// DELETE /api/products/:id - Delete Product Tests
// ============================================
describe('DELETE /api/products/:id', () => {
  test('should delete an existing product', async () => {
    const createRes = await request(app)
      .post('/api/products')
      .send(sampleProduct);
    const productId = createRes.body.data.id;

    const res = await request(app).delete(`/api/products/${productId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Product deleted successfully');

    // Verify the product no longer exists
    const getRes = await request(app).get(`/api/products/${productId}`);
    expect(getRes.statusCode).toBe(404);
  });

  test('should return 404 when deleting non-existent product', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000000';
    const res = await request(app).delete(`/api/products/${fakeId}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// GET /api/products/categories - Category Tests
// ============================================
describe('GET /api/products/categories', () => {
  test('should return distinct product categories', async () => {
    await request(app).post('/api/products').send(sampleProduct);
    await request(app).post('/api/products').send(thirdProduct);

    const res = await request(app).get('/api/products/categories');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toContain('Electronics');
    expect(res.body.data).toContain('Tools');
  });

  test('should return empty array when no products exist', async () => {
    const res = await request(app).get('/api/products/categories');

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

// ============================================
// 404 Route Tests
// ============================================
describe('404 Routes', () => {
  test('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown');

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
