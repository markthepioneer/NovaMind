import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger';
import { AppError, ApiResponse } from '../types';

// Custom error classes
export class ValidationError extends Error implements AppError {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'VALIDATION_ERROR',
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error implements AppError {
  constructor(
    message: string = 'Authentication required',
    public statusCode: number = 401,
    public code: string = 'AUTHENTICATION_ERROR'
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements AppError {
  constructor(
    message: string = 'Insufficient permissions',
    public statusCode: number = 403,
    public code: string = 'AUTHORIZATION_ERROR'
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error implements AppError {
  constructor(
    message: string,
    public statusCode: number = 404,
    public code: string = 'NOT_FOUND'
  ) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements AppError {
  constructor(
    message: string,
    public statusCode: number = 409,
    public code: string = 'CONFLICT'
  ) {
    super(message);
    this.name = 'ConflictError';
  }
}

// Error handler middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  const errorDetails = {
    type: error.name,
    ...(error as AppError),
    message: error.message,
    stack: error.stack,
  };

  logger.error('Error handling request:', {
    error: errorDetails,
    request: {
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      body: req.body,
    },
  });

  // Handle known errors
  if (error instanceof ZodError) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: {
          errors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        },
      },
    };
    return res.status(400).json(response);
  }

  if (error instanceof ValidationError ||
      error instanceof AuthenticationError ||
      error instanceof AuthorizationError ||
      error instanceof NotFoundError ||
      error instanceof ConflictError) {
    const appError = error as AppError;
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details,
      },
    };
    return res.status(appError.statusCode).json(response);
  }

  // Handle unknown errors
  const response: ApiResponse<null> = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  };
  return res.status(500).json(response);
};

// Async handler wrapper
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 