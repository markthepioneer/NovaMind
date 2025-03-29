import { config } from 'dotenv';
import { AgentRuntimeService } from './services/agent-runtime.service';
import { ToolManager } from './services/tool-manager.service';
import * as fs from 'fs';

// Load environment variables
config();

async function main() {
  try {
    // Initialize services
    const toolManager = new ToolManager();
    const agentRuntime = new AgentRuntimeService(toolManager);

    // Load test agent configuration
    const agentConfig = JSON.parse(fs.readFileSync('./src/test-agent.json', 'utf-8'));
    await agentRuntime.loadAgent(agentConfig);

    // Process a test message that will trigger web search
    const response = await agentRuntime.processMessage(
      'Search for the latest news about quantum computing breakthroughs',
      'test-agent',
      'test-user'
    );
    console.log('Agent Response:', response);

  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 