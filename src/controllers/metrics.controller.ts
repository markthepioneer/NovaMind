import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { DeploymentFactory } from '../services/deployment-factory.service';
import DeploymentModel from '../models/deployment.model';
import { logger } from '../utils/logger';

export class MetricsController {
  private deploymentFactory: DeploymentFactory;

  constructor() {
    this.deploymentFactory = DeploymentFactory.getInstance();
  }

  async getSystemMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const deployments = await DeploymentModel.find();
      const totalDeployments = deployments.length;
      const deploymentsByType = await DeploymentModel.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]);

      const metrics = {
        totalDeployments,
        activeDeployments: deployments.filter(d => d.status === 'running').length,
        deploymentsByType: deploymentsByType.reduce((acc, curr) => ({
          ...acc,
          [curr._id]: curr.count
        }), {}),
        totalRequests: await this.calculateTotalRequests(),
        totalErrors: await this.calculateTotalErrors(),
        averageLatency: await this.calculateAverageLatency(),
      };

      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get system metrics', { error });
      res.status(500).json({ error: 'Failed to get system metrics' });
    }
  }

  async getDeploymentMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const deployment = await DeploymentModel.findById(req.params.id);
      if (!deployment) {
        res.status(404).json({ error: 'Deployment not found' });
        return;
      }

      const metrics = await this.deploymentFactory.getDeploymentMetrics(deployment);
      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get deployment metrics', { error });
      res.status(500).json({ error: 'Failed to get deployment metrics' });
    }
  }

  async getDeploymentMetricsHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const deployment = await DeploymentModel.findById(req.params.id);
      if (!deployment) {
        res.status(404).json({ error: 'Deployment not found' });
        return;
      }

      const { startTime, endTime } = this.parseTimeRange(req.query);
      const metrics = await this.getHistoricalMetrics(deployment, startTime, endTime);
      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get deployment metrics history', { error });
      res.status(500).json({ error: 'Failed to get deployment metrics history' });
    }
  }

  async getMetricsByType(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const deployments = await DeploymentModel.find();
      const metrics: Record<string, any> = {
        kubernetes: { cpu: 0, memory: 0, requests: 0, errors: 0 },
        'aws-lambda': { invocations: 0, errors: 0, duration: 0 },
        'cloud-run': { requests: 0, latency: 0, memory: 0, cpu: 0 },
      };

      for (const deployment of deployments) {
        const deploymentMetrics = await this.deploymentFactory.getDeploymentMetrics(deployment);
        this.aggregateMetricsByType(metrics, deployment.type, deploymentMetrics);
      }

      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get metrics by type', { error });
      res.status(500).json({ error: 'Failed to get metrics by type' });
    }
  }

  async getCostMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const deployments = await DeploymentModel.find();
      const costs: {
        total: number;
        byType: {
          kubernetes: number;
          'aws-lambda': number;
          'cloud-run': number;
        };
        byDeployment: { [key: string]: number };
      } = {
        total: 0,
        byType: {
          kubernetes: 0,
          'aws-lambda': 0,
          'cloud-run': 0,
        },
        byDeployment: {},
      };

      for (const deployment of deployments) {
        const metrics = await this.deploymentFactory.getDeploymentMetrics(deployment);
        const cost = await this.calculateDeploymentCost(deployment, metrics);
        costs.total += cost;
        costs.byType[deployment.type] += cost;
        costs.byDeployment[deployment.name] = cost;
      }

      res.json(costs);
    } catch (error) {
      logger.error('Failed to get cost metrics', { error });
      res.status(500).json({ error: 'Failed to get cost metrics' });
    }
  }

  private async calculateTotalRequests(): Promise<number> {
    const deployments = await DeploymentModel.find();
    let totalRequests = 0;

    for (const deployment of deployments) {
      const metrics = await this.deploymentFactory.getDeploymentMetrics(deployment);
      totalRequests += metrics.requests || metrics.invocations || 0;
    }

    return totalRequests;
  }

  private async calculateTotalErrors(): Promise<number> {
    const deployments = await DeploymentModel.find();
    let totalErrors = 0;

    for (const deployment of deployments) {
      const metrics = await this.deploymentFactory.getDeploymentMetrics(deployment);
      totalErrors += metrics.errors || 0;
    }

    return totalErrors;
  }

  private async calculateAverageLatency(): Promise<number> {
    const deployments = await DeploymentModel.find();
    let totalLatency = 0;
    let count = 0;

    for (const deployment of deployments) {
      const metrics = await this.deploymentFactory.getDeploymentMetrics(deployment);
      if (metrics.latency || metrics.duration) {
        totalLatency += metrics.latency || metrics.duration;
        count++;
      }
    }

    return count > 0 ? totalLatency / count : 0;
  }

  private parseTimeRange(query: any): { startTime: Date; endTime: Date } {
    const endTime = new Date();
    const startTime = new Date();
    const range = query.range || '1h';

    switch (range) {
      case '1h':
        startTime.setHours(endTime.getHours() - 1);
        break;
      case '1d':
        startTime.setDate(endTime.getDate() - 1);
        break;
      case '7d':
        startTime.setDate(endTime.getDate() - 7);
        break;
      case '30d':
        startTime.setDate(endTime.getDate() - 30);
        break;
      default:
        startTime.setHours(endTime.getHours() - 1);
    }

    return { startTime, endTime };
  }

  private async getHistoricalMetrics(deployment: any, startTime: Date, endTime: Date): Promise<any[]> {
    // This is a placeholder. In a real implementation, you would:
    // 1. Query a time-series database
    // 2. Aggregate metrics by time intervals
    // 3. Return the historical data
    return [];
  }

  private aggregateMetricsByType(metrics: Record<string, any>, type: string, deploymentMetrics: any): void {
    switch (type) {
      case 'kubernetes':
        metrics.kubernetes.cpu += deploymentMetrics.cpu || 0;
        metrics.kubernetes.memory += deploymentMetrics.memory || 0;
        metrics.kubernetes.requests += deploymentMetrics.requests || 0;
        metrics.kubernetes.errors += deploymentMetrics.errors || 0;
        break;
      case 'aws-lambda':
        metrics['aws-lambda'].invocations += deploymentMetrics.invocations || 0;
        metrics['aws-lambda'].errors += deploymentMetrics.errors || 0;
        metrics['aws-lambda'].duration += deploymentMetrics.duration || 0;
        break;
      case 'cloud-run':
        metrics['cloud-run'].requests += deploymentMetrics.requestCount || 0;
        metrics['cloud-run'].latency += deploymentMetrics.latency || 0;
        metrics['cloud-run'].memory += deploymentMetrics.memory || 0;
        metrics['cloud-run'].cpu += deploymentMetrics.cpu || 0;
        break;
    }
  }

  private async calculateDeploymentCost(deployment: any, metrics: any): Promise<number> {
    // This is a placeholder. In a real implementation, you would:
    // 1. Get pricing information for each provider
    // 2. Calculate costs based on resource usage
    // 3. Apply any discounts or pricing tiers
    return 0;
  }
} 