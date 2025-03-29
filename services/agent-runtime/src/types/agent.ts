export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  basePrompt: string;
  model: {
    provider: string;
    name: string;
    temperature: number;
    maxTokens: number;
  };
  tools: {
    id: string;
    config: Record<string, any>;
  }[];
  capabilities: string[];
  uiConfig: {
    type: string;
    components: {
      type: string;
      [key: string]: any;
    }[];
  };
  deploymentConfig: {
    resources: {
      cpu: string;
      memory: string;
    };
    scaling: {
      minInstances: number;
      maxInstances: number;
    };
  };
}

export interface Agent {
  initialize(): Promise<void>;
  processMessage(message: string, userId: string): Promise<string>;
} 