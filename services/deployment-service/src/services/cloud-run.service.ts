import { Service } from '@google-cloud/run';
import { MonitoringClient } from '@google-cloud/monitoring';
import { Logging, Entry } from '@google-cloud/logging';
import { BaseProviderService, DeploymentMetrics } from './base-provider.service';
import { IDeployment } from '../models/deployment.model';
import { logger } from '../utils/logger';
import { Types } from 'mongoose';

// Extend IDeployment to include _id
interface DeploymentWithId extends IDeployment {
  _id: Types.ObjectId;
}

export class CloudRunService extends BaseProviderService {
  private cloudRun: Service;
  private monitoring: MonitoringClient;
  private logging: Logging;
  private projectId: string;
  private region: string;

  constructor() {
    super();
    this.cloudRun = new Service();
    this.monitoring = new MonitoringClient();
    this.logging = new Logging();
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || '';
    this.region = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
    
    if (!this.projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT environment variable is required');
    }
  }

  async deploy(deployment: IDeployment): Promise<void> {
    try {
      this.validateConfig(deployment.config, ['name', 'image', 'region']);

      const [service] = await this.cloudRun.createService({
        parent: `projects/${this.projectId}/locations/${deployment.config.region}`,
        service: {
          name: deployment.config.name,
          template: {
            containers: [{
              image: deployment.config.image,
              resources: {
                limits: {
                  cpu: deployment.config.cpu || '1000m',
                  memory: deployment.config.memory || '256Mi'
                }
              },
              env: Object.entries(deployment.config.environment || {}).map(([key, value]) => ({
                name: key,
                value: String(value)
              }))
            }],
            containerConcurrency: deployment.config.containerConcurrency || 80
          }
        }
      });

      if (!service) {
        throw new Error('Failed to create Cloud Run service');
      }
    } catch (error: unknown) {
      logger.error('Error deploying to Cloud Run:', error);
      throw error;
    }
  }

  async undeploy(deployment: IDeployment): Promise<void> {
    try {
      const name = `projects/${this.projectId}/locations/${deployment.config.region}/services/${deployment.config.name}`;
      await this.cloudRun.deleteService({ name });
    } catch (error: unknown) {
      logger.error('Error undeploying from Cloud Run:', error);
      throw error;
    }
  }

  async getStatus(deployment: IDeployment): Promise<string> {
    try {
      const name = `projects/${this.projectId}/locations/${deployment.config.region}/services/${deployment.config.name}`;
      const [service] = await this.cloudRun.getService({ name });

      if (!service || !service.status) {
        return 'unknown';
      }

      switch (service.status.conditions?.[0]?.status) {
        case true:
          return 'running';
        case false:
          return 'failed';
        default:
          return service.status.conditions?.[0]?.type === 'Ready' ? 'pending' : 'unknown';
      }
    } catch (error: unknown) {
      logger.error('Error getting Cloud Run status:', error);
      return 'failed';
    }
  }

