import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password
});

export const rateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rate_limit:'
  }),
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: config.rateLimit.standardHeaders,
  legacyHeaders: config.rateLimit.legacyHeaders,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      error: 'Too many requests',
      message: `Too many requests from this IP, please try again later.`,
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
    });
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// Stricter rate limiting for sensitive endpoints
export const strictRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'strict_rate_limit:'
  }),
  windowMs: 60000, // 1 minute
  max: 10, // 10 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Strict rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded for this endpoint. Please slow down.'
    });
  }
});

// Rate limiting for direct contract calls (very strict)
export const contractCallRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'contract_call_limit:'
  }),
  windowMs: 60000, // 1 minute
  max: 5, // 5 contract calls per minute per address
  keyGenerator: (req) => {
    // Rate limit by Stellar address if available, otherwise by IP
    return req.user?.stellarAddress || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Contract call rate limit exceeded for: ${req.user?.stellarAddress || req.ip}, Path: ${req.path}`);
    res.status(429).json({
      error: 'Too many contract calls',
      message: 'Rate limit exceeded for contract calls. Please wait before making another call.',
      retryAfter: 60
    });
  },
  skip: (req) => {
    // Only apply to contract call endpoints
    return !req.path.startsWith('/api/contracts') && !req.path.startsWith('/api/settlement');
  }
});

// Rate limiting for write operations (stricter than reads)
export const writeOperationRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'write_op_limit:'
  }),
  windowMs: 30000, // 30 seconds
  max: 3, // 3 write operations per 30 seconds
  keyGenerator: (req) => {
    return req.user?.stellarAddress || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Write operation rate limit exceeded for: ${req.user?.stellarAddress || req.ip}, Path: ${req.path}`);
    res.status(429).json({
      error: 'Too many write operations',
      message: 'Rate limit exceeded for write operations. Please wait before making another write.',
      retryAfter: 30
    });
  },
  skip: (req) => {
    // Only apply to write operations (POST, PUT, DELETE, PATCH)
    const method = req.method;
    return method !== 'POST' && method !== 'PUT' && method !== 'DELETE' && method !== 'PATCH';
  }
});
