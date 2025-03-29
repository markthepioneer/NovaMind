import mongoose from 'mongoose';
import { logger } from './utils/logger';
import { redisClient } from './utils/redis';

export async function initializeApp(): Promise<void> {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/deployment-service';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Connect to Redis
    await redisClient.connect();
    logger.info('Connected to Redis');
  } catch (error) {
    logger.error('Failed to initialize application', { error });
    throw error;
  }
}

export async function shutdownApp(): Promise<void> {
  try {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');

    // Disconnect from Redis
    await redisClient.disconnect();
    logger.info('Disconnected from Redis');
  } catch (error) {
    logger.error('Error during application shutdown', { error });
    throw error;
  }
}

// Handle process termination
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received');
  await shutdownApp();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received');
  await shutdownApp();
  process.exit(0);
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection', { reason });
  process.exit(1);
}); 