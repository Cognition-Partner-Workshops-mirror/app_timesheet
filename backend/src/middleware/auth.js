const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');
const { getDatabase } = require('../database/init');

/**
 * JWKS client for validating Azure AD JWT signatures.
 * Fetches signing keys from the Microsoft Entra ID JWKS endpoint.
 */
const jwksClient = jwksRsa({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'common'}/discovery/v2.0/keys`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

/**
 * Retrieves the signing key from JWKS endpoint for JWT verification.
 * Used as the key-lookup callback for jsonwebtoken.verify().
 */
function getSigningKey(header, callback) {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

/**
 * Validates an Azure AD JWT token and returns the decoded claims.
 * Checks issuer against the configured tenant and audience against the client ID.
 */
function validateAzureToken(token) {
  return new Promise((resolve, reject) => {
    const tenantId = process.env.AZURE_TENANT_ID || 'common';
    const clientId = process.env.AZURE_CLIENT_ID || '';

    jwt.verify(
      token,
      getSigningKey,
      {
        algorithms: ['RS256'],
        issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
        audience: clientId,
      },
      (err, decoded) => {
        if (err) {
          return reject(err);
        }
        resolve(decoded);
      }
    );
  });
}

/**
 * Extracts user email from Azure AD token claims.
 * Prefers 'preferred_username', falls back to 'email', then 'upn'.
 */
function extractEmailFromToken(decodedToken) {
  return decodedToken.preferred_username || decodedToken.email || decodedToken.upn || null;
}

/**
 * Ensures a user record exists in the local DB for the given email.
 * Creates the user if they don't exist yet (auto-provisioning for SSO users).
 * Calls next() with req.userEmail set for downstream route handlers.
 */
function ensureUserExists(email, req, res, next) {
  const db = getDatabase();

  db.get('SELECT email FROM users WHERE email = ?', [email], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!row) {
      // Auto-create user on first SSO login
      db.run('INSERT INTO users (email) VALUES (?)', [email], (err) => {
        if (err) {
          console.error('Error creating user:', err);
          return res.status(500).json({ error: 'Failed to create user' });
        }

        req.userEmail = email;
        next();
      });
    } else {
      req.userEmail = email;
      next();
    }
  });
}

/**
 * Authentication middleware supporting two modes:
 *
 * 1. Bearer token (primary) — validates JWT from Azure AD JWKS endpoint,
 *    extracts user email from token claims, and auto-provisions user in DB.
 *
 * 2. x-user-email header (legacy fallback) — used when ENABLE_EMAIL_AUTH=true
 *    in the backend env. Validates email format and auto-provisions user.
 *
 * Sets req.userEmail for downstream route handlers.
 */
function authenticateUser(req, res, next) {
  const authHeader = req.headers['authorization'];

  // Primary path: Bearer token (Azure AD JWT)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    validateAzureToken(token)
      .then((decoded) => {
        const email = extractEmailFromToken(decoded);
        if (!email) {
          return res.status(401).json({ error: 'No email claim found in token' });
        }
        ensureUserExists(email, req, res, next);
      })
      .catch((err) => {
        console.error('Token validation failed:', err.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
      });
    return;
  }

  // Fallback path: legacy email-based auth (dev mode)
  const enableEmailAuth = process.env.ENABLE_EMAIL_AUTH === 'true';
  const userEmail = req.headers['x-user-email'];

  if (enableEmailAuth && userEmail) {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    return ensureUserExists(userEmail, req, res, next);
  }

  // No valid credentials provided
  return res.status(401).json({ error: 'Authentication required. Provide a Bearer token or enable email auth.' });
}

module.exports = {
  authenticateUser,
  validateAzureToken,
  extractEmailFromToken,
};
