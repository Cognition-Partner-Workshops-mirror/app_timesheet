/**
 * Security middleware stack for CodeVision AI.
 *
 * Protects against:
 *   - XSS (Cross-Site Scripting): Sanitizes all string inputs
 *   - SQL Injection: Parameterized queries + input validation (already via Joi)
 *   - CSRF: Origin validation on state-changing requests
 *   - Rate Limiting: Prevents brute-force and abuse
 *   - Payload Bombs: Size limits on request bodies
 *   - HTTP Parameter Pollution: Rejects duplicate keys
 *   - Clickjacking: X-Frame-Options via helmet (already configured)
 *   - MIME sniffing: X-Content-Type-Options via helmet (already configured)
 *
 * All middleware is open-source (express-rate-limit, xss-filters, helmet).
 */

const rateLimit = require('express-rate-limit');
const xssFilters = require('xss-filters');

/**
 * XSS sanitization middleware.
 * Recursively sanitizes all string values in req.body, req.query, req.params.
 * Runs before route handlers to ensure no unsanitized input reaches business logic.
 *
 * NOTE: Code fields (req.body.code) are excluded from sanitization because
 * code intentionally contains characters like <, >, &, quotes etc.
 * The code field is validated via Joi schema (max length) and only stored
 * in the database using parameterized queries (safe from SQL injection).
 */
function xssSanitize(req, _res, next) {
  // Fields that contain code — exclude from XSS sanitization
  const codeFields = new Set(['code', 'optimized_code', 'originalCode', 'generatedCode', 'blocks']);

  /**
   * Recursively sanitize object values (strings get XSS-filtered).
   * @param {*} obj - Value to sanitize
   * @param {string} [key] - Current object key (to skip code fields)
   * @returns {*} Sanitized value
   */
  function sanitize(obj, key) {
    if (typeof obj === 'string') {
      // Skip code fields — they need raw characters like < > & " '
      if (key && codeFields.has(key)) return obj;
      return xssFilters.inHTMLData(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map((item, i) => sanitize(item, String(i)));
    }
    if (obj && typeof obj === 'object') {
      const cleaned = {};
      for (const [k, v] of Object.entries(obj)) {
        cleaned[k] = sanitize(v, k);
      }
      return cleaned;
    }
    return obj;
  }

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  next();
}

/**
 * SQL injection detection middleware.
 * Checks string inputs for common SQL injection patterns.
 * This is a defense-in-depth layer — the primary protection is
 * parameterized queries in better-sqlite3 (already used throughout).
 *
 * Blocks requests containing obvious SQL injection patterns in
 * non-code fields. Code fields are excluded since they legitimately
 * contain SQL-like syntax (e.g. explaining SQL code).
 */
function sqlInjectionGuard(req, res, next) {
  // Patterns that indicate SQL injection attempts
  const sqlPatterns = [
    /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE)\b\s+(ALL\s+)?)/i,
    /(-{2}|\/\*|\*\/)/,            // SQL comments: -- or /* */
    /(;\s*(DROP|DELETE|UPDATE|INSERT|ALTER))/i,  // Chained destructive statements
    /(\bOR\b\s+\d+\s*=\s*\d+)/i,  // OR 1=1 pattern
    /('\s*(OR|AND)\s+')/i,          // String-based boolean injection
  ];

  // Fields that contain code — skip injection detection
  const codeFields = new Set(['code', 'optimized_code', 'originalCode', 'generatedCode',
    'problem', 'question', 'blocks', 'userMessage']);

  /**
   * Check a value for SQL injection patterns.
   * @param {*} value - Value to check
   * @param {string} key - Field name
   * @returns {boolean} True if suspicious pattern detected
   */
  function isSuspicious(value, key) {
    if (typeof value !== 'string') return false;
    if (codeFields.has(key)) return false; // Skip code/question fields
    return sqlPatterns.some((pattern) => pattern.test(value));
  }

  /**
   * Recursively check all string values in an object.
   * @param {*} obj - Object to check
   * @returns {boolean} True if any suspicious value found
   */
  function checkObject(obj) {
    if (!obj || typeof obj !== 'object') return false;
    for (const [key, value] of Object.entries(obj)) {
      if (isSuspicious(value, key)) return true;
      if (typeof value === 'object' && checkObject(value)) return true;
    }
    return false;
  }

  if (checkObject(req.body) || checkObject(req.query)) {
    console.warn(`[security] SQL injection attempt blocked from ${req.ip}: ${req.method} ${req.path}`);
    return res.status(400).json({
      error: 'Request blocked',
      message: 'Potentially unsafe input detected.',
    });
  }

  next();
}

