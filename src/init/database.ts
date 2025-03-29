import mongoose from 'mongoose';
import { appConfig } from '../config';
import { logger } from '../utils/logger';

export const initializeDatabase = async (): Promise<void> => {
  try {
    // Set mongoose options
    mongoose.set('strictQuery', true);

    // Connect to MongoDB
    await mongoose.connect(appConfig.MONGODB_URI);

    // Log successful connection
    logger.info('Successfully connected to MongoDB');

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        logger.error('Error closing MongoDB connection:', error);
        process.exit(1);
      }
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

// Export the mongoose instance for use in models
export { mongoose }; 