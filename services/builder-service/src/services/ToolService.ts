interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  configuration: Record<string, any>;
  requiredAuth?: {
    type: 'apiKey' | 'oauth2' | 'basic';
    config: Record<string, any>;
  };
}

interface ToolConfiguration {
  toolId: string;
  config: Record<string, any>;
}

export class ToolService {
  private tools: Map<string, Tool>;

  constructor() {
    this.tools = new Map();
    this.initializeDefaultTools();
  }

  private initializeDefaultTools() {
    // Calendar Integration Tool
    this.tools.set('calendar', {
      id: 'calendar',
      name: 'Calendar Integration',
      description: 'Integrate with Google Calendar for scheduling and event management',
      category: 'productivity',
      configuration: {
        scopes: ['calendar.readonly', 'calendar.events'],
        apiVersion: 'v3'
      },
      requiredAuth: {
        type: 'oauth2',
        config: {
          authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          scopes: ['https://www.googleapis.com/auth/calendar']
        }
      }
    });

    // Email Tool
    this.tools.set('email', {
      id: 'email',
      name: 'Email Integration',
      description: 'Send and receive emails through SMTP/IMAP',
      category: 'communication',
      configuration: {
        smtp: {
          host: '',
          port: 587,
          secure: true
        },
        imap: {
          host: '',
          port: 993,
          secure: true
        }
      },
      requiredAuth: {
        type: 'basic',
        config: {
          username: '',
          password: ''
        }
      }
    });

    // Task Management Tool
    this.tools.set('tasks', {
      id: 'tasks',
      name: 'Task Management',
      description: 'Create, update, and track tasks',
      category: 'productivity',
      configuration: {
        storage: 'local',
        notifications: true
      }
    });

    // Weather API Tool
    this.tools.set('weather', {
      id: 'weather',
      name: 'Weather API',
      description: 'Get weather information and forecasts',
      category: 'api',
      configuration: {
        units: 'metric',
        language: 'en'
      },
      requiredAuth: {
        type: 'apiKey',
        config: {
          apiKey: '',
          headerName: 'X-API-Key'
        }
      }
    });
  }

  async configureTools(toolIds: string[]): Promise<ToolConfiguration[]> {
    const configurations: ToolConfiguration[] = [];

    for (const toolId of toolIds) {
      const tool = this.tools.get(toolId);
      if (!tool) {
        throw new Error(`Tool '${toolId}' not found`);
      }

      // Create basic configuration
      const config: ToolConfiguration = {
        toolId,
        config: { ...tool.configuration }
      };

      // Add authentication placeholders if required
      if (tool.requiredAuth) {
        config.config.auth = {
          type: tool.requiredAuth.type,
          // Placeholder for actual auth configuration
          // This should be populated during deployment
          config: {}
        };
      }

      configurations.push(config);
    }

    return configurations;
  }

  async getTool(toolId: string): Promise<Tool> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool '${toolId}' not found`);
    }
    return tool;
  }

  async listTools(): Promise<Tool[]> {
    return Array.from(this.tools.values());
  }

  async addTool(tool: Tool): Promise<void> {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool with ID '${tool.id}' already exists`);
    }
    this.tools.set(tool.id, tool);
  }

  async updateTool(toolId: string, updates: Partial<Tool>): Promise<Tool> {
    const existing = this.tools.get(toolId);
    if (!existing) {
      throw new Error(`Tool '${toolId}' not found`);
    }

    const updated = { ...existing, ...updates };
    this.tools.set(toolId, updated);
    return updated;
  }

  async deleteTool(toolId: string): Promise<boolean> {
    return this.tools.delete(toolId);
  }
} 