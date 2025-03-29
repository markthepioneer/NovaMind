import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';
import { rateLimiterMiddleware } from '../middleware/rate-limiter.middleware';

const router = Router();
const controller = new HealthController();

// Basic health check
router.get(
  '/',
  rateLimiterMiddleware,
  (req, res) => controller.getHealth(req, res)
);

// Detailed health check
router.get(
  '/detailed',
  rateLimiterMiddleware,
  (req, res) => controller.getDetailedHealth(req, res)
);

// Provider health check
router.get(
  '/providers',
  rateLimiterMiddleware,
  (req, res) => controller.getProviderHealth(req, res)
);

export default router; 