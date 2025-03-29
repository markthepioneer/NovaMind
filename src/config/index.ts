import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load environment variables from .env file
dotenvConfig();

// Environment variable validation schema
const configSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('4000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

  // Authentication
  JWT_SECRET: z.string().min(32),

  // Database
  MONGODB_URI: z.string().url(),

  // Redis
  REDIS_HOST: z.string(),
  REDIS_PORT: z.string().transform(Number),
  REDIS_PASSWORD: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_POINTS: z.string().transform(Number).default('10'),
  RATE_LIMIT_DURATION: z.string().transform(Number).default('1'),
  RATE_LIMIT_BLOCK_DURATION: z.string().transform(Number).default('900'),

  // AWS
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string().default('us-west-2'),

  // Google Cloud
  GOOGLE_PROJECT_ID: z.string(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string(),

  // Kubernetes
  KUBE_CONFIG_PATH: z.string().default('~/.kube/config'),

  // Monitoring
  METRICS_RETENTION_DAYS: z.string().transform(Number).default('30'),
  COST_METRICS_ENABLED: z.string().transform(val => val === 'true').default('true'),
});

// Validate and export config
const validateConfig = () => {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('\n');
      throw new Error(`Missing or invalid environment variables:\n${missingVars}`);
    }
    throw error;
  }
};

export const appConfig = validateConfig();

// Export specific config types
export type AppConfig = z.infer<typeof configSchema>;

// Export environment type guard
export const isProduction = () => appConfig.NODE_ENV === 'production';
export const isDevelopment = () => appConfig.NODE_ENV === 'development';
export const isTest = () => appConfig.NODE_ENV === 'test';

interface Config {
  env: string;
  port: number;
  mongodb: {
    uri: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  jwt: {
    secret: string;
    expirationTime: string;
  };
  aws: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  google: {
    credentials: string;
    projectId: string;
  };
  kubernetes: {
    configPath: string;
  };
  logging: {
    level: string;
    format: string;
  };
  rateLimiter: {
    points: number;
    duration: number;
    blockDuration: number;
  };
}

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'MONGODB_URI',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  mongodb: {
    uri: process.env.MONGODB_URI!,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expirationTime: process.env.JWT_EXPIRATION || '24h',
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-west-2',
  },
  google: {
    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    projectId: process.env.GOOGLE_CLOUD_PROJECT || '',
  },
  kubernetes: {
    configPath: process.env.KUBERNETES_CONFIG_PATH || path.join(process.env.HOME || '', '.kube', 'config'),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
  rateLimiter: {
    points: parseInt(process.env.RATE_LIMIT_POINTS || '10', 10),
    duration: parseInt(process.env.RATE_LIMIT_DURATION || '1', 10),
    blockDuration: parseInt(process.env.RATE_LIMIT_BLOCK_DURATION || '900', 10),
  },
}; 