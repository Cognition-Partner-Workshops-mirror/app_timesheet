// Mock jwks-rsa before importing routes (ESM compatibility)
jest.mock('jwks-rsa', () => {
  return jest.fn(() => ({
    getSigningKey: jest.fn(),
  }));
});

// Mock jsonwebtoken for Azure AD token validation
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const authRoutes = require('../../routes/auth');
const { getDatabase } = require('../../database/init');
const jwt = require('jsonwebtoken');

jest.mock('../../database/init');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
// Add error handler for Joi validation
app.use((err, req, res, next) => {
  if (err.isJoi) {
    return res.status(400).json({ error: 'Validation error' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

describe('Auth Routes', () => {
  let mockDb;
  const originalEnv = process.env;

  beforeEach(() => {
    mockDb = {
      get: jest.fn(),
      run: jest.fn()
    };
    getDatabase.mockReturnValue(mockDb);

    // Enable email auth by default for legacy login tests
    process.env = { ...originalEnv, ENABLE_EMAIL_AUTH: 'true' };
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env = originalEnv;
  });

  describe('POST /api/auth/login — SSO (Bearer Token)', () => {
    test('should login existing user via SSO token', async () => {
      const existingUser = {
        email: 'sso@example.com',
        created_at: '2024-01-01T00:00:00.000Z'
      };

      jwt.verify.mockImplementation((token, keyFunc, options, callback) => {
        callback(null, { preferred_username: 'sso@example.com' });
      });

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, existingUser);
      });

      const response = await request(app)
        .post('/api/auth/login')
        .set('Authorization', 'Bearer valid-sso-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user.email).toBe('sso@example.com');
    });

    test('should auto-create user on first SSO login', async () => {
      jwt.verify.mockImplementation((token, keyFunc, options, callback) => {
        callback(null, { preferred_username: 'newsso@example.com' });
      });

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null); // User doesn't exist
      });

      mockDb.run.mockImplementation(function(query, params, callback) {
        callback.call(this, null);
      });

      const response = await request(app)
        .post('/api/auth/login')
        .set('Authorization', 'Bearer new-user-token');

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User created and logged in successfully');
      expect(response.body.user.email).toBe('newsso@example.com');
    });

    test('should return 401 for invalid SSO token', async () => {
      jwt.verify.mockImplementation((token, keyFunc, options, callback) => {
        callback(new Error('Invalid token'));
      });

      const response = await request(app)
        .post('/api/auth/login')
        .set('Authorization', 'Bearer bad-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired token');
    });

    test('should return 401 if SSO token has no email claim', async () => {
      jwt.verify.mockImplementation((token, keyFunc, options, callback) => {
        callback(null, { sub: 'some-id' }); // no email
      });

      const response = await request(app)
        .post('/api/auth/login')
        .set('Authorization', 'Bearer no-email-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No email claim found in token');
    });

    test('should handle database error during SSO login', async () => {
      jwt.verify.mockImplementation((token, keyFunc, options, callback) => {
        callback(null, { preferred_username: 'test@example.com' });
      });

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .post('/api/auth/login')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });

    test('should handle database error when creating SSO user', async () => {
      jwt.verify.mockImplementation((token, keyFunc, options, callback) => {
        callback(null, { preferred_username: 'newsso@example.com' });
      });

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      mockDb.run.mockImplementation((query, params, callback) => {
        callback(new Error('Insert failed'));
      });

      const response = await request(app)
        .post('/api/auth/login')
        .set('Authorization', 'Bearer new-user-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to create user' });
    });
  });

  describe('POST /api/auth/login — Legacy Email', () => {
    test('should login existing user', async () => {
      const existingUser = {
        email: 'existing@example.com',
        created_at: '2024-01-01T00:00:00.000Z'
      };

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, existingUser);
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'existing@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user.email).toBe('existing@example.com');
    });

    test('should create new user on first login', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null); // User doesn't exist
      });

      mockDb.run.mockImplementation(function(query, params, callback) {
        callback.call(this, null);
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'newuser@example.com' });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User created and logged in successfully');
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(mockDb.run).toHaveBeenCalledWith(
        'INSERT INTO users (email) VALUES (?)',
        ['newuser@example.com'],
        expect.any(Function)
      );
    });

    test('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    test('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    test('should handle database error when checking user', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });

    test('should handle database error when creating user', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });

      mockDb.run.mockImplementation((query, params, callback) => {
        callback(new Error('Insert failed'));
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'newuser@example.com' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to create user' });
    });

    test('should return 401 when email login is disabled and no Bearer token', async () => {
      process.env.ENABLE_EMAIL_AUTH = 'false';

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Email login is disabled. Use SSO authentication.');
    });

    test('should handle unexpected errors in try-catch block', async () => {
      getDatabase.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });
  });

  describe('GET /api/auth/me', () => {
    test('should return current user info (email auth)', async () => {
      const user = {
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z'
      };

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, user);
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('x-user-email', 'test@example.com');

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.createdAt).toBe('2024-01-01T00:00:00.000Z');
    });

    test('should return current user info (Bearer token)', async () => {
      jwt.verify.mockImplementation((token, keyFunc, options, callback) => {
        callback(null, { preferred_username: 'sso@example.com' });
      });

      const user = {
        email: 'sso@example.com',
        created_at: '2024-01-01T00:00:00.000Z'
      };

      // First call: middleware ensureUserExists; Second call: route handler
      let callCount = 0;
      mockDb.get.mockImplementation((query, params, callback) => {
        callCount++;
        callback(null, user);
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-sso-token');

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('sso@example.com');
    });

    test('should return 401 if no email header and no Bearer token provided', async () => {
      process.env.ENABLE_EMAIL_AUTH = 'false';

      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    test('should return 404 if user not found', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        if (query.includes('SELECT email FROM users WHERE email = ?')) {
          // Auth middleware check
          callback(null, { email: 'test@example.com' });
        } else {
          // /me endpoint check
          callback(null, null);
        }
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('x-user-email', 'test@example.com');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'User not found' });
    });

    test('should handle database error', async () => {
      mockDb.get.mockImplementation((query, params, callback) => {
        if (query.includes('SELECT email FROM users WHERE email = ?')) {
          callback(null, { email: 'test@example.com' });
        } else {
          callback(new Error('Database error'), null);
        }
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('x-user-email', 'test@example.com');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });
  });
});
