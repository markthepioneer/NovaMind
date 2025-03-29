import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { DeploymentFactory } from '../services/deployment-factory.service';
import { logger } from '../utils/logger';
import { redisClient } from '../utils/redis';

export class HealthController {
  private deploymentFactory: DeploymentFactory;

  constructor() {
    this.deploymentFactory = DeploymentFactory.getInstance();
  }

  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const isHealthy = await this.checkBasicHealth();
      const status = isHealthy ? 'healthy' : 'unhealthy';
      const statusCode = isHealthy ? 200 : 503;

      res.status(statusCode).json({
        status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Health check failed', { error });
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getDetailedHealth(req: Request, res: Response): Promise<void> {
    try {
      const [dbStatus, redisStatus, providerStatus] = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkRedisHealth(),
        this.checkProviderHealth(),
      ]);

      const isHealthy = dbStatus.healthy && redisStatus.healthy && providerStatus.healthy;
      const statusCode = isHealthy ? 200 : 503;

      res.status(statusCode).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus,
          redis: redisStatus,
          providers: providerStatus,
        },
      });
    } catch (error) {
      logger.error('Detailed health check failed', { error });
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  }

  async getProviderHealth(req: Request, res: Response): Promise<void> {
    try {
      const providerStatus = await this.checkProviderHealth();
      const statusCode = providerStatus.healthy ? 200 : 503;

      res.status(statusCode).json({
        status: providerStatus.healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        providers: providerStatus.details,
      });
    } catch (error) {
      logger.error('Provider health check failed', { error });
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Provider health check failed',
      });
    }
  }

  private async checkBasicHealth(): Promise<boolean> {
    try {
      const [dbStatus, redisStatus] = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkRedisHealth(),
      ]);
      return dbStatus.healthy && redisStatus.healthy;
    } catch (error) {
      return false;
    }
  }

  private async checkDatabaseHealth(): Promise<{ healthy: boolean; latency?: number }> {
    const startTime = Date.now();
    try {
      if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        return { healthy: false };
      }

      await mongoose.connection.db.admin().ping();
      return {
        healthy: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      logger.error('Database health check failed', { error });
      return { healthy: false };
    }
  }

  private async checkRedisHealth(): Promise<{ healthy: boolean; latency?: number }> {
    const startTime = Date.now();
    try {
      const isHealthy = await redisClient.ping();
      return {
        healthy: isHealthy,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      logger.error('Redis health check failed', { error });
      return { healthy: false };
    }
  }

  private async checkProviderHealth(): Promise<{
    healthy: boolean;
    details: Record<string, { healthy: boolean; error?: string }>;
  }> {
    try {
      const providers = {
        kubernetes: await this.checkKubernetesHealth(),
        'aws-lambda': await this.checkAWSLambdaHealth(),
        'cloud-run': await this.checkCloudRunHealth(),
      };

      const allHealthy = Object.values(providers).every(p => p.healthy);

      return {
        healthy: allHealthy,
        details: providers,
      };
    } catch (error) {
      logger.error('Provider health check failed', { error });
      return {
        healthy: false,
        details: {
          kubernetes: { healthy: false, error: 'Health check failed' },
          'aws-lambda': { healthy: false, error: 'Health check failed' },
          'cloud-run': { healthy: false, error: 'Health check failed' },
        },
      };
    }
  }

  private async checkKubernetesHealth(): Promise<{ healthy: boolean; error?: string }> {
    try {
      // This is a placeholder. In a real implementation, you would:
      // 1. Get the Kubernetes client
      // 2. Perform a version check or list namespaces
      // 3. Return the status
      return { healthy: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { healthy: false, error: errorMessage };
    }
  }

  private async checkAWSLambdaHealth(): Promise<{ healthy: boolean; error?: string }> {
    try {
      // This is a placeholder. In a real implementation, you would:
      // 1. Get the AWS Lambda client
      // 2. List functions or get account settings
      // 3. Return the status
      return { healthy: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { healthy: false, error: errorMessage };
    }
  }

  private async checkCloudRunHealth(): Promise<{ healthy: boolean; error?: string }> {
    try {
      // This is a placeholder. In a real implementation, you would:
      // 1. Get the Cloud Run client
      // 2. List services or get project info
      // 3. Return the status
      return { healthy: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { healthy: false, error: errorMessage };
    }
  }
} 