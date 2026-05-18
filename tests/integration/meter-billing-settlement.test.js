/**
 * End-to-end integration test: meter reading → billing → settlement
 *
 * Runs against real PostgreSQL and Redis (provided by CI services).
 * No HTTP server or Stellar keypair required.
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import pg from "pg";
import { Redis } from "ioredis";

const { Pool } = pg;

// ── DB / Redis config from env (matches CI service definitions) ──────────────
const pgConfig = {
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB || "micro_courant_integration",
  user: process.env.POSTGRES_USER || "integration_user",
  password: process.env.POSTGRES_PASSWORD || "integration_password",
};

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT) || 6379,
};

// ── Shared connections ────────────────────────────────────────────────────────
let pool;
let redis;

// ── Test fixtures ─────────────────────────────────────────────────────────────
const HOUSEHOLD_ID = `HH-TEST-${Date.now()}`;
const METER_ID = `MTR-TEST-${Date.now()}`;
const TARIFF_RATE = 100; // stroops per kWh
const INITIAL_BALANCE = 10000; // stroops
const CONSUMPTION_KWH = 5.0;
const EXPECTED_COST = CONSUMPTION_KWH * TARIFF_RATE; // 500

// ── Schema bootstrap (minimal tables needed for the flow) ─────────────────────
async function bootstrapSchema(client) {
  await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS households (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      household_id VARCHAR(255) UNIQUE NOT NULL,
      stellar_address VARCHAR(255),
      billing_mode VARCHAR(50) DEFAULT 'prepaid',
      current_balance DECIMAL(20,2) DEFAULT 0,
      total_consumption DECIMAL(20,3) DEFAULT 0,
      total_paid DECIMAL(20,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS meters (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      meter_id VARCHAR(255) UNIQUE NOT NULL,
      household_id VARCHAR(255) NOT NULL,
      location VARCHAR(255),
      installation_date TIMESTAMP NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      trust_score INTEGER DEFAULT 100,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS meter_readings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      meter_id VARCHAR(255) NOT NULL,
      household_id VARCHAR(255) NOT NULL,
      consumption_kwh DECIMAL(10,3) NOT NULL,
      timestamp TIMESTAMP NOT NULL,
      processed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS billing_records (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      household_id VARCHAR(255) NOT NULL,
      meter_id VARCHAR(255) NOT NULL,
      consumption_kwh DECIMAL(10,3) NOT NULL,
      tariff_rate DECIMAL(10,2) NOT NULL,
      cost DECIMAL(20,2) NOT NULL,
      subsidy_applied DECIMAL(20,2) DEFAULT 0,
      final_cost DECIMAL(20,2) NOT NULL,
      billing_cycle_start TIMESTAMP NOT NULL,
      billing_cycle_end TIMESTAMP NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      settlement_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS settlements (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      settlement_id VARCHAR(255) UNIQUE NOT NULL,
      type VARCHAR(50) NOT NULL,
      from_address VARCHAR(255) NOT NULL,
      to_address VARCHAR(255) NOT NULL,
      amount DECIMAL(20,2) NOT NULL,
      reference_id VARCHAR(255),
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Subsidies table (needed by BillingService.applySubsidy)
  await client.query(`
    CREATE TABLE IF NOT EXISTS subsidies (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      subsidy_id VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      discount_percentage INTEGER NOT NULL,
      eligible_households VARCHAR(255)[] DEFAULT ARRAY[]::VARCHAR[],
      start_timestamp TIMESTAMP NOT NULL,
      end_timestamp TIMESTAMP NOT NULL,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Mimics TelemetryService.processReading() without importing the full service */
