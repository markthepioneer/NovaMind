import { Request, Response } from 'express';
import { rateLimiterMiddleware, createRateLimiter } from '../../middleware/rate-limiter.middleware';
import { logger } from '../../utils/logger';

// Mock the rate limiter module
const mockConsume = jest.fn();
const mockRateLimiter = {
  consume: mockConsume,
};

jest.mock('../../middleware/rate-limiter.middleware', () => ({
  ...jest.requireActual('../../middleware/rate-limiter.middleware'),
  createRateLimiter: jest.fn().mockReturnValue(mockRateLimiter),
}));

jest.mock('../../utils/logger');

describe('Rate Limiter Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      ip: '127.0.0.1',
      path: '/api/test',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rateLimiterMiddleware', () => {
    it('should allow request when within rate limit', async () => {
      mockConsume.mockResolvedValue({
        remainingPoints: 5,
        msBeforeNext: 1000,
      });

      const request = { ...mockRequest } as Request;
      await rateLimiterMiddleware(
        request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockConsume).toHaveBeenCalledWith('127.0.0.1');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        5
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        expect.any(Number)
      );
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should block request when rate limit exceeded', async () => {
      mockConsume.mockRejectedValue({
        remainingPoints: 0,
        msBeforeNext: 5000,
      });

      const request = { ...mockRequest } as Request;
      await rateLimiterMiddleware(
        request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          retryAfter: expect.any(Number),
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle rate limiter errors gracefully', async () => {
      mockConsume.mockRejectedValue(new Error('Redis connection error'));

      const request = { ...mockRequest } as Request;
      await rateLimiterMiddleware(
        request,
        mockResponse as Response,
        nextFunction
      );

      expect(logger.error).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle missing IP address', async () => {
      const request = { ...mockRequest, ip: undefined } as Request;

      await rateLimiterMiddleware(
        request,
        mockResponse as Response,
        nextFunction
      );

      expect(logger.warn).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should set appropriate headers when close to limit', async () => {
      mockConsume.mockResolvedValue({
        remainingPoints: 1,
        msBeforeNext: 1000,
      });

      const request = { ...mockRequest } as Request;
      await rateLimiterMiddleware(
        request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        1
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        expect.any(Number)
      );
      expect(nextFunction).toHaveBeenCalled();
    });
  });
}); 