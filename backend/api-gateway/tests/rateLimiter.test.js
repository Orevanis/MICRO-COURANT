import { describe, it, expect, beforeEach } from "@jest/globals";
import rateLimit from "express-rate-limit";
import request from "supertest";
import express from "express";

// Create a rate limiter with in-memory store for testing (no Redis needed)
function createTestRateLimiter(max = 100) {
  return rateLimit({
    windowMs: 60000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ error: "Too many requests" });
    },
    skip: (req) => req.path === "/health",
  });
}

describe("Rate Limiter", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(createTestRateLimiter(100));
    app.get("/test", (req, res) => res.json({ message: "success" }));
    app.get("/health", (req, res) => res.json({ status: "healthy" }));
  });

  it("should allow requests within limit", async () => {
    const response = await request(app).get("/test");
    expect(response.status).toBe(200);
  });

  it("should block requests exceeding limit", async () => {
    const strictApp = express();
    strictApp.use(createTestRateLimiter(5));
    strictApp.get("/test", (req, res) => res.json({ message: "success" }));

    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(request(strictApp).get("/test"));
    }

    const responses = await Promise.all(requests);
    const blocked = responses.filter((r) => r.status === 429).length;
    expect(blocked).toBeGreaterThan(0);
  });

  it("should allow health check without rate limiting", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
  });
});