async function processReading(reading) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO meter_readings (meter_id, household_id, consumption_kwh, timestamp)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [reading.meter_id, reading.household_id, reading.consumption_kwh, new Date(reading.timestamp)],
    );

    const readingId = result.rows[0].id;

    // Cache in Redis
    await redis.hset(
      `meter:${reading.meter_id}`,
      "last_reading", reading.consumption_kwh,
      "last_timestamp", reading.timestamp,
    );

    // Deduct balance in Redis
    const tariffRate = (await redis.get("tariff:rate")) || TARIFF_RATE;
    const cost = reading.consumption_kwh * parseFloat(tariffRate);
    const balanceKey = `household:${reading.household_id}:balance`;
    const current = parseFloat((await redis.get(balanceKey)) || 0);
    await redis.set(balanceKey, Math.max(0, current - cost));

    await client.query("COMMIT");
    return readingId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Mimics BillingService.processBilling() without importing the full service */
async function processBilling(householdId, consumptionKwh, meterId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tariffRate = TARIFF_RATE;
    const cost = consumptionKwh * tariffRate;
    const finalCost = cost; // no subsidy in this test

    const result = await client.query(
      `INSERT INTO billing_records
         (household_id, meter_id, consumption_kwh, tariff_rate, cost, subsidy_applied, final_cost,
          billing_cycle_start, billing_cycle_end, status)
       VALUES ($1,$2,$3,$4,$5,0,$6, NOW(), NOW() + INTERVAL '30 days', 'pending')
       RETURNING id`,
      [householdId, meterId, consumptionKwh, tariffRate, cost, finalCost],
    );

    const billingId = result.rows[0].id;

    await client.query(
      `UPDATE households
       SET current_balance = current_balance - $1,
           total_consumption = total_consumption + $2,
           updated_at = NOW()
       WHERE household_id = $3`,
      [finalCost, consumptionKwh, householdId],
    );

    await client.query("COMMIT");
    return { billingId, cost, finalCost };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Mimics SettlementService.createSettlement() — local DB record, no Stellar */
async function createSettlement(billingId, householdId, amount) {
  const settlementId = `SET-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  await pool.query(
    `INSERT INTO settlements (settlement_id, type, from_address, to_address, amount, reference_id, status)
     VALUES ($1, 'consumption_billing', $2, 'GRID-OPERATOR', $3, $4, 'pending')`,
    [settlementId, householdId, amount, billingId],
  );

  await pool.query(
    `UPDATE billing_records SET settlement_id = $1, status = 'settled' WHERE id = $2`,
    [settlementId, billingId],
  );

  return settlementId;
}

// ── Test suite ────────────────────────────────────────────────────────────────

beforeAll(async () => {
  pool = new Pool(pgConfig);
  redis = new Redis(redisConfig);

  const client = await pool.connect();
  try {
    await bootstrapSchema(client);
  } finally {
    client.release();
  }

  // Seed: household with initial balance
  await pool.query(
    `INSERT INTO households (household_id, current_balance) VALUES ($1, $2)
     ON CONFLICT (household_id) DO NOTHING`,
    [HOUSEHOLD_ID, INITIAL_BALANCE],
  );

  // Seed: meter
  await pool.query(
    `INSERT INTO meters (meter_id, household_id, location, installation_date)
     VALUES ($1, $2, 'Zone A', NOW())
     ON CONFLICT (meter_id) DO NOTHING`,
    [METER_ID, HOUSEHOLD_ID],
  );

  // Seed tariff rate in Redis
  await redis.set("tariff:rate", TARIFF_RATE);
  await redis.set(`household:${HOUSEHOLD_ID}:balance`, INITIAL_BALANCE);
});

afterAll(async () => {
  // Clean up test data
  await pool.query(`DELETE FROM settlements WHERE from_address = $1`, [HOUSEHOLD_ID]);
  await pool.query(`DELETE FROM billing_records WHERE household_id = $1`, [HOUSEHOLD_ID]);
  await pool.query(`DELETE FROM meter_readings WHERE household_id = $1`, [HOUSEHOLD_ID]);
  await pool.query(`DELETE FROM meters WHERE meter_id = $1`, [METER_ID]);
  await pool.query(`DELETE FROM households WHERE household_id = $1`, [HOUSEHOLD_ID]);
  await redis.del(`meter:${METER_ID}`, `household:${HOUSEHOLD_ID}:balance`);

  await pool.end();
  await redis.quit();
});

describe("Meter Reading → Billing → Settlement (end-to-end)", () => {
  let readingId;
  let billingId;
  let settlementId;

  it("step 1: processes a meter reading and stores it in postgres + redis", async () => {
    readingId = await processReading({
      meter_id: METER_ID,
      household_id: HOUSEHOLD_ID,
      consumption_kwh: CONSUMPTION_KWH,
      timestamp: Date.now(),
    });

    expect(readingId).toBeDefined();

    // Verify DB row
    const { rows } = await pool.query(
      `SELECT * FROM meter_readings WHERE id = $1`,
      [readingId],
    );
    expect(rows).toHaveLength(1);
    expect(parseFloat(rows[0].consumption_kwh)).toBe(CONSUMPTION_KWH);

    // Verify Redis cache
    const lastReading = await redis.hget(`meter:${METER_ID}`, "last_reading");
    expect(parseFloat(lastReading)).toBe(CONSUMPTION_KWH);
  });

  it("step 2: deducts cost from household balance in redis after reading", async () => {
    const balance = parseFloat(await redis.get(`household:${HOUSEHOLD_ID}:balance`));
    expect(balance).toBe(INITIAL_BALANCE - EXPECTED_COST);
  });

  it("step 3: creates a billing record and deducts from postgres balance", async () => {
    ({ billingId } = await processBilling(
      HOUSEHOLD_ID,
      CONSUMPTION_KWH,
      METER_ID,
    ));

    expect(billingId).toBeDefined();

    // Verify billing record
    const { rows } = await pool.query(
      `SELECT * FROM billing_records WHERE id = $1`,
      [billingId],
    );
    expect(rows).toHaveLength(1);
    expect(parseFloat(rows[0].final_cost)).toBe(EXPECTED_COST);
    expect(rows[0].status).toBe("pending");

    // Verify household balance deducted in postgres
    const { rows: hh } = await pool.query(
      `SELECT current_balance, total_consumption FROM households WHERE household_id = $1`,
      [HOUSEHOLD_ID],
    );
    expect(parseFloat(hh[0].current_balance)).toBe(INITIAL_BALANCE - EXPECTED_COST);
    expect(parseFloat(hh[0].total_consumption)).toBe(CONSUMPTION_KWH);
  });

  it("step 4: creates a settlement record and marks billing as settled", async () => {
    settlementId = await createSettlement(billingId, HOUSEHOLD_ID, EXPECTED_COST);

    expect(settlementId).toMatch(/^SET-/);

    // Verify settlement row
    const { rows: s } = await pool.query(
      `SELECT * FROM settlements WHERE settlement_id = $1`,
      [settlementId],
    );
    expect(s).toHaveLength(1);
    expect(s[0].status).toBe("pending");
    expect(parseFloat(s[0].amount)).toBe(EXPECTED_COST);

    // Verify billing record updated
    const { rows: b } = await pool.query(
      `SELECT status, settlement_id FROM billing_records WHERE id = $1`,
      [billingId],
    );
    expect(b[0].status).toBe("settled");
    expect(b[0].settlement_id).toBe(settlementId);
  });

  it("step 5: full flow audit — reading, billing, and settlement are all linked", async () => {
    const { rows: readings } = await pool.query(
      `SELECT * FROM meter_readings WHERE household_id = $1`,
      [HOUSEHOLD_ID],
    );
    const { rows: bills } = await pool.query(
      `SELECT * FROM billing_records WHERE household_id = $1`,
      [HOUSEHOLD_ID],
    );
    const { rows: settlements } = await pool.query(
      `SELECT * FROM settlements WHERE from_address = $1`,
      [HOUSEHOLD_ID],
    );

    expect(readings.length).toBeGreaterThanOrEqual(1);
    expect(bills.length).toBeGreaterThanOrEqual(1);
    expect(settlements.length).toBeGreaterThanOrEqual(1);
    expect(bills[0].settlement_id).toBe(settlements[0].settlement_id);
  });
});
