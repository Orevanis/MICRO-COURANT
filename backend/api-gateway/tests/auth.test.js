import { describe, it, expect, jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../src/middleware/auth.js";

describe("Auth Middleware", () => {
  const mockSecret = "test_secret";

  it("should allow requests with valid token", () => {
    const token = jwt.sign(
      { id: "test-user", stellar_address: "GTEST", role: "household" },
      mockSecret,
      { expiresIn: "1h" },
    );

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    process.env.JWT_SECRET = mockSecret;
    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe("test-user");
  });

  it("should reject requests without token", () => {
    const req = { headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    process.env.JWT_SECRET = mockSecret;
    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Unauthorized",
      message: "No token provided",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject requests with invalid token", () => {
    const req = { headers: { authorization: "Bearer invalid_token" } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    process.env.JWT_SECRET = mockSecret;
    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Unauthorized",
      message: "Invalid token",
    });
  });

  it("should reject requests with expired token", () => {
    const token = jwt.sign({ id: "test-user" }, mockSecret, {
      expiresIn: "-1h",
    });

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    process.env.JWT_SECRET = mockSecret;
    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Unauthorized",
      message: "Token expired",
    });
  });
});
