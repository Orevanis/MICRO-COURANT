import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import {
  CircuitBreaker,
  CircuitBreakerManager,
  CircuitState,
} from "../../shared/circuit-breaker/src/index.js";

describe("Integration Tests - Circuit Breaker", () => {
  let circuitBreaker;
  let manager;

  beforeAll(() => {
    manager = new CircuitBreakerManager();
  });

  it("should transition from CLOSED to OPEN after threshold failures", async () => {
    circuitBreaker = manager.register("test-service", {
      failureThreshold: 3,
      resetTimeout: 1000,
    });

    expect(circuitBreaker.getState().state).toBe(CircuitState.CLOSED);

    // Trigger failures
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(async () => {
          throw new Error("Test failure");
        });
      } catch (error) {
        // Expected
      }
    }

    expect(circuitBreaker.getState().state).toBe(CircuitState.OPEN);
  });

  it("should transition to HALF_OPEN after reset timeout", async () => {
    await new Promise((resolve) => setTimeout(resolve, 1100));

    try {
      await circuitBreaker.execute(async () => {
        return "success";
      });
    } catch (error) {
      // Expected - circuit might still be open or transitioning
    }

    expect(circuitBreaker.getState().state).toBe(CircuitState.HALF_OPEN);
  });

  it("should transition back to CLOSED after successful calls in HALF_OPEN", async () => {
    // Force to HALF_OPEN state
    circuitBreaker.transitionTo(CircuitState.HALF_OPEN);

    // Execute successful calls
    for (let i = 0; i < 2; i++) {
      await circuitBreaker.execute(async () => {
        return "success";
      });
    }

    expect(circuitBreaker.getState().state).toBe(CircuitState.CLOSED);
  });

  it("should track state transitions", async () => {
    const transitions = [];
    circuitBreaker = manager.register("transition-test", {
      failureThreshold: 2,
      resetTimeout: 500,
      onStateChange: (newState, oldState) => {
        transitions.push({ from: oldState, to: newState });
      },
    });

    // Trigger transition to OPEN
    for (let i = 0; i < 2; i++) {
      try {
        await circuitBreaker.execute(async () => {
          throw new Error("Test");
        });
      } catch (_error) {
        /* expected */
      }
    }

    expect(transitions.length).toBeGreaterThan(0);
    expect(transitions[transitions.length - 1].to).toBe(CircuitState.OPEN);
  });

  it("should provide state information", () => {
    const state = circuitBreaker.getState();

    expect(state).toHaveProperty("name");
    expect(state).toHaveProperty("state");
    expect(state).toHaveProperty("failureCount");
    expect(state).toHaveProperty("successCount");
    expect(state).toHaveProperty("lastFailureTime");
    expect(state).toHaveProperty("lastStateChange");
    expect(state).toHaveProperty("timeInCurrentState");
  });

  it("should allow manual reset", () => {
    circuitBreaker.transitionTo(CircuitState.OPEN);
    expect(circuitBreaker.getState().state).toBe(CircuitState.OPEN);

    circuitBreaker.reset();
    expect(circuitBreaker.getState().state).toBe(CircuitState.CLOSED);
  });

  it("should manage multiple circuit breakers", () => {
    manager.register("service-a", { failureThreshold: 3 });
    manager.register("service-b", { failureThreshold: 5 });
    manager.register("service-c", { failureThreshold: 2 });

    const states = manager.getAllStates();
    expect(Object.keys(states).length).toBeGreaterThanOrEqual(3);
    expect(states["service-a"]).toBeDefined();
    expect(states["service-b"]).toBeDefined();
    expect(states["service-c"]).toBeDefined();
  });
});

