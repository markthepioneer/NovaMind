import AWS from 'aws-sdk';
import { DeploymentProvider } from './deployment-factory.service';
import { Deployment } from '../models/deployment.model';
import { logger } from '../utils/logger';

export class AWSLambdaService implements DeploymentProvider {
  private lambda: AWS.Lambda;
  private cloudwatch: AWS.CloudWatch;
  private logs: AWS.CloudWatchLogs;

  constructor() {
    AWS.config.update({ region: process.env.AWS_REGION || 'us-east-1' });
    this.lambda = new AWS.Lambda();
    this.cloudwatch = new AWS.CloudWatch();
    this.logs = new AWS.CloudWatchLogs();
  }

  async deploy(deployment: Deployment): Promise<void> {
    try {
      if (!deployment.config.role) {
        throw new Error('Lambda execution role is required');
      }

      const params: AWS.Lambda.CreateFunctionRequest = {
        FunctionName: deployment.name,
        Runtime: deployment.config.runtime || 'nodejs18.x',
        Handler: deployment.config.handler || 'index.handler',
        Role: deployment.config.role,
        Code: {
          S3Bucket: deployment.config.s3Bucket,
          S3Key: deployment.config.s3Key,
        },
        MemorySize: deployment.config.memory ? parseInt(deployment.config.memory) : 128,
        Timeout: parseInt(deployment.config.timeout) || 30,
        Environment: {
          Variables: deployment.config.env || {},
        },
      };

      await this.lambda.createFunction(params).promise();
      logger.info(`Created Lambda function: ${deployment.name}`);
    } catch (error) {
      logger.error(`Failed to create Lambda function: ${deployment.name}`, { error });
      throw error;
    }
  }

  async getStatus(deployment: Deployment): Promise<string> {
    try {
      const params: AWS.Lambda.GetFunctionRequest = {
        FunctionName: deployment.name,
      };

      const response = await this.lambda.getFunction(params).promise();
      const state = response.Configuration?.State;
      const lastUpdateStatus = response.Configuration?.LastUpdateStatus;

      if (state === 'Active' && lastUpdateStatus === 'Successful') {
        return 'running';
      } else if (state === 'Failed') {
        return 'failed';
      } else if (state === 'Inactive') {
        return 'stopped';
      } else {
        return 'pending';
      }
    } catch (error) {
      logger.error(`Failed to get Lambda function status: ${deployment.name}`, { error });
      throw error;
    }
  }

  async getMetrics(deployment: Deployment): Promise<any> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 5 * 60000); // Last 5 minutes

      const params: AWS.CloudWatch.GetMetricDataInput = {
        StartTime: startTime,
        EndTime: endTime,
        MetricDataQueries: [
          {
            Id: 'invocations',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/Lambda',
                MetricName: 'Invocations',
                Dimensions: [
                  {
                    Name: 'FunctionName',
                    Value: deployment.name,
                  },
                ],
              },
              Period: 300,
              Stat: 'Sum',
            },
          },
          {
            Id: 'errors',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/Lambda',
                MetricName: 'Errors',
                Dimensions: [
                  {
                    Name: 'FunctionName',
                    Value: deployment.name,
                  },
                ],
              },
              Period: 300,
              Stat: 'Sum',
            },
          },
          {
            Id: 'duration',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/Lambda',
                MetricName: 'Duration',
                Dimensions: [
                  {
                    Name: 'FunctionName',
                    Value: deployment.name,
                  },
                ],
              },
              Period: 300,
              Stat: 'Average',
            },
          },
        ],
      };

      const response = await this.cloudwatch.getMetricData(params).promise();
      return {
        invocations: response.MetricDataResults?.find(r => r.Id === 'invocations')?.Values?.[0] || 0,
        errors: response.MetricDataResults?.find(r => r.Id === 'errors')?.Values?.[0] || 0,
        duration: response.MetricDataResults?.find(r => r.Id === 'duration')?.Values?.[0] || 0,
      };
    } catch (error) {
      logger.error(`Failed to get Lambda metrics: ${deployment.name}`, { error });
      throw error;
    }
  }

  async getLogs(deployment: Deployment): Promise<string[]> {
    try {
      const logGroupName = `/aws/lambda/${deployment.name}`;
      const params: AWS.CloudWatchLogs.GetLogEventsRequest = {
        logGroupName,
        logStreamName: await this.getLatestLogStream(logGroupName),
        startFromHead: false,
        limit: 100,
      };

      const response = await this.logs.getLogEvents(params).promise();
      return (response.events || []).map(event => event.message || '');
    } catch (error) {
      logger.error(`Failed to get Lambda logs: ${deployment.name}`, { error });
      throw error;
    }
  }

  private async getLatestLogStream(logGroupName: string): Promise<string> {
    const params: AWS.CloudWatchLogs.DescribeLogStreamsRequest = {
      logGroupName,
      orderBy: 'LastEventTime',
      descending: true,
      limit: 1,
    };

    const response = await this.logs.describeLogStreams(params).promise();
    const logStreamName = response.logStreams?.[0]?.logStreamName;
    if (!logStreamName) {
      throw new Error('No log streams found');
    }
    return logStreamName;
  }

  async stop(deployment: Deployment): Promise<void> {
    try {
      const params: AWS.Lambda.PutFunctionConcurrencyRequest = {
        FunctionName: deployment.name,
        ReservedConcurrentExecutions: 0,
      };

      await this.lambda.putFunctionConcurrency(params).promise();
      logger.info(`Stopped Lambda function: ${deployment.name}`);
    } catch (error) {
      logger.error(`Failed to stop Lambda function: ${deployment.name}`, { error });
      throw error;
    }
  }

  async delete(deployment: Deployment): Promise<void> {
    try {
      const params: AWS.Lambda.DeleteFunctionRequest = {
        FunctionName: deployment.name,
      };

      await this.lambda.deleteFunction(params).promise();
      logger.info(`Deleted Lambda function: ${deployment.name}`);
    } catch (error) {
      logger.error(`Failed to delete Lambda function: ${deployment.name}`, { error });
      throw error;
    }
  }
} 