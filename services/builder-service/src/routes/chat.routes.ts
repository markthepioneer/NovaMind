import express from 'express';
import { OpenAIService } from '../llm/LLMService';
import { ValidationError } from '@novamind/shared/utils/error-handling';

const router = express.Router();
const llmService = new OpenAIService();

// Initialize OpenAI service
llmService.initialize({
  model: process.env.OPENAI_MODEL || 'gpt-4',
  apiKey: process.env.OPENAI_API_KEY || '',
  temperature: 0.7
});

// Chat endpoint
router.post('/', async (req: express.Request, res: express.Response) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      throw new ValidationError('Messages array is required');
    }

    const response = await llmService.generateResponse(messages);
    return res.json({ response });
  } catch (error) {
    throw error;
  }
});

export { router as chatRoutes };