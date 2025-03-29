import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider } from './provider.interface';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel: string = 'claude-3-opus-20240229') {
    this.client = new Anthropic({
      apiKey,
    });
    this.defaultModel = defaultModel;
  }

  async getCompletion(prompt: string, options: any = {}): Promise<string> {
    try {
      const model = options.model || this.defaultModel;
      const maxTokens = options.maxTokens || 4096;
      const temperature = options.temperature || 0.7;

      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      return response.content[0].text;
    } catch (error) {
      console.error('Error getting completion from Anthropic:', error);
      throw new Error(`Failed to get completion from Anthropic: ${error}`);
    }
  }

  async getStructuredCompletion<T>(
    prompt: string,
    schema: any,
    options: any = {}
  ): Promise<T> {
    try {
      const structuredPrompt = `
        ${prompt}
        
        Respond with a valid JSON object that follows this schema:
        ${JSON.stringify(schema, null, 2)}
        
        Your response should only include the JSON object, nothing else.
      `;

      const response = await this.getCompletion(structuredPrompt, options);
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from LLM response');
      }
      
      return JSON.parse(jsonMatch[0]) as T;
    } catch (error) {
      console.error('Error getting structured completion from Anthropic:', error);
      throw new Error(`Failed to get structured completion from Anthropic: ${error}`);
    }
  }
}
