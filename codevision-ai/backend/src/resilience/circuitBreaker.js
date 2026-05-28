/**
 * Circuit Breaker pattern implementation.
 *
 * Prevents cascading failures by tracking error rates per service and
 * "opening" the circuit when failures exceed a threshold. While open,
 * requests fail fast with a fallback instead of waiting for a timeout.
 *
 * States:
 *   CLOSED   → Normal operation. Requests pass through. Failures counted.
 *   OPEN     → Too many failures. Requests rejected immediately with fallback.
 *   HALF_OPEN → After resetTimeout, allow a single probe request through.
 *               If it succeeds → CLOSED. If it fails → back to OPEN.
 *
 * This avoids deadlocks by failing fast and reduces load on struggling services.
 */

// Circuit breaker states
const STATE = {
  CLOSED: 'CLOSED',       // Normal — requests flow through
  OPEN: 'OPEN',           // Tripped — requests fail fast
  HALF_OPEN: 'HALF_OPEN', // Testing — one probe request allowed
};

/**
 * Default circuit breaker configuration.
 * Each service gets its own CircuitBreaker instance with these defaults.
 */
const DEFAULT_OPTIONS = {
  failureThreshold: 5,     // Number of failures before circuit opens
  resetTimeout: 30000,     // Time in ms before moving from OPEN → HALF_OPEN
  monitorInterval: 60000,  // Window for counting failures (resets after this)
  halfOpenMaxAttempts: 1,  // Number of probe requests in HALF_OPEN state
};

class CircuitBreaker {
  /**
   * @param {string} name - Service name for logging
   * @param {object} [options] - Override default configuration
   */
  constructor(name, options = {}) {
    this.name = name;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.state = STATE.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.halfOpenAttempts = 0;

    // Reset failure count periodically so old failures don't linger forever
    this._monitorTimer = setInterval(() => {
      if (this.state === STATE.CLOSED && this.failureCount > 0) {
        console.log(`[circuit-breaker] ${this.name}: resetting failure count (was ${this.failureCount})`);
        this.failureCount = 0;
      }
    }, this.options.monitorInterval);
  }

  /**
   * Execute an async function through the circuit breaker.
   * If circuit is OPEN, immediately calls fallback instead of fn.
   * If circuit is HALF_OPEN, allows one probe request.
   *
   * @param {Function} fn - The async function to protect
   * @param {Function} [fallback] - Optional fallback when circuit is open
   * @returns {Promise<*>} Result from fn or fallback
   * @throws {Error} If circuit is open and no fallback provided
   */
  async execute(fn, fallback) {
    // OPEN state — fail fast with fallback or error
    if (this.state === STATE.OPEN) {
      if (this._shouldTransitionToHalfOpen()) {
        this.state = STATE.HALF_OPEN;
        this.halfOpenAttempts = 0;
        console.log(`[circuit-breaker] ${this.name}: OPEN → HALF_OPEN (probe allowed)`);
      } else {
        console.warn(`[circuit-breaker] ${this.name}: circuit OPEN — request rejected`);
        if (fallback) return fallback();
        const err = new Error(`Circuit breaker OPEN for ${this.name}`);
        err.circuitOpen = true;
        throw err;
      }
    }

    // HALF_OPEN state — limit probe requests
    if (this.state === STATE.HALF_OPEN) {
      if (this.halfOpenAttempts >= this.options.halfOpenMaxAttempts) {
        console.warn(`[circuit-breaker] ${this.name}: HALF_OPEN probe limit reached — rejecting`);
        if (fallback) return fallback();
        const err = new Error(`Circuit breaker HALF_OPEN probe limit for ${this.name}`);
        err.circuitOpen = true;
        throw err;
      }
      this.halfOpenAttempts++;
    }

    // CLOSED or HALF_OPEN (probe) — attempt the real call
    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure();
      // If we have a fallback and the circuit just opened, use it
      if (fallback && this.state === STATE.OPEN) return fallback();
      throw error;
    }
  }

  /**
   * Records a successful call. Resets the circuit to CLOSED.
   * @private
   */
  _onSuccess() {
    this.successCount++;
    if (this.state === STATE.HALF_OPEN) {
      console.log(`[circuit-breaker] ${this.name}: HALF_OPEN → CLOSED (probe succeeded)`);
      this.state = STATE.CLOSED;
      this.failureCount = 0;
    }
  }

  /**
   * Records a failed call. Opens the circuit if threshold exceeded.
   * @private
   */
  _onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === STATE.HALF_OPEN) {
      // Probe failed — go back to OPEN
      console.warn(`[circuit-breaker] ${this.name}: HALF_OPEN → OPEN (probe failed)`);
      this.state = STATE.OPEN;
      this.nextAttemptTime = Date.now() + this.options.resetTimeout;
    } else if (this.failureCount >= this.options.failureThreshold) {
      // Threshold exceeded — trip the circuit
      console.error(`[circuit-breaker] ${this.name}: CLOSED → OPEN (${this.failureCount} failures)`);
      this.state = STATE.OPEN;
      this.nextAttemptTime = Date.now() + this.options.resetTimeout;
    }
  }

  /**
   * Checks if enough time has passed to allow a probe request.
   * @private
   * @returns {boolean}
   */
  _shouldTransitionToHalfOpen() {
    return this.nextAttemptTime && Date.now() >= this.nextAttemptTime;
  }

  /**
   * Returns current circuit breaker status for health checks / monitoring.
   * @returns {object} State information
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /** Cleanup timer on shutdown */
  destroy() {
    clearInterval(this._monitorTimer);
  }
}

// Registry: one circuit breaker per service name
const breakers = new Map();

/**
 * Gets or creates a circuit breaker for a named service.
 * @param {string} name - Service name
 * @param {object} [options] - Circuit breaker options
 * @returns {CircuitBreaker}
 */
function getCircuitBreaker(name, options) {
  if (!breakers.has(name)) {
    breakers.set(name, new CircuitBreaker(name, options));
  }
  return breakers.get(name);
}

/**
 * Returns status of all registered circuit breakers.
 * Used by the /api/health endpoint for monitoring.
 * @returns {object[]} Array of breaker statuses
 */
function getAllBreakerStatuses() {
  return Array.from(breakers.values()).map((b) => b.getStatus());
}

module.exports = { CircuitBreaker, getCircuitBreaker, getAllBreakerStatuses, STATE };
