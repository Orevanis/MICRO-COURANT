import mqtt from "mqtt";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";

export class MQTTClient {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async initialize() {
    const options = {
      clientId: config.mqtt.clientId,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    };

    this.client = mqtt.connect(
      `mqtt://${config.mqtt.broker}:${config.mqtt.port}`,
      options,
    );

    this.client.on("connect", () => {
      logger.info("MQTT client connected");
      this.connected = true;
      this.subscribeToTopics();
    });

    this.client.on("error", (err) => {
      logger.error("MQTT connection error:", err);
      this.connected = false;
    });

    this.client.on("reconnect", () => {
      logger.info("MQTT client reconnecting");
    });

    this.client.on("message", (topic, message) => {
      this.handleMessage(topic, message);
    });
  }

  subscribeToTopics() {
    // Subscribe to meter reading topics
    this.client.subscribe(config.mqtt.topic, (err) => {
      if (err) {
        logger.error("Failed to subscribe to topic:", err);
      } else {
        logger.info(`Subscribed to topic: ${config.mqtt.topic}`);
      }
    });
  }

  handleMessage(topic, message) {
    try {
      const payload = JSON.parse(message.toString());
      logger.info(`Received message on topic ${topic}:`, payload);

      // Emit event for processing
      this.emit("meterReading", {
        topic,
        payload,
      });
    } catch (error) {
      logger.error("Error parsing MQTT message:", error);
    }
  }

  publish(topic, message) {
    if (!this.connected) {
      logger.warn("MQTT client not connected, cannot publish");
      return;
    }

    this.client.publish(topic, JSON.stringify(message), (err) => {
      if (err) {
        logger.error("Error publishing MQTT message:", err);
      } else {
        logger.debug(`Published message to ${topic}`);
      }
    });
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      logger.info("MQTT client disconnected");
    }
  }

  // Simple event emitter
  on(event, callback) {
    if (!this.events) {
      this.events = {};
    }
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  emit(event, data) {
    if (this.events && this.events[event]) {
      this.events[event].forEach((callback) => callback(data));
    }
  }
}
