import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

export interface JWTCustomPayload extends JwtPayload {
  userId: string;
  email: string;
  roles: string[];
}

// Deployment types
export type DeploymentType = 'kubernetes' | 'aws-lambda' | 'cloud-run';

export type DeploymentStatus = 
  | 'pending'
  | 'deploying'
  | 'deployed'
  | 'failed'
  | 'stopped'
  | 'deleting'
  | 'deleted';

export interface DeploymentConfig {
  name: string;
  type: DeploymentType;
  resources: {
    cpu: string;
    memory: string;
    replicas?: number;
  };
  environment: Record<string, string>;
  image?: string;
  code?: {
    runtime: string;
    handler: string;
    source: string;
  };
}

export interface DeploymentMetrics {
  requests: number;
  errors: number;
  latency: number;
  cpu: number;
  memory: number;
  cost: number;
}

// Error types
export interface AppError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, unknown>;
}

// Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Service types
export interface CloudProvider {
  deploy(config: DeploymentConfig): Promise<string>;
  getStatus(deploymentId: string): Promise<DeploymentStatus>;
  getMetrics(deploymentId: string): Promise<DeploymentMetrics>;
  getLogs(deploymentId: string, since?: Date): Promise<string[]>;
  stop(deploymentId: string): Promise<void>;
  delete(deploymentId: string): Promise<void>;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
} 