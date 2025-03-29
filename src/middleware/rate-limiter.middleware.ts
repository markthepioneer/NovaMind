import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { config } from '../config';

const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  enableOfflineQueue: false,
});

redisClient.on('error', (err: Error) => {
  logger.error('Redis error', { error: err });
});

redisClient.on('connect', () => {
  logger.info('Redis connected');
});

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  points: config.rateLimiter.points,
  duration: config.rateLimiter.duration,
  blockDuration: config.rateLimiter.blockDuration,
});

export const rateLimiterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.ip) {
      throw new Error('No IP address found');
    }
    await rateLimiter.consume(req.ip);
    next();
  } catch (error) {
    logger.warn('Rate limit exceeded', { ip: req.ip });
    res.status(429).json({
      status: 'error',
      message: 'Too many requests',
    });
  }
};

// Custom rate limiter for specific routes
export const createRateLimiter = (
  points: number,
  duration: number,
  blockDuration?: number
): RateLimiterRedis => {
  return new RateLimiterRedis({
    storeClient: redisClient,
    points,
    duration,
    blockDuration: blockDuration || config.rateLimiter.blockDuration,
  });
}; 