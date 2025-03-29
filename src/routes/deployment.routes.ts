import { Router } from 'express';
import { DeploymentController } from '../controllers/deployment.controller';
import { authorize } from '../middleware/auth.middleware';
import { rateLimiterMiddleware } from '../middleware/rate-limiter.middleware';

const router = Router();
const controller = new DeploymentController();

// List deployments
router.get(
  '/',
  rateLimiterMiddleware,
  authorize(['read:deployments']),
  (req, res) => controller.listDeployments(req, res)
);

// Get deployment by ID
router.get(
  '/:id',
  rateLimiterMiddleware,
  authorize(['read:deployments']),
  (req, res) => controller.getDeployment(req, res)
);

// Get deployment logs
router.get(
  '/:id/logs',
  rateLimiterMiddleware,
  authorize(['read:deployments']),
  (req, res) => controller.getDeploymentLogs(req, res)
);

// Create deployment
router.post(
  '/',
  rateLimiterMiddleware,
  authorize(['create:deployments']),
  (req, res) => controller.createDeployment(req, res)
);

// Stop deployment
router.post(
  '/:id/stop',
  rateLimiterMiddleware,
  authorize(['update:deployments']),
  (req, res) => controller.stopDeployment(req, res)
);

// Delete deployment
router.delete(
  '/:id',
  rateLimiterMiddleware,
  authorize(['delete:deployments']),
  (req, res) => controller.deleteDeployment(req, res)
);

export default router; 