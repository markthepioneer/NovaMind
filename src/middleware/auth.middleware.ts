import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ValidationError } from '../utils/error-handler';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new ValidationError('No authorization header');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new ValidationError('No token provided');
    }

    const decoded = jwt.verify(token, config.jwt.secret) as {
      id: string;
      role: string;
    };

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    logger.debug('User authenticated', { userId: decoded.id });
    next();
  } catch (error) {
    logger.error('Authentication error', { error });
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token',
      });
    }
    next(error);
  }
};

export const authorize = (requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthError('User not authenticated');
      }

      const hasAllPermissions = requiredPermissions.every((permission) =>
        req.user!.role.includes(permission)
      );

      if (!hasAllPermissions) {
        throw new AuthError('Insufficient permissions');
      }

      logger.debug('User authorized', {
        userId: req.user.id,
        requiredPermissions,
      });
      next();
    } catch (error) {
      logger.error('Authorization failed', {
        error,
        userId: req.user?.id,
        requiredPermissions,
      });
      if (error instanceof AuthError) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(403).json({ error: 'Authorization failed' });
      }
    }
  };
}; 