import mongoose, { Document, Schema } from 'mongoose';

export interface Deployment extends Document {
  name: string;
  type: 'kubernetes' | 'aws-lambda' | 'cloud-run';
  status: 'pending' | 'running' | 'failed' | 'stopped';
  config: {
    namespace?: string;
    image?: string;
    replicas?: number;
    memory?: string;
    cpu?: string;
    env?: Record<string, string>;
    [key: string]: any;
  };
  metrics: {
    cpu: number;
    memory: number;
    requests: number;
    errors: number;
    lastUpdated: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

const DeploymentSchema = new Schema<Deployment>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['kubernetes', 'aws-lambda', 'cloud-run'],
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'running', 'failed', 'stopped'],
      default: 'pending',
    },
    config: {
      type: Schema.Types.Mixed,
      required: true,
    },
    metrics: {
      cpu: { type: Number, default: 0 },
      memory: { type: Number, default: 0 },
      requests: { type: Number, default: 0 },
      errors: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
DeploymentSchema.index({ name: 1 });
DeploymentSchema.index({ type: 1 });
DeploymentSchema.index({ status: 1 });
DeploymentSchema.index({ createdAt: 1 });
DeploymentSchema.index({ createdBy: 1 });

export default mongoose.model<Deployment>('Deployment', DeploymentSchema); 