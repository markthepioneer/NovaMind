import mongoose, { Document, Schema } from 'mongoose';

export enum DeploymentStatus {
  PENDING = 'pending',
  DEPLOYING = 'deploying',
  RUNNING = 'running',
  STOPPED = 'stopped',
  FAILED = 'failed',
  DELETED = 'deleted'
}

export enum DeploymentEnvironment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

export enum DeploymentProvider {
  KUBERNETES = 'kubernetes',
  AWS_LAMBDA = 'aws_lambda',
  CLOUD_RUN = 'cloud_run',
  CUSTOM = 'custom'
}

export interface IDeployment extends Document {
  agentId: string;
  userId: string;
  name: string;
  description?: string;
  status: DeploymentStatus;
  environment: DeploymentEnvironment;
  provider: DeploymentProvider;
  endpoint?: string;
  apiKey?: string;
  resources: {
    cpu: string;
    memory: string;
    replicas: number;
    autoscaling: {
      enabled: boolean;
      minReplicas: number;
      maxReplicas: number;
      targetCpuUtilization: number;
    };
  };
  config: Record<string, any>;
  logs: {
    timestamp: Date;
    message: string;
    level: string;
  }[];
  metrics: {
    lastUpdated: Date;
    cpuUsage: number;
    memoryUsage: number;
    requestCount: number;
    responseTime: number;
    errorRate: number;
  };
  costTracking: {
    startDate: Date;
    lastBillingDate: Date;
    totalCost: number;
    currentMonthCost: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const DeploymentSchema = new Schema<IDeployment>(
  {
    agentId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    status: { 
      type: String, 
      enum: Object.values(DeploymentStatus),
      default: DeploymentStatus.PENDING,
      index: true
    },
    environment: { 
      type: String, 
      enum: Object.values(DeploymentEnvironment),
      default: DeploymentEnvironment.DEVELOPMENT
    },
    provider: { 
      type: String, 
      enum: Object.values(DeploymentProvider),
      default: DeploymentProvider.KUBERNETES
    },
    endpoint: { type: String },
    apiKey: { type: String },
    resources: {
      cpu: { type: String, default: '100m' },
      memory: { type: String, default: '256Mi' },
      replicas: { type: Number, default: 1 },
      autoscaling: {
        enabled: { type: Boolean, default: false },
        minReplicas: { type: Number, default: 1 },
        maxReplicas: { type: Number, default: 5 },
        targetCpuUtilization: { type: Number, default: 70 }
      }
    },
    config: { type: Schema.Types.Mixed, default: {} },
    logs: [{
      timestamp: { type: Date, default: Date.now },
      message: { type: String, required: true },
      level: { type: String, default: 'info' }
    }],
    metrics: {
      lastUpdated: { type: Date, default: Date.now },
      cpuUsage: { type: Number, default: 0 },
      memoryUsage: { type: Number, default: 0 },
      requestCount: { type: Number, default: 0 },
      responseTime: { type: Number, default: 0 },
      errorRate: { type: Number, default: 0 }
    },
    costTracking: {
      startDate: { type: Date, default: Date.now },
      lastBillingDate: { type: Date, default: Date.now },
      totalCost: { type: Number, default: 0 },
      currentMonthCost: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

export const Deployment = mongoose.model<IDeployment>('Deployment', DeploymentSchema);
