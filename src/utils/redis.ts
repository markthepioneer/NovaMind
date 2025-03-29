import Redis from 'ioredis';
import { logger } from './logger';

class RedisClient {
  private static instance: RedisClient;
  private client: Redis | null = null;

  private constructor() {}

  static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  async connect(): Promise<void> {
    try {
      if (!this.client) {
        this.client = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD,
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        });

        this.client.on('error', (error: Error) => {
          logger.error('Redis client error', { error });
        });

        this.client.on('connect', () => {
          logger.info('Redis client connected');
        });
      }
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      logger.info('Redis client disconnected');
    }
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client not initialized. Call connect() first.');
    }
    return this.client;
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      // Use the set command as a ping alternative
      await this.client.set('health_check', 'ping');
      const response = await this.client.get('health_check');
      await this.client.del('health_check');
      return response === 'ping';
    } catch (error) {
      logger.error('Redis ping failed', { error });
      return false;
    }
  }
}

export const redisClient = RedisClient.getInstance(); 