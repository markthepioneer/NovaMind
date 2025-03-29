import OpenAI from 'openai';
import { Template, Tool, AgentConfig, DeploymentConfig, AgentBuildResult } from '../types/agent';
import { analyzeRequirementsPrompt, generateAgentConfigPrompt, generateAgentCodePrompt } from './prompts';
import { mockTemplates, mockTools } from '../services/mockData';
import { BuilderConfig } from '../config';
import { Agent } from '../types/agent';

interface AnalyzeRequirementsResult {
  requirements: string[];
  capabilities: string[];
  tools: string[];
  templateType: string;
  securityLevel: 'low' | 'medium' | 'high';
  suggestedUI: 'chat' | 'dashboard' | 'form' | 'custom';
}

export class BuilderService {
  private openai: OpenAI;
  private templates: Map<string, Template>;
  private tools: Map<string, Tool>;
  private config: BuilderConfig;

  constructor(config: BuilderConfig) {
    this.config = config;

    this.openai = new OpenAI({
      baseURL: 'https://api.openai.com/v1',
    });

    // Initialize templates
    this.templates = new Map();
    mockTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });

    // Initialize tools
    this.tools = new Map();
    mockTools.forEach(tool => {
      this.tools.set(tool.id, tool);
    });
  }

  async buildAgent(userRequest: string): Promise<Agent> {
    try {
      // Use environment variable for API key
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Step 1: Analyze requirements
      const requirements = await this.analyzeRequirements(userRequest);
      console.log('Requirements:', requirements);

      // Step 2: Select template and tools
      const template = await this.selectTemplate(requirements);
      console.log('Selected template:', template);
      const tools = await this.selectTools(requirements);
      console.log('Selected tools:', tools);

      // Step 3: Generate agent configuration
      const config = await this.generateConfig(requirements, template, tools);
      console.log('Generated config:', config);

      // Step 4: Generate agent code
      const code = await this.generateCode(config, template);
      console.log('Generated code:', code);

      // Step 5: Validate the agent
      await this.validateAgent(code);

      // Step 6: Create deployment configuration
      const deploymentConfig = this.createDeploymentConfig(config);

      return {
        userId: '',
        template: template.id,
        tools: tools.map(t => t.id),
        config,
        code,
        deploymentConfig,
      };
    } catch (error) {
      console.error('Error building agent:', error);
      throw error;
    }
  }

  private async analyzeRequirements(request: string): Promise<AnalyzeRequirementsResult> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: analyzeRequirementsPrompt },
        { role: 'user', content: request }
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content || '{}';
    console.log('OpenAI response:', content);
    return JSON.parse(content);
  }

  private async selectTemplate(requirements: AnalyzeRequirementsResult): Promise<Template> {
    // Match requirements with available templates
    const templateScores = Array.from(this.templates.values()).map(template => ({
      template,
      score: this.calculateTemplateScore(template, requirements),
    }));

    // Return the best matching template or default to Basic Assistant
    const bestMatch = templateScores.reduce((best, current) => 
      current.score > best.score ? current : best,
      { template: mockTemplates[0], score: 0 } // Default to first template (Basic Assistant)
    );

    return bestMatch.template;
  }

  private async selectTools(requirements: AnalyzeRequirementsResult): Promise<Tool[]> {
    // Select tools based on requirements
    return requirements.tools
      .map(toolId => this.tools.get(toolId))
      .filter((tool): tool is Tool => tool !== undefined);
  }

  private async generateConfig(
    requirements: AnalyzeRequirementsResult,
    template: Template,
    tools: Tool[]
  ): Promise<AgentConfig> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: generateAgentConfigPrompt },
        {
          role: 'user',
          content: JSON.stringify({ requirements, template, tools })
        }
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content || '{}';
    console.log('Config generation response:', content);
    return JSON.parse(content);
  }

  private async generateCode(config: AgentConfig, template: Template): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: generateAgentCodePrompt },
        {
          role: 'user',
          content: JSON.stringify({ config, template })
        }
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content || '';
    console.log('Code generation response:', content);
    return content;
  }

  private async validateAgent(code: string): Promise<boolean> {
    // Implement code validation logic
    // This could include TypeScript compilation, linting, and security checks
    return true;
  }

  private createDeploymentConfig(config: AgentConfig): DeploymentConfig {
    return {
      resources: {
        cpu: '0.5',
        memory: '512Mi',
      },
      scaling: {
        minInstances: 1,
        maxInstances: 3,
      },
      environment: {
        NODE_ENV: 'production',
      },
    };
  }

  private calculateTemplateScore(template: Template, requirements: AnalyzeRequirementsResult): number {
    let score = 0;
    
    // Score based on capability match
    const requiredCapabilities = new Set(requirements.capabilities);
    const templateCapabilities = new Set(template.capabilities);
    const matchingCapabilities = new Set(
      [...requiredCapabilities].filter(cap => templateCapabilities.has(cap))
    );
    score += matchingCapabilities.size / requiredCapabilities.size;

    // Score based on tool requirements
    const requiredTools = new Set(requirements.tools);
    const templateTools = new Set(template.requiredTools);
    const matchingTools = new Set(
      [...requiredTools].filter(tool => templateTools.has(tool))
    );
    score += matchingTools.size / requiredTools.size;

    return score;
  }

  async getAvailableTools(): Promise<Tool[]> {
    // Implementation details...
    return [];
  }
} 