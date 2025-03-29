/**
 * Data models for agents
 */

/**
 * Agent capability type
 */
export enum CapabilityType {
  TEXT_GENERATION = 'text_generation',
  IMAGE_GENERATION = 'image_generation',
  DATA_ANALYSIS = 'data_analysis',
  WEB_SEARCH = 'web_search',
  CODE_GENERATION = 'code_generation',
  CALENDAR_MANAGEMENT = 'calendar_management',
  EMAIL_COMMUNICATION = 'email_communication',
  PAYMENT_PROCESSING = 'payment_processing',
  SMS_MESSAGING = 'sms_messaging',
  CUSTOM = 'custom',
}

/**
 * Agent capability interface
 */
export interface Capability {
  type: CapabilityType;
  description: string;
  config: Record<string, any>;
}

/**
 * Integration interface
 */
export interface Integration {
  service: string;
  authType: 'api_key' | 'oauth' | 'custom';
  config: Record<string, any>;
}

/**
 * Agent configuration interface
 */
export interface AgentConfig {
  id?: string;
  name: string;
  description: string;
  version: string;
  createdAt?: Date;
  updatedAt?: Date;
  owner: string;
  isPublic: boolean;
  basePrompt: string;
  capabilities: Capability[];
  integrations: Integration[];
  uiConfig?: {
    type: 'chat' | 'dashboard' | 'form' | 'custom';
    components: Record<string, any>[];
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

/**
 * Agent build request interface
 */
export interface AgentBuildRequest {
  userRequest: string;
  userId: string;
  preferences?: {
    modelPreference?: string;
    templateId?: string;
    uiType?: 'chat' | 'dashboard' | 'form' | 'custom';
  };
}

/**
 * Agent build response interface
 */
export interface AgentBuildResponse {
  success: boolean;
  agent?: AgentConfig;
  error?: string;
}
