import { Schema, model, Document } from 'mongoose';

export interface IUsage extends Document {
  deploymentId: string;
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    requestCount: number;
    responseTime: number;
    errorRate: number;
  };
  timestamp: Date;
}

const usageSchema = new Schema<IUsage>({
  deploymentId: {
    type: String,
    required: true,
    index: true
  },
  metrics: {
    cpuUsage: {
      type: Number,
      required: true
    },
    memoryUsage: {
      type: Number,
      required: true
    },
    requestCount: {
      type: Number,
      required: true
    },
    responseTime: {
      type: Number,
      required: true
    },
    errorRate: {
      type: Number,
      required: true
    }
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  }
});

export const UsageModel = model<IUsage>('Usage', usageSchema); 