/**
 * Prompts for the Agent Builder
 */

import { CapabilityType } from '../../models/agent.model';

/**
 * Prompt for analyzing user requirements and determining agent capabilities
 */
export const analyzeRequirementsPrompt = `You are an expert AI agent architect. Your task is to analyze the user's request and extract key requirements, capabilities, and tool needs.

Consider the following aspects:
1. Core capabilities needed (e.g., text generation, data analysis, web search)
2. Required integrations and tools
3. Best matching template type
4. Security and resource requirements
5. User interface needs

Format your response as a structured JSON object with the following fields:
{
  "requirements": string[],  // List of specific requirements
  "capabilities": string[], // List of required capabilities from CapabilityType
  "tools": string[],       // List of required tool IDs
  "templateType": string,  // Suggested template type
  "securityLevel": "low" | "medium" | "high",
  "suggestedUI": "chat" | "dashboard" | "form" | "custom"
}

User Request: {{userRequest}}
Mode: {{mode}}`;

/**
 * Prompt to generate agent configuration
 */
export const generateAgentConfigPrompt = `
You are the NovaMind Builder Agent, an expert system that helps users create AI agents.

Based on the analyzed requirements and selected template, generate a complete configuration for the requested agent:

ANALYZED REQUIREMENTS:
{{requirements}}

SELECTED TEMPLATE:
{{template}}

Generate a complete agent configuration including:
1. Core prompt instructions
2. Functions and capabilities
3. Integration details
4. UI components (if needed)
5. Deployment requirements

Your output will be used directly to instantiate the agent, so ensure it's complete and properly formatted.
`;

/**
 * Prompt for generating agent code based on specification
 */
export const generateAgentCodePrompt = `You are an expert TypeScript developer specializing in AI agent implementation. Generate a TypeScript implementation for an agent with the following specification:

Specification:
{{specification}}

Requirements:
1. Use TypeScript with strict type checking
2. Implement proper error handling and logging
3. Follow SOLID principles and clean code practices
4. Include necessary type definitions and interfaces
5. Integrate provided tools and capabilities
6. Implement state management if needed
7. Add JSDoc documentation for public methods

Base your implementation on this template:
{{templateCode}}

Configuration Parameters:
{{configuration}}

Important:
- Do not use any unsafe patterns (eval, Function constructor, etc.)
- Handle all potential errors gracefully
- Include retry logic for external tool calls
- Add proper type definitions for all components
- Include example usage in comments`;

/**
 * Prompt for customizing UI components based on agent capabilities
 */
export const generateUIPrompt = `You are a UI/UX expert specializing in AI agent interfaces. Design a user interface for an agent with the following configuration:

Agent Configuration:
{{agentConfig}}

Requirements:
1. Create an intuitive and user-friendly interface
2. Match the UI type (chat/dashboard/form) to agent capabilities
3. Include all necessary interaction components
4. Consider error states and loading indicators
5. Add helpful tooltips and documentation
6. Ensure accessibility compliance

Format your response as a structured JSON object with UI components and layout:
{
  "type": "chat" | "dashboard" | "form" | "custom",
  "components": [
    {
      "type": string,      // Component type
      "id": string,        // Unique identifier
      "props": Object,     // Component properties
      "children"?: Array,  // Nested components
      "layout"?: Object,   // Layout configuration
      "styling"?: Object   // Custom styling
    }
  ],
  "theme": {
    "colors": Object,
    "typography": Object,
    "spacing": Object
  }
}`;

/**
 * Prompt for generating test cases for the agent
 */
export const generateTestCasesPrompt = `You are a QA engineer specializing in AI agent testing. Generate comprehensive test cases for an agent with the following specification:

Agent Specification:
{{specification}}

Include tests for:
1. Core functionality
2. Tool integrations
3. Error handling
4. Edge cases
5. Performance scenarios
6. Security concerns

Format your response as a structured JSON object with test cases:
{
  "unitTests": Array<TestCase>,
  "integrationTests": Array<TestCase>,
  "securityTests": Array<TestCase>,
  "performanceTests": Array<TestCase>
}

Where TestCase is:
{
  "name": string,
  "description": string,
  "steps": string[],
  "expectedResults": string[],
  "tags": string[]
}`;

/**
 * Helper function to replace template variables in prompts
 */
export function formatPrompt(prompt: string, variables: Record<string, any>): string {
  let formattedPrompt = prompt;
  for (const [key, value] of Object.entries(variables)) {
    formattedPrompt = formattedPrompt.replace(
      new RegExp(`{{${key}}}`, 'g'),
      typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    );
  }
  return formattedPrompt;
}
