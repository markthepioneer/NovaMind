import { Request, Response, NextFunction } from 'express';
import { AuthorizationError } from './error-handling';

export function validateApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    throw new AuthorizationError('Invalid API key');
  }

  next();
} 