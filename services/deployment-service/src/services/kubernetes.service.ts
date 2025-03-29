import * as k8s from '@kubernetes/client-node';
import { BaseProviderService, DeploymentMetrics } from './base-provider.service';
import { IDeployment } from '../models/deployment.model';
import { logger } from '../utils/logger';

export class KubernetesService extends BaseProviderService {
  private k8sApi: k8s.CoreV1Api;
  private k8sAppsApi: k8s.AppsV1Api;
  private metricsApi: k8s.CustomObjectsApi;

  constructor() {
    super();
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    
    this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    this.k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);
    this.metricsApi = kc.makeApiClient(k8s.CustomObjectsApi);
  }

  async deploy(deployment: IDeployment): Promise<void> {
    try {
      this.validateConfig(deployment.config, ['namespace', 'image', 'replicas']);
      
      const deploymentManifest: k8s.V1Deployment = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: deployment.name,
          namespace: deployment.config.namespace,
        },
        spec: {
          replicas: deployment.config.replicas,
          selector: {
            matchLabels: {
              app: deployment.name,
            },
          },
          template: {
            metadata: {
              labels: {
                app: deployment.name,
              },
            },
            spec: {
              containers: [
                {
                  name: deployment.name,
                  image: deployment.config.image,
                  resources: deployment.config.resources || {
                    requests: {
                      cpu: '100m',
                      memory: '128Mi',
                    },
                    limits: {
                      cpu: '200m',
                      memory: '256Mi',
                    },
                  },
                },
              ],
            },
          },
        },
      };

      await this.k8sAppsApi.createNamespacedDeployment(
        deployment.config.namespace,
        deploymentManifest
      );
    } catch (error: unknown) {
      logger.error('Error deploying to Kubernetes:', error);
      throw error;
    }
  }

  async undeploy(deployment: IDeployment): Promise<void> {
    try {
      await this.k8sAppsApi.deleteNamespacedDeployment(
        deployment.name,
        deployment.config.namespace,
        undefined, // options
        undefined, // pretty
        undefined, // dryRun
        undefined, // gracePeriodSeconds
        undefined, // orphanDependents
        'Background' // propagationPolicy
      );
    } catch (error: unknown) {
      logger.error('Error undeploying from Kubernetes:', error);
      throw error;
    }
  }

  async getStatus(deployment: IDeployment): Promise<string> {
    try {
      const response = await this.k8sAppsApi.readNamespacedDeployment(
        deployment.name,
        deployment.config.namespace
      );

      const status = response.body.status;
      if (!status) return 'unknown';

      if (status.availableReplicas === status.replicas) {
        return 'running';
      } else if (status.availableReplicas === 0) {
        return 'stopped';
      } else {
        return 'pending';
      }
    } catch (error: unknown) {
      logger.error('Error getting Kubernetes deployment status:', error);
      return 'failed';
    }
  }

  async getMetrics(deployment: IDeployment): Promise<DeploymentMetrics> {
    try {
      const metrics = await this.metricsApi.getNamespacedCustomObject(
        'metrics.k8s.io',
        'v1beta1',
        deployment.config.namespace,
        'pods',
        deployment.name
      );

      // Parse and calculate metrics
      const podMetrics = metrics as any;
      let cpuUsage = 0;
      let memoryUsage = 0;

      if (podMetrics.containers) {
        for (const container of podMetrics.containers) {
          cpuUsage += parseInt(container.usage.cpu);
          memoryUsage += parseInt(container.usage.memory);
        }
      }

      return {
        cpuUsage: cpuUsage / 1000000, // Convert to millicores
        memoryUsage: memoryUsage / (1024 * 1024), // Convert to MB
        requestCount: 0, // Would need metrics server or Prometheus for this
        responseTime: 0, // Would need metrics server or Prometheus for this
        errorRate: 0, // Would need metrics server or Prometheus for this
      };
    } catch (error: unknown) {
      logger.error('Error getting Kubernetes metrics:', error);
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        requestCount: 0,
        responseTime: 0,
        errorRate: 0,
      };
    }
  }

  async getLogs(deployment: IDeployment, tail: number = 100): Promise<string[]> {
    try {
      const response = await this.k8sApi.readNamespacedPodLog(
        deployment.name,
        deployment.config.namespace,
        undefined, // container
        undefined, // follow
        undefined, // insecureSkipTLSVerifyBackend
        undefined, // limitBytes
        undefined, // pretty
        undefined, // previous
        undefined, // sinceSeconds
        tail // tailLines
      );

      return response.body.split('\n');
    } catch (error: unknown) {
      logger.error('Error getting Kubernetes logs:', error);
      return [];
    }
  }
}
