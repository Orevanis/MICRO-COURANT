import pg from "pg";
import { Redis } from "ioredis";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";

const { Pool } = pg;

export class TelemetryService {
  constructor() {
    this.pool = null;
    this.redis = null;
  }

  async initialize() {
    // Initialize PostgreSQL
    this.pool = new Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    await this.pool.query("SELECT NOW()");
    logger.info("PostgreSQL connection established");

    // Initialize Redis
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on("connect", () => {
      logger.info("Redis connection established");
    });

    this.redis.on("error", (err) => {
      logger.error("Redis error:", err);
    });
  }

  async processReading(reading) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Store reading in database
      const query = `
        INSERT INTO meter_readings (meter_id, household_id, consumption_kwh, timestamp, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id
      `;

      const result = await client.query(query, [
        reading.meter_id,
        reading.household_id,
        reading.consumption_kwh,
        new Date(reading.timestamp),
      ]);

      const readingId = result.rows[0].id;

      // Update meter's last reading in Redis for real-time access
      await this.redis.hset(
        `meter:${reading.meter_id}`,
        "last_reading",
        reading.consumption_kwh,
        "last_timestamp",
        reading.timestamp,
        "last_updated",
        Date.now(),
      );

      // Update household's real-time balance in Redis
      await this.updateHouseholdBalance(
        reading.household_id,
        reading.consumption_kwh,
      );

      // Update grid load statistics
      await this.updateGridLoad(reading.consumption_kwh);

      await client.query("COMMIT");

      logger.info(
        `Reading processed: ${readingId} for meter ${reading.meter_id}`,
      );

      return { readingId, status: "processed" };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error processing reading:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateHouseholdBalance(householdId, consumptionKwh) {
    // Get current tariff rate
    const tariffRate = (await this.redis.get("tariff:rate")) || 100; // Default 100 stroops per kWh

    // Calculate cost
    const cost = consumptionKwh * parseFloat(tariffRate);

    // Deduct from balance
    const balanceKey = `household:${householdId}:balance`;
    const currentBalance = (await this.redis.get(balanceKey)) || 0;
    const newBalance = Math.max(0, parseFloat(currentBalance) - cost);

    await this.redis.set(balanceKey, newBalance);

    // Publish balance update event
    await this.redis.publish(
      `balance:${householdId}`,
      JSON.stringify({
        householdId,
        previousBalance: currentBalance,
        newBalance,
        deduction: cost,
        timestamp: Date.now(),
      }),
    );

    // Check for low balance alert
    if (newBalance < 1000) {
      // Less than 1000 stroops
      await this.redis.publish(
        `alerts:${householdId}`,
        JSON.stringify({
          type: "low_balance",
          balance: newBalance,
          timestamp: Date.now(),
        }),
      );
    }
  }

  async updateGridLoad(consumptionKwh) {
    const timestamp = Date.now();
    const hourKey = `grid:load:${Math.floor(timestamp / 3600000)}`; // Hourly buckets

    await this.redis.incrbyfloat(hourKey, consumptionKwh);
    await this.redis.expire(hourKey, 86400); // Expire after 24 hours

    // Update current load (last 5 minutes)
    const currentLoadKey = "grid:load:current";
    await this.redis.incrbyfloat(currentLoadKey, consumptionKwh);
    await this.redis.expire(currentLoadKey, 300); // Expire after 5 minutes
  }

  async getMeterStats(meterId) {
    // Get from Redis first for real-time data
    const redisData = await this.redis.hgetall(`meter:${meterId}`);

    // Get historical data from PostgreSQL
    const query = `
      SELECT 
        COUNT(*) as total_readings,
        AVG(consumption_kwh) as avg_consumption,
        MAX(consumption_kwh) as max_consumption,
        MIN(consumption_kwh) as min_consumption,
        SUM(consumption_kwh) as total_consumption
      FROM meter_readings
      WHERE meter_id = $1
      AND timestamp >= NOW() - INTERVAL '24 hours'
    `;

    const result = await this.pool.query(query, [meterId]);

    return {
      meter_id: meterId,
      real_time: redisData,
      last_24h: result.rows[0],
    };
  }

  async getGridLoad() {
    const currentLoad = (await this.redis.get("grid:load:current")) || 0;
    const peakLoad = (await this.redis.get("grid:load:peak")) || 0;

    // Get hourly breakdown for last 24 hours
    const hourlyLoads = [];
    const now = Date.now();

    for (let i = 0; i < 24; i++) {
      const hourTimestamp = now - i * 3600000;
      const hourKey = `grid:load:${Math.floor(hourTimestamp / 3600000)}`;
      const load = (await this.redis.get(hourKey)) || 0;
      hourlyLoads.push({
        hour: i,
        load: parseFloat(load),
        timestamp: hourTimestamp,
      });
    }

    return {
      current_load: parseFloat(currentLoad),
      peak_load: parseFloat(peakLoad),
      hourly_breakdown: hourlyLoads.reverse(),
    };
  }

  async getHouseholdBalance(householdId) {
    const balanceKey = `household:${householdId}:balance`;
    const balance = (await this.redis.get(balanceKey)) || 0;

    return {
      household_id: householdId,
      balance: parseFloat(balance),
      timestamp: Date.now(),
    };
  }

  async shutdown() {
    if (this.pool) {
      await this.pool.end();
      logger.info("PostgreSQL connection closed");
    }

    if (this.redis) {
      await this.redis.quit();
      logger.info("Redis connection closed");
    }
  }
}
