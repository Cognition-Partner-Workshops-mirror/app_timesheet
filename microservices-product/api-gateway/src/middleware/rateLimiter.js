/**
 * Rate limiting middleware.
 * Protects the gateway from excessive requests using a sliding window algorithm.
 */
const rateLimit = require('express-rate-limit');

// Global rate limiter - applies to all routes through the gateway
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100, // max requests per window
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,  // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,   // Disable the `X-RateLimit-*` headers
});

module.exports = { globalLimiter };
