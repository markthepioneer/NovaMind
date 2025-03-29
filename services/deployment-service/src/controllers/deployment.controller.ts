import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { DeploymentModel, IDeployment } from '../models/deployment.model';
import { DeploymentFactory } from '../services/deployment-factory.service';
import { ValidationError, NotFoundError } from '@novamind/shared/utils/error-handling';
import { logger } from '@novamind/shared/utils/logger';
import { Deployment, DeploymentStatus, DeploymentEnvironment, DeploymentProvider } from '../models/deployment.schema';
import { UsageTrackingService } from '../services/usage-tracking.service';

interface DeploymentWithId extends IDeployment {
  _id: Types.ObjectId;
}

export class DeploymentController {
  private deploymentFactory: DeploymentFactory;
  private usageTrackingService: UsageTrackingService;

  constructor() {
    this.deploymentFactory = new DeploymentFactory();
    this.usageTrackingService = new UsageTrackingService();
  }

  /**
   * Create a new deployment
   */
  async createDeployment(req: Request, res: Response): Promise<void> {
    try {
      const { name, type, config } = req.body;

      if (!name || !type || !config) {
        throw new ValidationError('Missing required fields');
      }

      const deployment = await DeploymentModel.create({
        name,
        type,
        config,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const service = this.deploymentFactory.getService(type);
      await service.deploy(deployment as DeploymentWithId);

      res.status(201).json(deployment);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error creating deployment:', error);
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  /**
   * Get deployment by ID
   */
  async getDeployment(req: Request, res: Response): Promise<void> {
    try {
      const deployment = await DeploymentModel.findById(req.params.id);
      if (!deployment) {
        throw new NotFoundError('Deployment not found');
      }
      res.json(deployment);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error getting deployment:', error);
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  /**
   * Get all deployments for a user
   */
  public async getUserDeployments(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const deployments = await Deployment.find({ userId });

      res.status(200).json({
        success: true,
        count: deployments.length,
        deployments
      });
    } catch (error) {
      logger.error('Error getting user deployments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user deployments'
      });
    }
  }

  /**
   * Update deployment
   */
  async updateDeployment(req: Request, res: Response): Promise<void> {
    try {
      const { name, config } = req.body;
      const deployment = await DeploymentModel.findById(req.params.id);

      if (!deployment) {
        throw new NotFoundError('Deployment not found');
      }

      if (name) deployment.name = name;
      if (config) deployment.config = config;
      deployment.updatedAt = new Date();

      await deployment.save();
      res.json(deployment);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error updating deployment:', error);
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  /**
   * Delete a deployment
   */
  async deleteDeployment(req: Request, res: Response): Promise<void> {
    try {
      const deployment = await DeploymentModel.findById(req.params.id);
      if (!deployment) {
        throw new NotFoundError('Deployment not found');
      }

      const service = this.deploymentFactory.getService(deployment.type);
      await service.undeploy(deployment as DeploymentWithId);

      await deployment.deleteOne();
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error deleting deployment:', error);
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  /**
   * Get deployment metrics
   */
  public async getDeploymentMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deployment = await Deployment.findById(id);

      if (!deployment) {
        res.status(404).json({
          success: false,
          error: 'Deployment not found'
        });
        return;
      }

      // Get metrics if deployment is running
      if (deployment.status === DeploymentStatus.RUNNING) {
        try {
          const metrics = await this.deploymentFactory.getDeploymentMetrics(deployment);
          
          // Update metrics in database
          deployment.metrics = {
            lastUpdated: new Date(),
            ...metrics
          };
          
          await deployment.save();
        } catch (error) {
          logger.error('Error getting deployment metrics:', error);
        }
      }

      res.status(200).json({
        success: true,
        metrics: deployment.metrics
      });
    } catch (error) {
      logger.error('Error getting deployment metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get deployment metrics'
      });
    }
  }

  /**
   * Get deployment logs
   */
  public async getDeploymentLogs(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { tail } = req.query;

      const deployment = await Deployment.findById(id);

      if (!deployment) {
        res.status(404).json({
          success: false,
          error: 'Deployment not found'
        });
        return;
      }

      let logs: string[] = [];

      // Get logs from provider if deployed
      if (deployment.status === DeploymentStatus.RUNNING || 
          deployment.status === DeploymentStatus.STOPPED) {
        try {
          logs = await this.deploymentFactory.getDeploymentLogs(
            deployment, 
            tail ? parseInt(tail as string) : 100
          );
        } catch (error) {
          logger.error('Error getting deployment logs:', error);
        }
      }

      // Include stored logs
      const storedLogs = deployment.logs.map(log => 
        `${new Date(log.timestamp).toISOString()} [${log.level.toUpperCase()}] ${log.message}`
      );

      res.status(200).json({
        success: true,
        storedLogs: deployment.logs,
        logs: logs.length > 0 ? logs : storedLogs
      });
    } catch (error) {
      logger.error('Error getting deployment logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get deployment logs'
      });
    }
  }

  /**
   * Get deployment usage statistics
   */
  public async getDeploymentUsage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const deployment = await Deployment.findById(id);

      if (!deployment) {
        res.status(404).json({
          success: false,
          error: 'Deployment not found'
        });
        return;
      }

      // Parse date range
      const start = startDate ? new Date(startDate as string) : new Date();
      start.setDate(start.getDate() - 30); // Default to last 30 days
      
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get usage statistics
      const usageStats = await this.usageTrackingService.getDeploymentUsageStats(
        deployment._id.toString(),
        start,
        end
      );

      res.status(200).json({
        success: true,
        usage: usageStats
      });
    } catch (error) {
      logger.error('Error getting deployment usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get deployment usage'
      });
    }
  }

  /**
   * Record usage for a deployment
   */
  public async recordUsage(req: Request, res: Response): Promise<void> {
    try {
      const { deploymentId } = req.params;
      const { 
        inputTokens, 
        outputTokens, 
        latencyMs, 
        isError
      } = req.body;

      // Validate required fields
      if (inputTokens === undefined || outputTokens === undefined || latencyMs === undefined) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: inputTokens, outputTokens, latencyMs'
        });
        return;
      }

      // Get deployment
      const deployment = await Deployment.findById(deploymentId);

      if (!deployment) {
        res.status(404).json({
          success: false,
          error: 'Deployment not found'
        });
        return;
      }

      // Record usage
      await this.usageTrackingService.recordUsage(
        deploymentId,
        deployment.userId,
        {
          inputTokens,
          outputTokens,
          latencyMs,
          isError: isError || false
        }
      );

      // Update deployment metrics
      deployment.metrics.requestCount += 1;
      deployment.metrics.lastUpdated = new Date();
      await deployment.save();

      res.status(200).json({
        success: true
      });
    } catch (error) {
      logger.error('Error recording usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record usage'
      });
    }
  }

  /**
   * Get billing summary for a user
   */
  public async getUserBillingSummary(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const billingSummary = await this.usageTrackingService.getUserBillingSummary(userId);

      res.status(200).json({
        success: true,
        billing: billingSummary
      });
    } catch (error) {
      logger.error('Error getting billing summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get billing summary'
      });
    }
  }
}
