/**
 * Tool models for agent capabilities
 */

/**
 * Tool category types
 */
export enum ToolCategory {
  DATA_RETRIEVAL = 'data_retrieval',
  COMMUNICATION = 'communication',
  DATA_PROCESSING = 'data_processing',
  EXTERNAL_SERVICES = 'external_services',
  REASONING = 'reasoning',
  SYSTEM = 'system'
}

/**
 * Authentication method for tools
 */
export enum ToolAuthMethod {
  NONE = 'none',
  API_KEY = 'api_key',
  OAUTH = 'oauth',
  CUSTOM = 'custom'
}

/**
 * Parameter type for tool configuration
 */
export enum ParameterType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
  ENUM = 'enum'
}

/**
 * Tool parameter definition
 */
export interface ToolParameter {
  name: string;
  description: string;
  type: ParameterType;
  required: boolean;
  default?: any;
  options?: string[]; // For enum types
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

/**
 * Tool interface
 */
export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon?: string;
  authMethod: ToolAuthMethod;
  parameters: ToolParameter[];
  capabilities: string[];
  documentation: string;
  outputSchema?: Record<string, any>; // JSON Schema of tool output
  inputSchema?: Record<string, any>; // JSON Schema of tool input
  version: string;
  exampleUsage?: string[];
  isSystem?: boolean; // Is this a system tool that's always available?
  enabled?: boolean; // Is this tool enabled for the agent?
  configuration?: Record<string, any>; // User-provided configuration
}

/**
 * Tool instance with configuration
 */
export interface ToolInstance {
  toolId: string;
  enabled: boolean;
  configuration: Record<string, any>;
}
