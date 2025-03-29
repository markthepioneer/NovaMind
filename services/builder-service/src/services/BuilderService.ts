import { LLMService, OpenAIService } from '../llm/LLMService';
import { AgentSpecification, AgentBuildResult } from '../llm/types';
import { TemplateService } from './TemplateService';
import { ToolService } from './ToolService';
import { v4 as uuidv4 } from 'uuid';
import { ValidationError, NotFoundError } from '@novamind/shared/utils/error-handling';
import { Logger } from '../utils/logger';
import { Agent } from '../models/agent.schema';

const logger = new Logger('BuilderService');

interface BuilderOptions {
  yoloMode?: boolean; // Skip certain validations for rapid prototyping
  maxRetries?: number;
  timeout?: number;
}

export class BuilderService {
  private llmService: LLMService;
  private defaultOptions: BuilderOptions = {
    yoloMode: false,
    maxRetries: 3,
    timeout: 30000
  };

  constructor(
    private templateService: TemplateService,
    private toolService: ToolService
  ) {
    this.llmService = new OpenAIService();
  }

  async buildAgent(userRequest: string, options: BuilderOptions = {}): Promise<AgentBuildResult> {
    const buildOptions = { ...this.defaultOptions, ...options };
    let retryCount = 0;

    try {
      // Step 1: Analyze user request with enhanced context
      const analysis = await this.llmService.analyzeUserRequest(
        `${userRequest}\nContext: Running in ${buildOptions.yoloMode ? 'YOLO' : 'standard'} mode.`
      );

      // Step 2: Create agent specification with safety checks
      const specification: AgentSpecification = {
        name: `Agent-${uuidv4().slice(0, 8)}`,
        description: userRequest,
        requirements: this.validateRequirements(analysis.requirements, buildOptions),
        tools: await this.validateTools(analysis.tools, buildOptions),
        templateType: analysis.templateType,
        configuration: {}
      };

      // Step 3: Get and validate template
      const template = await this.templateService.getTemplate(specification.templateType);
      
      // Step 4: Configure tools with retry logic
      while (retryCount < (buildOptions.maxRetries || 3)) {
        try {
          const toolConfigurations = await this.toolService.configureTools(specification.tools);
          specification.configuration.tools = toolConfigurations;
          break;
        } catch (error) {
          retryCount++;
          if (retryCount === buildOptions.maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
        }
      }

      // Step 5: Generate agent code with template integration
      const enhancedSpec = {
        ...specification,
        template: {
          code: template.code,
          configuration: template.configuration
        }
      };

      const code = await this.llmService.generateAgentCode(JSON.stringify(enhancedSpec));

      // Step 6: Validate generated code unless in YOLO mode
      if (!buildOptions.yoloMode) {
        await this.validateAgentCode(code);
      }

      // Step 7: Create agent in database
      const agent = new Agent({
        name: specification.name,
        description: specification.description,
        version: '1.0.0',
        owner: 'system', // TODO: Replace with actual user ID
        isPublic: false,
        basePrompt: template.configuration.basePrompt || '',
        capabilities: analysis.requirements.map(req => ({
          type: 'requirement',
          description: req,
          config: {}
        })),
        tools: specification.tools.map(tool => ({
          toolId: tool,
          enabled: true,
          configuration: {}
        }))
      });

      await agent.save();

      // Step 8: Build result with enhanced metadata
      const result: AgentBuildResult = {
        success: true,
        agentId: agent.id,
        code,
        metadata: {
          createdAt: new Date(),
          version: '1.0.0',
          requirements: specification.requirements,
          tools: specification.tools,
          buildInfo: {
            yoloMode: buildOptions.yoloMode,
            template: template.name
          }
        }
      };

      return result;
    } catch (error) {
      logger.error('Error building agent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private validateRequirements(requirements: string[], options: BuilderOptions): string[] {
    if (options.yoloMode) return requirements;

    return requirements.filter(req => {
      // Basic security checks
      const lowercaseReq = req.toLowerCase();
      const forbidden = ['system access', 'root access', 'admin privileges'];
      return !forbidden.some(term => lowercaseReq.includes(term));
    });
  }

  private async validateTools(tools: string[], options: BuilderOptions): Promise<string[]> {
    if (options.yoloMode) return tools;

    const validTools = [];
    for (const tool of tools) {
      try {
        await this.toolService.getTool(tool);
        validTools.push(tool);
      } catch (error) {
        logger.warn(`Invalid tool ${tool}, skipping`);
      }
    }
    return validTools;
  }

  private async validateAgentCode(code: string): Promise<void> {
    // Basic security validation
    const forbiddenPatterns = [
      'process.env',
      'require(',
      'eval(',
      'Function(',
      'execSync'
    ];

    for (const pattern of forbiddenPatterns) {
      if (code.includes(pattern)) {
        throw new ValidationError(`Forbidden pattern found in code: ${pattern}`);
      }
    }

    // TODO: Add more sophisticated validation (AST parsing, etc.)
  }
} 