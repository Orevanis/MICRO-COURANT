import dotenv from "dotenv";

dotenv.config();

// Validate required environment variables (skip during tests)
if (process.env.NODE_ENV !== "test") {
  const requiredEnvVars = ["JWT_SECRET", "POSTGRES_PASSWORD"];
  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`,
    );
  }
}

export const config = {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 3000,

  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(",")
      : [
          "http://localhost:5173",
          "http://localhost:5174",
          "http://localhost:5175",
        ],
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    standardHeaders: true,
    legacyHeaders: false,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  },

  // PostgreSQL
  postgres: {
    host: process.env.POSTGRES_HOST || "localhost",
    port: parseInt(process.env.POSTGRES_PORT) || 5432,
    database: process.env.POSTGRES_DB || "micro_courant",
    user: process.env.POSTGRES_USER || "courant_user",
    password: process.env.POSTGRES_PASSWORD,
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // Service URLs
  services: {
    telemetry: process.env.TELEMETRY_SERVICE_URL || "http://localhost:3001",
    billing: process.env.BILLING_SERVICE_URL || "http://localhost:3002",
    contracts: process.env.CONTRACTS_SERVICE_URL || "http://localhost:3003",
  },

  // Stellar
  stellar: {
    network: process.env.STELLAR_NETWORK || "testnet",
    rpcUrl:
      process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org",
  },
};
