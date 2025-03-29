import { KubernetesService } from './kubernetes.service';
import { AWSLambdaService } from './aws-lambda.service';
import { CloudRunService } from './cloud-run.service';
import { Deployment } from '../models/deployment.model';
import { logger } from '../utils/logger';

export interface DeploymentProvider {
  deploy(deployment: Deployment): Promise<void>;
  getStatus(deployment: Deployment): Promise<string>;
  getMetrics(deployment: Deployment): Promise<any>;
  getLogs(deployment: Deployment): Promise<string[]>;
  stop(deployment: Deployment): Promise<void>;
  delete(deployment: Deployment): Promise<void>;
}

export class DeploymentFactory {
  private static instance: DeploymentFactory;
  private providers: Map<string, DeploymentProvider>;

  private constructor() {
    this.providers = new Map();
    this.providers.set('kubernetes', new KubernetesService());
    this.providers.set('aws-lambda', new AWSLambdaService());
    this.providers.set('cloud-run', new CloudRunService());
  }

  public static getInstance(): DeploymentFactory {
    if (!DeploymentFactory.instance) {
      DeploymentFactory.instance = new DeploymentFactory();
    }
    return DeploymentFactory.instance;
  }

  public async createDeployment(deployment: Deployment): Promise<void> {
    const provider = this.providers.get(deployment.type);
    if (!provider) {
      const error = `Unsupported deployment type: ${deployment.type}`;
      logger.error(error);
      throw new Error(error);
    }

    try {
      logger.info(`Creating ${deployment.type} deployment: ${deployment.name}`);
      await provider.deploy(deployment);
      logger.info(`Successfully created deployment: ${deployment.name}`);
    } catch (error) {
      logger.error(`Failed to create deployment: ${deployment.name}`, { error });
      throw error;
    }
  }

  public async getDeploymentStatus(deployment: Deployment): Promise<string> {
    const provider = this.providers.get(deployment.type);
    if (!provider) {
      throw new Error(`Unsupported deployment type: ${deployment.type}`);
    }
    return provider.getStatus(deployment);
  }

  public async getDeploymentMetrics(deployment: Deployment): Promise<any> {
    const provider = this.providers.get(deployment.type);
    if (!provider) {
      throw new Error(`Unsupported deployment type: ${deployment.type}`);
    }
    return provider.getMetrics(deployment);
  }

  public async getDeploymentLogs(deployment: Deployment): Promise<string[]> {
    const provider = this.providers.get(deployment.type);
    if (!provider) {
      throw new Error(`Unsupported deployment type: ${deployment.type}`);
    }
    return provider.getLogs(deployment);
  }

  public async stopDeployment(deployment: Deployment): Promise<void> {
    const provider = this.providers.get(deployment.type);
    if (!provider) {
      throw new Error(`Unsupported deployment type: ${deployment.type}`);
    }
    await provider.stop(deployment);
  }

  public async deleteDeployment(deployment: Deployment): Promise<void> {
    const provider = this.providers.get(deployment.type);
    if (!provider) {
      throw new Error(`Unsupported deployment type: ${deployment.type}`);
    }
    await provider.delete(deployment);
  }
} 