import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 3002,

  postgres: {
    host: process.env.POSTGRES_HOST || "localhost",
    port: parseInt(process.env.POSTGRES_PORT) || 5432,
    database: process.env.POSTGRES_DB || "micro_courant",
    user: process.env.POSTGRES_USER || "courant_user",
    password: process.env.POSTGRES_PASSWORD || "dev_password_change_in_prod",
  },

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  stellar: {
    network: process.env.STELLAR_NETWORK || "testnet",
    rpcUrl:
      process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org",
  },
};
