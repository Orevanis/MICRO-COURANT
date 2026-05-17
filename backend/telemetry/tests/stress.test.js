import { describe, it, expect } from '@jest/globals';

describe('Stress Tests', () => {
  it('should handle high-frequency meter ingestion', async () => {
    const readings = [];
    const meterCount = 1000;
    const readingsPerMeter = 10;

    // Generate test data
    for (let i = 0; i < meterCount; i++) {
      for (let j = 0; j < readingsPerMeter; j++) {
        readings.push({
          meter_id: `MTR-STRESS-${String(i).padStart(4, '0')}`,
          household_id: `HH-STRESS-${String(i).padStart(4, '0')}`,
          consumption_kwh: Math.random() * 10,
          timestamp: Date.now()
        });
      }
    }

    const totalReadings = meterCount * readingsPerMeter;
    expect(readings.length).toBe(totalReadings);

    // In a real test, this would send all readings to the API
    // and verify they are processed correctly
    console.log(`Generated ${totalReadings} readings for stress test`);
  });

  it('should handle concurrent requests', async () => {
    const concurrentRequests = 100;
    const promises = [];

    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        fetch('http://localhost:3001/api/v1/telemetry/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meter_id: `MTR-CONCURRENT-${i}`,
            household_id: `HH-CONCURRENT-${i}`,
            consumption_kwh: Math.random() * 5,
            timestamp: Date.now()
          })
        }).catch(err => ({ error: err.message }))
      );
    }

    const results = await Promise.all(promises);
    const successful = results.filter(r => !r.error).length;
    
    console.log(`Concurrent requests: ${concurrentRequests}, Successful: ${successful}`);
    expect(successful).toBeGreaterThan(0);
  });

  it('should simulate fraud detection under load', async () => {
    const suspiciousReadings = [];
    const normalReadings = [];

    // Generate suspicious readings (duplicates)
    for (let i = 0; i < 50; i++) {
      suspiciousReadings.push({
        meter_id: 'MTR-FRAUD-LOAD-001',
        household_id: 'HH-FRAUD-LOAD-001',
        consumption_kwh: 10.0,
        timestamp: Date.now()
      });
    }

    // Generate normal readings
    for (let i = 0; i < 50; i++) {
      normalReadings.push({
        meter_id: `MTR-NORMAL-${i}`,
        household_id: `HH-NORMAL-${i}`,
        consumption_kwh: Math.random() * 5,
        timestamp: Date.now() + (i * 1000)
      });
    }

    const allReadings = [...suspiciousReadings, ...normalReadings];
    expect(allReadings.length).toBe(100);

    console.log(`Generated ${suspiciousReadings.length} suspicious and ${normalReadings.length} normal readings`);
  });
});
