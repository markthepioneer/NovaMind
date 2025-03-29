import { v2 } from '@google-cloud/run';
import { v3 } from '@google-cloud/monitoring';
import * as AWS from 'aws-sdk';
import { logger } from '../utils/logger';

export interface DeploymentMetrics {
  cpuUsage: number;
  memoryUsage: number;
  requestCount: number;
  responseTime: number;
  errorRate: number;
}

export class MetricsService {
  private cloudRun: v2.ServicesClient;
  private monitoring: v3.MetricServiceClient;
  private cloudwatch: AWS.CloudWatch;
  private projectId: string;
  private region: string;

  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || '';
    this.region = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
    
    if (!this.projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT environment variable is required');
    }

    this.cloudRun = new v2.ServicesClient({
      projectId: this.projectId,
      location: this.region
    });

    this.monitoring = new v3.MetricServiceClient({
      projectId: this.projectId
    });

    this.cloudwatch = new AWS.CloudWatch({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  /**
   * Get metrics for a Cloud Run deployment
   */
  async getCloudRunMetrics(deploymentId: string): Promise<DeploymentMetrics> {
    try {
      const serviceName = `agent-${deploymentId}`;
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Get CPU usage
      const [cpuData] = await this.monitoring.listTimeSeries({
        name: this.monitoring.projectPath(this.projectId),
        filter: `metric.type="run.googleapis.com/container/cpu/utilization" AND resource.type="cloud_run_revision" AND resource.labels.service_name="${serviceName}"`,
        interval: {
          startTime: {
            seconds: Math.floor(fiveMinutesAgo.getTime() / 1000)
          },
          endTime: {
            seconds: Math.floor(now.getTime() / 1000)
          }
        }
      });

      // Get memory usage
      const [memoryData] = await this.monitoring.listTimeSeries({
        name: this.monitoring.projectPath(this.projectId),
        filter: `metric.type="run.googleapis.com/container/memory/utilization" AND resource.type="cloud_run_revision" AND resource.labels.service_name="${serviceName}"`,
        interval: {
          startTime: {
            seconds: Math.floor(fiveMinutesAgo.getTime() / 1000)
          },
          endTime: {
            seconds: Math.floor(now.getTime() / 1000)
          }
        }
      });

      // Get request count
      const [requestData] = await this.monitoring.listTimeSeries({
        name: this.monitoring.projectPath(this.projectId),
        filter: `metric.type="run.googleapis.com/request_count" AND resource.type="cloud_run_revision" AND resource.labels.service_name="${serviceName}"`,
        interval: {
          startTime: {
            seconds: Math.floor(fiveMinutesAgo.getTime() / 1000)
          },
          endTime: {
            seconds: Math.floor(now.getTime() / 1000)
          }
        }
      });

      // Get response time
      const [latencyData] = await this.monitoring.listTimeSeries({
        name: this.monitoring.projectPath(this.projectId),
        filter: `metric.type="run.googleapis.com/request_latencies" AND resource.type="cloud_run_revision" AND resource.labels.service_name="${serviceName}"`,
        interval: {
          startTime: {
            seconds: Math.floor(fiveMinutesAgo.getTime() / 1000)
          },
          endTime: {
            seconds: Math.floor(now.getTime() / 1000)
          }
        }
      });

      // Calculate metrics
      const cpuUsage = this.calculateAverageMetric(cpuData?.[0]?.points || []);
      const memoryUsage = this.calculateAverageMetric(memoryData?.[0]?.points || []);
      const requestCount = this.calculateSumMetric(requestData?.[0]?.points || []);
      const responseTime = this.calculateAverageMetric(latencyData?.[0]?.points || []);
      const errorRate = await this.calculateErrorRate(serviceName, fiveMinutesAgo, now);

      return {
        cpuUsage,
        memoryUsage,
        requestCount,
        responseTime,
        errorRate
      };
    } catch (error) {
      logger.error('Error getting Cloud Run metrics:', error);
      return this.getDefaultMetrics();
    }
  }

  /**
   * Get metrics for an AWS Lambda deployment
   */
  async getLambdaMetrics(deploymentId: string): Promise<DeploymentMetrics> {
    try {
      const functionName = `novamind-agent-${deploymentId}`;
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Get CPU usage
      const cpuData = await this.cloudwatch.getMetricStatistics({
        Namespace: 'AWS/Lambda',
        MetricName: 'CPUUtilization',
        Dimensions: [{ Name: 'FunctionName', Value: functionName }],
        StartTime: fiveMinutesAgo,
        EndTime: now,
        Period: 60,
        Statistics: ['Average']
      }).promise();

      // Get memory usage
      const memoryData = await this.cloudwatch.getMetricStatistics({
        Namespace: 'AWS/Lambda',
        MetricName: 'MemoryUtilization',
        Dimensions: [{ Name: 'FunctionName', Value: functionName }],
        StartTime: fiveMinutesAgo,
        EndTime: now,
        Period: 60,
        Statistics: ['Average']
      }).promise();

      // Get request count
      const requestData = await this.cloudwatch.getMetricStatistics({
        Namespace: 'AWS/Lambda',
        MetricName: 'Invocations',
        Dimensions: [{ Name: 'FunctionName', Value: functionName }],
        StartTime: fiveMinutesAgo,
        EndTime: now,
        Period: 60,
        Statistics: ['Sum']
      }).promise();

      // Get response time
      const durationData = await this.cloudwatch.getMetricStatistics({
        Namespace: 'AWS/Lambda',
        MetricName: 'Duration',
        Dimensions: [{ Name: 'FunctionName', Value: functionName }],
        StartTime: fiveMinutesAgo,
        EndTime: now,
        Period: 60,
        Statistics: ['Average']
      }).promise();

      // Get error rate
      const errorData = await this.cloudwatch.getMetricStatistics({
        Namespace: 'AWS/Lambda',
        MetricName: 'Errors',
        Dimensions: [{ Name: 'FunctionName', Value: functionName }],
        StartTime: fiveMinutesAgo,
        EndTime: now,
        Period: 60,
        Statistics: ['Sum']
      }).promise();

      const cpuUsage = this.calculateAverageMetric(cpuData.Datapoints || []);
      const memoryUsage = this.calculateAverageMetric(memoryData.Datapoints || []);
      const requestCount = this.calculateSumMetric(requestData.Datapoints || []);
      const responseTime = this.calculateAverageMetric(durationData.Datapoints || []);
      const errorRate = this.calculateErrorRateFromDatapoints(errorData.Datapoints || [], requestData.Datapoints || []);

      return {
        cpuUsage,
        memoryUsage,
        requestCount,
        responseTime,
        errorRate
      };
    } catch (error) {
      logger.error('Error getting Lambda metrics:', error);
      return this.getDefaultMetrics();
    }
  }

  /**
   * Calculate average metric value from time series points
   */
  private calculateAverageMetric(points: any[]): number {
    if (!points.length) return 0;
    const sum = points.reduce((acc, point) => acc + (point.value?.doubleValue || 0), 0);
    return sum / points.length;
  }

  /**
   * Calculate sum metric value from time series points
   */
  private calculateSumMetric(points: any[]): number {
    if (!points.length) return 0;
    return points.reduce((acc, point) => acc + (point.value?.doubleValue || 0), 0);
  }

  /**
   * Calculate error rate for Cloud Run
   */
  private async calculateErrorRate(serviceName: string, startTime: Date, endTime: Date): Promise<number> {
    try {
      const [errorData] = await this.monitoring.listTimeSeries({
        name: this.monitoring.projectPath(this.projectId),
        filter: `metric.type="run.googleapis.com/request_count" AND resource.type="cloud_run_revision" AND resource.labels.service_name="${serviceName}" AND metric.labels.response_code_class="5"`,
        interval: {
          startTime: {
            seconds: Math.floor(startTime.getTime() / 1000)
          },
          endTime: {
            seconds: Math.floor(endTime.getTime() / 1000)
          }
        }
      });

      const [totalData] = await this.monitoring.listTimeSeries({
        name: this.monitoring.projectPath(this.projectId),
        filter: `metric.type="run.googleapis.com/request_count" AND resource.type="cloud_run_revision" AND resource.labels.service_name="${serviceName}"`,
        interval: {
          startTime: {
            seconds: Math.floor(startTime.getTime() / 1000)
          },
          endTime: {
            seconds: Math.floor(endTime.getTime() / 1000)
          }
        }
      });

      const errorCount = this.calculateSumMetric(errorData?.[0]?.points || []);
      const totalCount = this.calculateSumMetric(totalData?.[0]?.points || []);

      return totalCount > 0 ? (errorCount / totalCount) * 100 : 0;
    } catch (error) {
      logger.error('Error calculating error rate:', error);
      return 0;
    }
  }

  /**
   * Calculate error rate for Lambda
   */
  private calculateErrorRateFromDatapoints(errorDatapoints: any[], requestDatapoints: any[]): number {
    const errorCount = this.calculateSumMetric(errorDatapoints);
    const totalCount = this.calculateSumMetric(requestDatapoints);
    return totalCount > 0 ? (errorCount / totalCount) * 100 : 0;
  }

  /**
   * Get default metrics when there's an error
   */
  private getDefaultMetrics(): DeploymentMetrics {
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      requestCount: 0,
      responseTime: 0,
      errorRate: 0
    };
  }
} 