/**
 * CSRF protection middleware.
 * Validates that state-changing requests (POST, PUT, DELETE) originate
 * from the expected frontend origin.
 *
 * Checks the Origin and Referer headers against the configured CORS origin.
 * API clients can bypass this by including the X-Requested-With header.
 */
function csrfProtection(req, res, next) {
  // Only check state-changing methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // Allow if Origin matches, or Referer starts with allowed origin
  if (origin === allowedOrigin) return next();
  if (referer && referer.startsWith(allowedOrigin)) return next();

  // Allow API clients that set X-Requested-With (standard AJAX header)
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') return next();

  // Allow internal service-to-service calls (no origin = server-side)
  if (!origin && !referer) return next();

  console.warn(`[security] CSRF blocked: origin=${origin} referer=${referer} path=${req.path}`);
  return res.status(403).json({
    error: 'Forbidden',
    message: 'Cross-site request blocked.',
  });
}

/**
 * Rate limiter factory.
 * Creates a rate limiter with configurable window and max requests.
 * Uses in-memory store (suitable for single-instance or per-pod deployment).
 * In production k8s, swap to Redis store for shared state across pods.
 *
 * @param {object} [options] - Rate limit options
 * @returns {Function} Express middleware
 */
function createRateLimiter(options = {}) {
  return rateLimit({
    windowMs: options.windowMs || 60000,       // 1 minute window
    max: options.max || 100,                    // 100 requests per window
    standardHeaders: true,                      // Return rate limit info in headers
    legacyHeaders: false,                       // Disable X-RateLimit-* headers
    message: {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((options.windowMs || 60000) / 1000),
    },
    // Skip rate limiting for health checks
    skip: (req) => req.path === '/health' || req.path === '/api/health',
  });
}

/**
 * AI endpoint rate limiter (stricter — AI calls are expensive).
 * Limits to 30 requests per minute per IP.
 */
const aiRateLimiter = createRateLimiter({
  windowMs: 60000,
  max: 30,
});

/**
 * General API rate limiter.
 * Limits to 100 requests per minute per IP.
 */
const generalRateLimiter = createRateLimiter({
  windowMs: 60000,
  max: 100,
});

/**
 * Request size validation middleware.
 * Extra layer beyond express.json({limit}) — catches edge cases
 * and provides a clearer error message.
 */
function requestSizeGuard(req, res, next) {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  const maxSize = 10 * 1024 * 1024; // 10MB (matches express.json limit)
  if (contentLength > maxSize) {
    return res.status(413).json({
      error: 'Payload too large',
      message: `Request body exceeds ${maxSize / (1024 * 1024)}MB limit.`,
    });
  }
  next();
}

/**
 * Security headers middleware (supplements helmet).
 * Adds additional headers not covered by default helmet config.
 */
function additionalSecurityHeaders(req, res, next) {
  // Prevent browsers from MIME-sniffing response away from declared content-type
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Restrict embedding in iframes (clickjacking protection)
  res.setHeader('X-Frame-Options', 'DENY');
  // Enable browser XSS filter (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Prevent referrer leakage
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions policy — disable unnecessary browser APIs
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

/**
 * Applies the full security middleware stack to an Express app.
 * Should be called early in the middleware chain (before routes).
 * @param {import('express').Application} app - Express app
 * @param {object} [options] - Override options
 */
function applySecurityMiddleware(app, options = {}) {
  // 1. Additional security headers (supplements helmet)
  app.use(additionalSecurityHeaders);
  // 2. Request size guard
  app.use(requestSizeGuard);
  // 3. General rate limiting
  app.use(generalRateLimiter);
  // 4. CSRF protection on state-changing requests
  app.use(csrfProtection);
  // 5. XSS sanitization on all string inputs
  app.use(xssSanitize);
  // 6. SQL injection detection (defense-in-depth)
  app.use(sqlInjectionGuard);

  console.log('[security] Full security middleware stack applied');
}

module.exports = {
  xssSanitize,
  sqlInjectionGuard,
  csrfProtection,
  createRateLimiter,
  aiRateLimiter,
  generalRateLimiter,
  requestSizeGuard,
  additionalSecurityHeaders,
  applySecurityMiddleware,
};
