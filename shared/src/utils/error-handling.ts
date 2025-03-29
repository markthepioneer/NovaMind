import { AxiosError } from 'axios';

export interface ErrorResponse {
  message?: string;
  details?: unknown;
}

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, details);
  }
}

export class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceError';
  }
}

export function handleAxiosError(error: AxiosError<ErrorResponse>): never {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        throw new ValidationError(data?.message || 'Bad Request');
      case 401:
        throw new AuthenticationError(data?.message || 'Unauthorized');
      case 403:
        throw new AuthorizationError(data?.message || 'Forbidden');
      case 404:
        throw new NotFoundError(data?.message || 'Not Found');
      case 409:
        throw new ConflictError(data?.message || 'Conflict', data?.details);
      default:
        throw new ServiceError(data?.message || 'Internal Server Error');
    }
  }
  
  if (error.request) {
    throw new ServiceError('No response received from service');
  }
  
  throw new ServiceError('Error making request to service');
}

export function handleError(error: Error): void {
  if (error instanceof ValidationError) {
    // Handle validation errors
    console.error('Validation Error:', error.message);
  } else if (error instanceof AuthenticationError) {
    // Handle authentication errors
    console.error('Authentication Error:', error.message);
  } else if (error instanceof AuthorizationError) {
    // Handle authorization errors
    console.error('Authorization Error:', error.message);
  } else if (error instanceof NotFoundError) {
    // Handle not found errors
    console.error('Not Found Error:', error.message);
  } else if (error instanceof ServiceError) {
    // Handle service errors
    console.error('Service Error:', error.message);
  } else {
    // Handle unknown errors
    console.error('Unknown Error:', error.message);
  }
}

export function validateRequiredFields(obj: Record<string, unknown>, fields: string[]): void {
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null) {
      throw new ValidationError(`Missing required field: ${field}`);
    }
  }
}

export function validateEnumValue(value: string, enumObj: Record<string, string>, fieldName: string): void {
  if (!Object.values(enumObj).includes(value)) {
    throw new ValidationError(
      `Invalid ${fieldName}: ${value}. Must be one of: ${Object.values(enumObj).join(', ')}`
    );
  }
}

export function validateStringLength(value: string, min: number, max: number, fieldName: string): void {
  if (value.length < min) {
    throw new ValidationError(`${fieldName} must be at least ${min} characters long`);
  }
  if (value.length > max) {
    throw new ValidationError(`${fieldName} must be at most ${max} characters long`);
  }
}

export function validateNumberRange(value: number, min: number, max: number, fieldName: string): void {
  if (value < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`);
  }
  if (value > max) {
    throw new ValidationError(`${fieldName} must be at most ${max}`);
  }
} 