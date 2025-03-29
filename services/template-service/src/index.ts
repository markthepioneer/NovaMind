import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Template } from './models/template.schema';
import { baseTemplates } from './data/base-templates';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/novamind')
  .then(() => {
    logger.info('Connected to MongoDB');
    // Initialize base templates if none exist
    initializeTemplates();
  })
  .catch((error: Error) => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Initialize base templates in the database
async function initializeTemplates() {
  try {
    const count = await Template.countDocuments();
    if (count === 0) {
      logger.info('Initializing base templates...');
      await Template.insertMany(baseTemplates);
      logger.info(`${baseTemplates.length} templates inserted successfully`);
    }
  } catch (error) {
    logger.error('Error initializing templates:', error);
  }
}

// Routes
app.get('/', (req, res) => {
  res.send('NovaMind Template Service is running');
});

// Get all templates
app.get('/templates', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await Template.find();
    res.json(templates);
  } catch (error) {
    next(error);
  }
});

// Get template by ID
app.get('/templates/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    next(error);
  }
});

// Get templates by category
app.get('/templates/category/:category', async (req, res) => {
  try {
    const templates = await Template.find({ 
      category: req.params.category,
      isPublic: true 
    });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy' });
});

// Create new template
app.post('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = new Template(req.body);
    await template.validate();
    const savedTemplate = await template.save();
    res.status(201).json(savedTemplate);
  } catch (error) {
    next(error);
  }
});

// Update template
app.put('/templates/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = await Template.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    next(error);
  }
});

// Delete template
app.delete('/templates/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = await Template.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  logger.info(`Template service listening on port ${port}`);
});

export default app;
