import * as k8s from '@kubernetes/client-node';
import { DeploymentProvider } from './deployment-factory.service';
import { Deployment } from '../models/deployment.model';
import { logger } from '../utils/logger';

export class KubernetesService implements DeploymentProvider {
  private k8sApi: k8s.AppsV1Api;
  private k8sMetricsApi: k8s.CustomObjectsApi;
  private k8sCoreApi: k8s.CoreV1Api;

  constructor() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    this.k8sApi = kc.makeApiClient(k8s.AppsV1Api);
    this.k8sMetricsApi = kc.makeApiClient(k8s.CustomObjectsApi);
    this.k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
  }

  async deploy(deployment: Deployment): Promise<void> {
    const namespace = deployment.config.namespace || 'default';
    const deploymentManifest: k8s.V1Deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: deployment.name,
        namespace,
      },
      spec: {
        replicas: deployment.config.replicas || 1,
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
                resources: {
                  requests: {
                    cpu: deployment.config.cpu || '100m',
                    memory: deployment.config.memory || '128Mi',
                  },
                  limits: {
                    cpu: deployment.config.cpu || '200m',
                    memory: deployment.config.memory || '256Mi',
                  },
                },
                env: Object.entries(deployment.config.env || {}).map(([key, value]) => ({
                  name: key,
                  value: value,
                })),
              },
            ],
          },
        },
      },
    };

    try {
      await this.k8sApi.createNamespacedDeployment(namespace, deploymentManifest);
      logger.info(`Created Kubernetes deployment: ${deployment.name} in namespace ${namespace}`);
    } catch (error) {
      logger.error(`Failed to create Kubernetes deployment: ${deployment.name}`, { error });
      throw error;
    }
  }

  async getStatus(deployment: Deployment): Promise<string> {
    try {
      const namespace = deployment.config.namespace || 'default';
      const response = await this.k8sApi.readNamespacedDeployment(deployment.name, namespace);
      const status = response.body.status;

      if (status?.availableReplicas === status?.replicas) {
        return 'running';
      } else if (status?.replicas === 0) {
        return 'stopped';
      } else if ((status?.unavailableReplicas ?? 0) > 0) {
        return 'failed';
      } else {
        return 'pending';
      }
    } catch (error) {
      logger.error(`Failed to get Kubernetes deployment status: ${deployment.name}`, { error });
      throw error;
    }
  }

  async getMetrics(deployment: Deployment): Promise<any> {
    try {
      const namespace = deployment.config.namespace || 'default';
      const response = await this.k8sMetricsApi.getNamespacedCustomObject(
        'metrics.k8s.io',
        'v1beta1',
        namespace,
        'pods',
        deployment.name
      );

      const podMetrics = (response.body as any).items.filter((item: any) =>
        item.metadata.name.startsWith(deployment.name)
      );

      return {
        cpu: podMetrics.reduce((acc: number, pod: any) => {
          return acc + parseInt(pod.containers[0].usage.cpu);
        }, 0),
        memory: podMetrics.reduce((acc: number, pod: any) => {
          return acc + parseInt(pod.containers[0].usage.memory);
        }, 0),
      };
    } catch (error) {
      logger.error(`Failed to get Kubernetes metrics: ${deployment.name}`, { error });
      throw error;
    }
  }

  async getLogs(deployment: Deployment): Promise<string[]> {
    try {
      const namespace = deployment.config.namespace || 'default';
      const labelSelector = `app=${deployment.name}`;
      const pods = await this.k8sCoreApi.listNamespacedPod(namespace, undefined, undefined, undefined, undefined, labelSelector);

      const logs = await Promise.all(
        pods.body.items.map(async (pod: k8s.V1Pod) => {
          if (!pod.metadata?.name) {
            throw new Error('Pod name is undefined');
          }
          const response = await this.k8sCoreApi.readNamespacedPodLog(
            pod.metadata.name,
            namespace
          );
          return response.body;
        })
      );

      return logs;
    } catch (error) {
      logger.error(`Failed to get Kubernetes logs: ${deployment.name}`, { error });
      throw error;
    }
  }

  async stop(deployment: Deployment): Promise<void> {
    try {
      const namespace = deployment.config.namespace || 'default';
      const patch = [{
        op: 'replace',
        path: '/spec/replicas',
        value: 0,
      }];

      await this.k8sApi.patchNamespacedDeployment(
        deployment.name,
        namespace,
        patch as any
      );

      logger.info(`Stopped Kubernetes deployment: ${deployment.name}`);
    } catch (error) {
      logger.error(`Failed to stop Kubernetes deployment: ${deployment.name}`, { error });
      throw error;
    }
  }

  async delete(deployment: Deployment): Promise<void> {
    try {
      const namespace = deployment.config.namespace || 'default';
      await this.k8sApi.deleteNamespacedDeployment(deployment.name, namespace);
      logger.info(`Deleted Kubernetes deployment: ${deployment.name}`);
    } catch (error) {
      logger.error(`Failed to delete Kubernetes deployment: ${deployment.name}`, { error });
      throw error;
    }
  }
} 