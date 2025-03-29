interface Template {
  id: string;
  name: string;
  description: string;
  code: string;
  configuration: Record<string, any>;
  requiredTools: string[];
}

export class TemplateService {
  private templates: Map<string, Template>;

  constructor() {
    this.templates = new Map();
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates() {
    // Add basic agent template
    this.templates.set('basic', {
      id: 'basic',
      name: 'Basic Agent',
      description: 'A simple agent template with basic functionality',
      code: `
export class BasicAgent {
  constructor(private config: AgentConfig) {}

  async process(input: string): Promise<string> {
    // Basic processing logic
    return 'Processed: ' + input;
  }
}`,
      configuration: {
        maxTokens: 1000,
        temperature: 0.7
      },
      requiredTools: []
    });

    // Add assistant template
    this.templates.set('assistant', {
      id: 'assistant',
      name: 'Assistant Agent',
      description: 'An AI assistant template with chat capabilities',
      code: `
export class AssistantAgent {
  private context: string[] = [];

  constructor(private config: AssistantConfig) {}

  async chat(message: string): Promise<string> {
    this.context.push(message);
    // Assistant processing logic
    return 'Response based on context';
  }
}`,
      configuration: {
        maxTokens: 2000,
        temperature: 0.8,
        memory: true
      },
      requiredTools: ['chat']
    });

    // Add task automation template
    this.templates.set('automation', {
      id: 'automation',
      name: 'Task Automation Agent',
      description: 'A template for creating task automation agents',
      code: `
export class AutomationAgent {
  constructor(private config: AutomationConfig) {}

  async executeTask(task: Task): Promise<TaskResult> {
    // Task execution logic
    return { success: true, result: 'Task completed' };
  }

  async schedule(schedule: Schedule): Promise<void> {
    // Scheduling logic
  }
}`,
      configuration: {
        maxTokens: 1500,
        temperature: 0.5,
        scheduling: true
      },
      requiredTools: ['scheduler', 'taskRunner']
    });
  }

  async getTemplate(templateType: string): Promise<Template> {
    const template = this.templates.get(templateType.toLowerCase());
    if (!template) {
      throw new Error(`Template type '${templateType}' not found`);
    }
    return template;
  }

  async listTemplates(): Promise<Template[]> {
    return Array.from(this.templates.values());
  }

  async addTemplate(template: Template): Promise<void> {
    if (this.templates.has(template.id)) {
      throw new Error(`Template with ID '${template.id}' already exists`);
    }
    this.templates.set(template.id, template);
  }

  async updateTemplate(templateId: string, updates: Partial<Template>): Promise<Template> {
    const existing = this.templates.get(templateId);
    if (!existing) {
      throw new Error(`Template '${templateId}' not found`);
    }

    const updated = { ...existing, ...updates };
    this.templates.set(templateId, updated);
    return updated;
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    return this.templates.delete(templateId);
  }
} 