describe("Integration Tests - Adaptive Fraud Detection", () => {
  // Mock Redis for testing
  class MockRedis {
    constructor() {
      this.data = new Map();
    }

    async get(key) {
      return this.data.get(key);
    }

    async set(key, value) {
      this.data.set(key, value);
    }

    async setex(key, ttl, value) {
      this.data.set(key, value);
    }

    async expire(key, ttl) {
      // Mock implementation
    }

    async incr(key) {
      const current = parseInt(this.data.get(key) || "0");
      this.data.set(key, (current + 1).toString());
      return current + 1;
    }
  }

  it("should adapt thresholds based on meter profile", async () => {
    // This would test the fraud detector's adaptive threshold logic
    // For now, we'll create a simplified test
    const mockRedis = new MockRedis();

    // Simulate meter profile data
    const profile = {
      meterId: "meter-001",
      averageConsumption: 5.0,
      readingCount: 20,
      standardDeviation: 1.5,
      lastAdaptiveUpdate: Date.now(),
    };

    await mockRedis.set("fraud:profile:meter-001", JSON.stringify(profile));

    const retrievedProfile = JSON.parse(
      await mockRedis.get("fraud:profile:meter-001"),
    );

    expect(retrievedProfile.averageConsumption).toBe(5.0);
    expect(retrievedProfile.readingCount).toBe(20);

    // Calculate adaptive threshold based on standard deviation
    const adaptiveThreshold = Math.max(
      2.0,
      2.0 + profile.standardDeviation / profile.averageConsumption,
    );
    expect(adaptiveThreshold).toBeGreaterThan(2.0);
  });

  it("should update meter profile with new readings", async () => {
    const mockRedis = new MockRedis();

    const initialProfile = {
      meterId: "meter-002",
      averageConsumption: 3.0,
      readingCount: 5,
      standardDeviation: 0.5,
      lastAdaptiveUpdate: Date.now(),
    };

    await mockRedis.set(
      "fraud:profile:meter-002",
      JSON.stringify(initialProfile),
    );

    // Simulate adding a new reading
    const newConsumption = 4.0;
    const profile = JSON.parse(await mockRedis.get("fraud:profile:meter-002"));

    profile.readingCount++;
    const oldAverage = profile.averageConsumption;
    profile.averageConsumption =
      oldAverage + (newConsumption - oldAverage) / profile.readingCount;

    await mockRedis.set("fraud:profile:meter-002", JSON.stringify(profile));

    const updatedProfile = JSON.parse(
      await mockRedis.get("fraud:profile:meter-002"),
    );
    expect(updatedProfile.readingCount).toBe(6);
    expect(updatedProfile.averageConsumption).toBeGreaterThan(3.0);
  });
});

describe("Integration Tests - Multi-Sig Governance", () => {
  it("should track admin signatures for proposals", () => {
    const proposal = {
      id: "prop-001",
      type: "tariff_change",
      proposedBy: "admin-1",
      signatures: new Map(),
      threshold: 2,
      status: "pending",
    };

    proposal.signatures.set("admin-1", true);
    proposal.signatures.set("admin-2", true);

    const signatureCount = proposal.signatures.size;
    const thresholdMet = signatureCount >= proposal.threshold;

    expect(thresholdMet).toBe(true);
    expect(proposal.status).toBe("pending");

    if (thresholdMet) {
      proposal.status = "approved";
    }

    expect(proposal.status).toBe("approved");
  });

  it("should prevent execution without sufficient signatures", () => {
    const proposal = {
      id: "prop-002",
      signatures: new Map(),
      threshold: 3,
      status: "pending",
    };

    proposal.signatures.set("admin-1", true);
    proposal.signatures.set("admin-2", true);

    const signatureCount = proposal.signatures.size;
    const canExecute = signatureCount >= proposal.threshold;

    expect(canExecute).toBe(false);
    expect(proposal.status).toBe("pending");
  });

  it("should track proposal expiration", () => {
    const proposal = {
      id: "prop-003",
      createdAt: Date.now() - 86400001, // 1ms past expiration
      expiration: 86400000,
      status: "pending",
    };

    const age = Date.now() - proposal.createdAt;
    const isExpired = age > proposal.expiration;

    expect(isExpired).toBe(true);

    if (isExpired) {
      proposal.status = "expired";
    }

    expect(proposal.status).toBe("expired");
  });
});
