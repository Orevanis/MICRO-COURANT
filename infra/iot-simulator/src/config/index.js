import dotenv from 'dotenv';

dotenv.config();

export const config = {
  mqtt: {
    broker: process.env.MQTT_BROKER || 'localhost',
    port: parseInt(process.env.MQTT_PORT) || 1883
  },
  
  simulation: {
    meterCount: parseInt(process.env.METER_COUNT) || 10,
    interval: parseInt(process.env.READING_INTERVAL) || 5000 // 5 seconds
  }
};
