import mongoose, { Document, Schema } from 'mongoose';
import { ToolInstance } from './tool.model';

// Capability schema
interface ICapability {
  type: string;
  description: string;
  config: Record<string, any>;
  tools?: {
    toolId: string;
    isEnabled: boolean;
    config: Record<string, any>;
  }[];
}

const CapabilitySchema = new Schema<ICapability>({
  type: { type: String, required: true },
  description: { type: String, required: true },
  config: { type: Schema.Types.Mixed, default: {} },
  tools: [{
    toolId: { type: Schema.Types.ObjectId, ref: 'Tool' },
    isEnabled: { type: Boolean, default: true },
    config: { type: Schema.Types.Mixed, default: {} }
  }]
});

// Integration schema
interface IIntegration {
  service: string;
  authType: 'api_key' | 'oauth' | 'custom';
  config: Record<string, any>;
}

const IntegrationSchema = new Schema<IIntegration>({
  service: { type: String, required: true },
  authType: { type: String, enum: ['api_key', 'oauth', 'custom'], required: true },
  config: { type: Schema.Types.Mixed, default: {} }
});

// UI config schema
interface IUIConfig {
  type: 'chat' | 'dashboard' | 'form' | 'custom';
  components: Record<string, any>[];
}

const UIConfigSchema = new Schema<IUIConfig>({
  type: { type: String, enum: ['chat', 'dashboard', 'form', 'custom'], required: true },
  components: [{ type: Schema.Types.Mixed }]
});

// Deployment config schema
interface IDeploymentConfig {
  resources: {
    cpu: string;
    memory: string;
  };
  scaling: {
    minInstances: number;
    maxInstances: number;
  };
}

const DeploymentConfigSchema = new Schema<IDeploymentConfig>({
  resources: {
    cpu: { type: String, default: '0.5' },
    memory: { type: String, default: '512Mi' }
  },
  scaling: {
    minInstances: { type: Number, default: 1 },
    maxInstances: { type: Number, default: 5 }
  }
});

// Agent schema
export interface IAgent extends Document {
  name: string;
  description: string;
  version: string;
  owner: string;
  isPublic: boolean;
  basePrompt: string;
  capabilities: ICapability[];
  integrations: IIntegration[];
  tools: ToolInstance[];
  uiConfig?: IUIConfig;
  deploymentConfig: IDeploymentConfig;
  createdAt: Date;
  updatedAt: Date;
}

// Tool instance schema
const ToolInstanceSchema = new Schema({
  toolId: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  configuration: { type: Schema.Types.Mixed, default: {} }
});

const AgentSchema = new Schema<IAgent>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    version: { type: String, required: true },
    owner: { type: String, required: true },
    isPublic: { type: Boolean, default: false },
    basePrompt: { type: String, required: true },
    capabilities: [CapabilitySchema],
    integrations: [IntegrationSchema],
    tools: [ToolInstanceSchema],
    uiConfig: UIConfigSchema,
    deploymentConfig: {
      type: DeploymentConfigSchema,
      default: () => ({})
    }
  },
  { timestamps: true }
);

export const Agent = mongoose.model<IAgent>('Agent', AgentSchema);
