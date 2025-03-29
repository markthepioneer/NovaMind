import { ServicesClient } from '@google-cloud/run';
import { Logging } from '@google-cloud/logging';
import { MetricServiceClient } from '@google-cloud/monitoring';
import { protos } from '@google-cloud/monitoring';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Deployment } from '../models/deployment.model';
import { DeploymentProvider } from './deployment-factory.service';

type TimeSeries = protos.google.monitoring.v3.ITimeSeries;

interface ICloudRunService {
  name: string;
  status?: {
    conditions?: Array<{
      status: string;
      type: string;
      message?: string;
    }>;
  };
}

export class CloudRunService implements DeploymentProvider {
  private client: ServicesClient;
  private logging: Logging;
  private monitoring: MetricServiceClient;

  constructor() {
    this.client = new ServicesClient();
    this.logging = new Logging();
    this.monitoring = new MetricServiceClient();
  }

  async deploy(deployment: Deployment): Promise<void> {
    try {
      const [operation] = await this.client.createService({
        parent: `projects/${config.google.projectId}/locations/us-central1`,
        service: {
          name: deployment.name,
          template: {
            containers: [{
              image: deployment.config.image || '',
              resources: {
                limits: {
                  cpu: deployment.config.cpu || '1',
                  memory: deployment.config.memory || '512Mi',
                },
              },
              env: Object.entries(deployment.config.env || {}).map(([key, value]) => ({
                name: key,
                value: value.toString(),
              })),
            }],
          },
        },
      });

      await operation.promise();
      const response = await this.client.getService({
        name: `projects/${config.google.projectId}/locations/us-central1/services/${deployment.name}`,
      });
      const service = response[0] as unknown as ICloudRunService;

      logger.info('Cloud Run service deployed', {
        name: deployment.name,
        status: service?.status,
      });
    } catch (error) {
      logger.error('Failed to deploy Cloud Run service', { error });
      throw error;
    }
  }

  async getStatus(deployment: Deployment): Promise<string> {
    try {
      const response = await this.client.getService({
        name: `projects/${config.google.projectId}/locations/us-central1/services/${deployment.name}`,
      });
      const service = response[0] as unknown as ICloudRunService;

      if (!service?.status?.conditions) {
        return 'failed';
      }

      const conditions = service.status.conditions;
      if (conditions.some((condition: { status: string }) => condition.status === 'False')) {
        return 'failed';
      }

      if (conditions.every((condition: { status: string }) => condition.status === 'True')) {
        return 'running';
      }

      return 'stopped';
    } catch (error) {
      logger.error('Failed to get Cloud Run service status', { error });
      return 'failed';
    }
  }

  async getMetrics(deployment: Deployment): Promise<{
    cpu: number;
    memory: number;
    requests: number;
  }> {
    try {
      const [timeSeries] = await this.monitoring.listTimeSeries({
        name: `projects/${config.google.projectId}`,
        filter: `resource.type="cloud_run_revision" AND resource.labels.service_name="${deployment.name}"`,
        interval: {
          startTime: { seconds: Date.now() / 1000 - 3600 },
          endTime: { seconds: Date.now() / 1000 },
        },
      });

      let cpu = 0;
      let memory = 0;
      let requests = 0;

      timeSeries.forEach((series: TimeSeries) => {
        const value = series.points?.[0]?.value?.doubleValue || 0;
        const metricType = series.metric?.type;
        if (metricType) {
          switch (metricType) {
            case 'run.googleapis.com/container/cpu/utilization':
              cpu = value;
              break;
            case 'run.googleapis.com/container/memory/utilization':
              memory = value;
              break;
            case 'run.googleapis.com/request_count':
              requests = value;
              break;
          }
        }
      });

      return { cpu, memory, requests };
    } catch (error) {
      logger.error('Failed to get Cloud Run metrics', { error });
      throw error;
    }
  }

  async getLogs(deployment: Deployment): Promise<string[]> {
    try {
      const log = this.logging.log(deployment.name);
      const [entries] = await log.getEntries({
        filter: `resource.type="cloud_run_revision" AND resource.labels.service_name="${deployment.name}"`,
        orderBy: 'timestamp desc',
        pageSize: 50,
      });

      return entries.map(entry => {
        const data = entry.data || entry.metadata?.jsonPayload || entry.metadata?.textPayload;
        return typeof data === 'string' ? data : JSON.stringify(data);
      });
    } catch (error) {
      logger.error('Failed to get Cloud Run logs', { error });
      throw error;
    }
  }

  async stop(deployment: Deployment): Promise<void> {
    try {
      const [operation] = await this.client.updateService({
        service: {
          name: `projects/${config.google.projectId}/locations/us-central1/services/${deployment.name}`,
          template: {
            containers: [{
              image: deployment.config.image || '',
              resources: {
                limits: {
                  cpu: '0',
                  memory: '0',
                },
              },
            }],
          },
        },
        updateMask: {
          paths: ['template.containers[0].resources.limits'],
        },
      });

      await operation.promise();
      logger.info('Cloud Run service stopped', { name: deployment.name });
    } catch (error) {
      logger.error('Failed to stop Cloud Run service', { error });
      throw error;
    }
  }

  async delete(deployment: Deployment): Promise<void> {
    try {
      const [operation] = await this.client.deleteService({
        name: `projects/${config.google.projectId}/locations/us-central1/services/${deployment.name}`,
      });

      await operation.promise();
      logger.info('Cloud Run service deleted', { name: deployment.name });
    } catch (error) {
      logger.error('Failed to delete Cloud Run service', { error });
      throw error;
    }
  }
} 