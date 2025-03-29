import mongoose, { Document, Schema } from 'mongoose';

export interface IDailyUsage extends Document {
  deploymentId: string;
  userId: string;
  date: Date;
  requestCount: number;
  tokenCount: {
    input: number;
    output: number;
    total: number;
  };
  latency: {
    avg: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  };
  errorCount: number;
  cost: {
    compute: number;
    tokens: number;
    total: number;
  };
}

const DailyUsageSchema = new Schema<IDailyUsage>({
  deploymentId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  date: { type: Date, required: true, index: true },
  requestCount: { type: Number, default: 0 },
  tokenCount: {
    input: { type: Number, default: 0 },
    output: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  latency: {
    avg: { type: Number, default: 0 },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    p95: { type: Number, default: 0 },
    p99: { type: Number, default: 0 }
  },
  errorCount: { type: Number, default: 0 },
  cost: {
    compute: { type: Number, default: 0 },
    tokens: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }
});

// Create a compound index for faster queries
DailyUsageSchema.index({ deploymentId: 1, date: 1 });
DailyUsageSchema.index({ userId: 1, date: 1 });

export interface IMonthlyBilling extends Document {
  userId: string;
  year: number;
  month: number;
  deployments: {
    deploymentId: string;
    name: string;
    cost: number;
  }[];
  totalCost: number;
  status: 'pending' | 'processed' | 'paid';
  paidAt?: Date;
  invoiceId?: string;
}

const MonthlyBillingSchema = new Schema<IMonthlyBilling>({
  userId: { type: String, required: true, index: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  deployments: [{
    deploymentId: { type: String, required: true },
    name: { type: String, required: true },
    cost: { type: Number, required: true }
  }],
  totalCost: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'processed', 'paid'],
    default: 'pending'
  },
  paidAt: { type: Date },
  invoiceId: { type: String }
}, { timestamps: true });

// Create a compound index for faster queries
MonthlyBillingSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

export const DailyUsage = mongoose.model<IDailyUsage>('DailyUsage', DailyUsageSchema);
export const MonthlyBilling = mongoose.model<IMonthlyBilling>('MonthlyBilling', MonthlyBillingSchema);
