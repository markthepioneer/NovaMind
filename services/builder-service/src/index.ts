import express from 'express';
import { builderRoutes } from './routes/builder.routes';
import { chatRoutes } from './routes/chat.routes';
import { logger } from '@novamind/shared/utils/logger';
import { handleError } from '@novamind/shared/utils/error-handling';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  handleError(err, res);
});

// Health check endpoint
app.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({ status: 'healthy' });
});

// Routes
app.use('/api/builder', builderRoutes);
app.use('/api/chat', chatRoutes);

// Start server
app.listen(port, () => {
  logger.info(`Builder service listening on port ${port}`);
});

export default app;
