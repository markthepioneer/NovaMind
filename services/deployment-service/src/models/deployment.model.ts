import { Schema, model, Document } from 'mongoose';

export interface IDeployment extends Document {
  name: string;
  type: string;
  status: string;
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const deploymentSchema = new Schema<IDeployment>({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['kubernetes', 'aws-lambda', 'cloud-run']
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'running', 'failed', 'stopped'],
    default: 'pending'
  },
  config: {
    type: Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    required: true,
    default: Date.now
  }
});

export const DeploymentModel = model<IDeployment>('Deployment', deploymentSchema); 