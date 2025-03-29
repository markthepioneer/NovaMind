import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { initializeApp } from './init';
import { authenticate } from './middleware/auth.middleware';
import { rateLimiterMiddleware } from './middleware/rate-limiter.middleware';
import deploymentRoutes from './routes/deployment.routes';
import metricsRoutes from './routes/metrics.routes';
import healthRoutes from './routes/health.routes';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req: express.Request, res: express.Response) => {
  res.json({
    name: 'Novamind API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      deployments: '/api/v1/deployments',
      metrics: '/api/v1/metrics'
    },
    documentation: 'For API documentation, please refer to the README.md'
  });
});

// Routes
app.use('/health', healthRoutes);
app.use('/api/v1/deployments', authenticate, deploymentRoutes);
app.use('/api/v1/metrics', authenticate, metricsRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err });
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
});

// Start the server
const startServer = async () => {
  try {
    await initializeApp();
    
    const port = config.port || 4000;
    app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

startServer(); 