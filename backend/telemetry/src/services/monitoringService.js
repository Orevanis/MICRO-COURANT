import { Redis } from "ioredis";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";
import { circuitBreakerManager } from "@micro-courant/circuit-breaker";

export class MonitoringService {
  constructor() {
    this.redis = null;
    this.metrics = {
      circuitBreakerTransitions: 0,
      fraudDetections: 0,
      falsePositives: 0,
      truePositives: 0,
      proposalsCreated: 0,
      proposalsApproved: 0,
      proposalsExecuted: 0,
      securityAlerts: 0,
    };
  }

  async initialize() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    });

    // Load persisted metrics
    await this.loadMetrics();

    // Start periodic monitoring
    this.startPeriodicMonitoring();

    logger.info("Monitoring service initialized");
  }

  async loadMetrics() {
    try {
      const savedMetrics = await this.redis.get("monitoring:metrics");
      if (savedMetrics) {
        this.metrics = JSON.parse(savedMetrics);
      }
    } catch (error) {
      logger.warn("Failed to load monitoring metrics:", error);
    }
  }

  async saveMetrics() {
    try {
      await this.redis.set("monitoring:metrics", JSON.stringify(this.metrics));
      await this.redis.expire("monitoring:metrics", 86400); // 24 hours
    } catch (error) {
      logger.error("Failed to save monitoring metrics:", error);
    }
  }

  startPeriodicMonitoring() {
    // Check circuit breaker states every 30 seconds
    setInterval(() => {
      this.checkCircuitBreakerStates();
    }, 30000);

    // Check fraud threshold anomalies every 5 minutes
    setInterval(() => {
      this.checkFraudThresholdAnomalies();
    }, 300000);

    // Check for pending proposals every minute
    setInterval(() => {
      this.checkPendingProposals();
    }, 60000);

    // Save metrics every minute
    setInterval(() => {
      this.saveMetrics();
    }, 60000);
  }

  async checkCircuitBreakerStates() {
    try {
      const states = circuitBreakerManager.getAllStates();

      for (const [name, state] of Object.entries(states)) {
        const key = `monitoring:circuit:${name}`;
        const previousState = await this.redis.get(key);

        if (previousState !== state.state) {
          // State transition detected
          this.metrics.circuitBreakerTransitions++;

          logger.warn(
            `Circuit breaker state transition: ${name} ${previousState} -> ${state.state}`,
          );

          // Alert if circuit is OPEN
          if (state.state === "OPEN") {
            await this.sendSecurityAlert({
              type: "circuit_breaker_open",
              component: name,
              state: state,
              timestamp: Date.now(),
            });
          }

          await this.redis.set(key, state.state);
          await this.redis.expire(key, 86400);
        }
      }
    } catch (error) {
      logger.error("Error checking circuit breaker states:", error);
    }
  }

  async checkFraudThresholdAnomalies() {
    try {
      // Get global threshold stats from fraud detector
      const keys = await this.redis.keys("fraud:profile:*");

      if (keys.length === 0) {
        return;
      }

      let extremeAdjustments = 0;
      const anomalousMeters = [];

      for (const key of keys) {
        const profile = JSON.parse(await this.redis.get(key));

        if (
          (profile.spikeAdjustment && profile.spikeAdjustment > 2.5) ||
          (profile.frequencyAdjustment && profile.frequencyAdjustment > 2.5)
        ) {
          extremeAdjustments++;
          anomalousMeters.push(profile.meterId);
        }
      }

      if (extremeAdjustments > 0) {
        logger.warn(
          `Detected ${extremeAdjustments} meters with extreme threshold adjustments`,
        );

        await this.sendSecurityAlert({
          type: "fraud_threshold_anomaly",
          count: extremeAdjustments,
          meters: anomalousMeters,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      logger.error("Error checking fraud threshold anomalies:", error);
    }
  }

  async checkPendingProposals() {
    try {
      // This would check for proposals that have been pending too long
      const pendingThreshold = 86400000; // 24 hours

      const alertKey = `monitoring:pending_proposals_alert`;
      const lastAlert = await this.redis.get(alertKey);

      if (lastAlert && Date.now() - parseInt(lastAlert) < 3600000) {
        return; // Already alerted within the last hour
      }

      // In a real implementation, this would query the smart contract
      // For now, we'll just log a placeholder
      logger.debug("Checking for pending proposals...");
    } catch (error) {
      logger.error("Error checking pending proposals:", error);
    }
  }

  async sendSecurityAlert(alert) {
    this.metrics.securityAlerts++;

    // Store alert in Redis for dashboard
    const alertKey = `monitoring:alerts:${Date.now()}`;
    await this.redis.set(alertKey, JSON.stringify(alert));
    await this.redis.expire(alertKey, 604800); // 7 days

    // Add to recent alerts list
    await this.redis.lpush("monitoring:recent_alerts", JSON.stringify(alert));
    await this.redis.ltrim("monitoring:recent_alerts", 0, 99); // Keep last 100

    logger.error("Security alert:", alert);
  }

  async recordFraudDetection(meterId, checkType) {
    this.metrics.fraudDetections++;

    const key = `monitoring:fraud:${meterId}`;
    const data = await this.redis.get(key);
    const detections = data ? JSON.parse(data) : {};

    detections[checkType] = (detections[checkType] || 0) + 1;
    detections.lastDetection = Date.now();

    await this.redis.set(key, JSON.stringify(detections));
    await this.redis.expire(key, 604800);
  }

  async recordFalsePositive(meterId, checkType) {
    this.metrics.falsePositives++;

    const key = `monitoring:false_positives:${meterId}`;
    const data = await this.redis.get(key);
    const falsePositives = data ? JSON.parse(data) : {};

    falsePositives[checkType] = (falsePositives[checkType] || 0) + 1;

    await this.redis.set(key, JSON.stringify(falsePositives));
    await this.redis.expire(key, 604800);
  }

  async recordTruePositive(meterId, checkType) {
    this.metrics.truePositives++;

    const key = `monitoring:true_positives:${meterId}`;
    const data = await this.redis.get(key);
    const truePositives = data ? JSON.parse(data) : {};

    truePositives[checkType] = (truePositives[checkType] || 0) + 1;

    await this.redis.set(key, JSON.stringify(truePositives));
    await this.redis.expire(key, 604800);
  }

  async recordProposalCreated(proposalId, proposalType) {
    this.metrics.proposalsCreated++;

    const key = `monitoring:proposals`;
    await this.redis.incr(key);
  }

  async recordProposalApproved(proposalId) {
    this.metrics.proposalsApproved++;

    const key = `monitoring:proposals:approved`;
    await this.redis.incr(key);
  }

  async recordProposalExecuted(proposalId, proposalType) {
    this.metrics.proposalsExecuted++;

    const key = `monitoring:proposals:executed`;
    await this.redis.incr(key);
  }

  async getMonitoringDashboard() {
    try {
      const circuitStates = circuitBreakerManager.getAllStates();
      const recentAlerts = await this.redis.lrange(
        "monitoring:recent_alerts",
        0,
        9,
      );

      return {
        metrics: this.metrics,
        circuitBreakers: circuitStates,
        recentAlerts: recentAlerts.map((alert) => JSON.parse(alert)),
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error("Error getting monitoring dashboard:", error);
      throw error;
    }
  }

  async getMeterMonitoringData(meterId) {
    try {
      const fraudDetections = await this.redis.get(
        `monitoring:fraud:${meterId}`,
      );
      const falsePositives = await this.redis.get(
        `monitoring:false_positives:${meterId}`,
      );
      const truePositives = await this.redis.get(
        `monitoring:true_positives:${meterId}`,
      );

      return {
        meterId,
        fraudDetections: fraudDetections ? JSON.parse(fraudDetections) : {},
        falsePositives: falsePositives ? JSON.parse(falsePositives) : {},
        truePositives: truePositives ? JSON.parse(truePositives) : {},
      };
    } catch (error) {
      logger.error("Error getting meter monitoring data:", error);
      throw error;
    }
  }

  async resetMetrics() {
    this.metrics = {
      circuitBreakerTransitions: 0,
      fraudDetections: 0,
      falsePositives: 0,
      truePositives: 0,
      proposalsCreated: 0,
      proposalsApproved: 0,
      proposalsExecuted: 0,
      securityAlerts: 0,
    };

    await this.saveMetrics();
    logger.info("Monitoring metrics reset");
  }

  async shutdown() {
    await this.saveMetrics();

    if (this.redis) {
      await this.redis.quit();
      logger.info("Monitoring service Redis connection closed");
    }
  }
}