  async getMetrics(deployment: IDeployment): Promise<DeploymentMetrics> {
    try {
      const projectPath = this.monitoring.projectPath(this.projectId);
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 5 * 60 * 1000); // Last 5 minutes

      const [requestCount, latency, cpuUsage, memoryUsage] = await Promise.all([
        this.getMetricData('run.googleapis.com/request_count', deployment.config.name, startTime, endTime),
        this.getMetricData('run.googleapis.com/request_latencies', deployment.config.name, startTime, endTime),
        this.getMetricData('run.googleapis.com/container/cpu/utilization', deployment.config.name, startTime, endTime),
        this.getMetricData('run.googleapis.com/container/memory/utilization', deployment.config.name, startTime, endTime)
      ]);

      const totalRequests = requestCount.reduce((sum, val) => sum + val, 0);
      const avgLatency = latency.reduce((sum, val) => sum + val, 0) / latency.length || 0;
      const avgCpu = cpuUsage.reduce((sum, val) => sum + val, 0) / cpuUsage.length || 0;
      const avgMemory = memoryUsage.reduce((sum, val) => sum + val, 0) / memoryUsage.length || 0;

      return {
        cpuUsage: avgCpu * 100, // Convert to percentage
        memoryUsage: avgMemory * 100, // Convert to percentage
        requestCount: totalRequests,
        responseTime: avgLatency,
        errorRate: 0 // Cloud Run doesn't provide error rate metric directly
      };
    } catch (error: unknown) {
      logger.error('Error getting Cloud Run metrics:', error);
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        requestCount: 0,
        responseTime: 0,
        errorRate: 0
      };
    }
  }

  async getLogs(deployment: IDeployment, tail: number = 100): Promise<string[]> {
    try {
      const filter = `resource.type="cloud_run_revision" AND resource.labels.service_name="${deployment.config.name}"`;
      const [entries] = await this.logging.getEntries({
        filter,
        orderBy: 'timestamp desc',
        pageSize: tail
      });

      return (entries as Entry[]).map(entry => entry.data?.message || JSON.stringify(entry.data));
    } catch (error: unknown) {
      logger.error('Error getting Cloud Run logs:', error);
      return [];
    }
  }

  private async getMetricData(
    metricType: string,
    serviceName: string,
    startTime: Date,
    endTime: Date
  ): Promise<number[]> {
    const request = {
      name: `projects/${this.projectId}`,
      filter: `metric.type="${metricType}" AND resource.labels.service_name="${serviceName}"`,
      interval: {
        startTime: {
          seconds: Math.floor(startTime.getTime() / 1000),
          nanos: 0
        },
        endTime: {
          seconds: Math.floor(endTime.getTime() / 1000),
          nanos: 0
        }
      }
    };

    try {
      const [timeSeries] = await this.monitoring.listTimeSeries(request);
      if (!timeSeries || timeSeries.length === 0) {
        return [];
      }

      return timeSeries[0].points?.map(point => Number(point.value?.doubleValue || 0)) || [];
    } catch (error: unknown) {
      logger.error(`Error getting ${metricType} metric:`, error);
      return [];
    }
  }

  /**
   * Deploy an agent to Cloud Run
   */
  async deployAgent(deployment: DeploymentWithId): Promise<boolean> {
    try {
      const serviceName = `agent-${deployment._id.toString()}`;
      const image = 'novamind/agent-runtime:latest';

      // Convert memory from Kubernetes format (e.g., '256Mi') to MB
      const memoryMB = this.parseMemory(deployment.resources.memory);
      
      // Convert CPU from Kubernetes format (e.g., '100m') to Cloud Run format
      const cpu = this.parseCpu(deployment.resources.cpu);

      const service = {
        name: serviceName,
        template: {
          spec: {
            containers: [{
              image,
              ports: [{
                containerPort: 4000,
                name: 'http1'
              }],
              env: [
                {
                  name: 'AGENT_ID',
                  value: deployment.agentId
                },
                {
                  name: 'DEPLOYMENT_ID',
                  value: deployment._id.toString()
                },
                {
                  name: 'ENVIRONMENT',
                  value: deployment.environment
                }
              ],
              resources: {
                limits: {
                  cpu: `${cpu}`,
                  memory: `${memoryMB}Mi`
                }
              }
            }],
            serviceAccountName: process.env.CLOUD_RUN_SERVICE_ACCOUNT
          },
          metadata: {
            annotations: {
              'autoscaling.knative.dev/maxScale': deployment.resources.autoscaling.maxReplicas.toString(),
              'autoscaling.knative.dev/minScale': deployment.resources.autoscaling.minReplicas.toString(),
              'autoscaling.knative.dev/target': deployment.resources.autoscaling.targetCpuUtilization.toString()
            }
          }
        }
      };

      // Create or update the service
      const [operation] = await this.cloudRun.services.create({
        parent: `projects/${this.projectId}/locations/${this.region}`,
        service
      });

      // Wait for the operation to complete
      await operation.promise();

      return true;
    } catch (error: any) {
      logger.error('Error deploying agent to Cloud Run:', error);
      throw error;
    }
  }

  /**
   * Get deployment status from Cloud Run
   */
  async getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus> {
    try {
      const serviceName = `agent-${deploymentId}`;
      const [service] = await this.cloudRun.services.get({
        name: `projects/${this.projectId}/locations/${this.region}/services/${serviceName}`
      });

      const status = service.status?.conditions?.[0]?.status;
      
      if (status === 'True') {
        return DeploymentStatus.RUNNING;
      } else if (status === 'False') {
        return DeploymentStatus.FAILED;
      } else if (status === 'Unknown') {
        return DeploymentStatus.DEPLOYING;
      }

      return DeploymentStatus.RUNNING; // Default to running if status is unknown
    } catch (error: any) {
      if (error.code === 5) { // NOT_FOUND
        return DeploymentStatus.DELETED;
      }
      
      logger.error('Error getting Cloud Run deployment status:', error);
      return DeploymentStatus.FAILED;
    }
  }

  /**
   * Stop a deployment
   */
  async stopDeployment(deploymentId: string): Promise<boolean> {
    try {
      const serviceName = `agent-${deploymentId}`;
      
      // Update the service to scale to 0
      const [operation] = await this.cloudRun.services.patch({
        name: `projects/${this.projectId}/locations/${this.region}/services/${serviceName}`,
        service: {
          template: {
            metadata: {
              annotations: {
                'autoscaling.knative.dev/maxScale': '0',
                'autoscaling.knative.dev/minScale': '0'
              }
            }
          }
        }
      });

      await operation.promise();
      return true;
    } catch (error: any) {
      logger.error('Error stopping Cloud Run deployment:', error);
      throw error;
    }
  }

  /**
   * Start a deployment
   */
  async startDeployment(deployment: DeploymentWithId): Promise<boolean> {
    try {
      const serviceName = `agent-${deployment._id.toString()}`;
      
      // Update the service to restore scaling
      const [operation] = await this.cloudRun.services.patch({
        name: `projects/${this.projectId}/locations/${this.region}/services/${serviceName}`,
        service: {
          template: {
            metadata: {
              annotations: {
                'autoscaling.knative.dev/maxScale': deployment.resources.autoscaling.maxReplicas.toString(),
                'autoscaling.knative.dev/minScale': deployment.resources.autoscaling.minReplicas.toString()
              }
            }
          }
        }
      });

      await operation.promise();
      return true;
    } catch (error: any) {
      logger.error('Error starting Cloud Run deployment:', error);
      throw error;
    }
  }

  /**
   * Delete a deployment
   */
  async deleteDeployment(deploymentId: string): Promise<boolean> {
    try {
      const serviceName = `agent-${deploymentId}`;
      
      const [operation] = await this.cloudRun.services.delete({
        name: `projects/${this.projectId}/locations/${this.region}/services/${serviceName}`
      });

      await operation.promise();
      return true;
    } catch (error: any) {
      if (error.code === 5) { // NOT_FOUND
        return true; // Consider it successfully deleted if it doesn't exist
      }
      
      logger.error('Error deleting Cloud Run deployment:', error);
      throw error;
    }
  }

  /**
   * Parse memory string to MB
   */
  private parseMemory(memoryString: string): number {
    const numericPart = parseInt(memoryString.replace(/[^0-9]/g, ''));
    const unit = memoryString.replace(/[0-9]/g, '');
    
    let memoryMB: number;
    
    if (unit === 'Ki') {
      memoryMB = numericPart / 1024;
    } else if (unit === 'Mi') {
      memoryMB = numericPart;
    } else if (unit === 'Gi') {
      memoryMB = numericPart * 1024;
    } else {
      memoryMB = parseInt(memoryString) / (1024 * 1024);
    }
    
    // Cloud Run memory must be between 128MB and 4GB
    memoryMB = Math.max(128, memoryMB);
    memoryMB = Math.min(4096, memoryMB);
    
    return memoryMB;
  }

  /**
   * Parse CPU string to Cloud Run format
   */
  private parseCpu(cpuString: string): string {
    // Convert from Kubernetes format (e.g., '100m') to Cloud Run format
    const numericPart = parseInt(cpuString.replace(/[^0-9]/g, ''));
    const unit = cpuString.replace(/[0-9]/g, '');
    
    if (unit === 'm') {
      // Convert millicores to CPU (1000m = 1 CPU)
      return (numericPart / 1000).toString();
    } else {
      return numericPart.toString();
    }
  }
}