import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServiceProxy } from './utils/proxy';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy' });
});

// Service proxies
const services = {
  builder: process.env.BUILDER_SERVICE_URL || 'http://builder-service:3001',
  template: process.env.TEMPLATE_SERVICE_URL || 'http://template-service:3002',
  deployment: process.env.DEPLOYMENT_SERVICE_URL || 'http://deployment-service:3003'
};

// Mount service proxies
app.use('/api/builder', createServiceProxy(services.builder));
app.use('/api/templates', createServiceProxy(services.template));
app.use('/api/deployments', createServiceProxy(services.deployment));

// Error handling
app.use((error: Error, _req: Request, res: Response) => {
  logger.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  logger.info(`API Gateway listening on port ${port}`);
  logger.info('Service URLs:', services);
});
