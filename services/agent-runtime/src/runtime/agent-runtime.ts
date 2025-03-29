import { Agent } from '../types/agent';

export class AgentRuntime {
  private agents: Map<string, Agent>;

  constructor() {
    this.agents = new Map();
  }

  async registerAgent(id: string, agent: Agent): Promise<void> {
    if (this.agents.has(id)) {
      throw new Error(`Agent with ID ${id} is already registered`);
    }
    this.agents.set(id, agent);
  }

  async processMessage(message: string, agentId: string, userId: string): Promise<string> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    try {
      console.log(`Processing message with agent ${agentId}:`, message);
      const result = await agent.processMessage(message, userId);
      console.log(`Agent ${agentId} response:`, result);
      return result;
    } catch (error) {
      console.error(`Error processing message with agent ${agentId}:`, error);
      throw error;
    }
  }
} 