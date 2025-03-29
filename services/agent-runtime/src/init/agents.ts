import { AgentRuntime } from '../runtime/agent-runtime';
import { ContactDetectiveAgent } from '../agents/contact-detective';

export async function initializeAgents(runtime: AgentRuntime): Promise<void> {
  try {
    // Initialize Contact Detective agent
    const contactDetective = new ContactDetectiveAgent();
    await contactDetective.initialize();
    await runtime.registerAgent('contact-detective', contactDetective);
    console.log('Successfully initialized Contact Detective agent');
  } catch (error) {
    console.error('Failed to initialize agents:', error);
    throw error;
  }
} 