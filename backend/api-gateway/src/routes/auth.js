import express from "express";
import jwt from "jsonwebtoken";
import { strictRateLimiter } from "../middleware/rateLimiter.js";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";

const router = express.Router();

// Login endpoint
router.post("/login", strictRateLimiter, (req, res) => {
  try {
    const { stellar_address, signature } = req.body;

    if (!stellar_address || !signature) {
      return res.status(400).json({
        error: "Bad request",
        message: "stellar_address and signature are required",
      });
    }

    // In a real implementation, verify the signature against the stellar address
    // For now, we'll create a token with the stellar address as the user ID

    const token = jwt.sign(
      {
        id: stellar_address,
        stellar_address,
        role: "household", // Default role, would be determined from database
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn },
    );

    logger.info(`User logged in: ${stellar_address}`);

    res.json({
      token,
      user: {
        id: stellar_address,
        stellar_address,
        role: "household",
      },
    });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Login failed",
    });
  }
});

// Refresh token endpoint
router.post("/refresh", (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: "Bad request",
        message: "Token is required",
      });
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        ignoreExpiration: true,
      });

      const newToken = jwt.sign(
        {
          id: decoded.id,
          stellar_address: decoded.stellar_address,
          role: decoded.role,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn },
      );

      res.json({ token: newToken });
    } catch (jwtError) {
      logger.warn("Invalid refresh token:", jwtError.message);
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid token",
      });
    }
  } catch (error) {
    logger.error("Refresh token error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Token refresh failed",
    });
  }
});

// Verify token endpoint
router.get("/verify", (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "No token provided",
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      res.json({
        valid: true,
        user: {
          id: decoded.id,
          stellar_address: decoded.stellar_address,
          role: decoded.role,
        },
      });
    } catch (jwtError) {
      res.json({
        valid: false,
        message: jwtError.message,
      });
    }
  } catch (error) {
    logger.error("Verify token error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Token verification failed",
    });
  }
});

export default router;
