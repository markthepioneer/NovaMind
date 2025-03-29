import { z } from 'zod';
import { DeploymentType } from '../types';

// Common schemas
const paginationSchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

const resourceSchema = z.object({
  cpu: z.string().regex(/^\d+m?$/),
  memory: z.string().regex(/^\d+[KMG]i?$/),
  replicas: z.number().int().min(1).optional(),
});

const environmentSchema = z.record(z.string());

const codeSchema = z.object({
  runtime: z.string(),
  handler: z.string(),
  source: z.string(),
});

// Deployment schemas
const baseDeploymentSchema = z.object({
  name: z.string().min(1).max(63).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
  type: z.enum(['kubernetes', 'aws-lambda', 'cloud-run'] as const),
  resources: resourceSchema,
  environment: environmentSchema,
  image: z.string().url().optional(),
  code: codeSchema.optional(),
});

export const createDeploymentSchema = baseDeploymentSchema.refine(
  data => {
    if (data.type === 'kubernetes' && !data.image) {
      return false;
    }
    if (data.type === 'aws-lambda' && !data.code) {
      return false;
    }
    return true;
  },
  {
    message: "Kubernetes deployments require 'image', Lambda deployments require 'code'",
    path: ['type'],
  }
);

export const updateDeploymentSchema = baseDeploymentSchema.partial().refine(
  data => {
    if (data.type === 'kubernetes' && data.image === undefined) {
      return true;
    }
    if (data.type === 'aws-lambda' && data.code === undefined) {
      return true;
    }
    if (data.type === 'kubernetes' && !data.image) {
      return false;
    }
    if (data.type === 'aws-lambda' && !data.code) {
      return false;
    }
    return true;
  },
  {
    message: "Kubernetes deployments require 'image', Lambda deployments require 'code'",
    path: ['type'],
  }
);

export const deploymentQuerySchema = z.object({
  type: z.enum(['kubernetes', 'aws-lambda', 'cloud-run'] as const).optional(),
  status: z.string().optional(),
  ...paginationSchema.shape,
});

// Metrics schemas
export const metricsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  interval: z.enum(['1m', '5m', '15m', '1h', '1d']).optional(),
  ...paginationSchema.shape,
});

export const costMetricsQuerySchema = z.object({
  type: z.enum(['kubernetes', 'aws-lambda', 'cloud-run'] as const).optional(),
  from: z.string().datetime(),
  to: z.string().datetime(),
  groupBy: z.enum(['type', 'deployment']).optional(),
});

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

// Validation middleware creator
export const validateRequest = (schema: z.ZodSchema) => {
  return async (req: any, res: any, next: any) => {
    try {
      const data = {
        ...req.body,
        ...req.query,
        ...req.params,
      };
      const validatedData = await schema.parseAsync(data);
      req.validatedData = validatedData;
      next();
    } catch (error) {
      next(error);
    }
  };
}; 