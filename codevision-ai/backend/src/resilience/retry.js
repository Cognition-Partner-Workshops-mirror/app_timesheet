/**
 * Retry utility with exponential backoff and jitter.
 * Wraps async operations to automatically retry on transient failures.
 *
 * Uses exponential backoff (delay doubles each attempt) plus random jitter
 * to prevent thundering-herd when multiple callers retry simultaneously.
 *
 * Retryable errors: network failures, 5xx responses, rate limits (429).
 * Non-retryable: 4xx client errors (except 429), validation errors.
 */

/**
 * Default config for retry behavior.
 * Can be overridden per-call via options parameter.
 */
const DEFAULT_CONFIG = {
  maxRetries: 3,           // Total retry attempts (not counting the initial call)
  baseDelay: 500,          // Starting delay in ms before first retry
  maxDelay: 10000,         // Cap on delay to prevent excessively long waits
  backoffFactor: 2,        // Multiplier applied to delay each retry
  jitterRange: 0.3,        // Random jitter ±30% to spread out retries
  retryableStatuses: [429, 500, 502, 503, 504], // HTTP status codes worth retrying
};

/**
 * Checks if an error is transient and worth retrying.
 * Network errors (ECONNREFUSED, ETIMEDOUT, etc.) are always retryable.
 * HTTP errors are retryable only if their status is in the retryable list.
 * @param {Error} error - The error to evaluate
 * @param {number[]} retryableStatuses - HTTP statuses considered retryable
 * @returns {boolean} Whether the operation should be retried
 */
function isRetryable(error, retryableStatuses) {
  // Network-level errors are always transient
  if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND' ||
      error.code === 'EPIPE' || error.code === 'EAI_AGAIN') {
    return true;
  }
  // HTTP status-based retry check
  if (error.status && retryableStatuses.includes(error.status)) return true;
  if (error.response?.status && retryableStatuses.includes(error.response.status)) return true;
  // Generic "fetch failed" errors are retryable
  if (error.message?.includes('fetch failed') || error.message?.includes('socket hang up')) return true;
  return false;
}

/**
 * Calculates delay with exponential backoff + jitter.
 * Jitter prevents synchronized retries across multiple callers.
 * @param {number} attempt - Current attempt number (0-based)
 * @param {object} config - Retry configuration
 * @returns {number} Delay in milliseconds
 */
function calculateDelay(attempt, config) {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  // Apply random jitter: delay * (1 ± jitterRange)
  const jitter = 1 + (Math.random() * 2 - 1) * config.jitterRange;
  return Math.round(cappedDelay * jitter);
}

/**
 * Executes an async function with retry logic.
 * Retries on transient failures using exponential backoff + jitter.
 *
 * @param {Function} fn - Async function to execute
 * @param {object} [options] - Override default retry config
 * @param {string} [label] - Label for logging (e.g. "animation-service")
 * @returns {Promise<*>} Result of the function
 * @throws {Error} Last error if all retries are exhausted
 *
 * @example
 *   const data = await withRetry(() => fetch(url), { maxRetries: 5 }, 'fetch-user');
 */
async function withRetry(fn, options = {}, label = 'operation') {
  const config = { ...DEFAULT_CONFIG, ...options };
  let lastError;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry non-retryable errors (client mistakes, validation, etc.)
      if (!isRetryable(error, config.retryableStatuses)) {
        throw error;
      }

      // Don't retry if we've exhausted all attempts
      if (attempt >= config.maxRetries) {
        console.error(`[retry] ${label}: all ${config.maxRetries} retries exhausted`, error.message);
        throw error;
      }

      const delay = calculateDelay(attempt, config);
      console.warn(`[retry] ${label}: attempt ${attempt + 1}/${config.maxRetries} failed, retrying in ${delay}ms — ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

module.exports = { withRetry, isRetryable, calculateDelay, DEFAULT_CONFIG };
