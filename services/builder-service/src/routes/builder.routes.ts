import express from 'express';
import { BuilderService } from '../services/BuilderService';
import { OpenAIService } from '../llm/LLMService';
import { TemplateService } from '../services/TemplateService';
import { ToolService } from '../services/ToolService';
import { AgentSpecification } from '../llm/types';
import { ValidationError } from '@novamind/shared/utils/error-handling';

const router = express.Router();

// Initialize services
const llmService = new OpenAIService();
const templateService = new TemplateService();
const toolService = new ToolService();
const builderService = new BuilderService(llmService, templateService, toolService);

// Initialize LLM service with API key from environment
llmService.initialize({
  model: process.env.OPENAI_MODEL || 'gpt-4',
  apiKey: process.env.OPENAI_API_KEY || '',
  temperature: 0.7
});

// Create a new agent
router.post('/agents', async (req: express.Request, res: express.Response) => {
  try {
    const { name, description, tools } = req.body;

    if (!name || !description) {
      throw new ValidationError('Name and description are required');
    }

    const agent = await builderService.createAgent({
      name,
      description,
      tools: tools || []
    });

    return res.status(201).json(agent);
  } catch (error) {
    throw error;
  }
});

// Update an agent
router.put('/agents/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { name, description, tools } = req.body;

    if (!name && !description && !tools) {
      throw new ValidationError('At least one field to update is required');
    }

    const agent = await builderService.updateAgent(id, {
      name,
      description,
      tools
    });

    return res.status(200).json(agent);
  } catch (error) {
    throw error;
  }
});

// Get all agents
router.get('/agents', async (_req: express.Request, res: express.Response) => {
  try {
    const agents = await builderService.getAllAgents();
    return res.status(200).json(agents);
  } catch (error) {
    throw error;
  }
});

// Get agent by ID
router.get('/agents/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const agent = await builderService.getAgentById(id);
    return res.status(200).json(agent);
  } catch (error) {
    throw error;
  }
});

// Delete agent
router.delete('/agents/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    await builderService.deleteAgent(id);
    return res.status(204).send();
  } catch (error) {
    throw error;
  }
});

// Route to validate agent code
router.post('/validate', async (req: express.Request, res: express.Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Agent code is required' });
    }

    const isValid = await builderService.validateAgent(code);
    res.json({ valid: isValid });
  } catch (error) {
    console.error('Error validating agent:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Route to list available templates
router.get('/templates', async (req: express.Request, res: express.Response) => {
  try {
    const templates = await templateService.listTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Route to list available tools
router.get('/tools', async (req: express.Request, res: express.Response) => {
  try {
    const tools = await toolService.listTools();
    res.json(tools);
  } catch (error) {
    console.error('Error listing tools:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export { router as builderRoutes };
