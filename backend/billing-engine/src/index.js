import express from 'express';
import { BillingService } from './services/billingService.js';
import { IdentityService } from './services/identityService.js';
import { SettlementService } from './services/settlementService.js';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';

const app = express();
const PORT = config.port || 3002;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize services
const billingService = new BillingService();
const identityService = new IdentityService();
const settlementService = new SettlementService();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'billing-engine', timestamp: new Date().toISOString() });
});

// Identity endpoints
app.post('/api/v1/identity/register', async (req, res) => {
  try {
    const { stellar_address, role, metadata } = req.body;
    const result = await identityService.registerIdentity(stellar_address, role, metadata);
    res.json(result);
  } catch (error) {
    logger.error('Identity registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/identity/:stellar_address', async (req, res) => {
  try {
    const { stellar_address } = req.params;
    const identity = await identityService.getIdentity(stellar_address);
    res.json(identity);
  } catch (error) {
    logger.error('Identity lookup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/v1/identity/verify', async (req, res) => {
  try {
    const { stellar_address, signature } = req.body;
    const result = await identityService.verifyIdentity(stellar_address, signature);
    res.json(result);
  } catch (error) {
    logger.error('Identity verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Billing endpoints
app.post('/api/v1/billing/process', async (req, res) => {
  try {
    const { household_id, consumption_kwh, meter_id } = req.body;
    const result = await billingService.processBilling(household_id, consumption_kwh, meter_id);
    res.json(result);
  } catch (error) {
    logger.error('Billing processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/billing/balance/:household_id', async (req, res) => {
  try {
    const { household_id } = req.params;
    const balance = await billingService.getBalance(household_id);
    res.json(balance);
  } catch (error) {
    logger.error('Balance lookup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Settlement endpoints
app.post('/api/v1/settlement/create', async (req, res) => {
  try {
    const { type, from_address, to_address, amount, reference_id } = req.body;
    const result = await settlementService.createSettlement(type, from_address, to_address, amount, reference_id);
    res.json(result);
  } catch (error) {
    logger.error('Settlement creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/v1/settlement/process', async (req, res) => {
  try {
    const { batch_size } = req.body;
    const result = await settlementService.processPendingSettlements(batch_size || 10);
    res.json(result);
  } catch (error) {
    logger.error('Settlement processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
async function startServer() {
  try {
    await billingService.initialize();
    await identityService.initialize();
    await settlementService.initialize();
    
    logger.info('Billing engine services initialized');
    
    app.listen(PORT, () => {
      logger.info(`Billing engine listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await billingService.shutdown();
  await identityService.shutdown();
  await settlementService.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await billingService.shutdown();
  await identityService.shutdown();
  await settlementService.shutdown();
  process.exit(0);
});

startServer();
