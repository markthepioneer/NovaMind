import mongoose, { Document, Schema } from 'mongoose';

// Tool parameter schema
export interface IToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  items?: {
    type: string;
    properties?: Record<string, any>;
  };
  properties?: Record<string, IToolParameter>;
}

const ToolParameterSchema = new Schema<IToolParameter>({
  name: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['string', 'number', 'boolean', 'array', 'object']
  },
  description: { type: String, required: true },
  required: { type: Boolean, default: false },
  default: { type: Schema.Types.Mixed },
  enum: [{ type: String }],
  minimum: { type: Number },
  maximum: { type: Number },
  items: {
    type: {
      type: { type: String },
      properties: { type: Map, of: Schema.Types.Mixed }
    }
  },
  properties: { type: Map, of: Schema.Types.Mixed }
});

// Tool schema
export interface ITool extends Document {
  name: string;
  description: string;
  version: string;
  category: string;
  parameters: IToolParameter[];
  returns: {
    type: string;
    description: string;
    properties?: Record<string, any>;
  };
  serviceUrl?: string;
  integrationId?: string;
  authRequired: boolean;
  isBuiltIn: boolean;
  isEnabled: boolean;
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ToolSchema = new Schema<ITool>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    version: { type: String, required: true },
    category: { type: String, required: true },
    parameters: [ToolParameterSchema],
    returns: {
      type: { type: String, required: true },
      description: { type: String, required: true },
      properties: { type: Map, of: Schema.Types.Mixed }
    },
    serviceUrl: { type: String },
    integrationId: { type: String },
    authRequired: { type: Boolean, default: false },
    isBuiltIn: { type: Boolean, default: false },
    isEnabled: { type: Boolean, default: true },
    config: { type: Map, of: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

export const Tool = mongoose.model<ITool>('Tool', ToolSchema);
