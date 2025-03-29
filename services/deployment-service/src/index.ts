import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { deploymentRoutes } from './routes/deployment.routes';
import { usageRoutes } from './routes/usage.routes';
import { logger } from '@novamind/shared/utils/logger';
import { handleError } from '@novamind/shared/utils/error-handling';

// Load environment variables
dotenv.config();

// Create logs directory if it doesn't exist
import fs from 'fs';
import path from 'path';
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create Express server
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/deployments', deploymentRoutes);
app.use('/api/usage', usageRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('NovaMind Deployment Service is running');
});

// Health check endpoint
app.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({ status: 'healthy' });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  handleError(err, res);
});

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/novamind';
mongoose.connect(MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
    
    // Start the server
    const port = process.env.PORT || 3003;
    app.listen(port, () => {
      logger.info(`Deployment service listening on port ${port}`);
    });
  })
  .catch(error => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  });
