import { config } from 'dotenv';
import { AgentRuntimeService } from './services/agent-runtime.service';
import { ToolManager } from './services/tool-manager.service';
import * as fs from 'fs';

// Load environment variables
config();

async function runTest(agentRuntime: AgentRuntimeService, testName: string, message: string) {
  console.log(`\n=== Running Test: ${testName} ===`);
  try {
    const response = await agentRuntime.processMessage(
      message,
      'test-agent',
      'test-user'
    );
    console.log('Response:', JSON.stringify(response, null, 2));
    console.log('=== Test Completed Successfully ===\n');
    return true;
  } catch (error) {
    console.error('Test Failed:', error);
    console.log('=== Test Failed ===\n');
    return false;
  }
}

async function main() {
  try {
    // Initialize services
    console.log('Initializing services...');
    const toolManager = new ToolManager();
    const agentRuntime = new AgentRuntimeService(toolManager);

    // Load test agent configuration
    console.log('Loading agent configuration...');
    const agentConfig = JSON.parse(fs.readFileSync('./src/test-agent.json', 'utf-8'));
    await agentRuntime.loadAgent(agentConfig);

    // Run a series of tests
    const tests = [
      {
        name: 'Web Search Capability',
        message: 'What are the latest developments in renewable energy technology? Focus on breakthroughs from the past month.'
      },
      {
        name: 'Complex Query Processing',
        message: 'Compare and contrast the current state of quantum computing and classical computing, including recent developments and limitations.'
      },
      {
        name: 'Tool Integration',
        message: 'Can you help me understand the current weather in Tokyo and San Francisco? Use HTTP requests to fetch this information.'
      },
      {
        name: 'Error Handling',
        message: 'Try to access a non-existent file called test.txt and handle the error appropriately.'
      }
    ];

    let passedTests = 0;
    for (const test of tests) {
      const passed = await runTest(agentRuntime, test.name, test.message);
      if (passed) passedTests++;
    }

    console.log(`\nTest Summary: ${passedTests}/${tests.length} tests passed`);

  } catch (error) {
    console.error('Fatal Error:', error);
  }
}

main(); 