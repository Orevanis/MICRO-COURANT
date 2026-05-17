import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TelemetryService } from '../src/services/telemetryService.js';
import { FraudDetector } from '../src/services/fraudDetector.js';

describe('TelemetryService', () => {
  let telemetryService;
  let fraudDetector;

  beforeEach(() => {
    telemetryService = new TelemetryService();
    fraudDetector = new FraudDetector();
  });

  afterEach(async () => {
    await telemetryService.shutdown();
    await fraudDetector.shutdown();
  });

  describe('processReading', () => {
    it('should process a valid meter reading', async () => {
      const reading = {
        meter_id: 'MTR-TEST-001',
        household_id: 'HH-TEST-001',
        consumption_kwh: 5.5,
        timestamp: Date.now()
      };

      // Mock database operations
      telemetryService.pool = {
        query: jest.fn().mockResolvedValue({ rows: [{ id: 1 }] }),
        connect: jest.fn().mockResolvedValue({ query: jest.fn() }),
        end: jest.fn().mockResolvedValue()
      };

      telemetryService.redis = {
        hset: jest.fn().mockResolvedValue(),
        set: jest.fn().mockResolvedValue(),
        incrbyfloat: jest.fn().mockResolvedValue(),
        expire: jest.fn().mockResolvedValue(),
        publish: jest.fn().mockResolvedValue(),
        get: jest.fn().mockResolvedValue('0'),
        quit: jest.fn().mockResolvedValue()
      };

      const result = await telemetryService.processReading(reading);
      expect(result.status).toBe('processed');
    });

    it('should reject readings with negative consumption', async () => {
      const reading = {
        meter_id: 'MTR-TEST-002',
        household_id: 'HH-TEST-002',
        consumption_kwh: -5.5,
        timestamp: Date.now()
      };

      await expect(telemetryService.processReading(reading)).rejects.toThrow();
    });
  });

  describe('FraudDetector', () => {
    it('should detect duplicate readings', async () => {
      fraudDetector.redis = {
        get: jest.fn().mockResolvedValue(Date.now().toString()),
        setex: jest.fn().mockResolvedValue(),
        quit: jest.fn().mockResolvedValue()
      };

      const reading = {
        meter_id: 'MTR-FRAUD-001',
        consumption_kwh: 10.0,
        timestamp: Date.now()
      };

      const result = await fraudDetector.detectFraud(reading);
      expect(result.isSuspicious).toBe(true);
      expect(result.reason).toContain('Duplicate');
    });

    it('should detect consumption spikes', async () => {
      fraudDetector.redis = {
        get: jest.fn().mockResolvedValue('1.0'),
        set: jest.fn().mockResolvedValue(),
        quit: jest.fn().mockResolvedValue()
      };

      const reading = {
        meter_id: 'MTR-FRAUD-002',
        consumption_kwh: 10.0,
        timestamp: Date.now()
      };

      const result = await fraudDetector.detectFraud(reading);
      expect(result.isSuspicious).toBe(true);
      expect(result.reason).toContain('spike');
    });

    it('should detect high frequency readings', async () => {
      fraudDetector.redis = {
        get: jest.fn().mockResolvedValue((Date.now() - 500).toString()),
        set: jest.fn().mockResolvedValue(),
        quit: jest.fn().mockResolvedValue()
      };

      const reading = {
        meter_id: 'MTR-FRAUD-003',
        consumption_kwh: 2.0,
        timestamp: Date.now()
      };

      const result = await fraudDetector.detectFraud(reading);
      expect(result.isSuspicious).toBe(true);
      expect(result.reason).toContain('frequency');
    });

    it('should pass valid readings', async () => {
      fraudDetector.redis = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(),
        setex: jest.fn().mockResolvedValue(),
        quit: jest.fn().mockResolvedValue()
      };

      const reading = {
        meter_id: 'MTR-VALID-001',
        consumption_kwh: 5.0,
        timestamp: Date.now()
      };

      const result = await fraudDetector.detectFraud(reading);
      expect(result.isSuspicious).toBe(false);
    });
  });
});
