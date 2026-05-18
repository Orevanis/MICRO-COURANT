import mqtt from "mqtt";
import { v4 as uuidv4 } from "uuid";
import { logger } from "./utils/logger.js";
import { config } from "./config/index.js";

export class MeterSimulator {
  constructor() {
    this.client = null;
    this.meters = new Map();
    this.intervals = new Map();
    this.connected = false;
  }

  async initialize() {
    const mqttUrl = `mqtt://${config.mqtt.broker}:${config.mqtt.port}`;

    this.client = mqtt.connect(mqttUrl, {
      clientId: `iot-simulator-${uuidv4()}`,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    });

    this.client.on("connect", () => {
      logger.info("IoT Simulator connected to MQTT broker");
      this.connected = true;
    });

    this.client.on("error", (err) => {
      logger.error("MQTT connection error:", err);
      this.connected = false;
    });

    this.client.on("reconnect", () => {
      logger.info("IoT Simulator reconnecting to MQTT broker");
    });

    // Wait for connection
    await new Promise((resolve) => {
      this.client.once("connect", resolve);
    });
  }

  generateMeters(count) {
    const meters = [];

    for (let i = 0; i < count; i++) {
      const meterId = `MTR-${String(i + 1).padStart(4, "0")}`;
      const householdId = `HH-${String(i + 1).padStart(3, "0")}`;

      const meter = {
        meter_id: meterId,
        household_id: householdId,
        location: this.getRandomLocation(),
        base_consumption: this.getRandomBaseConsumption(),
        current_reading: 0,
        last_reading: 0,
        variation_factor: 0.1 + Math.random() * 0.2, // 10-30% variation
      };

      meters.push(meter);
      this.meters.set(meterId, meter);
    }

    logger.info(`Generated ${count} simulated meters`);
    return meters;
  }

  getRandomLocation() {
    const zones = ["Zone A", "Zone B", "Zone C", "Zone D"];
    const sectors = ["Sector 1", "Sector 2", "Sector 3"];
    return `${zones[Math.floor(Math.random() * zones.length)]} - ${sectors[Math.floor(Math.random() * sectors.length)]}`;
  }

  getRandomBaseConsumption() {
    // Base consumption between 0.5 and 5 kWh per reading
    return 0.5 + Math.random() * 4.5;
  }

  generateReading(meter) {
    // Generate realistic consumption with variation
    const base = meter.base_consumption;
    const variation = (Math.random() - 0.5) * 2 * meter.variation_factor * base;
    const consumption = Math.max(0, base + variation);

    meter.current_reading += consumption;
    meter.last_reading = consumption;

    return {
      meter_id: meter.meter_id,
      household_id: meter.household_id,
      consumption_kwh: parseFloat(consumption.toFixed(3)),
      timestamp: Date.now(),
      signature: this.generateSignature(meter.meter_id, consumption),
    };
  }

  generateSignature(meterId, consumption) {
    // In a real implementation, this would be a cryptographic signature
    // For simulation, we'll use a simple hash
    return Buffer.from(`${meterId}-${consumption}-${Date.now()}`)
      .toString("base64")
      .substring(0, 32);
  }

  publishReading(reading) {
    const topic = `energy/meters/${reading.meter_id}/readings`;

    this.client.publish(topic, JSON.stringify(reading), (err) => {
      if (err) {
        logger.error(`Failed to publish reading for ${reading.meter_id}:`, err);
      } else {
        logger.debug(
          `Published reading for ${reading.meter_id}: ${reading.consumption_kwh} kWh`,
        );
      }
    });
  }

  startSimulation(meterCount, interval) {
    // Generate meters
    this.generateMeters(meterCount);

    // Start periodic readings for each meter
    this.meters.forEach((meter, meterId) => {
      const intervalId = setInterval(() => {
        const reading = this.generateReading(meter);
        this.publishReading(reading);
      }, interval);

      this.intervals.set(meterId, intervalId);
    });

    logger.info(
      `Started simulation with ${meterCount} meters, ${interval}ms interval`,
    );
  }

  stopSimulation() {
    // Clear all intervals
    this.intervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });

    this.intervals.clear();
    logger.info("Simulation stopped");
  }

  getMeterStatus() {
    const status = [];

    this.meters.forEach((meter, meterId) => {
      status.push({
        meter_id: meterId,
        household_id: meter.household_id,
        total_reading: meter.current_reading.toFixed(3),
        last_reading: meter.last_reading.toFixed(3),
        location: meter.location,
      });
    });

    return status;
  }

  async shutdown() {
    this.stopSimulation();

    if (this.client) {
      await new Promise((resolve) => {
        this.client.end(false, resolve);
      });
      logger.info("MQTT client disconnected");
    }

    logger.info("IoT Simulator shutdown");
  }
}
