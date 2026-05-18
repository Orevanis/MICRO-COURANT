import express from "express";
import { TelemetryService } from "./services/telemetryService.js";
import { MQTTClient } from "./services/mqttClient.js";
import { QueueManager } from "./services/queueManager.js";
import { FraudDetector } from "./services/fraudDetector.js";
import { logger } from "./utils/logger.js";
import { config } from "./config/index.js";

const app = express();
const PORT = config.port || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize services
const telemetryService = new TelemetryService();
const mqttClient = new MQTTClient();
const queueManager = new QueueManager();
const fraudDetector = new FraudDetector();

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Ingest meter reading endpoint
app.post("/api/v1/telemetry/ingest", async (req, res) => {
  try {
    const { meter_id, household_id, consumption_kwh, timestamp, signature } =
      req.body;

    // Validate input
    if (!meter_id || !household_id || consumption_kwh === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check for fraud
    const fraudCheck = await fraudDetector.detectFraud({
      meter_id,
      consumption_kwh,
      timestamp: timestamp || Date.now(),
    });

    if (fraudCheck.isSuspicious) {
      logger.warn(
        `Suspicious activity detected for meter ${meter_id}: ${fraudCheck.reason}`,
      );
      return res.status(403).json({
        error: "Suspicious activity detected",
        reason: fraudCheck.reason,
      });
    }

    // Queue for processing
    await queueManager.addReading({
      meter_id,
      household_id,
      consumption_kwh,
      timestamp: timestamp || Date.now(),
      signature,
    });

    res.json({
      status: "queued",
      message: "Reading queued for processing",
      queue_id: queueManager.lastId,
    });
  } catch (error) {
    logger.error("Error ingesting telemetry:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Batch ingest endpoint
app.post("/api/v1/telemetry/batch", async (req, res) => {
  try {
    const { readings } = req.body;

    if (!Array.isArray(readings) || readings.length === 0) {
      return res.status(400).json({ error: "Invalid readings array" });
    }

    const results = [];

    for (const reading of readings) {
      try {
        const fraudCheck = await fraudDetector.detectFraud(reading);

        if (fraudCheck.isSuspicious) {
          results.push({
            meter_id: reading.meter_id,
            status: "rejected",
            reason: fraudCheck.reason,
          });
          continue;
        }

        await queueManager.addReading(reading);
        results.push({
          meter_id: reading.meter_id,
          status: "queued",
        });
      } catch (error) {
        results.push({
          meter_id: reading.meter_id,
          status: "error",
          error: error.message,
        });
      }
    }

    res.json({
      status: "processed",
      results,
      total: readings.length,
      queued: results.filter((r) => r.status === "queued").length,
    });
  } catch (error) {
    logger.error("Error in batch ingest:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get meter statistics
app.get("/api/v1/telemetry/meter/:meter_id/stats", async (req, res) => {
  try {
    const { meter_id } = req.params;
    const stats = await telemetryService.getMeterStats(meter_id);
    res.json(stats);
  } catch (error) {
    logger.error("Error getting meter stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get grid load
app.get("/api/v1/telemetry/grid/load", async (req, res) => {
  try {
    const load = await telemetryService.getGridLoad();
    res.json(load);
  } catch (error) {
    logger.error("Error getting grid load:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
async function startServer() {
  try {
    // Initialize database connection
    await telemetryService.initialize();
    logger.info("Telemetry service initialized");

    // Initialize queue manager
    await queueManager.initialize();
    logger.info("Queue manager initialized");

    // Initialize MQTT client
    await mqttClient.initialize();
    logger.info("MQTT client initialized");

    // Start processing queue
    queueManager.startProcessing(telemetryService);

    app.listen(PORT, () => {
      logger.info(`Telemetry service listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await queueManager.shutdown();
  await mqttClient.disconnect();
  await telemetryService.shutdown();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await queueManager.shutdown();
  await mqttClient.disconnect();
  await telemetryService.shutdown();
  process.exit(0);
});

startServer();
