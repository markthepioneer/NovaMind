import { Request, Response } from 'express';
import { AnthropicProvider } from '../llm/providers/anthropic.provider';
import {
  analyzeRequirementsPrompt,
  generateAgentConfigPrompt,
  generateUIPrompt,
} from '../llm/prompts/agent-builder.prompt';
import {
  AgentBuildRequest,
  AgentBuildResponse,
  AgentConfig,
} from '../models/agent.model';

// Initialize the LLM provider (should be moved to a service/factory in production)
const llmProvider = new AnthropicProvider(process.env.ANTHROPIC_API_KEY || '');

interface UIConfig {
  type: "chat" | "custom" | "dashboard" | "form";
  components: Record<string, any>[];
}

interface LLMResponse {
  data: {
    uiConfig: unknown;
  };
}

export class BuilderController {
  /**
   * Build a new agent based on user request
   */
  public static async buildAgent(req: Request, res: Response): Promise<void> {
    try {
      const buildRequest: AgentBuildRequest = req.body;

      if (!buildRequest.userRequest || !buildRequest.userId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: userRequest and userId',
        });
        return;
      }

      // Step 1: Analyze the user's request
      const requirementsPrompt = analyzeRequirementsPrompt.replace(
        '{{userRequest}}',
        buildRequest.userRequest
      );

      const requirementsSchema = {
        type: 'object',
        properties: {
          purpose: { type: 'string' },
          capabilities: {
            type: 'array',
            items: { type: 'string' },
          },
          integrations: {
            type: 'array',
            items: { type: 'string' },
          },
          uiRequirements: { type: 'string' },
          personality: { type: 'string' },
        },
      };

      const requirements = await llmProvider.getStructuredCompletion(
        requirementsPrompt,
        requirementsSchema
      );

      // This would normally fetch from a template service
      const mockTemplate = {
        id: 'template-123',
        name: 'Basic Assistant',
        description: 'A general-purpose assistant template',
        basePrompt: 'You are a helpful assistant that...',
        capabilities: ['text_generation'],
      };

      // Step 2: Generate agent configuration
      const configPrompt = generateAgentConfigPrompt
        .replace('{{requirements}}', JSON.stringify(requirements, null, 2))
        .replace('{{template}}', JSON.stringify(mockTemplate, null, 2));

      const configSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          basePrompt: { type: 'string' },
          capabilities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                description: { type: 'string' },
                config: { type: 'object' }
              }
            }
          },
          integrations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                service: { type: 'string' },
                authType: { type: 'string' },
                config: { type: 'object' }
              }
            }
          },
          deploymentConfig: {
            type: 'object',
            properties: {
              resources: { type: 'object' },
              scaling: { type: 'object' }
            }
          }
        }
      };

      const agentConfig = await llmProvider.getStructuredCompletion<Partial<AgentConfig>>(
        configPrompt,
        configSchema
      );

      // Step 3: Generate UI components if needed
      let uiConfig = undefined;
      
      if (buildRequest.preferences?.uiType) {
        const uiPrompt = generateUIPrompt.replace(
          '{{agentConfig}}',
          JSON.stringify(agentConfig, null, 2)
        );

        const uiSchema = {
          type: 'object',
          properties: {
            type: { type: 'string' },
            components: { 
              type: 'array',
              items: { type: 'object' }
            }
          }
        };

        const response = await llmProvider.getStructuredCompletion(
          uiPrompt,
          uiSchema
        ) as LLMResponse;

        const responseConfig = response.data.uiConfig;
        if (isUIConfig(responseConfig)) {
          uiConfig = responseConfig;
        }
      }

      // Compile the final agent configuration
      const finalAgentConfig: AgentConfig = {
        ...agentConfig as AgentConfig,
        id: `agent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        version: '0.1.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: buildRequest.userId,
        isPublic: false,
        uiConfig: uiConfig
      };

      // In a real system, we would save this to the database

      const response: AgentBuildResponse = {
        success: true,
        agent: finalAgentConfig
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error building agent:', error);
      
      const response: AgentBuildResponse = {
        success: false,
        error: `Failed to build agent: ${error instanceof Error ? error.message : String(error)}`
      };

      res.status(500).json(response);
    }
  }
}

function isUIConfig(obj: any): obj is UIConfig {
  return (
    obj &&
    typeof obj === 'object' &&
    'type' in obj &&
    'components' in obj &&
    Array.isArray(obj.components) &&
    ['chat', 'custom', 'dashboard', 'form'].includes(obj.type)
  );
}
