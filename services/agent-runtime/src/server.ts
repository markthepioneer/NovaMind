import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { AgentRuntime } from './runtime/agent-runtime';
import { ToolManager } from './services/tool-manager.service';
import { logger } from './utils/logger';
import { initializeAgents } from './init/agents';

// Load environment variables
dotenv.config();

// Initialize services
const toolManager = new ToolManager();
const agentRuntime = new AgentRuntime();

// Create Express app
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3007', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});
app.use(limiter);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.post('/api/v1/agents/:agentId/messages', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { message, userId, context } = req.body;
    
    console.log('Received message request:', { agentId, message, userId, context });
    
    const result = await agentRuntime.processMessage(message, agentId, userId);
    console.log('Processed message result:', result);
    
    res.json({ success: true, data: { output: result } });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize agents and start server
async function start() {
  try {
    await initializeAgents(agentRuntime);
    app.listen(port, () => {
      console.log(`Agent runtime service listening at http://localhost:${port}`);
      console.log('CORS enabled for:', ['http://localhost:3007', 'http://localhost:3000']);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});
