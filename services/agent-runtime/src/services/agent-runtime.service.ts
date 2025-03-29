import { Logger } from '../utils/logger';
import { ToolManager } from './tool-manager.service';
import { ValidationError, NotFoundError } from '../utils/error-handling';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const logger = new Logger('AgentRuntime');

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  basePrompt: string;
  model: {
    provider: 'openai' | 'anthropic';
    name: string;
    temperature?: number;
    maxTokens?: number;
  };
  tools: { id: string; config: Record<string, any> }[];
}

interface AgentInfo {
  agentId: string;
  name: string;
  description: string;
}

interface MessageContext {
  agentId: string;
  userId: string;
  conversationId: string;
  messageId: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface AgentResponse {
  content: string;
  actions?: {
    tool: string;
    params: Record<string, any>;
  }[];
  metadata?: Record<string, any>;
}

export class AgentRuntimeService {
  private agents: Map<string, AgentConfig>;
  private toolManager: ToolManager;
  private openai: OpenAI | null;
  private anthropic: Anthropic | null;

  constructor(toolManager: ToolManager) {
    this.agents = new Map();
    this.toolManager = toolManager;
    this.openai = null;
    this.anthropic = null;

    // Initialize model providers
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  async loadAgent(config: AgentConfig): Promise<AgentInfo> {
    // Validate required fields
    if (!config.id || !config.name || !config.description || !config.basePrompt) {
      throw new ValidationError('Missing required agent configuration fields');
    }

    // Validate model configuration
    if (!config.model || !config.model.provider || !config.model.name) {
      throw new ValidationError('Invalid model configuration');
    }

    // Validate model provider is available
    if (config.model.provider === 'openai' && !this.openai) {
      throw new ValidationError('OpenAI API key not configured');
    }
    if (config.model.provider === 'anthropic' && !this.anthropic) {
      throw new ValidationError('Anthropic API key not configured');
    }

    // Store agent configuration
    this.agents.set(config.id, config);

    return {
      agentId: config.id,
      name: config.name,
      description: config.description
    };
  }

  async processMessage(message: string, agentId: string, userId: string): Promise<any> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    // Create context for tool execution
    const context: MessageContext = {
      agentId,
      userId,
      conversationId: `${userId}-${Date.now()}`,
      messageId: `msg-${Date.now()}`
    };

    // Create tools interface for the agent
    const tools = {
      executeTool: async (toolId: string, params: any) => {
        return this.toolManager.executeTool(toolId, params, context);
      }
    };

    // Process message using agent's configuration
    try {
      let response;
      if (agent.model.provider === 'openai' && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: agent.model.name,
          messages: [
            { role: 'system', content: agent.basePrompt },
            { role: 'user', content: message }
          ],
          temperature: agent.model.temperature ?? 0.7,
          max_tokens: agent.model.maxTokens ?? 1000
        });
        response = completion.choices[0]?.message?.content || 'No response generated';
      } else if (agent.model.provider === 'anthropic' && this.anthropic) {
        const completion = await this.anthropic.messages.create({
          model: agent.model.name,
          messages: [
            { role: 'user', content: `${agent.basePrompt}\n\n${message}` }
          ],
          temperature: agent.model.temperature ?? 0.7,
          max_tokens: agent.model.maxTokens ?? 1000
        });
        response = completion.content[0]?.text || 'No response generated';
      } else {
        throw new ValidationError('No valid model provider available');
      }

      return {
        response,
        agentId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to process message: ${(error as Error).message}`);
    }
  }

  getLoadedAgents(): AgentInfo[] {
    return Array.from(this.agents.values()).map(agent => ({
      agentId: agent.id,
      name: agent.name,
      description: agent.description
    }));
  }

  getAvailableTools(): string[] {
    return this.toolManager.getAvailableTools();
  }
} 