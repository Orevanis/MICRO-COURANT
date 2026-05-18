import { logger } from "../utils/logger.js";
import pg from "pg";

const { Pool } = pg;

let auditPool = null;

function getAuditPool() {
  if (!auditPool) {
    auditPool = new Pool({
      host: process.env.POSTGRES_HOST || "localhost",
      port: parseInt(process.env.POSTGRES_PORT) || 5432,
      database: process.env.POSTGRES_DB || "micro_courant",
      user: process.env.POSTGRES_USER || "courant_user",
      password: process.env.POSTGRES_PASSWORD || "dev_password_change_in_prod",
      max: 5,
    });
  }
  return auditPool;
}

export const auditLogger = async (req, res, next) => {
  const startTime = Date.now();

  // Store original json method
  const originalJson = res.json;

  // Override json method to capture response
  res.json = function (data) {
    res.responseData = data;
    return originalJson.call(this, data);
  };

  // Log after response is sent
  res.on("finish", async () => {
    const duration = Date.now() - startTime;
    const auditLog = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      ip: req.ip,
      user_agent: req.get("user-agent"),
      user_id: req.user?.id || null,
      status_code: res.statusCode,
      response_time: duration,
      request_size: req.get("content-length") || 0,
      response_size: res.get("content-length") || 0,
      success: res.statusCode >= 200 && res.statusCode < 400,
    };

    // Log to Winston
    if (auditLog.success) {
      logger.info("API Request", auditLog);
    } else {
      logger.warn("API Request (Error)", auditLog);
    }

    // Store in database asynchronously
    storeAuditLog(auditLog).catch((err) => {
      logger.error("Failed to store audit log:", err);
    });
  });

  next();
};

async function storeAuditLog(auditLog) {
  const pool = getAuditPool();

  try {
    const query = `
      INSERT INTO audit_logs (
        timestamp, method, path, ip, user_agent, user_id,
        status_code, response_time, request_size, response_size, success
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    await pool.query(query, [
      auditLog.timestamp,
      auditLog.method,
      auditLog.path,
      auditLog.ip,
      auditLog.user_agent,
      auditLog.user_id,
      auditLog.status_code,
      auditLog.response_time,
      auditLog.request_size,
      auditLog.response_size,
      auditLog.success,
    ]);
  } catch (error) {
    // If table doesn't exist, create it
    if (error.code === "42P01") {
      await createAuditLogsTable();
      await storeAuditLog(auditLog);
    } else {
      throw error;
    }
  }
}

async function createAuditLogsTable() {
  const pool = getAuditPool();

  const query = `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMP NOT NULL,
      method VARCHAR(10) NOT NULL,
      path VARCHAR(255) NOT NULL,
      ip VARCHAR(45) NOT NULL,
      user_agent TEXT,
      user_id VARCHAR(255),
      status_code INTEGER NOT NULL,
      response_time INTEGER NOT NULL,
      request_size BIGINT,
      response_size BIGINT,
      success BOOLEAN NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_path ON audit_logs(path);
  `;

  await pool.query(query);
}
