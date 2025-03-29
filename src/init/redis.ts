import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

let client: Redis | null = null;

export const initRedis = async (): Promise<void> => {
  try {
    client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableOfflineQueue: false,
    });

    client.on('error', (error) => {
      logger.error('Redis connection error', { error });
    });

    client.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    // Test connection using set/get/del
    await client.set('health_check', 'ping');
    const response = await client.get('health_check');
    await client.del('health_check');
    if (response !== 'ping') {
      throw new Error('Redis connection test failed');
    }
    logger.info('Redis connection test successful');
  } catch (error) {
    logger.error('Failed to initialize Redis', { error });
    throw error;
  }
};

export const getRedisClient = (): Redis => {
  if (!client) {
    throw new Error('Redis client not initialized');
  }
  return client;
};

export const closeRedis = async (): Promise<void> => {
  if (client) {
    await client.quit();
    client = null;
    logger.info('Redis connection closed');
  }
};

// Export Redis client type
export type RedisClient = Redis; 