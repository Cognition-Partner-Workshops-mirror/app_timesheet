const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');
const fileRoutes = require('../../routes/files');
const { getDatabase } = require('../../database/init');

jest.mock('../../database/init');
jest.mock('../../middleware/auth', () => ({
  authenticateUser: (req, res, next) => {
    req.userEmail = 'test@example.com';
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/api/files', fileRoutes);
// Add error handler for multer and general errors
app.use((err, req, res, next) => {
  if (err.message && err.message.includes('File type')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

describe('File Routes', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      all: jest.fn(),
      get: jest.fn(),
      run: jest.fn()
    };
    getDatabase.mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/files', () => {
    test('should return all files for authenticated user', async () => {
      const mockFiles = [
        { id: 1, original_name: 'test.pdf', file_name: '123-test.pdf', file_size: 1024, mime_type: 'application/pdf', category: 'Documents', description: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 2, original_name: 'image.png', file_name: '456-image.png', file_size: 2048, mime_type: 'image/png', category: 'Images', description: 'A test image', created_at: '2024-01-02', updated_at: '2024-01-02' }
      ];

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockFiles);
      });

      const response = await request(app).get('/api/files');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ files: mockFiles });
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, original_name'),
        ['test@example.com'],
        expect.any(Function)
      );
    });

    test('should filter files by search term', async () => {
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, []);
      });

      const response = await request(app).get('/api/files?search=test');

      expect(response.status).toBe(200);
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('original_name LIKE'),
        ['test@example.com', '%test%', '%test%'],
        expect.any(Function)
      );
    });

    test('should filter files by category', async () => {
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, []);
      });

      const response = await request(app).get('/api/files?category=Documents');

      expect(response.status).toBe(200);
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('category = ?'),
        ['test@example.com', 'Documents'],
        expect.any(Function)
      );
    });

    test('should handle database errors', async () => {
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(new Error('DB error'), null);
      });

      const response = await request(app).get('/api/files');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });
  });

  describe('GET /api/files/categories', () => {
    test('should return all categories for the user', async () => {
      const mockCategories = [{ category: 'Documents' }, { category: 'Images' }];

      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, mockCategories);
      });

      const response = await request(app).get('/api/files/categories');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ categories: ['Documents', 'Images'] });
    });

    test('should handle database errors', async () => {
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(new Error('DB error'), null);
      });

      const response = await request(app).get('/api/files/categories');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });
  });

  describe('GET /api/files/:id', () => {
    test('should return a specific file metadata', async () => {
      const mockFile = { id: 1, original_name: 'test.pdf', file_name: '123-test.pdf', file_size: 1024, mime_type: 'application/pdf', category: 'Documents', description: null, created_at: '2024-01-01', updated_at: '2024-01-01' };

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockFile);
      });

      const response = await request(app).get('/api/files/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ file: mockFile });
    });

    test('should return 404 if file not found', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      const response = await request(app).get('/api/files/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'File not found' });
    });

    test('should return 400 for invalid file ID', async () => {
      const response = await request(app).get('/api/files/abc');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid file ID' });
    });

    test('should handle database errors', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(new Error('DB error'), null);
      });

      const response = await request(app).get('/api/files/1');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });
  });

  describe('PUT /api/files/:id', () => {
    test('should update file metadata', async () => {
      const updatedFile = { id: 1, original_name: 'renamed.pdf', file_name: '123-test.pdf', file_size: 1024, mime_type: 'application/pdf', category: 'Reports', description: 'Updated', created_at: '2024-01-01', updated_at: '2024-01-02' };

      // First call checks ownership, second returns updated file
      mockDb.get
        .mockImplementationOnce((query, params, callback) => {
          callback(null, { id: 1 });
        })
        .mockImplementationOnce((query, params, callback) => {
          callback(null, updatedFile);
        });

      mockDb.run.mockImplementation((query, params, callback) => {
        callback.call({ changes: 1 }, null);
      });

      const response = await request(app)
        .put('/api/files/1')
        .send({ category: 'Reports', description: 'Updated', original_name: 'renamed.pdf' });

      expect(response.status).toBe(200);
      expect(response.body.file).toEqual(updatedFile);
    });

    test('should return 404 if file not found', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .put('/api/files/999')
        .send({ category: 'Reports' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'File not found' });
    });

    test('should return 400 if no fields provided', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { id: 1 });
      });

      const response = await request(app)
        .put('/api/files/1')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'No fields to update' });
    });

    test('should return 400 for invalid file ID', async () => {
      const response = await request(app)
        .put('/api/files/abc')
        .send({ category: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid file ID' });
    });
  });

  describe('DELETE /api/files/:id', () => {
    test('should delete a file', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { file_name: '123-test.pdf' });
      });

      mockDb.run.mockImplementation((query, params, callback) => {
        callback.call({ changes: 1 }, null);
      });

      // Mock fs.existsSync and fs.unlinkSync
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      const response = await request(app).delete('/api/files/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'File deleted successfully' });

      fs.existsSync.mockRestore();
      fs.unlinkSync.mockRestore();
    });

    test('should return 404 if file not found', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      const response = await request(app).delete('/api/files/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'File not found' });
    });

    test('should return 400 for invalid file ID', async () => {
      const response = await request(app).delete('/api/files/abc');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid file ID' });
    });
  });

  describe('DELETE /api/files', () => {
    test('should delete all files for the user', async () => {
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(null, [{ file_name: '123-test.pdf' }, { file_name: '456-image.png' }]);
      });

      mockDb.run.mockImplementation((query, params, callback) => {
        callback.call({ changes: 2 }, null);
      });

      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      const response = await request(app).delete('/api/files');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'All files deleted successfully', deletedCount: 2 });

      fs.existsSync.mockRestore();
      fs.unlinkSync.mockRestore();
    });

    test('should handle database errors', async () => {
      mockDb.all.mockImplementation((query, params, callback) => {
        callback(new Error('DB error'), null);
      });

      const response = await request(app).delete('/api/files');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });
  });

  describe('POST /api/files (upload)', () => {
    test('should return 400 if no file is provided', async () => {
      const response = await request(app)
        .post('/api/files')
        .field('category', 'Test');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'No file uploaded' });
    });

    test('should upload a file successfully', async () => {
      const mockFileRecord = {
        id: 1,
        original_name: 'test.pdf',
        file_name: '123-test.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        category: 'Documents',
        description: 'Test file',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      mockDb.run.mockImplementation(function(query, params, callback) {
        callback.call({ lastID: 1 }, null);
      });

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, mockFileRecord);
      });

      // Create a temporary test PDF file
      const testFilePath = path.join(__dirname, 'test-upload.pdf');
      fs.writeFileSync(testFilePath, 'fake pdf content');

      const response = await request(app)
        .post('/api/files')
        .attach('file', testFilePath)
        .field('category', 'Documents')
        .field('description', 'Test file');

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('File uploaded successfully');
      expect(response.body.file).toEqual(mockFileRecord);

      // Clean up test file
      fs.unlinkSync(testFilePath);
    });
  });
});
