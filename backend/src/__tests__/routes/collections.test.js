const request = require('supertest');
const express = require('express');
const { getDatabase } = require('../../database/init');

jest.mock('../../database/init');
// Mock auth middleware so it just injects userEmail without DB calls
jest.mock('../../middleware/auth', () => ({
  authenticateUser: (req, res, next) => {
    req.userEmail = req.headers['x-user-email'] || 'test@example.com';
    next();
  }
}));

const collectionsRoutes = require('../../routes/collections');

const app = express();
app.use(express.json());
app.use('/api/collections', collectionsRoutes);

describe('Collections Routes – Digital Library', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      get: jest.fn(),
      all: jest.fn(),
      run: jest.fn()
    };
    getDatabase.mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/collections', () => {
    test('should return all collections for the user', async () => {
      const collections = [
        { id: 1, name: 'Work', color: '#6366f1', file_count: 5 },
        { id: 2, name: 'Personal', color: '#22c55e', file_count: 3 }
      ];

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, collections);
      });

      const response = await request(app)
        .get('/api/collections')
        .set('x-user-email', 'test@example.com');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Work');
    });

    test('should handle database error', async () => {
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(new Error('DB error'), null);
      });

      const response = await request(app)
        .get('/api/collections')
        .set('x-user-email', 'test@example.com');

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/collections', () => {
    test('should create a new collection', async () => {
      mockDb.run.mockImplementation(function(query, params, callback) {
        callback.call({ lastID: 1 }, null);
      });

      const response = await request(app)
        .post('/api/collections')
        .set('x-user-email', 'test@example.com')
        .send({ name: 'My Collection', description: 'Test description', color: '#ef4444' });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('My Collection');
      expect(response.body.color).toBe('#ef4444');
    });

    test('should return 400 for missing name', async () => {
      const response = await request(app)
        .post('/api/collections')
        .set('x-user-email', 'test@example.com')
        .send({ description: 'No name provided' });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/collections/:id', () => {
    test('should update a collection', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { id: 1 });
      });

      mockDb.run.mockImplementation(function(query, params, callback) {
        callback.call({ changes: 1 }, null);
      });

      const response = await request(app)
        .put('/api/collections/1')
        .set('x-user-email', 'test@example.com')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Collection updated successfully');
    });

    test('should return 404 for non-existent collection', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .put('/api/collections/999')
        .set('x-user-email', 'test@example.com')
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/collections/:id', () => {
    test('should delete a collection', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { id: 1 });
      });

      mockDb.run.mockImplementation(function(query, params, callback) {
        callback.call({ changes: 1 }, null);
      });

      const response = await request(app)
        .delete('/api/collections/1')
        .set('x-user-email', 'test@example.com');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Collection deleted successfully');
    });

    test('should return 404 for non-existent collection', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .delete('/api/collections/999')
        .set('x-user-email', 'test@example.com');

      expect(response.status).toBe(404);
    });
  });
});
