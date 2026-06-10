// Mock jwks-rsa before importing auth middleware (ESM compatibility)
jest.mock('jwks-rsa', () => {
  return jest.fn(() => ({
    getSigningKey: jest.fn(),
  }));
});

// Mock jsonwebtoken for Azure AD token validation tests
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

const { authenticateUser } = require('../../middleware/auth');
const { getDatabase } = require('../../database/init');
const jwt = require('jsonwebtoken');

jest.mock('../../database/init');

describe('Authentication Middleware', () => {
  let req, res, next, mockDb;
  const originalEnv = process.env;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    mockDb = {
      get: jest.fn(),
      run: jest.fn()
    };
    
    getDatabase.mockReturnValue(mockDb);

    // Enable email auth by default for legacy tests
    process.env = { ...originalEnv, ENABLE_EMAIL_AUTH: 'true' };
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env = originalEnv;
  });

  describe('No Credentials Provided', () => {
    test('should return 401 if no auth header and email auth is disabled', () => {
      process.env.ENABLE_EMAIL_AUTH = 'false';

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required. Provide a Bearer token or enable email auth.'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Bearer Token Authentication (Azure AD SSO)', () => {
    test('should authenticate user with valid Azure AD token', (done) => {
      req.headers['authorization'] = 'Bearer valid-token';

      // Mock JWT verification to succeed
      jwt.verify.mockImplementation((token, keyFunc, options, callback) => {
        callback(null, { preferred_username: 'sso@example.com' });
      });

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { email: 'sso@example.com' });
      });

      authenticateUser(req, res, next);

      setImmediate(() => {
        expect(req.userEmail).toBe('sso@example.com');
        expect(next).toHaveBeenCalled();
        done();
      });
    });

    test('should return 401 for invalid token', (done) => {
      req.headers['authorization'] = 'Bearer invalid-token';

      jwt.verify.mockImplementation((token, keyFunc, options, callback) => {
        callback(new Error('Token is invalid'));
      });

      authenticateUser(req, res, next);

      setImmediate(() => {
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
        expect(next).not.toHaveBeenCalled();
        done();
      });
    });

    test('should return 401 if token has no email claim', (done) => {
      req.headers['authorization'] = 'Bearer no-email-token';

      jwt.verify.mockImplementation((token, keyFunc, options, callback) => {
        callback(null, { sub: 'some-id' }); // no email claims
      });

      authenticateUser(req, res, next);

      setImmediate(() => {
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'No email claim found in token' });
        done();
      });
    });

    test('should auto-create user on first SSO login', (done) => {
      req.headers['authorization'] = 'Bearer new-user-token';

      jwt.verify.mockImplementation((token, keyFunc, options, callback) => {
        callback(null, { preferred_username: 'newsso@example.com' });
      });

      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null); // User doesn't exist
      });

      mockDb.run.mockImplementation((query, params, callback) => {
        callback(null);
      });

      authenticateUser(req, res, next);

      setImmediate(() => {
        expect(mockDb.run).toHaveBeenCalledWith(
          'INSERT INTO users (email) VALUES (?)',
          ['newsso@example.com'],
          expect.any(Function)
        );
        expect(req.userEmail).toBe('newsso@example.com');
        expect(next).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('Legacy Email Header Authentication (Fallback)', () => {
    test('should return 401 if x-user-email header is missing and no Bearer token', () => {
      // Email auth enabled but no email header
      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 400 if email format is invalid', () => {
      req.headers['x-user-email'] = 'invalid-email';

      authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid email format'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should accept valid email format', () => {
      req.headers['x-user-email'] = 'test@example.com';
      
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { email: 'test@example.com' });
      });

      authenticateUser(req, res, next);

      expect(mockDb.get).toHaveBeenCalled();
    });
  });

  describe('Existing User Authentication (Email Fallback)', () => {
    test('should authenticate existing user and call next()', (done) => {
      req.headers['x-user-email'] = 'existing@example.com';
      
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { email: 'existing@example.com' });
      });

      authenticateUser(req, res, next);

      setImmediate(() => {
        expect(req.userEmail).toBe('existing@example.com');
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        done();
      });
    });

    test('should handle database error when checking user', (done) => {
      req.headers['x-user-email'] = 'test@example.com';
      
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(new Error('Database error'), null);
      });

      authenticateUser(req, res, next);

      setImmediate(() => {
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Internal server error'
        });
        expect(next).not.toHaveBeenCalled();
        done();
      });
    });
  });

  describe('New User Creation (Email Fallback)', () => {
    test('should create new user if not exists and call next()', (done) => {
      req.headers['x-user-email'] = 'newuser@example.com';
      
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null); // User doesn't exist
      });
      
      mockDb.run.mockImplementation((query, params, callback) => {
        callback(null);
      });

      authenticateUser(req, res, next);

      setImmediate(() => {
        expect(mockDb.run).toHaveBeenCalledWith(
          'INSERT INTO users (email) VALUES (?)',
          ['newuser@example.com'],
          expect.any(Function)
        );
        expect(req.userEmail).toBe('newuser@example.com');
        expect(next).toHaveBeenCalled();
        done();
      });
    });

    test('should handle error when creating new user', (done) => {
      req.headers['x-user-email'] = 'newuser@example.com';
      
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });
      
      mockDb.run.mockImplementation((query, params, callback) => {
        callback(new Error('Insert failed'));
      });

      authenticateUser(req, res, next);

      setImmediate(() => {
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Failed to create user'
        });
        expect(next).not.toHaveBeenCalled();
        done();
      });
    });
  });

  describe('Email Format Edge Cases', () => {
    test('should reject email without @', () => {
      req.headers['x-user-email'] = 'notanemail';
      authenticateUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should reject email without domain', () => {
      req.headers['x-user-email'] = 'test@';
      authenticateUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should reject email without TLD', () => {
      req.headers['x-user-email'] = 'test@domain';
      authenticateUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should accept email with subdomain', () => {
      req.headers['x-user-email'] = 'test@mail.example.com';
      
      mockDb.get.mockImplementation((query, params, callback) => {
        callback(null, { email: 'test@mail.example.com' });
      });

      authenticateUser(req, res, next);
      expect(mockDb.get).toHaveBeenCalled();
    });
  });
});
