import { Tool, ToolCategory, ToolAuthMethod, ParameterType } from '../models/tool.model';
import logger from '../utils/logger';

/**
 * Service for managing available tools
 */
export class ToolRegistryService {
  private tools: Map<string, Tool>;
  private static instance: ToolRegistryService;

  constructor() {
    this.tools = new Map<string, Tool>();
    this.initializeDefaultTools();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ToolRegistryService {
    if (!ToolRegistryService.instance) {
      ToolRegistryService.instance = new ToolRegistryService();
    }
    return ToolRegistryService.instance;
  }

  /**
   * Initialize default tools
   */
  private initializeDefaultTools(): void {
    // Web Search Tool
    this.registerTool({
      id: 'web-search',
      name: 'Web Search',
      description: 'Search the web for information',
      category: ToolCategory.DATA_RETRIEVAL,
      icon: 'search',
      authMethod: ToolAuthMethod.NONE,
      parameters: [
        {
          name: 'query',
          description: 'Search query',
          type: ParameterType.STRING,
          required: true
        }
      ],
      capabilities: ['search', 'research', 'information-retrieval'],
      documentation: 'This tool allows the agent to search the web for information. It returns a list of search results with titles, URLs, and snippets.',
      version: '1.0.0',
      exampleUsage: [
        'Search for the latest news about artificial intelligence',
        'Find information about climate change'
      ],
      isSystem: true,
      enabled: false
    });

    // Knowledge Base Tool
    this.registerTool({
      id: 'knowledge-base',
      name: 'Knowledge Base',
      description: 'Retrieve information from a custom knowledge base',
      category: ToolCategory.DATA_RETRIEVAL,
      icon: 'database',
      authMethod: ToolAuthMethod.API_KEY,
      parameters: [
        {
          name: 'apiKey',
          description: 'API key for the knowledge base',
          type: ParameterType.STRING,
          required: true
        },
        {
          name: 'query',
          description: 'Search query',
          type: ParameterType.STRING,
          required: true
        },
        {
          name: 'maxResults',
          description: 'Maximum number of results to return',
          type: ParameterType.NUMBER,
          required: false,
          default: 5
        }
      ],
      capabilities: ['knowledge-retrieval', 'documentation-search'],
      documentation: 'This tool allows the agent to search a custom knowledge base for information. It returns relevant documents or passages.',
      version: '1.0.0',
      exampleUsage: [
        'Search the company knowledge base for information about vacation policy',
        'Find documentation about product features'
      ],
      isSystem: false,
      enabled: false
    });

    // Calendar Tool
    this.registerTool({
      id: 'calendar',
      name: 'Calendar',
      description: 'Manage calendar events and appointments',
      category: ToolCategory.EXTERNAL_SERVICES,
      icon: 'calendar',
      authMethod: ToolAuthMethod.OAUTH,
      parameters: [
        {
          name: 'calendarId',
          description: 'ID of the calendar to use',
          type: ParameterType.STRING,
          required: false,
          default: 'primary'
        }
      ],
      capabilities: ['event-creation', 'scheduling', 'availability-check'],
      documentation: 'This tool allows the agent to create, view, and manage calendar events. It can check for availability and schedule appointments.',
      version: '1.0.0',
      exampleUsage: [
        'Schedule a meeting with John on Friday at 2pm',
        'Check my availability next week'
      ],
      isSystem: false,
      enabled: false
    });

    // Email Tool
    this.registerTool({
      id: 'email',
      name: 'Email',
      description: 'Send and manage emails',
      category: ToolCategory.COMMUNICATION,
      icon: 'email',
      authMethod: ToolAuthMethod.OAUTH,
      parameters: [
        {
          name: 'fromName',
          description: 'Name to use in the From field',
          type: ParameterType.STRING,
          required: false
        },
        {
          name: 'replyTo',
          description: 'Email address for replies',
          type: ParameterType.STRING,
          required: false
        }
      ],
      capabilities: ['email-sending', 'email-drafting'],
      documentation: 'This tool allows the agent to send emails and draft email content. It supports attachments and formatting.',
      version: '1.0.0',
      exampleUsage: [
        'Send an email to team@example.com with the subject "Weekly Update"',
        'Draft a follow-up email to a customer'
      ],
      isSystem: false,
      enabled: false
    });

    // Data Analysis Tool
    this.registerTool({
      id: 'data-analysis',
      name: 'Data Analysis',
      description: 'Analyze data and generate insights',
      category: ToolCategory.DATA_PROCESSING,
      icon: 'analytics',
      authMethod: ToolAuthMethod.NONE,
      parameters: [
        {
          name: 'dataFormat',
          description: 'Format of the input data',
          type: ParameterType.ENUM,
          options: ['csv', 'json', 'excel'],
          required: false,
          default: 'csv'
        }
      ],
      capabilities: ['data-analysis', 'charting', 'statistics'],
      documentation: 'This tool allows the agent to process and analyze data. It can perform statistical calculations and generate charts.',
      version: '1.0.0',
      exampleUsage: [
        'Analyze the sales data to find trends',
        'Generate a chart of monthly revenue'
      ],
      isSystem: false,
      enabled: false
    });

    // Weather Tool
    this.registerTool({
      id: 'weather',
      name: 'Weather',
      description: 'Get weather information for a location',
      category: ToolCategory.EXTERNAL_SERVICES,
      icon: 'cloud',
      authMethod: ToolAuthMethod.API_KEY,
      parameters: [
        {
          name: 'apiKey',
          description: 'API key for the weather service',
          type: ParameterType.STRING,
          required: true
        },
        {
          name: 'location',
          description: 'Location to get weather for',
          type: ParameterType.STRING,
          required: true
        },
        {
          name: 'units',
          description: 'Units to use for temperature',
          type: ParameterType.ENUM,
          options: ['imperial', 'metric'],
          required: false,
          default: 'metric'
        }
      ],
      capabilities: ['weather-forecast'],
      documentation: 'This tool allows the agent to get current weather conditions and forecasts for a specified location.',
      version: '1.0.0',
      exampleUsage: [
        'What\'s the weather like in New York today?',
        'Get the weather forecast for London for the next 5 days'
      ],
      isSystem: false,
      enabled: false
    });

    // File Storage Tool
    this.registerTool({
      id: 'file-storage',
      name: 'File Storage',
      description: 'Store and retrieve files',
      category: ToolCategory.DATA_RETRIEVAL,
      icon: 'folder',
      authMethod: ToolAuthMethod.API_KEY,
      parameters: [
        {
          name: 'apiKey',
          description: 'API key for the file storage service',
          type: ParameterType.STRING,
          required: true
        },
        {
          name: 'storageProvider',
          description: 'Provider for file storage',
          type: ParameterType.ENUM,
          options: ['s3', 'google-drive', 'dropbox', 'azure-blob'],
          required: true
        }
      ],
      capabilities: ['file-storage', 'file-retrieval'],
      documentation: 'This tool allows the agent to store and retrieve files from various cloud storage providers.',
      version: '1.0.0',
      exampleUsage: [
        'Upload a file to cloud storage',
        'Retrieve a file from cloud storage'
      ],
      isSystem: false,
      enabled: false
    });

    // Calculator Tool
    this.registerTool({
      id: 'calculator',
      name: 'Calculator',
      description: 'Perform calculations',
      category: ToolCategory.REASONING,
      icon: 'calculator',
      authMethod: ToolAuthMethod.NONE,
      parameters: [],
      capabilities: ['math', 'calculation'],
      documentation: 'This tool allows the agent to perform mathematical calculations with high precision.',
      version: '1.0.0',
      exampleUsage: [
        'Calculate the compound interest on a loan',
        'Find the square root of 1521'
      ],
      isSystem: true,
      enabled: false
    });

    logger.info(`Initialized ${this.tools.size} default tools`);
  }

  /**
   * Register a new tool
   */
  public registerTool(tool: Tool): void {
    this.tools.set(tool.id, tool);
    logger.info(`Registered tool: ${tool.name} (${tool.id})`);
  }

  /**
   * Get all registered tools
   */
  public getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get a specific tool by ID
   */
  public getTool(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  /**
   * Get available tools by category
   */
  public getToolsByCategory(category: ToolCategory): Tool[] {
    return this.getAllTools().filter(tool => tool.category === category);
  }

  /**
   * Get system tools
   */
  public getSystemTools(): Tool[] {
    return this.getAllTools().filter(tool => tool.isSystem);
  }

  /**
   * Validate tool configuration against parameters
   */
  public validateToolConfiguration(toolId: string, config: Record<string, any>): { valid: boolean; errors?: string[] } {
    const tool = this.getTool(toolId);
    
    if (!tool) {
      return { valid: false, errors: [`Tool with ID ${toolId} not found`] };
    }

    const errors: string[] = [];

    // Check for required parameters
    for (const param of tool.parameters) {
      if (param.required && (config[param.name] === undefined || config[param.name] === null)) {
        errors.push(`Required parameter ${param.name} is missing`);
      }
    }

    // Validate parameter types and constraints
    for (const [key, value] of Object.entries(config)) {
      const param = tool.parameters.find(p => p.name === key);
      
      if (!param) {
        errors.push(`Unknown parameter: ${key}`);
        continue;
      }

      // Type validation
      switch (param.type) {
        case ParameterType.STRING:
          if (typeof value !== 'string') {
            errors.push(`Parameter ${key} must be a string`);
          } else if (param.validation) {
            if (param.validation.minLength !== undefined && value.length < param.validation.minLength) {
              errors.push(`Parameter ${key} must be at least ${param.validation.minLength} characters long`);
            }
            if (param.validation.maxLength !== undefined && value.length > param.validation.maxLength) {
              errors.push(`Parameter ${key} must be at most ${param.validation.maxLength} characters long`);
            }
            if (param.validation.pattern !== undefined && !new RegExp(param.validation.pattern).test(value)) {
              errors.push(`Parameter ${key} must match the pattern: ${param.validation.pattern}`);
            }
          }
          break;
        
        case ParameterType.NUMBER:
          if (typeof value !== 'number') {
            errors.push(`Parameter ${key} must be a number`);
          } else if (param.validation) {
            if (param.validation.min !== undefined && value < param.validation.min) {
              errors.push(`Parameter ${key} must be at least ${param.validation.min}`);
            }
            if (param.validation.max !== undefined && value > param.validation.max) {
              errors.push(`Parameter ${key} must be at most ${param.validation.max}`);
            }
          }
          break;
        
        case ParameterType.BOOLEAN:
          if (typeof value !== 'boolean') {
            errors.push(`Parameter ${key} must be a boolean`);
          }
          break;
        
        case ParameterType.ENUM:
          if (!param.options?.includes(value)) {
            errors.push(`Parameter ${key} must be one of: ${param.options?.join(', ')}`);
          }
          break;
        
        case ParameterType.OBJECT:
          if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            errors.push(`Parameter ${key} must be an object`);
          }
          break;
        
        case ParameterType.ARRAY:
          if (!Array.isArray(value)) {
            errors.push(`Parameter ${key} must be an array`);
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
