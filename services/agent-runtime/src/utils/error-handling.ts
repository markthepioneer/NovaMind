export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}

export class ConfigurationError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}

export class ExecutionError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}

export class RateLimitError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}

export function handleError(error: Error): never {
  if (error instanceof BaseError) {
    throw error;
  }
  
  // Convert unknown errors to ExecutionError
  throw new ExecutionError(error.message);
}

export function validateRequiredParams(params: Record<string, any>, required: string[]): void {
  const missing = required.filter(param => !params[param]);
  if (missing.length > 0) {
    throw new ValidationError(`Missing required parameters: ${missing.join(', ')}`);
  }
}

export function validateEnum<T extends string>(value: string, allowedValues: T[]): void {
  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(`Invalid value: ${value}. Allowed values: ${allowedValues.join(', ')}`);
  }
}

export function validateUrl(url: string): void {
  try {
    new URL(url);
  } catch {
    throw new ValidationError(`Invalid URL: ${url}`);
  }
}

export function validateFilePath(path: string): void {
  if (path.includes('..') || path.startsWith('/')) {
    throw new ValidationError('Invalid file path: Path traversal not allowed');
  }
}

export function assertNonNull<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new ValidationError(message);
  }
  return value;
}

export function assertCondition(condition: boolean, message: string): void {
  if (!condition) {
    throw new ValidationError(message);
  }
}

export function assertAuthorized(condition: boolean, message: string): void {
  if (!condition) {
    throw new AuthorizationError(message);
  }
}

export function assertValidConfig(condition: boolean, message: string): void {
  if (!condition) {
    throw new ConfigurationError(message);
  }
} 