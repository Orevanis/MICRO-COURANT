import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import axios from 'axios';
import { logger } from '../utils/logger.js';

export const proxyRoutes = (serviceName, serviceUrl) => {
  const router = express.Router();
  
  // Create proxy middleware
  const proxy = createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    pathRewrite: {
      [`^/api/v1/${serviceName}`]: ''
    },
    onProxyReq: (proxyReq, req, res) => {
      // Forward user information from JWT
      if (req.user) {
        proxyReq.setHeader('X-User-Id', req.user.id);
        proxyReq.setHeader('X-User-Role', req.user.role);
        proxyReq.setHeader('X-Stellar-Address', req.user.stellar_address);
      }
      
      // Forward original IP
      proxyReq.setHeader('X-Forwarded-For', req.ip);
      
      logger.debug(`Proxying ${req.method} ${req.path} to ${serviceUrl}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      logger.debug(`Proxy response from ${serviceUrl}: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${serviceName}:`, err);
      res.status(503).json({
        error: 'Service unavailable',
        message: `The ${serviceName} service is currently unavailable`
      });
    }
  });
  
  // Apply proxy to all routes
  router.use('/', proxy);
  
  return router;
};

// Health check for all services
export const serviceHealthCheck = async (serviceUrl) => {
  try {
    const response = await axios.get(`${serviceUrl}/health`, {
      timeout: 5000
    });
    return {
      service: serviceUrl,
      status: 'healthy',
      data: response.data
    };
  } catch (error) {
    return {
      service: serviceUrl,
      status: 'unhealthy',
      error: error.message
    };
  }
};
