import pg from "pg";
import { Redis } from "ioredis";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";

const { Pool } = pg;

export class BillingService {
  constructor() {
    this.pool = null;
    this.redis = null;
  }

  async initialize() {
    this.pool = new Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password,
      max: 20,
    });

    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    });

    logger.info("Billing service initialized");
  }

  async processBilling(householdId, consumptionKwh, meterId) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Get tariff rate
      const tariffRate = (await this.redis.get("tariff:rate")) || 100;

      // Calculate base cost
      const cost = consumptionKwh * parseFloat(tariffRate);

      // Check for applicable subsidies
      const subsidy = await this.applySubsidy(householdId, cost);
      const finalCost = cost - subsidy;

      // Create billing record
      const insertQuery = `
        INSERT INTO billing_records 
        (household_id, meter_id, consumption_kwh, tariff_rate, cost, subsidy_applied, final_cost, billing_cycle_start, billing_cycle_end, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW() + INTERVAL '30 days', 'pending')
        RETURNING id
      `;

      const result = await client.query(insertQuery, [
        householdId,
        meterId,
        consumptionKwh,
        tariffRate,
        cost,
        subsidy,
        finalCost,
      ]);

      const billingId = result.rows[0].id;

      // Update household balance
      await this.updateHouseholdBalance(client, householdId, finalCost);

      await client.query("COMMIT");

      logger.info(
        `Billing processed: ${billingId} for household ${householdId}`,
      );

      return {
        billing_id: billingId,
        household_id: householdId,
        consumption_kwh: consumptionKwh,
        cost,
        subsidy_applied: subsidy,
        final_cost: finalCost,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Billing processing error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async applySubsidy(householdId, baseCost) {
    // Check for active subsidies
    const query = `
      SELECT * FROM subsidies 
      WHERE active = true 
      AND end_timestamp > NOW()
      AND $1 = ANY(eligible_households)
    `;

    const result = await this.pool.query(query, [householdId]);

    if (result.rows.length === 0) {
      return 0;
    }

    // Apply the highest discount subsidy
    const subsidies = result.rows;
    const maxDiscount = Math.max(
      ...subsidies.map((s) => s.discount_percentage),
    );

    return (baseCost * maxDiscount) / 100;
  }

  async updateHouseholdBalance(client, householdId, amount) {
    const query = `
      UPDATE households 
      SET current_balance = current_balance - $1,
          total_consumption = total_consumption + $2,
          updated_at = NOW()
      WHERE household_id = $3
    `;

    await client.query(query, [amount, amount, householdId]);

    // Update Redis cache
    const balanceKey = `household:${householdId}:balance`;
    const currentBalance = (await this.redis.get(balanceKey)) || 0;
    await this.redis.set(balanceKey, parseFloat(currentBalance) - amount);
  }

  async getBalance(householdId) {
    // Try Redis first
    const balanceKey = `household:${householdId}:balance`;
    const cachedBalance = await this.redis.get(balanceKey);

    if (cachedBalance !== null) {
      return {
        household_id: householdId,
        balance: parseFloat(cachedBalance),
        source: "cache",
      };
    }

    // Query database
    const query =
      "SELECT current_balance FROM households WHERE household_id = $1";
    const result = await this.pool.query(query, [householdId]);

    if (result.rows.length === 0) {
      return null;
    }

    const balance = result.rows[0].current_balance;

    // Cache result
    await this.redis.setex(balanceKey, 300, balance);

    return {
      household_id: householdId,
      balance,
      source: "database",
    };
  }

  async rechargeBalance(householdId, amount) {
    const query = `
      UPDATE households 
      SET current_balance = current_balance + $1,
          total_paid = total_paid + $1,
          updated_at = NOW()
      WHERE household_id = $2
      RETURNING current_balance
    `;

    const result = await this.pool.query(query, [amount, householdId]);
    const newBalance = result.rows[0].current_balance;

    // Update cache
    const balanceKey = `household:${householdId}:balance`;
    await this.redis.set(balanceKey, newBalance);

    return {
      household_id: householdId,
      previous_balance: newBalance - amount,
      new_balance: newBalance,
      amount_added: amount,
    };
  }

  async shutdown() {
    if (this.pool) {
      await this.pool.end();
      logger.info("Billing service PostgreSQL connection closed");
    }

    if (this.redis) {
      await this.redis.quit();
      logger.info("Billing service Redis connection closed");
    }
  }
}
