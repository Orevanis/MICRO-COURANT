export const CircuitState = {
  CLOSED: 'closed',
  OPEN: 'open',
  HALF_OPEN: 'half_open'
};

export class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'CircuitBreaker';
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.monitoringPeriod = options.monitoringPeriod || 10000;
    
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    this.lastStateChange = Date.now();
    
    this.onStateChange = options.onStateChange || null;
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
      
      if (this.successCount >= 2) {
        this.transitionTo(CircuitState.CLOSED);
      }
    } else {
      this.failureCount = 0;
    }
  }

  onFailure(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();

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
    
    if (newState === CircuitState.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
    } else if (newState === CircuitState.OPEN) {
      this.successCount = 0;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successCount = 0;
    }

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
  }
}

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
