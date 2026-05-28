/**
 * In-process event bus with dead-letter queue (DLQ) support.
 *
 * Provides event-driven communication between microservices to:
 *   - Avoid tight coupling and deadlocks (async fire-and-forget)
 *   - Enable eventual consistency (events processed asynchronously)
 *   - Support retry with DLQ for failed event handlers
 *
 * Events that fail processing are retried up to maxRetries times.
 * After exhausting retries, failed events go to the dead-letter queue
 * for manual inspection or later reprocessing.
 *
 * In a production k8s deployment, this would be replaced by a message
 * broker (Redis Streams, RabbitMQ, Kafka). The interface remains the same.
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Default event bus configuration.
 */
const DEFAULT_CONFIG = {
  maxRetries: 3,             // Retry count before sending to DLQ
  retryDelay: 2000,          // Base delay between retries in ms
  dlqMaxSize: 1000,          // Maximum DLQ entries (oldest evicted)
  enableLogging: true,       // Log event emission and processing
};

class EventBus {
  /**
   * @param {object} [options] - Override default configuration
   */
  constructor(options = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options };
    this.listeners = new Map();     // eventName → Set of handler functions
    this.dlq = [];                  // Dead-letter queue for failed events
    this.eventLog = [];             // Recent event history for debugging
    this.processing = new Set();    // Currently processing event IDs (prevents deadlocks)
    this.stats = {
      emitted: 0,
      processed: 0,
      failed: 0,
      dlqCount: 0,
      retried: 0,
    };
  }

  /**
   * Registers an event handler.
   * Multiple handlers can be registered for the same event.
   * @param {string} eventName - Event to listen for
   * @param {Function} handler - Async function receiving (eventData)
   * @returns {Function} Unsubscribe function
   */
  on(eventName, handler) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(handler);

    // Return unsubscribe function for cleanup
    return () => this.listeners.get(eventName)?.delete(handler);
  }

  /**
   * Emits an event asynchronously (fire-and-forget).
   * Handlers run in parallel and don't block the emitter.
   * This avoids deadlocks by ensuring producers never wait on consumers.
   *
   * @param {string} eventName - Event name
   * @param {object} data - Event payload
   * @returns {string} Event ID for tracking
   */
  emit(eventName, data = {}) {
    const eventId = uuidv4();
    const event = {
      id: eventId,
      name: eventName,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    this.stats.emitted++;
    if (this.config.enableLogging) {
      console.log(`[event-bus] EMIT: ${eventName} (${eventId})`);
    }

    // Record in event log (keep last 100 for debugging)
    this.eventLog.push({ id: eventId, name: eventName, timestamp: event.timestamp });
    if (this.eventLog.length > 100) this.eventLog.shift();

    // Process asynchronously — don't block the emitter (avoids deadlocks)
    setImmediate(() => this._processEvent(event));

    return eventId;
  }

  /**
   * Processes an event by calling all registered handlers.
   * Failed handlers are retried up to maxRetries before going to DLQ.
   * @private
   * @param {object} event - Event object
   */
  async _processEvent(event) {
    // Deadlock prevention: skip if this event is already being processed
    if (this.processing.has(event.id)) {
      console.warn(`[event-bus] Skipping re-entrant event ${event.id} (deadlock prevention)`);
      return;
    }
    this.processing.add(event.id);

    const handlers = this.listeners.get(event.name);
    if (!handlers || handlers.size === 0) {
      this.processing.delete(event.id);
      return;
    }

    // Run all handlers in parallel (eventual consistency — order not guaranteed)
    const results = await Promise.allSettled(
      Array.from(handlers).map((handler) => handler(event.data, event))
    );

    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled') {
        this.stats.processed++;
      } else {
        const error = results[i].reason;
        console.error(`[event-bus] Handler failed for ${event.name}:`, error?.message);
        this.stats.failed++;

        // Retry the failed handler
        if (event.retryCount < this.config.maxRetries) {
          event.retryCount++;
          this.stats.retried++;
          const delay = this.config.retryDelay * event.retryCount;
          console.warn(`[event-bus] Retrying ${event.name} (attempt ${event.retryCount}/${this.config.maxRetries}) in ${delay}ms`);
          setTimeout(() => {
            this.processing.delete(event.id);
            this._processEvent(event);
          }, delay);
          return; // Will be reprocessed after delay
        } else {
          // All retries exhausted — send to dead-letter queue
          this._sendToDLQ(event, error);
        }
      }
    }

    this.processing.delete(event.id);
  }

  /**
   * Sends a failed event to the dead-letter queue for later inspection.
   * DLQ entries include the original event, error details, and failure timestamp.
   * @private
   * @param {object} event - The failed event
   * @param {Error} error - The last error
   */
  _sendToDLQ(event, error) {
    const dlqEntry = {
      event,
      error: error?.message || 'Unknown error',
      stack: error?.stack,
      failedAt: new Date().toISOString(),
      retries: event.retryCount,
    };

    this.dlq.push(dlqEntry);
    this.stats.dlqCount++;
    console.error(`[event-bus] DLQ: ${event.name} (${event.id}) after ${event.retryCount} retries`);

    // Evict oldest DLQ entries if over capacity
    while (this.dlq.length > this.config.dlqMaxSize) {
      this.dlq.shift();
    }
  }

  /**
   * Returns DLQ entries for inspection (e.g. via admin API).
   * @param {number} [limit=50] - Max entries to return
   * @returns {object[]} DLQ entries
   */
  getDLQ(limit = 50) {
    return this.dlq.slice(-limit);
  }

  /**
   * Replays a DLQ entry by re-emitting the event.
   * Removes it from DLQ if replay is initiated.
   * @param {string} eventId - Event ID to replay
   * @returns {boolean} Whether the event was found and replayed
   */
  replayDLQ(eventId) {
    const idx = this.dlq.findIndex((e) => e.event.id === eventId);
    if (idx === -1) return false;

    const entry = this.dlq.splice(idx, 1)[0];
    entry.event.retryCount = 0; // Reset retry count for fresh attempt
    console.log(`[event-bus] Replaying DLQ event: ${entry.event.name} (${eventId})`);
    setImmediate(() => this._processEvent(entry.event));
    return true;
  }

  /**
   * Clears the dead-letter queue.
   * @returns {number} Number of entries cleared
   */
  clearDLQ() {
    const count = this.dlq.length;
    this.dlq = [];
    return count;
  }

  /**
   * Returns event bus stats for monitoring dashboards.
   * @returns {object}
   */
  getStats() {
    return {
      ...this.stats,
      listeners: Object.fromEntries(
        Array.from(this.listeners.entries()).map(([k, v]) => [k, v.size])
      ),
      processingCount: this.processing.size,
      recentEvents: this.eventLog.slice(-10),
    };
  }
}

// Singleton event bus instance shared across the application
const eventBus = new EventBus();

// Pre-defined event names for type safety and discoverability
const EVENTS = {
  // Animation events
  ANIMATION_GENERATED: 'animation.generated',
  ANIMATION_FAILED: 'animation.failed',
  // AI analysis events
  CODE_ANALYZED: 'code.analyzed',
  CODE_EXPLAINED: 'code.explained',
  CODE_OPTIMIZED: 'code.optimized',
  // Interview events
  INTERVIEW_ANSWER_GENERATED: 'interview.answer.generated',
  // Session events
  SESSION_CREATED: 'session.created',
  SESSION_UPDATED: 'session.updated',
  // Cache events (for write-back coordination)
  CACHE_WRITE_BACK: 'cache.writeBack',
  CACHE_INVALIDATED: 'cache.invalidated',
  // Error events (for centralized error tracking)
  SERVICE_ERROR: 'service.error',
  CIRCUIT_OPENED: 'circuit.opened',
  CIRCUIT_CLOSED: 'circuit.closed',
};

module.exports = { EventBus, eventBus, EVENTS };
