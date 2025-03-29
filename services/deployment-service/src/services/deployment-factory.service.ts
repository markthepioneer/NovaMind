import { DeploymentProvider, IDeployment, DeploymentStatus } from '../models/deployment.schema';
import { KubernetesService } from './kubernetes.service';
import { AwsLambdaService } from './aws-lambda.service';
import { CloudRunService } from './cloud-run.service';
import { MetricsService } from './metrics.service';
import { logger } from '../utils/logger';
import { Types } from 'mongoose';
import { ValidationError } from '@novamind/shared/utils/error-handling';

// Extend IDeployment to include _id
interface DeploymentWithId extends IDeployment {
  _id: Types.ObjectId;
}

interface DeploymentService {
  deploy(deployment: IDeployment): Promise<void>;
  undeploy(deployment: IDeployment): Promise<void>;
  getStatus(deployment: IDeployment): Promise<string>;
}

/**
 * Factory to create and manage deployment providers
 */
export class DeploymentFactory {
  private services: Map<string, DeploymentService>;
  private kubernetesService: KubernetesService;
  private awsLambdaService: AwsLambdaService;
  private cloudRunService: CloudRunService;
  private metricsService: MetricsService;
  
  constructor() {
    this.services = new Map();
    this.kubernetesService = new KubernetesService();
    this.awsLambdaService = new AwsLambdaService();
    this.cloudRunService = new CloudRunService();
    this.metricsService = new MetricsService();
    this.services.set('kubernetes', this.kubernetesService);
    this.services.set('aws-lambda', this.awsLambdaService);
    this.services.set('cloud-run', this.cloudRunService);
  }
  
  getService(type: string): DeploymentService {
    const service = this.services.get(type);
    if (!service) {
      throw new ValidationError(`Unsupported deployment type: ${type}`);
    }
    return service;
  }
  
  /**
   * Deploy an agent using the appropriate provider
   */
  async deployAgent(deployment: DeploymentWithId): Promise<boolean> {
    try {
      const service = this.getService(deployment.provider.toLowerCase());
      await service.deploy(deployment);
      return true;
    } catch (error) {
      logger.error(`Error deploying agent with provider ${deployment.provider}:`, error);
      throw error;
    }
  }
  
  /**
   * Get deployment status from the appropriate provider
   */
  async getDeploymentStatus(deployment: DeploymentWithId): Promise<DeploymentStatus> {
    try {
      const service = this.getService(deployment.provider.toLowerCase());
      const status = await service.getStatus(deployment);
      return status === 'running' ? DeploymentStatus.RUNNING : DeploymentStatus.FAILED;
    } catch (error) {
      logger.error(`Error getting deployment status for provider ${deployment.provider}:`, error);
      return DeploymentStatus.FAILED;
    }
  }
  
  /**
   * Stop a deployment using the appropriate provider
   */
  async stopDeployment(deployment: DeploymentWithId): Promise<boolean> {
    try {
      const service = this.getService(deployment.provider.toLowerCase());
      await service.undeploy(deployment);
      return true;
    } catch (error) {
      logger.error(`Error stopping deployment for provider ${deployment.provider}:`, error);
      throw error;
    }
  }
  
  /**
   * Start a deployment using the appropriate provider
   */
  async startDeployment(deployment: DeploymentWithId): Promise<boolean> {
    try {
      const service = this.getService(deployment.provider.toLowerCase());
      await service.deploy(deployment);
      return true;
    } catch (error) {
      logger.error(`Error starting deployment for provider ${deployment.provider}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a deployment using the appropriate provider
   */
  async deleteDeployment(deployment: DeploymentWithId): Promise<boolean> {
    try {
      const service = this.getService(deployment.provider.toLowerCase());
      await service.undeploy(deployment);
      return true;
    } catch (error) {
      logger.error(`Error deleting deployment for provider ${deployment.provider}:`, error);
      throw error;
    }
  }
  
  /**
   * Get metrics for a deployment using the appropriate provider
   */
  async getDeploymentMetrics(deployment: DeploymentWithId): Promise<{
    cpuUsage: number;
    memoryUsage: number;
    requestCount: number;
    responseTime: number;
    errorRate: number;
  }> {
    try {
      const service = this.getService(deployment.provider.toLowerCase());
      return await service.getMetrics(deployment);
    } catch (error) {
      logger.error(`Error getting metrics for provider ${deployment.provider}:`, error);
      
      // Return default metrics on error
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        requestCount: 0,
        responseTime: 0,
        errorRate: 0
      };
    }
  }
  
  /**
   * Get logs for a deployment using the appropriate provider
   */
  async getDeploymentLogs(deployment: DeploymentWithId, tail: number = 100): Promise<string[]> {
    try {
      const service = this.getService(deployment.provider.toLowerCase());
      return await service.getLogs(deployment, tail);
    } catch (error) {
      logger.error(`Error getting logs for provider ${deployment.provider}:`, error);
      return [];
    }
  }
}
