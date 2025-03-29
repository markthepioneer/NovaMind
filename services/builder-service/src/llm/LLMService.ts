import { ChatCompletionMessage } from './types';
import { OpenAI } from 'openai';
import { ValidationError } from '@novamind/shared/utils/error-handling';
import { Logger } from '../utils/logger';
import {
  analyzeRequirementsPrompt,
  generateAgentCodePrompt,
  generateUIPrompt,
  generateTestCasesPrompt,
  formatPrompt
} from './prompts/agent-builder.prompt';

const logger = new Logger('LLMService');

export interface LLMConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey: string;
}

export interface LLMService {
  initialize(config: LLMConfig): Promise<void>;
  generateResponse(messages: ChatCompletionMessage[]): Promise<string>;
  generateAgentCode(specification: string): Promise<string>;
  analyzeUserRequest(request: string): Promise<{
    requirements: string[];
    tools: string[];
    templateType: string;
  }>;
}

interface AnalysisResponse {
  requirements: string[];
  capabilities: string[];
  tools: string[];
  templateType: string;
  securityLevel: 'low' | 'medium' | 'high';
  suggestedUI: 'chat' | 'dashboard' | 'form' | 'custom';
}

// Implementation for OpenAI
export class OpenAIService implements LLMService {
  private config: LLMConfig | null = null;
  private openai: OpenAI | null = null;

  async initialize(config: LLMConfig): Promise<void> {
    this.config = config;
    this.openai = new OpenAI({ apiKey: config.apiKey });
  }

  async generateResponse(messages: ChatCompletionMessage[]): Promise<string> {
    if (!this.openai) throw new Error('OpenAI not initialized');

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config?.model || 'gpt-4',
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: this.config?.temperature || 0.7,
        max_tokens: this.config?.maxTokens || 2000,
        response_format: { type: 'json_object' }
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      logger.error('Error generating response:', error);
      throw new ValidationError('Failed to generate response from LLM');
    }
  }

  async generateAgentCode(specification: string): Promise<string> {
    try {
      const prompt = formatPrompt(generateAgentCodePrompt, {
        specification,
        templateCode: '', // Will be filled by the template service
        configuration: {} // Will be filled with tool configurations
      });

      const response = await this.generateResponse([
        { role: 'system', content: 'You are an expert TypeScript developer.' },
        { role: 'user', content: prompt }
      ]);

      // Parse and validate the response
      const parsedResponse = JSON.parse(response);
      if (!parsedResponse.code) {
        throw new ValidationError('Generated code is missing');
      }

      return parsedResponse.code;
    } catch (error) {
      logger.error('Error generating agent code:', error);
      throw new ValidationError('Failed to generate agent code');
    }
  }

  async analyzeUserRequest(request: string): Promise<{
    requirements: string[];
    tools: string[];
    templateType: string;
  }> {
    try {
      const prompt = formatPrompt(analyzeRequirementsPrompt, {
        userRequest: request,
        mode: this.config?.temperature === 0 ? 'precise' : 'creative'
      });

      const response = await this.generateResponse([
        { role: 'system', content: 'You are an AI agent architect.' },
        { role: 'user', content: prompt }
      ]);

      // Parse and validate the response
      const analysis = JSON.parse(response) as AnalysisResponse;
      
      // Validate required fields
      if (!analysis.requirements || !analysis.tools || !analysis.templateType) {
        throw new ValidationError('Invalid analysis response structure');
      }

      // Log analysis results
      logger.debug('Request analysis:', {
        requirements: analysis.requirements,
        capabilities: analysis.capabilities,
        securityLevel: analysis.securityLevel,
        suggestedUI: analysis.suggestedUI
      });

      return {
        requirements: analysis.requirements,
        tools: analysis.tools,
        templateType: analysis.templateType
      };
    } catch (error) {
      logger.error('Error analyzing user request:', error);
      throw new ValidationError('Failed to analyze user request');
    }
  }

  async generateUIComponents(agentConfig: any): Promise<any> {
    try {
      const prompt = formatPrompt(generateUIPrompt, {
        agentConfig: JSON.stringify(agentConfig, null, 2)
      });

      const response = await this.generateResponse([
        { role: 'system', content: 'You are a UI/UX expert.' },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      logger.error('Error generating UI components:', error);
      throw new ValidationError('Failed to generate UI components');
    }
  }

  async generateTestCases(specification: string): Promise<any> {
    try {
      const prompt = formatPrompt(generateTestCasesPrompt, {
        specification
      });

      const response = await this.generateResponse([
        { role: 'system', content: 'You are a QA engineer.' },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      logger.error('Error generating test cases:', error);
      throw new ValidationError('Failed to generate test cases');
    }
  }
} 