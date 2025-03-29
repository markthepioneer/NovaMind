import { Logger } from '../utils/logger';
import { ValidationError, NotFoundError } from '../utils/error-handling';
import { WebSearchTool } from '../tools/web-search.tool';
import { HttpRequestTool } from '../tools/http-request.tool';
import { FileOperationsTool } from '../tools/file-operations.tool';

const logger = new Logger('ToolManager');

export interface Tool {
  id: string;
  name: string;
  description: string;
  parameters: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    description: string;
  }[];
  execute(params: Record<string, any>, context: ToolContext): Promise<any>;
}

export interface ToolContext {
  agentId: string;
  userId: string;
  conversationId: string;
}

export interface ToolConfig {
  id: string;
  config: Record<string, any>;
}

export class ToolManager {
  private tools: Map<string, Tool> = new Map();
  private toolConfigs: Map<string, Record<string, any>> = new Map();
  private rateLimit: Map<string, { count: number; timestamp: number }> = new Map();
  private readonly maxRequestsPerMinute = 60;

  constructor() {
    this.registerBuiltinTools();
  }

  private registerBuiltinTools() {
    // Register web search tool
    this.registerTool(new WebSearchTool());

    // Register HTTP request tool
    this.registerTool(new HttpRequestTool());

    // Register file operations tool
    this.registerTool(new FileOperationsTool(process.env.WORKSPACE_ROOT));

    logger.info('Built-in tools registered');
  }

  async loadTools(configs: ToolConfig[]): Promise<void> {
    try {
      for (const config of configs) {
        if (!this.tools.has(config.id)) {
          throw new ValidationError(`Tool ${config.id} not found`);
        }
        this.toolConfigs.set(config.id, config.config);
        logger.info(`Loaded configuration for tool ${config.id}`);
      }
    } catch (error) {
      logger.error('Error loading tools:', error);
      throw error;
    }
  }

  registerTool(tool: Tool): void {
    if (this.tools.has(tool.id)) {
      throw new ValidationError(`Tool with ID ${tool.id} already exists`);
    }
    this.tools.set(tool.id, tool);
    logger.info(`Registered tool ${tool.id}`);
  }

  async executeTool(
    toolId: string,
    params: Record<string, any>,
    context: ToolContext
  ): Promise<any> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    try {
      // Check rate limit
      this.checkRateLimit(context.userId);

      // Validate parameters
      this.validateToolParameters(tool, params);

      // Get tool configuration
      const config = this.toolConfigs.get(toolId) || {};

      // Execute tool with merged parameters and configuration
      const result = await tool.execute(
        { ...params, ...config },
        context
      );

      logger.info(`Successfully executed tool ${toolId}`);
      return result;
    } catch (error) {
      logger.error(`Error executing tool ${toolId}:`, error);
      throw error;
    }
  }

  getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }

  private validateToolParameters(
    tool: Tool,
    params: Record<string, any>
  ): void {
    for (const param of tool.parameters) {
      if (param.required && !(param.type in params)) {
        throw new ValidationError(
          `Missing required parameter ${param.type} for tool ${tool.id}`
        );
      }

      if (param.type in params) {
        const value = params[param.type];
        if (typeof value !== param.type) {
          throw new ValidationError(
            `Invalid type for parameter ${param.type} in tool ${tool.id}`
          );
        }
      }
    }
  }

  private checkRateLimit(userId: string): void {
    const now = Date.now();
    const userRateLimit = this.rateLimit.get(userId) || { count: 0, timestamp: now };

    // Reset count if more than a minute has passed
    if (now - userRateLimit.timestamp > 60000) {
      userRateLimit.count = 0;
      userRateLimit.timestamp = now;
    }

    // Check if rate limit exceeded
    if (userRateLimit.count >= this.maxRequestsPerMinute) {
      throw new ValidationError('Rate limit exceeded. Please try again later.');
    }

    // Increment count
    userRateLimit.count++;
    this.rateLimit.set(userId, userRateLimit);
  }
}
