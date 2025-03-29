import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AgentRuntimeService } from './services/agent-runtime.service';
import { ToolManager } from './services/tool-manager.service';
import { UsageTracker } from './services/usage-tracker.service';
import { WebSearchTool } from './tools/web-search.tool';
import { HttpRequestTool } from './tools/http-request.tool';
import { FileOperationsTool } from './tools/file-operations.tool';
import { validateApiKey } from './utils/auth';
import { handleError } from './utils/error-handling';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'API_KEY',
  'OPENAI_API_KEY',
  'WORKSPACE_ROOT',
  'GOOGLE_SEARCH_API_KEY',
  'GOOGLE_SEARCH_ENGINE_ID'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Initialize services
const toolManager = new ToolManager();
const usageTracker = new UsageTracker();
const agentRuntime = new AgentRuntimeService(toolManager);

// Register built-in tools
toolManager.registerTool(new WebSearchTool());
toolManager.registerTool(new HttpRequestTool());
toolManager.registerTool(new FileOperationsTool());

console.log('[ToolManager] INFO: Built-in tools registered');

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-api-key']
}));
app.use(express.json({ limit: process.env.MAX_REQUEST_SIZE || '1mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
});
app.use(limiter);

// API key authentication
app.use(validateApiKey);

// Routes
app.post('/api/v1/agents', async (req, res) => {
  try {
    const result = await agentRuntime.loadAgent(req.body);
    res.json(result);
  } catch (error) {
    handleError(error as Error);
  }
});

app.post('/api/v1/agents/:agentId/messages', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { message, userId } = req.body;

    usageTracker.trackAgentUsage(userId, agentId);
    const result = await agentRuntime.processMessage(message, agentId, userId);
    res.json(result);
  } catch (error) {
    handleError(error as Error);
  }
});

app.get('/api/v1/agents', (req, res) => {
  try {
    const agents = agentRuntime.getLoadedAgents();
    res.json(agents);
  } catch (error) {
    handleError(error as Error);
  }
});

app.get('/api/v1/tools', (req, res) => {
  try {
    const tools = agentRuntime.getAvailableTools();
    res.json(tools);
  } catch (error) {
    handleError(error as Error);
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const port = process.env.PORT || 4000;
const server = app.listen(port, () => {
  logger.info(`Agent Runtime Service listening on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Export components
export {
  AgentRuntimeService,
  ToolManager,
  UsageTracker,
  WebSearchTool,
  HttpRequestTool,
  FileOperationsTool
};
