import { describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";
import { rateLimiter } from "../src/middleware/rateLimiter.js";

describe("Rate Limiter", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(rateLimiter);
    app.get("/test", (req, res) => {
      res.json({ message: "success" });
    });
  });

  it("should allow requests within limit", async () => {
    const response = await request(app).get("/test");
    expect(response.status).toBe(200);
  });

  it("should block requests exceeding limit", async () => {
    // Make multiple requests to exceed limit
    const requests = [];
    for (let i = 0; i < 150; i++) {
      requests.push(request(app).get("/test"));
    }

    const responses = await Promise.all(requests);
    const blocked = responses.filter((r) => r.status === 429).length;

    expect(blocked).toBeGreaterThan(0);
  });

  it("should allow health check without rate limiting", async () => {
    const healthApp = express();
    healthApp.use(rateLimiter);
    healthApp.get("/health", (req, res) => {
      res.json({ status: "healthy" });
    });

    // Health checks should skip rate limiting
    const response = await request(healthApp).get("/health");
    expect(response.status).toBe(200);
  });
});
