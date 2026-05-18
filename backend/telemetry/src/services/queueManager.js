import Queue from "bull";
import { Redis } from "ioredis";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";

// Error classification
export const ErrorTypes = {
  TRANSIENT: "transient", // Temporary errors that should be retried
  PERMANENT: "permanent", // Permanent errors that should not be retried
  RATE_LIMIT: "rate_limit", // Rate limit errors that need backoff
  VALIDATION: "validation", // Input validation errors
  NETWORK: "network", // Network connectivity errors
  DATABASE: "database", // Database errors
  EXTERNAL_SERVICE: "external_service", // External service errors
};

// Error classification patterns
const ERROR_PATTERNS = {
  TRANSIENT: [
    /timeout/i,
    /ETIMEDOUT/i,
    /ECONNRESET/i,
    /ECONNREFUSED/i,
    /temporary/i,
    /temporarily/i,
  ],
  RATE_LIMIT: [/rate limit/i, /429/i, /too many requests/i],
  VALIDATION: [/validation/i, /invalid/i, /malformed/i, /required/i],
  NETWORK: [/network/i, /ENOTFOUND/i, /EHOSTUNREACH/i, /ECONNREFUSED/i],
  DATABASE: [/database/i, /postgres/i, /connection/i, /deadlock/i],
  EXTERNAL_SERVICE: [/stellar/i, /soroban/i, /external/i, /api/i],
};

export class QueueManager {
  constructor() {
    this.readingQueue = null;
    this.redis = null;
    this.lastId = null;
  }

  async initialize() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    });

    this.readingQueue = new Queue("meter-readings", {
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      },
      defaultJobOptions: {
        attempts: config.queue.retryAttempts || 3,
        backoff: {
          type: "exponential",
          delay: config.queue.retryDelay || 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    // Queue event handlers with error classification
    this.readingQueue.on("completed", (job, result) => {
      logger.info(`Job ${job.id} completed:`, result);
    });

    this.readingQueue.on("failed", (job, err) => {
      const errorType = this.classifyError(err);
      logger.error(`Job ${job.id} failed [${errorType}]:`, err.message);

      // Log additional context for specific error types
      if (errorType === ErrorTypes.PERMANENT) {
        logger.error(`Permanent error for job ${job.id}, will not retry`);
      } else if (errorType === ErrorTypes.RATE_LIMIT) {
        logger.warn(
          `Rate limit hit for job ${job.id}, will retry with backoff`,
        );
      }
    });

    this.readingQueue.on("stalled", (job) => {
      logger.warn(`Job ${job.id} stalled`);
    });

    logger.info("Queue manager initialized");
  }

  classifyError(error) {
    const errorMessage = error.message || "";
    const errorName = error.name || "";

    // Check for specific error patterns
    for (const [type, patterns] of Object.entries(ERROR_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(errorMessage) || pattern.test(errorName)) {
          return type.toUpperCase();
        }
      }
    }

    // Default classification based on error code
    if (error.code) {
      if (error.code === "ETIMEDOUT" || error.code === "ECONNRESET") {
        return ErrorTypes.TRANSIENT.toUpperCase();
      }
      if (error.code === "ECONNREFUSED") {
        return ErrorTypes.NETWORK.toUpperCase();
      }
    }

    // Default to transient for unknown errors
    return ErrorTypes.TRANSIENT.toUpperCase();
  }

  shouldRetry(error, attemptsMade) {
    const errorType = this.classifyError(error);
    const maxAttempts = config.queue.retryAttempts || 3;

    // Don't retry permanent errors
    if (errorType === ErrorTypes.PERMANENT.toUpperCase()) {
      return false;
    }

    // Don't retry validation errors
    if (errorType === ErrorTypes.VALIDATION.toUpperCase()) {
      return false;
    }

    // Retry transient errors up to max attempts
    if (errorType === ErrorTypes.TRANSIENT.toUpperCase()) {
      return attemptsMade < maxAttempts;
    }

    // Retry network errors with more attempts
    if (errorType === ErrorTypes.NETWORK.toUpperCase()) {
      return attemptsMade < maxAttempts + 2;
    }

    // Retry rate limit errors with exponential backoff
    if (errorType === ErrorTypes.RATE_LIMIT.toUpperCase()) {
      return attemptsMade < maxAttempts + 1;
    }

    // Default: retry up to max attempts
    return attemptsMade < maxAttempts;
  }

  getRetryDelay(attemptsMade, errorType) {
    const baseDelay = config.queue.retryDelay || 5000;

    // Exponential backoff for rate limits
    if (errorType === ErrorTypes.RATE_LIMIT.toUpperCase()) {
      return baseDelay * Math.pow(2, attemptsMade);
    }

    // Longer backoff for network errors
    if (errorType === ErrorTypes.NETWORK.toUpperCase()) {
      return baseDelay * Math.pow(2, attemptsMade);
    }

    // Standard backoff for transient errors
    return baseDelay * attemptsMade;
  }

  async addReading(reading) {
    const job = await this.readingQueue.add("process-reading", reading, {
      priority: this.calculatePriority(reading),
      attempts: config.queue.retryAttempts || 3,
      backoff: {
        type: "exponential",
        delay: config.queue.retryDelay || 5000,
      },
    });

    this.lastId = job.id;
    logger.debug(`Reading added to queue: ${job.id}`);

    return job.id;
  }

  calculatePriority(reading) {
    // Higher priority for high consumption readings
    if (reading.consumption_kwh > 10) {
      return 1; // High priority
    } else if (reading.consumption_kwh > 5) {
      return 5; // Medium priority
    }
    return 10; // Low priority
  }

  startProcessing(telemetryService) {
    this.readingQueue.process(config.queue.concurrency, async (job) => {
      const attemptsMade = job.attemptsMade || 0;

      try {
        const result = await telemetryService.processReading(job.data);
        return result;
      } catch (error) {
        const errorType = this.classifyError(error);

        // Check if we should retry
        if (!this.shouldRetry(error, attemptsMade)) {
          logger.error(
            `Job ${job.id} will not be retried [${errorType}]:`,
            error.message,
          );
          // Mark as failed without retry
          throw new Error(`Permanent error: ${error.message}`);
        }

        // Calculate retry delay
        const retryDelay = this.getRetryDelay(attemptsMade, errorType);
        logger.warn(
          `Job ${job.id} will retry in ${retryDelay}ms [${errorType}]`,
        );

        throw error;
      }
    });

    logger.info(
      `Queue processing started with concurrency: ${config.queue.concurrency}`,
    );
  }

  async getQueueStats() {
    const waiting = await this.readingQueue.getWaiting();
    const active = await this.readingQueue.getActive();
    const completed = await this.readingQueue.getCompleted();
    const failed = await this.readingQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  async shutdown() {
    if (this.readingQueue) {
      await this.readingQueue.close();
      logger.info("Queue closed");
    }

    if (this.redis) {
      await this.redis.quit();
      logger.info("Queue Redis connection closed");
    }
  }
}
