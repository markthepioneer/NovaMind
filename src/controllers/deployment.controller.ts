import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { DeploymentFactory } from '../services/deployment-factory.service';
import DeploymentModel from '../models/deployment.model';
import { logger } from '../utils/logger';

export class DeploymentController {
  private deploymentFactory: DeploymentFactory;

  constructor() {
    this.deploymentFactory = DeploymentFactory.getInstance();
  }

  async createDeployment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, type, config } = req.body;

      if (!name || !type || !config) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const existingDeployment = await DeploymentModel.findOne({ name });
      if (existingDeployment) {
        res.status(409).json({ error: 'Deployment with this name already exists' });
        return;
      }

      const deployment = new DeploymentModel({
        name,
        type,
        config,
        createdBy: req.user!.id,
      });

      await deployment.save();
      await this.deploymentFactory.createDeployment(deployment);

      logger.info(`Created deployment: ${name}`, {
        userId: req.user!.id,
        deploymentType: type,
      });

      res.status(201).json(deployment);
    } catch (error) {
      logger.error('Failed to create deployment', { error });
      res.status(500).json({ error: 'Failed to create deployment' });
    }
  }

  async getDeployment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const deployment = await DeploymentModel.findById(req.params.id);
      if (!deployment) {
        res.status(404).json({ error: 'Deployment not found' });
        return;
      }

      const status = await this.deploymentFactory.getDeploymentStatus(deployment);
      const metrics = await this.deploymentFactory.getDeploymentMetrics(deployment);

      res.json({
        ...deployment.toJSON(),
        status,
        metrics,
      });
    } catch (error) {
      logger.error('Failed to get deployment', { error });
      res.status(500).json({ error: 'Failed to get deployment' });
    }
  }

  async listDeployments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { type, status } = req.query;
      const query: any = { createdBy: req.user!.id };

      if (type) query.type = type;
      if (status) query.status = status;

      const deployments = await DeploymentModel.find(query).sort({ createdAt: -1 });
      res.json(deployments);
    } catch (error) {
      logger.error('Failed to list deployments', { error });
      res.status(500).json({ error: 'Failed to list deployments' });
    }
  }

  async getDeploymentLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const deployment = await DeploymentModel.findById(req.params.id);
      if (!deployment) {
        res.status(404).json({ error: 'Deployment not found' });
        return;
      }

      const logs = await this.deploymentFactory.getDeploymentLogs(deployment);
      res.json({ logs });
    } catch (error) {
      logger.error('Failed to get deployment logs', { error });
      res.status(500).json({ error: 'Failed to get deployment logs' });
    }
  }

  async stopDeployment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const deployment = await DeploymentModel.findById(req.params.id);
      if (!deployment) {
        res.status(404).json({ error: 'Deployment not found' });
        return;
      }

      await this.deploymentFactory.stopDeployment(deployment);
      deployment.status = 'stopped';
      await deployment.save();

      logger.info(`Stopped deployment: ${deployment.name}`, {
        userId: req.user!.id,
      });

      res.json({ message: 'Deployment stopped successfully' });
    } catch (error) {
      logger.error('Failed to stop deployment', { error });
      res.status(500).json({ error: 'Failed to stop deployment' });
    }
  }

  async deleteDeployment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const deployment = await DeploymentModel.findById(req.params.id);
      if (!deployment) {
        res.status(404).json({ error: 'Deployment not found' });
        return;
      }

      await this.deploymentFactory.deleteDeployment(deployment);
      await deployment.deleteOne();

      logger.info(`Deleted deployment: ${deployment.name}`, {
        userId: req.user!.id,
      });

      res.json({ message: 'Deployment deleted successfully' });
    } catch (error) {
      logger.error('Failed to delete deployment', { error });
      res.status(500).json({ error: 'Failed to delete deployment' });
    }
  }
} 