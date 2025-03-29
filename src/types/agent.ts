export interface Template {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  architecture: string;
  requiredTools: string[];
  configuration?: Record<string, any>;
  code?: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  type: string;
  requiredAuth?: {
    type: 'oauth2' | 'apiKey';
    config: {
      authUrl?: string;
      headerName?: string;
    };
  };
  parameters?: {
    name: string;
    type: string;
    description: string;
    required: boolean;
  }[];
}

export interface Agent {
  initialize(): Promise<void>;
  process(input: string): Promise<string>;
  handleError(error: any): string;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  basePrompt: string;
  model: {
    provider: 'openai' | 'anthropic';
    name: string;
    temperature?: number;
    maxTokens?: number;
  };
  tools: {
    id: string;
    config: Record<string, any>;
  }[];
  capabilities?: string[];
  uiConfig?: {
    type: 'chat' | 'dashboard' | 'form' | 'custom';
    components: Record<string, any>[];
  };
  deploymentConfig?: {
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

export interface DeploymentConfig {
  resources: {
    cpu: string;
    memory: string;
  };
  scaling: {
    minInstances: number;
    maxInstances: number;
  };
  environment: Record<string, string>;
}

export interface AgentBuildResult {
  userId: string;
  template: string;
  tools: string[];
  config: AgentConfig;
  code: string;
  deploymentConfig: DeploymentConfig;
} 