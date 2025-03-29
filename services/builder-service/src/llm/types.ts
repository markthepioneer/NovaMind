export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type ChatMessage = ChatCompletionMessage;

export interface AgentSpecification {
  name: string;
  description: string;
  requirements: string[];
  tools: string[];
  templateType: string;
  configuration: Record<string, any>;
}

export interface AgentBuildResult {
  success: boolean;
  agentId?: string;
  error?: string;
  code?: string;
  metadata?: {
    createdAt: Date;
    version: string;
    requirements: string[];
    tools: string[];
    buildInfo?: {
      yoloMode?: boolean;
      template?: string;
    };
  };
} 