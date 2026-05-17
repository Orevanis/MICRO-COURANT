import { logger } from './logger.js';

export const CircuitState = {
  CLOSED: 'closed',     // Normal operation
  OPEN: 'open',         // Circuit is open, blocking requests
  HALF_OPEN: 'half_open' // Testing if service has recovered
};

export class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'CircuitBreaker';
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    this.lastStateChange = Date.now();
    
    this.onStateChange = options.onStateChange || null;
    
    logger.info(`CircuitBreaker '${this.name}' initialized`, {
      failureThreshold: this.failureThreshold,
      resetTimeout: this.resetTimeout
    });
  }

  async execute(fn, context = {}) {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        const error = new Error(`CircuitBreaker '${this.name}' is OPEN - blocking request`);
        error.code = 'CIRCUIT_OPEN';
        throw error;
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  onSuccess() {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      
      // If we get enough successes in half-open state, close the circuit
      if (this.successCount >= 2) {
        this.transitionTo(CircuitState.CLOSED);
      }
    } else {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  onFailure(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    logger.warn(`CircuitBreaker '${this.name}' failure`, {
      failureCount: this.failureCount,
      threshold: this.failureThreshold,
      error: error.message
    });

    if (this.failureCount >= this.failureThreshold) {
      if (this.state !== CircuitState.OPEN) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  shouldAttemptReset() {
    if (!this.lastFailureTime) {
      return true;
    }
    
    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    return timeSinceLastFailure >= this.resetTimeout;
  }

  transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();
    
    // Reset counters when transitioning
    if (newState === CircuitState.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
    } else if (newState === CircuitState.OPEN) {
      this.successCount = 0;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successCount = 0;
    }

    logger.info(`CircuitBreaker '${this.name}' state transition`, {
      from: oldState,
      to: newState
    });

    if (this.onStateChange) {
      this.onStateChange(newState, oldState);
    }
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
      timeInCurrentState: Date.now() - this.lastStateChange
    };
  }

  reset() {
    this.transitionTo(CircuitState.CLOSED);
    logger.info(`CircuitBreaker '${this.name}' manually reset`);
  }
}

// Circuit breaker manager for managing multiple circuit breakers
export class CircuitBreakerManager {
  constructor() {
    this.circuitBreakers = new Map();
  }

  register(name, options) {
    const circuitBreaker = new CircuitBreaker({ ...options, name });
    this.circuitBreakers.set(name, circuitBreaker);
    return circuitBreaker;
  }

  get(name) {
    return this.circuitBreakers.get(name);
  }

  execute(name, fn, context) {
    const circuitBreaker = this.circuitBreakers.get(name);
    if (!circuitBreaker) {
      throw new Error(`CircuitBreaker '${name}' not found`);
    }
    return circuitBreaker.execute(fn, context);
  }

  getAllStates() {
    const states = {};
    for (const [name, cb] of this.circuitBreakers.entries()) {
      states[name] = cb.getState();
    }
    return states;
  }

  reset(name) {
    const circuitBreaker = this.circuitBreakers.get(name);
    if (circuitBreaker) {
      circuitBreaker.reset();
    }
  }

  resetAll() {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.reset();
    }
  }
}

// Singleton instance
export const circuitBreakerManager = new CircuitBreakerManager();
