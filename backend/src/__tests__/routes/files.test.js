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
// Mock the upload middleware to skip actual disk I/O in tests
jest.mock('../../middleware/upload', () => ({
  upload: {
    array: () => (req, res, next) => {
      // Simulate uploaded files in req.files
      req.files = req.body._mockFiles || [];
      next();
    }
  },
  getFileType: (mimeType) => {
    const map = { 'image/png': 'image', 'application/pdf': 'pdf' };
    return map[mimeType] || 'document';
  },
  uploadsDir: '/tmp/test-uploads'
}));

const fileRoutes = require('../../routes/files');

const app = express();
app.use(express.json());
app.use('/api/files', fileRoutes);

describe('Files Routes – Digital Library', () => {
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

  describe('GET /api/files', () => {
    test('should return paginated file list', async () => {
      // Mock count query
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { total: 2 });
      });

      // Mock files query and tags query
      mockDb.all
        .mockImplementationOnce((query, params, callback) => {
          callback(null, [
            { id: 1, original_name: 'test.pdf', file_type: 'pdf', size: 1024 },
            { id: 2, original_name: 'photo.png', file_type: 'image', size: 2048 }
          ]);
        })
        .mockImplementationOnce((query, params, callback) => {
          callback(null, []);
        });

      const response = await request(app)
        .get('/api/files')
        .set('x-user-email', 'test@example.com');

      expect(response.status).toBe(200);
      expect(response.body.files).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
    });

    test('should handle search parameter', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { total: 0 });
      });

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, []);
      });

      const response = await request(app)
        .get('/api/files?search=test&sort_by=name')
        .set('x-user-email', 'test@example.com');

      expect(response.status).toBe(200);
      expect(response.body.files).toHaveLength(0);
    });
  });

  describe('GET /api/files/stats', () => {
    test('should return library statistics', async () => {
      const stats = {
        total_files: 10,
        total_size: 50000,
        image_count: 5,
        pdf_count: 3,
        ebook_count: 1,
        document_count: 1,
        favorites_count: 2
      };

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, stats);
      });

      const response = await request(app)
        .get('/api/files/stats')
        .set('x-user-email', 'test@example.com');

      expect(response.status).toBe(200);
      expect(response.body.total_files).toBe(10);
      expect(response.body.image_count).toBe(5);
    });
  });

  describe('GET /api/files/:id', () => {
    test('should return file details with tags', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { id: 1, original_name: 'test.pdf', file_type: 'pdf' });
      });

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, [{ id: 1, name: 'important' }]);
      });

      const response = await request(app)
        .get('/api/files/1')
        .set('x-user-email', 'test@example.com');

      expect(response.status).toBe(200);
      expect(response.body.original_name).toBe('test.pdf');
      expect(response.body.tags).toHaveLength(1);
    });

    test('should return 404 for non-existent file', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .get('/api/files/999')
        .set('x-user-email', 'test@example.com');

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/files/:id', () => {
    test('should return 404 for non-existent file', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .delete('/api/files/999')
        .set('x-user-email', 'test@example.com');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/files/:id/favorite', () => {
    test('should toggle favorite status', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { id: 1, is_favorite: 0 });
      });

      mockDb.run.mockImplementation(function(query, params, callback) {
        callback.call({ changes: 1 }, null);
      });

      const response = await request(app)
        .post('/api/files/1/favorite')
        .set('x-user-email', 'test@example.com');

      expect(response.status).toBe(200);
      expect(response.body.is_favorite).toBe(true);
    });

    test('should return 404 for non-existent file', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .post('/api/files/999/favorite')
        .set('x-user-email', 'test@example.com');

      expect(response.status).toBe(404);
    });
  });
});
