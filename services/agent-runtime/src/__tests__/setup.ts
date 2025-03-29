// Mock environment variables
process.env.API_KEY = 'test-api-key';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.WORKSPACE_ROOT = '/tmp/test-workspace';
process.env.GOOGLE_SEARCH_API_KEY = 'test-google-key';
process.env.GOOGLE_SEARCH_ENGINE_ID = 'test-search-engine-id';

// Create test workspace directory
import fs from 'fs';
import path from 'path';

const workspaceRoot = process.env.WORKSPACE_ROOT;
if (!fs.existsSync(workspaceRoot)) {
  fs.mkdirSync(workspaceRoot, { recursive: true });
}

// Mock external services
jest.mock('axios');
jest.mock('openai');
jest.mock('@anthropic-ai/sdk'); 