import { Redis } from "ioredis";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";

export class FraudDetector {
  constructor() {
    this.redis = null;
    this.thresholds = {
      duplicateThreshold: config.fraud.duplicateThreshold || 60000, // 1 minute default
      maxReadingIncrease: config.fraud.maxReadingIncrease || 3.0, // 3x default
      minReadingInterval: config.fraud.minReadingInterval || 60000, // 1 minute default
      tamperingThreshold: config.fraud.tamperingThreshold || 5,
    };

    // Adaptive thresholds per meter
    this.meterProfiles = new Map();
  }

  async initialize() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    });

    // Load adaptive thresholds from config or defaults
    await this.loadAdaptiveThresholds();

    logger.info("Fraud detector initialized with adaptive thresholds");
  }

  async loadAdaptiveThresholds() {
    try {
      const adaptiveConfig = await this.redis.get("fraud:adaptive_config");
      if (adaptiveConfig) {
        const config = JSON.parse(adaptiveConfig);
        this.thresholds = { ...this.thresholds, ...config };
        logger.info("Loaded adaptive thresholds from Redis");
      }
    } catch (error) {
      logger.warn("Failed to load adaptive thresholds, using defaults");
    }
  }

  async updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };

    // Save to Redis for persistence
    await this.redis.set(
      "fraud:adaptive_config",
      JSON.stringify(this.thresholds),
    );
    await this.redis.expire("fraud:adaptive_config", 86400); // 24 hours

    logger.info("Updated fraud detection thresholds:", this.thresholds);
  }

  async getMeterProfile(meterId) {
    const profileKey = `fraud:profile:${meterId}`;
    const profile = await this.redis.get(profileKey);

    if (profile) {
      return JSON.parse(profile);
    }

    // Initialize default profile for new meter
    const defaultProfile = {
      meterId,
      averageConsumption: 0,
      readingCount: 0,
      standardDeviation: 0,
      lastAdaptiveUpdate: Date.now(),
    };

    await this.redis.set(profileKey, JSON.stringify(defaultProfile));
    return defaultProfile;
  }

  async updateMeterProfile(meterId, consumption) {
    const profile = await this.getMeterProfile(meterId);

    // Update running average and standard deviation
    profile.readingCount++;
    const oldAverage = profile.averageConsumption;
    profile.averageConsumption =
      oldAverage + (consumption - oldAverage) / profile.readingCount;

    // Simple standard deviation calculation
    const variance = Math.pow(consumption - profile.averageConsumption, 2);
    profile.standardDeviation = Math.sqrt(
      (profile.standardDeviation * (profile.readingCount - 1) + variance) /
        profile.readingCount,
    );

    profile.lastAdaptiveUpdate = Date.now();

    await this.redis.set(`fraud:profile:${meterId}`, JSON.stringify(profile));
    await this.redis.expire(`fraud:profile:${meterId}`, 604800); // 7 days
  }

  async detectFraud(reading) {
    const checks = [];
    const meterId = reading.meter_id;
    const timestamp = reading.timestamp || Date.now();
    const consumption = reading.consumption_kwh;

    // Check 1: Duplicate reading detection
    const duplicateCheck = await this.checkDuplicateReading(
      meterId,
      consumption,
      timestamp,
    );
    checks.push({ type: "duplicate", ...duplicateCheck });

    // Check 2: Abnormal consumption spike (adaptive)
    const spikeCheck = await this.checkConsumptionSpike(meterId, consumption);
    checks.push({ type: "spike", ...spikeCheck });

    // Check 3: Reading frequency (adaptive)
    const frequencyCheck = await this.checkReadingFrequency(meterId, timestamp);
    checks.push({ type: "frequency", ...frequencyCheck });

    // Check 4: Meter tampering detection
    const tamperingCheck = await this.checkMeterTampering(meterId);
    checks.push({ type: "tampering", ...tamperingCheck });

    // Update meter profile for adaptive learning
    if (!checks.some((c) => c.isSuspicious)) {
      await this.updateMeterProfile(meterId, consumption);
    }

    // Aggregate results
    const suspiciousChecks = checks.filter((c) => c.isSuspicious);

    if (suspiciousChecks.length > 0) {
      return {
        isSuspicious: true,
        reason: suspiciousChecks.map((c) => c.reason).join(", "),
        checks,
      };
    }

    return {
      isSuspicious: false,
      checks,
    };
  }

  async checkDuplicateReading(meterId, consumption, timestamp) {
    const key = `fraud:duplicate:${meterId}:${consumption}`;
    const existing = await this.redis.get(key);

    if (existing) {
      const existingTimestamp = parseInt(existing);
      const timeDiff = timestamp - existingTimestamp;

      if (timeDiff < this.thresholds.duplicateThreshold) {
        return {
          isSuspicious: true,
          reason: "Duplicate reading detected within threshold",
        };
      }
    }

    await this.redis.setex(key, 3600, timestamp);

    return { isSuspicious: false };
  }

  async checkConsumptionSpike(meterId, consumption) {
    const adaptiveThreshold = await this.getAdaptiveThreshold(meterId, "spike");
    const lastReadingKey = `meter:${meterId}:last_reading`;
    const lastReading = await this.redis.get(lastReadingKey);

    if (lastReading) {
      const lastConsumption = parseFloat(lastReading);
      const increaseRatio = consumption / lastConsumption;

      if (increaseRatio > adaptiveThreshold && consumption > 1) {
        return {
          isSuspicious: true,
          reason: `Abnormal consumption spike: ${increaseRatio.toFixed(2)}x increase (threshold: ${adaptiveThreshold.toFixed(2)}x)`,
        };
      }
    }

    await this.redis.set(lastReadingKey, consumption);

    return { isSuspicious: false };
  }

  async checkReadingFrequency(meterId, timestamp) {
    const adaptiveThreshold = await this.getAdaptiveThreshold(
      meterId,
      "frequency",
    );
    const lastTimestampKey = `meter:${meterId}:last_timestamp`;
    const lastTimestamp = await this.redis.get(lastTimestampKey);

    if (lastTimestamp) {
      const lastTime = parseInt(lastTimestamp);
      const timeDiff = timestamp - lastTime;

      if (timeDiff < adaptiveThreshold) {
        return {
          isSuspicious: true,
          reason: `Reading frequency too high: ${timeDiff}ms interval (threshold: ${adaptiveThreshold}ms)`,
        };
      }
    }

    await this.redis.set(lastTimestampKey, timestamp);

    return { isSuspicious: false };
  }

  async checkMeterTampering(meterId) {
    const tamperingScoreKey = `fraud:tampering:${meterId}`;
    const score = await this.redis.get(tamperingScoreKey);

    if (score && parseInt(score) > this.thresholds.tamperingThreshold) {
      return {
        isSuspicious: true,
        reason: "High tampering score detected",
      };
    }

    return { isSuspicious: false };
  }

  async reportTampering(meterId) {
    const tamperingScoreKey = `fraud:tampering:${meterId}`;
    await this.redis.incr(tamperingScoreKey);
    await this.redis.expire(tamperingScoreKey, 86400);
  }

  async getMeterStats(meterId) {
    const profile = await this.getMeterProfile(meterId);
    const tamperingScore = await this.redis.get(`fraud:tampering:${meterId}`);

    return {
      meterId,
      profile,
      tamperingScore: tamperingScore ? parseInt(tamperingScore) : 0,
      currentThresholds: {
        spike: await this.getAdaptiveThreshold(meterId, "spike"),
        frequency: await this.getAdaptiveThreshold(meterId, "frequency"),
      },
    };
  }

  async reportFalsePositive(meterId, checkType) {
    // Feedback loop: when a fraud detection is marked as false positive,
    // adjust the adaptive threshold to be more lenient for this meter
    const profile = await this.getMeterProfile(meterId);

    // Increase the adaptive threshold for this check type
    const adjustmentFactor = 1.1; // 10% more lenient

    switch (checkType) {
      case "spike":
        profile.spikeAdjustment =
          (profile.spikeAdjustment || 1.0) * adjustmentFactor;
        break;
      case "frequency":
        profile.frequencyAdjustment =
          (profile.frequencyAdjustment || 1.0) * adjustmentFactor;
        break;
      case "duplicate":
        profile.duplicateAdjustment =
          (profile.duplicateAdjustment || 1.0) * adjustmentFactor;
        break;
    }

    await this.redis.set(`fraud:profile:${meterId}`, JSON.stringify(profile));
    await this.redis.expire(`fraud:profile:${meterId}`, 604800);

    logger.info(
      `Adjusted threshold for ${meterId} after false positive: ${checkType}`,
    );
  }

  async reportTruePositive(meterId, checkType) {
    // Feedback loop: when a fraud detection is confirmed as true positive,
    // adjust the adaptive threshold to be more strict for this meter
    const profile = await this.getMeterProfile(meterId);

    // Decrease the adaptive threshold for this check type
    const adjustmentFactor = 0.9; // 10% more strict

    switch (checkType) {
      case "spike":
        profile.spikeAdjustment =
          (profile.spikeAdjustment || 1.0) * adjustmentFactor;
        break;
      case "frequency":
        profile.frequencyAdjustment =
          (profile.frequencyAdjustment || 1.0) * adjustmentFactor;
        break;
      case "duplicate":
        profile.duplicateAdjustment =
          (profile.duplicateAdjustment || 1.0) * adjustmentFactor;
        break;
    }

    await this.redis.set(`fraud:profile:${meterId}`, JSON.stringify(profile));
    await this.redis.expire(`fraud:profile:${meterId}`, 604800);

    logger.info(
      `Adjusted threshold for ${meterId} after true positive: ${checkType}`,
    );
  }

  async getAdaptiveThreshold(meterId, thresholdType) {
    const profile = await this.getMeterProfile(meterId);

    let baseThreshold;
    switch (thresholdType) {
      case "spike":
        if (profile.readingCount < 10) {
          baseThreshold = this.thresholds.maxReadingIncrease;
        } else {
          baseThreshold = Math.max(
            2.0,
            2.0 + profile.standardDeviation / profile.averageConsumption,
          );
        }
        return baseThreshold * (profile.spikeAdjustment || 1.0);

      case "frequency":
        baseThreshold = this.thresholds.minReadingInterval;
        return baseThreshold * (profile.frequencyAdjustment || 1.0);

      default:
        return this.thresholds[thresholdType];
    }
  }

  async getGlobalThresholdStats() {
    const keys = await this.redis.keys("fraud:profile:*");
    const stats = {
      totalMeters: keys.length,
      averageSpikeAdjustment: 0,
      averageFrequencyAdjustment: 0,
      metersNeedingReview: [],
    };

    if (keys.length === 0) {
      return stats;
    }

    let totalSpikeAdj = 0;
    let totalFreqAdj = 0;

    for (const key of keys) {
      const profile = JSON.parse(await this.redis.get(key));

      if (profile.spikeAdjustment) {
        totalSpikeAdj += profile.spikeAdjustment;
      }
      if (profile.frequencyAdjustment) {
        totalFreqAdj += profile.frequencyAdjustment;
      }

      // Flag meters with extreme adjustments for review
      if (
        (profile.spikeAdjustment && profile.spikeAdjustment > 2.0) ||
        (profile.frequencyAdjustment && profile.frequencyAdjustment > 2.0)
      ) {
        stats.metersNeedingReview.push(profile.meterId);
      }
    }

    stats.averageSpikeAdjustment = totalSpikeAdj / keys.length;
    stats.averageFrequencyAdjustment = totalFreqAdj / keys.length;

    return stats;
  }

  async resetMeterAdjustments(meterId) {
    const profile = await this.getMeterProfile(meterId);
    profile.spikeAdjustment = 1.0;
    profile.frequencyAdjustment = 1.0;
    profile.duplicateAdjustment = 1.0;

    await this.redis.set(`fraud:profile:${meterId}`, JSON.stringify(profile));
    await this.redis.expire(`fraud:profile:${meterId}`, 604800);

    logger.info(`Reset threshold adjustments for ${meterId}`);
  }

  async shutdown() {
    if (this.redis) {
      await this.redis.quit();
      logger.info("Fraud detector Redis connection closed");
    }
  }
}
