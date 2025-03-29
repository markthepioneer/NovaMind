import mongoose, { Document, Schema } from 'mongoose';

// Template schema
export interface ITemplate extends Document {
  name: string;
  description: string;
  category: string;
  basePrompt: string;
  suggestedCapabilities: string[];
  suggestedIntegrations: string[];
  configTemplate: Record<string, any>;
  uiTemplate?: Record<string, any>;
  isPublic: boolean;
  author: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSchema = new Schema<ITemplate>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    basePrompt: { type: String, required: true },
    suggestedCapabilities: [{ type: String }],
    suggestedIntegrations: [{ type: String }],
    configTemplate: { type: Schema.Types.Mixed, default: {} },
    uiTemplate: { type: Schema.Types.Mixed },
    isPublic: { type: Boolean, default: true },
    author: { type: String, required: true },
    version: { type: String, required: true }
  },
  { timestamps: true }
);

export const Template = mongoose.model<ITemplate>('Template', TemplateSchema);
