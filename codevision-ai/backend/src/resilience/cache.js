/**
 * In-memory cache with write-back support and TTL eviction.
 *
 * Provides a fallback layer when downstream services are unavailable.
 * Implements the write-back (write-behind) pattern:
 *   1. On successful response → cache the result immediately
 *   2. On service failure → serve stale cached data if available
 *   3. Periodically flush dirty entries to persistent storage (DB)
 *
 * TTL-based eviction prevents unbounded memory growth.
 * Cache keys are derived from request method + URL + body hash.
 */

const crypto = require('crypto');

/**
 * Default cache configuration.
 */
const DEFAULT_OPTIONS = {
  maxSize: 500,             // Maximum number of cached entries
  defaultTTL: 300000,       // Default time-to-live: 5 minutes
  staleTTL: 1800000,        // Stale entries served as fallback for 30 minutes
  writeBackInterval: 60000, // Flush dirty entries every 60 seconds
  enableWriteBack: true,    // Enable write-back to persistent storage
};

class Cache {
  /**
   * @param {string} name - Cache name for logging
   * @param {object} [options] - Override default configuration
   */
  constructor(name, options = {}) {
    this.name = name;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.store = new Map();          // key → { value, createdAt, ttl, dirty }
    this.hits = 0;
    this.misses = 0;
    this.fallbackHits = 0;           // Times stale cache saved a failed request
    this.dirtyEntries = new Set();   // Keys that need write-back to DB
    this.writeBackCallbacks = [];    // Registered flush handlers

    // Periodic eviction of expired entries
    this._evictTimer = setInterval(() => this._evict(), this.options.defaultTTL);

    // Write-back timer — flush dirty entries to persistent storage
    if (this.options.enableWriteBack) {
      this._writeBackTimer = setInterval(() => this._flushDirty(), this.options.writeBackInterval);
    }
  }

  /**
   * Generates a cache key from HTTP request properties.
   * Uses method + URL + body hash for uniqueness.
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {object} [body] - Request body
   * @returns {string} Cache key
   */
  static keyFromRequest(method, url, body) {
    const bodyHash = body && Object.keys(body).length > 0
      ? crypto.createHash('md5').update(JSON.stringify(body)).digest('hex').slice(0, 12)
      : 'nobody';
    return `${method}:${url}:${bodyHash}`;
  }

  /**
   * Gets a cached value. Returns null on miss or expiry.
   * @param {string} key - Cache key
   * @returns {*|null} Cached value or null
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    // Check if entry is within its TTL
    if (Date.now() - entry.createdAt < entry.ttl) {
      this.hits++;
      return entry.value;
    }
    this.misses++;
    return null;
  }

  /**
   * Gets a stale cached value (past TTL but within staleTTL).
   * Used as fallback when the live service is unavailable.
   * @param {string} key - Cache key
   * @returns {*|null} Stale cached value or null
   */
  getStale(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    // Serve stale data if within the extended staleTTL window
    if (Date.now() - entry.createdAt < this.options.staleTTL) {
      this.fallbackHits++;
      console.log(`[cache] ${this.name}: serving stale fallback for ${key}`);
      return entry.value;
    }
    return null;
  }

  /**
   * Stores a value in cache. Marks entry as dirty for write-back.
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} [ttl] - Custom TTL in ms (defaults to config)
   */
  set(key, value, ttl) {
    // Evict oldest entry if at capacity
    if (this.store.size >= this.options.maxSize) {
      const oldest = this.store.keys().next().value;
      this.store.delete(oldest);
      this.dirtyEntries.delete(oldest);
    }

    this.store.set(key, {
      value,
      createdAt: Date.now(),
      ttl: ttl || this.options.defaultTTL,
      dirty: true,
    });
    this.dirtyEntries.add(key);
  }

  /**
   * Registers a callback for write-back flushing.
   * Called periodically with dirty entries that need persistent storage.
   * @param {Function} callback - Receives (key, value) for each dirty entry
   */
  onWriteBack(callback) {
    this.writeBackCallbacks.push(callback);
  }

  /**
   * Flushes dirty entries to persistent storage via registered callbacks.
   * Implements the write-back (write-behind) pattern.
   * @private
   */
  async _flushDirty() {
    if (this.dirtyEntries.size === 0 || this.writeBackCallbacks.length === 0) return;

    const keysToFlush = [...this.dirtyEntries];
    console.log(`[cache] ${this.name}: flushing ${keysToFlush.length} dirty entries`);

    for (const key of keysToFlush) {
      const entry = this.store.get(key);
      if (!entry) { this.dirtyEntries.delete(key); continue; }

      try {
        for (const cb of this.writeBackCallbacks) {
          await cb(key, entry.value);
        }
        entry.dirty = false;
        this.dirtyEntries.delete(key);
      } catch (err) {
        // Keep in dirty set — will retry on next flush cycle
        console.error(`[cache] ${this.name}: write-back failed for ${key}:`, err.message);
      }
    }
  }

  /**
   * Evicts expired entries to free memory.
   * Entries past staleTTL are fully removed.
   * @private
   */
  _evict() {
    const now = Date.now();
    let evicted = 0;
    for (const [key, entry] of this.store) {
      if (now - entry.createdAt > this.options.staleTTL) {
        this.store.delete(key);
        this.dirtyEntries.delete(key);
        evicted++;
      }
    }
    if (evicted > 0) {
      console.log(`[cache] ${this.name}: evicted ${evicted} expired entries`);
    }
  }

  /**
   * Returns cache statistics for monitoring.
   * @returns {object} Cache stats
   */
  getStats() {
    return {
      name: this.name,
      size: this.store.size,
      maxSize: this.options.maxSize,
      hits: this.hits,
      misses: this.misses,
      fallbackHits: this.fallbackHits,
      dirtyEntries: this.dirtyEntries.size,
      hitRate: this.hits + this.misses > 0
        ? (this.hits / (this.hits + this.misses) * 100).toFixed(1) + '%'
        : '0%',
    };
  }

  /** Cleanup timers on shutdown */
  destroy() {
    clearInterval(this._evictTimer);
    if (this._writeBackTimer) clearInterval(this._writeBackTimer);
  }
}

// Shared cache instances per service
const caches = new Map();

/**
 * Gets or creates a cache for a named service.
 * @param {string} name - Service name
 * @param {object} [options] - Cache options
 * @returns {Cache}
 */
function getCache(name, options) {
  if (!caches.has(name)) {
    caches.set(name, new Cache(name, options));
  }
  return caches.get(name);
}

/**
 * Returns stats for all registered caches.
 * @returns {object[]}
 */
function getAllCacheStats() {
  return Array.from(caches.values()).map((c) => c.getStats());
}

module.exports = { Cache, getCache, getAllCacheStats };
