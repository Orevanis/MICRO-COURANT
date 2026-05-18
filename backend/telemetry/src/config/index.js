import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,

  // PostgreSQL
  postgres: {
    host: process.env.POSTGRES_HOST || "localhost",
    port: parseInt(process.env.POSTGRES_PORT) || 5432,
    database: process.env.POSTGRES_DB || "micro_courant",
    user: process.env.POSTGRES_USER || "courant_user",
    password: process.env.POSTGRES_PASSWORD || "dev_password_change_in_prod",
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // MQTT
  mqtt: {
    broker: process.env.MQTT_BROKER || "localhost",
    port: parseInt(process.env.MQTT_PORT) || 1883,
    clientId: process.env.MQTT_CLIENT_ID || "telemetry-service",
    topic: process.env.MQTT_TOPIC || "energy/meters/+/readings",
  },

  // Stellar
  stellar: {
    network: process.env.STELLAR_NETWORK || "testnet",
    rpcUrl:
      process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org",
  },

  // Fraud detection
  fraud: {
    maxReadingIncrease: parseFloat(process.env.MAX_READING_INCREASE) || 5.0, // 5x max increase
    minReadingInterval: parseInt(process.env.MIN_READING_INTERVAL) || 1000, // 1 second min
    duplicateThreshold: parseInt(process.env.DUPLICATE_THRESHOLD) || 5000, // 5 seconds
  },

  // Queue
  queue: {
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY) || 10,
    retryAttempts: parseInt(process.env.QUEUE_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(process.env.QUEUE_RETRY_DELAY) || 5000,
  },
};
