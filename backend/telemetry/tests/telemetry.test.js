import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { TelemetryService } from "../src/services/telemetryService.js";
import { FraudDetector } from "../src/services/fraudDetector.js";

describe("TelemetryService", () => {
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

  describe("processReading", () => {
    it("should process a valid meter reading", async () => {
      const reading = {
        meter_id: "MTR-TEST-001",
        household_id: "HH-TEST-001",
        consumption_kwh: 5.5,
        timestamp: Date.now(),
      };

      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ id: 1 }] }),
        release: jest.fn(),
      };

      telemetryService.pool = {
        connect: jest.fn().mockResolvedValue(mockClient),
        end: jest.fn().mockResolvedValue(),
      };

      telemetryService.redis = {
        hset: jest.fn().mockResolvedValue(),
        set: jest.fn().mockResolvedValue(),
        incrbyfloat: jest.fn().mockResolvedValue(),
        expire: jest.fn().mockResolvedValue(),
        publish: jest.fn().mockResolvedValue(),
        get: jest.fn().mockResolvedValue("0"),
        quit: jest.fn().mockResolvedValue(),
      };

      const result = await telemetryService.processReading(reading);
      expect(result.status).toBe("processed");
    });

    it("should reject readings with negative consumption", async () => {
      const reading = {
        meter_id: "MTR-TEST-002",
        household_id: "HH-TEST-002",
        consumption_kwh: -5.5,
        timestamp: Date.now(),
      };

      const mockClient = {
        query: jest
          .fn()
          .mockRejectedValue(new Error("Invalid consumption value")),
        release: jest.fn(),
      };

      telemetryService.pool = {
        connect: jest.fn().mockResolvedValue(mockClient),
        end: jest.fn().mockResolvedValue(),
      };

      telemetryService.redis = {
        quit: jest.fn().mockResolvedValue(),
      };

      await expect(telemetryService.processReading(reading)).rejects.toThrow();
    });
  });

  describe("FraudDetector", () => {
    it("should detect duplicate readings", async () => {
      fraudDetector.redis = {
        get: jest.fn().mockResolvedValue(Date.now().toString()),
        setex: jest.fn().mockResolvedValue(),
        set: jest.fn().mockResolvedValue(),
        expire: jest.fn().mockResolvedValue(),
        incr: jest.fn().mockResolvedValue(0),
        quit: jest.fn().mockResolvedValue(),
      };

      const reading = {
        meter_id: "MTR-FRAUD-001",
        consumption_kwh: 10.0,
        timestamp: Date.now(),
      };

      const result = await fraudDetector.detectFraud(reading);
      expect(result.isSuspicious).toBe(true);
      expect(result.reason).toContain("Duplicate");
    });

    it("should detect consumption spikes", async () => {
      fraudDetector.redis = {
        // duplicate check: no existing duplicate
        get: jest
          .fn()
          .mockResolvedValueOnce(null) // checkDuplicateReading: no duplicate
          .mockResolvedValueOnce(null) // getMeterProfile: no profile
          .mockResolvedValueOnce("1.0") // checkConsumptionSpike: last reading = 1.0
          .mockResolvedValueOnce(null) // getMeterProfile for frequency
          .mockResolvedValueOnce(null) // checkReadingFrequency: no last timestamp
          .mockResolvedValueOnce(null), // checkMeterTampering: no score
        set: jest.fn().mockResolvedValue(),
        setex: jest.fn().mockResolvedValue(),
        expire: jest.fn().mockResolvedValue(),
        incr: jest.fn().mockResolvedValue(0),
        quit: jest.fn().mockResolvedValue(),
      };

      const reading = {
        meter_id: "MTR-FRAUD-002",
        consumption_kwh: 10.0,
        timestamp: Date.now(),
      };

      const result = await fraudDetector.detectFraud(reading);
      expect(result.isSuspicious).toBe(true);
      expect(result.reason).toContain("spike");
    });

    it("should detect high frequency readings", async () => {
      const recentTimestamp = (Date.now() - 500).toString();
      fraudDetector.redis = {
        get: jest
          .fn()
          .mockResolvedValueOnce(null) // checkDuplicateReading: no duplicate
          .mockResolvedValueOnce(null) // getMeterProfile for spike
          .mockResolvedValueOnce(null) // checkConsumptionSpike: no last reading
          .mockResolvedValueOnce(null) // getMeterProfile for frequency
          .mockResolvedValueOnce(recentTimestamp) // checkReadingFrequency: recent timestamp
          .mockResolvedValueOnce(null), // checkMeterTampering: no score
        set: jest.fn().mockResolvedValue(),
        setex: jest.fn().mockResolvedValue(),
        expire: jest.fn().mockResolvedValue(),
        incr: jest.fn().mockResolvedValue(0),
        quit: jest.fn().mockResolvedValue(),
      };

      const reading = {
        meter_id: "MTR-FRAUD-003",
        consumption_kwh: 2.0,
        timestamp: Date.now(),
      };

      const result = await fraudDetector.detectFraud(reading);
      expect(result.isSuspicious).toBe(true);
      expect(result.reason).toContain("frequency");
    });

    it("should pass valid readings", async () => {
      fraudDetector.redis = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(),
        setex: jest.fn().mockResolvedValue(),
        expire: jest.fn().mockResolvedValue(),
        incr: jest.fn().mockResolvedValue(0),
        quit: jest.fn().mockResolvedValue(),
      };

      const reading = {
        meter_id: "MTR-VALID-001",
        consumption_kwh: 5.0,
        timestamp: Date.now(),
      };

      const result = await fraudDetector.detectFraud(reading);
      expect(result.isSuspicious).toBe(false);
    });
  });
});
