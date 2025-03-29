import { IDeployment } from '../models/deployment.model';

export interface DeploymentMetrics {
  cpuUsage: number;
  memoryUsage: number;
  requestCount: number;
  responseTime: number;
  errorRate: number;
}

export interface DeploymentService {
  deploy(deployment: IDeployment): Promise<void>;
  undeploy(deployment: IDeployment): Promise<void>;
  getStatus(deployment: IDeployment): Promise<string>;
  getMetrics(deployment: IDeployment): Promise<DeploymentMetrics>;
  getLogs(deployment: IDeployment, tail?: number): Promise<string[]>;
}

export abstract class BaseProviderService implements DeploymentService {
  abstract deploy(deployment: IDeployment): Promise<void>;
  abstract undeploy(deployment: IDeployment): Promise<void>;
  abstract getStatus(deployment: IDeployment): Promise<string>;
  abstract getMetrics(deployment: IDeployment): Promise<DeploymentMetrics>;
  
  async getLogs(deployment: IDeployment, tail: number = 100): Promise<string[]> {
    return []; // Default implementation returns empty logs
  }

  protected validateConfig(config: Record<string, any>, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }
  }
} 