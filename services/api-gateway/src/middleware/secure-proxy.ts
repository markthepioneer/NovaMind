import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { ValidationError, AuthenticationError } from '@novamind/shared/utils/error-handling';
import { createServiceProxy } from '../utils/proxy';

interface ProxyConfig {
  target: string;
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  validateRequest?: (req: Request) => void;
  transformRequest?: (req: Request) => void;
  transformResponse?: (res: Response) => void;
}

export function createSecureProxy(config: ProxyConfig) {
  const middleware = [];

  // Add rate limiting if configured
  if (config.rateLimit) {
    middleware.push(
      rateLimit({
        windowMs: config.rateLimit.windowMs,
        max: config.rateLimit.max,
        message: { error: 'Too many requests' }
      })
    );
  }

  // Add request validation if configured
  if (config.validateRequest) {
    middleware.push((req: Request, _res: Response, next: NextFunction) => {
      try {
        config.validateRequest!(req);
        next();
      } catch (error) {
        if (error instanceof ValidationError) {
          next(error);
        } else {
          next(new ValidationError('Invalid request'));
        }
      }
    });
  }

  // Add request transformation if configured
  if (config.transformRequest) {
    middleware.push((req: Request, _res: Response, next: NextFunction) => {
      try {
        config.transformRequest!(req);
        next();
      } catch (error) {
        next(error);
      }
    });
  }

  // Add response transformation if configured
  if (config.transformResponse) {
    middleware.push((_req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      res.send = function(body) {
        try {
          config.transformResponse!(res);
          return originalSend.call(this, body);
        } catch (error) {
          next(error);
          return this;
        }
      };
      next();
    });
  }

  // Add the proxy middleware
  middleware.push(createServiceProxy(config.target));

  return middleware;
} 