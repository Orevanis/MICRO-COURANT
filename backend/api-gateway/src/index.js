import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import {
  rateLimiter,
  contractCallRateLimiter,
  writeOperationRateLimiter,
} from "./middleware/rateLimiter.js";
import { auditLogger } from "./middleware/auditLogger.js";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { logger } from "./utils/logger.js";
import { config } from "./config/index.js";
import { proxyRoutes } from "./routes/proxy.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";

const app = express();
const PORT = config.port || 3000;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.cors.origins,
    credentials: true,
  }),
);
app.use(compression());

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
app.use(rateLimiter);

// Audit logging
app.use(auditLogger);

// Health check (no auth required)
app.use("/health", healthRoutes);

// Authentication routes
app.use("/api/v1/auth", authRoutes);

// Protected routes
app.use("/api/v1", authMiddleware);
app.use(
  "/api/v1/telemetry",
  proxyRoutes("telemetry", config.services.telemetry),
);
app.use("/api/v1/billing", proxyRoutes("billing", config.services.billing));
app.use(
  "/api/v1/contracts",
  contractCallRateLimiter,
  writeOperationRateLimiter,
  proxyRoutes("contracts", config.services.contracts),
);

// Error handling
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    app.listen(PORT, () => {
      logger.info(`API Gateway listening on port ${PORT}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(
        `Rate limit: ${config.rateLimit.max} requests per ${config.rateLimit.windowMs}ms`,
      );
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

startServer();
