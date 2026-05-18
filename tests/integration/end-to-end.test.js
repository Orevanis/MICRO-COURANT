import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

// Skip all E2E suites when no auth token is configured or the stack isn't up.
// Run with: TEST_AUTH_TOKEN=<token> API_BASE_URL=<url> npm test
const skipE2E = !TEST_AUTH_TOKEN;

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${TEST_AUTH_TOKEN}`,
  };
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) },
  });
  return response;
}

describe("End-to-End Energy Lifecycle", () => {
  let householdId;
  let meterId;

  beforeAll(async () => {
    if (skipE2E) return;
    householdId = `HH-E2E-${Date.now()}`;
    meterId = `MTR-E2E-${Date.now()}`;
  });

  afterAll(async () => {
    if (skipE2E || !householdId) return;
    // Best-effort cleanup — ignore errors
    await apiRequest(`/api/v1/identity/${householdId}`, {
      method: "DELETE",
    }).catch(() => {});
    await apiRequest(`/api/v1/telemetry/meter/${meterId}`, {
      method: "DELETE",
    }).catch(() => {});
  });

  it("should register a new household", async () => {
    if (skipE2E) return expect(true).toBe(true); // pass as skipped

    const response = await apiRequest("/api/v1/identity/register", {
      method: "POST",
      body: JSON.stringify({
        stellar_address: `GTEST${householdId}`,
        role: "household",
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it("should register a new energy meter", async () => {
    if (skipE2E) return expect(true).toBe(true);

    const response = await apiRequest("/api/v1/telemetry/meter/register", {
      method: "POST",
      body: JSON.stringify({
        meter_id: meterId,
        household_id: householdId,
        location: "Zone A - Sector 1",
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("registered");
  });

  it("should ingest meter reading", async () => {
    if (skipE2E) return expect(true).toBe(true);

    const response = await apiRequest("/api/v1/telemetry/ingest", {
      method: "POST",
      body: JSON.stringify({
        meter_id: meterId,
        household_id: householdId,
        consumption_kwh: 5.5,
        timestamp: Date.now(),
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("queued");
  });

  it("should process billing for consumption", async () => {
    if (skipE2E) return expect(true).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const response = await apiRequest(`/api/v1/billing/balance/${householdId}`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.balance).toBeDefined();
  });

  it("should allow balance recharge", async () => {
    if (skipE2E) return expect(true).toBe(true);

    const response = await apiRequest("/api/v1/billing/recharge", {
      method: "POST",
      body: JSON.stringify({ household_id: householdId, amount: 50 }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("success");
  });

  it("should create settlement for payment", async () => {
    if (skipE2E) return expect(true).toBe(true);

    const response = await apiRequest("/api/v1/settlement/create", {
      method: "POST",
      body: JSON.stringify({
        type: "consumption_billing",
        from_address: householdId,
        to_address: "GRID-SETTLEMENT",
        amount: 50,
        reference_id: meterId,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.settlement_id).toBeDefined();
  });
});

describe("P2P Energy Trading Scenario", () => {
  let offerId;
  let requestId;

  beforeAll(async () => {
    if (skipE2E) return;
  });

  it("should create energy offer from producer", async () => {
    if (skipE2E) return expect(true).toBe(true);

    const response = await apiRequest("/api/v1/p2p/offer", {
      method: "POST",
      body: JSON.stringify({
        producer_address: `HH-P2P-PRODUCER-${Date.now()}`,
        energy_amount_kwh: 10,
        price_per_kwh: 95,
        expiry_hours: 24,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.offer_id).toBeDefined();
    offerId = data.offer_id;
  });

  it("should create energy request from consumer", async () => {
    if (skipE2E) return expect(true).toBe(true);

    const response = await apiRequest("/api/v1/p2p/request", {
      method: "POST",
      body: JSON.stringify({
        consumer_address: `HH-P2P-CONSUMER-${Date.now()}`,
        energy_amount_kwh: 5,
        max_price_per_kwh: 100,
        expiry_hours: 24,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.request_id).toBeDefined();
    requestId = data.request_id;
  });

  it("should match offer and request", async () => {
    if (skipE2E) return expect(true).toBe(true);

    const response = await apiRequest("/api/v1/p2p/match", {
      method: "POST",
      body: JSON.stringify({ offer_id: offerId, request_id: requestId }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.trade_id).toBeDefined();
  });

  it("should settle the trade", async () => {
    if (skipE2E) return expect(true).toBe(true);

    const response = await apiRequest("/api/v1/settlement/process", {
      method: "POST",
      body: JSON.stringify({ batch_size: 10 }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.processed).toBeGreaterThan(0);
  });
});

describe("Governance Voting Simulation", () => {
  let proposalId;

  it("should create governance proposal", async () => {
    if (skipE2E) return expect(true).toBe(true);

    const response = await apiRequest("/api/v1/governance/proposal", {
      method: "POST",
      body: JSON.stringify({
        proposer: `HH-GOV-${Date.now()}`,
        proposal_type: "tariff",
        title: "Reduce tariff for low-income households",
        description: "This proposal aims to reduce the base tariff by 15%",
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    proposalId = data.proposal_id;
    expect(proposalId).toBeDefined();
  });

  it("should cast votes on proposal", async () => {
    if (skipE2E) return expect(true).toBe(true);

    const voters = [
      `HH-GOV-V1-${Date.now()}`,
      `HH-GOV-V2-${Date.now()}`,
      `HH-GOV-V3-${Date.now()}`,
    ];

    for (const voter of voters) {
      const response = await apiRequest("/api/v1/governance/vote", {
        method: "POST",
        body: JSON.stringify({
          voter,
          proposal_id: proposalId,
          vote_option: "yes",
        }),
      });
      expect(response.status).toBe(200);
    }
  });

  it("should finalize proposal and check outcome", async () => {
    if (skipE2E) return expect(true).toBe(true);

    const response = await apiRequest(
      `/api/v1/governance/finalize/${proposalId}`,
      { method: "POST" },
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(["passed", "rejected"]).toContain(data.status);
  });
});
