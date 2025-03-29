import { AgentConfig } from '../types/agent';

export const contactDetectiveConfig: AgentConfig = {
  id: 'contact-detective',
  name: 'Contact Detective',
  description: 'An AI agent that investigates and compiles contact information from various online sources',
  version: '1.0.0',
  basePrompt: `You are the Contact Detective, an AI agent specialized in finding and analyzing contact information.
Your task is to search the web and social media platforms to gather comprehensive information about the person specified.
Be thorough but respectful of privacy - only collect publicly available information.
Format your findings in a clear, organized report with proper citations.`,
  model: {
    provider: 'openai',
    name: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000
  },
  tools: [
    {
      id: 'web_search',
      config: {
        resultsPerQuery: 5
      }
    },
    {
      id: 'report_generator',
      config: {
        format: 'markdown'
      }
    }
  ],
  capabilities: [
    'Web Search',
    'Social Media Analysis',
    'Contact Information Extraction',
    'Report Generation'
  ],
  uiConfig: {
    type: 'chat',
    components: [
      {
        type: 'input',
        placeholder: 'Enter the name of the person to investigate',
        required: true
      },
      {
        type: 'button',
        label: 'Start Investigation',
        action: 'submit'
      },
      {
        type: 'markdown',
        style: {
          maxHeight: '600px',
          overflow: 'auto'
        }
      }
    ]
  },
  deploymentConfig: {
    resources: {
      cpu: '0.5',
      memory: '512Mi'
    },
    scaling: {
      minInstances: 1,
      maxInstances: 3
    }
  }
}; 