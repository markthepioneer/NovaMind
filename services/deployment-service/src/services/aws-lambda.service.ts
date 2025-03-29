import { Lambda, CloudWatchLogs, CloudWatch } from 'aws-sdk';
import { BaseProviderService, DeploymentMetrics } from './base-provider.service';
import { IDeployment } from '../models/deployment.model';
import { logger } from '../utils/logger';

export class AWSLambdaService extends BaseProviderService {
  private lambda: Lambda;
  private cloudWatch: CloudWatch;
  private cloudWatchLogs: CloudWatchLogs;

  constructor() {
    super();
    this.lambda = new Lambda();
    this.cloudWatch = new CloudWatch();
    this.cloudWatchLogs = new CloudWatchLogs();
  }

  async deploy(deployment: IDeployment): Promise<void> {
    try {
      this.validateConfig(deployment.config, ['functionName', 'runtime', 'handler', 'role', 'code']);

      const params: Lambda.Types.CreateFunctionRequest = {
        FunctionName: deployment.config.functionName,
        Runtime: deployment.config.runtime,
        Handler: deployment.config.handler,
        Role: deployment.config.role,
        Code: {
          ZipFile: deployment.config.code,
        },
        MemorySize: deployment.config.memorySize || 128,
        Timeout: deployment.config.timeout || 30,
        Environment: {
          Variables: deployment.config.environment || {},
        },
      };

      await this.lambda.createFunction(params).promise();
    } catch (error: unknown) {
      logger.error('Error deploying to AWS Lambda:', error);
      throw error;
    }
  }

  async undeploy(deployment: IDeployment): Promise<void> {
    try {
      await this.lambda.deleteFunction({
        FunctionName: deployment.config.functionName,
      }).promise();
    } catch (error: unknown) {
      logger.error('Error undeploying from AWS Lambda:', error);
      throw error;
    }
  }

  async getStatus(deployment: IDeployment): Promise<string> {
    try {
      const response = await this.lambda.getFunctionConfiguration({
        FunctionName: deployment.config.functionName,
      }).promise();

      switch (response.State) {
        case 'Active':
          return 'running';
        case 'Inactive':
          return 'stopped';
        case 'Failed':
          return 'failed';
        case 'Pending':
          return 'pending';
        default:
          return 'unknown';
      }
    } catch (error: unknown) {
      logger.error('Error getting AWS Lambda status:', error);
      return 'failed';
    }
  }

  async getMetrics(deployment: IDeployment): Promise<DeploymentMetrics> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 5 * 60 * 1000); // Last 5 minutes

      const [invocations, errors, duration, throttles] = await Promise.all([
        this.getMetricData('Invocations', deployment.config.functionName, startTime, endTime),
        this.getMetricData('Errors', deployment.config.functionName, startTime, endTime),
        this.getMetricData('Duration', deployment.config.functionName, startTime, endTime),
        this.getMetricData('Throttles', deployment.config.functionName, startTime, endTime),
      ]);

      const requestCount = invocations.reduce((sum, val) => sum + val, 0);
      const errorCount = errors.reduce((sum, val) => sum + val, 0);
      const avgDuration = duration.reduce((sum, val) => sum + val, 0) / duration.length || 0;

      return {
        cpuUsage: 0, // Not available for Lambda
        memoryUsage: 0, // Not available for Lambda
        requestCount,
        responseTime: avgDuration,
        errorRate: requestCount > 0 ? (errorCount / requestCount) * 100 : 0,
      };
    } catch (error: unknown) {
      logger.error('Error getting AWS Lambda metrics:', error);
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
      const logGroupName = `/aws/lambda/${deployment.config.functionName}`;
      
      // Get log streams
      const streams = await this.cloudWatchLogs.describeLogStreams({
        logGroupName,
        orderBy: 'LastEventTime',
        descending: true,
        limit: 1,
      }).promise();

      if (!streams.logStreams || streams.logStreams.length === 0) {
        return [];
      }

      // Get logs from the most recent stream
      const logs = await this.cloudWatchLogs.getLogEvents({
        logGroupName,
        logStreamName: streams.logStreams[0].logStreamName!,
        limit: tail,
        startFromHead: false,
      }).promise();

      return (logs.events || []).map(event => event.message || '');
    } catch (error: unknown) {
      logger.error('Error getting AWS Lambda logs:', error);
      return [];
    }
  }

  private async getMetricData(
    metricName: string,
    functionName: string,
    startTime: Date,
    endTime: Date
  ): Promise<number[]> {
    const params: CloudWatch.Types.GetMetricDataInput = {
      MetricDataQueries: [
        {
          Id: 'm1',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/Lambda',
              MetricName: metricName,
              Dimensions: [
                {
                  Name: 'FunctionName',
                  Value: functionName,
                },
              ],
            },
            Period: 60,
            Stat: 'Sum',
          },
        },
      ],
      StartTime: startTime,
      EndTime: endTime,
    };

    try {
      const response = await this.cloudWatch.getMetricData(params).promise();
      return response.MetricDataResults?.[0]?.Values || [];
    } catch (error: unknown) {
      logger.error(`Error getting ${metricName} metric:`, error);
      return [];
    }
  }
}
