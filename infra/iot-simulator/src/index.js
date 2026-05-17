import { MeterSimulator } from './meterSimulator.js';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';

const simulator = new MeterSimulator();

async function startSimulator() {
  try {
    await simulator.initialize();
    logger.info('IoT Meter Simulator started');
    
    // Start simulation
    simulator.startSimulation(config.simulation.meterCount, config.simulation.interval);
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down simulator');
      await simulator.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down simulator');
      await simulator.shutdown();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start simulator:', error);
    process.exit(1);
  }
}

startSimulator();
