import { Router } from 'express';
import { MetricsController } from '../controllers/metrics.controller';
import { authorize } from '../middleware/auth.middleware';
import { rateLimiterMiddleware } from '../middleware/rate-limiter.middleware';

const router = Router();
const controller = new MetricsController();

// Get overall system metrics
router.get(
  '/system',
  rateLimiterMiddleware,
  authorize(['read:metrics']),
  (req, res) => controller.getSystemMetrics(req, res)
);

// Get deployment metrics
router.get(
  '/deployments/:id',
  rateLimiterMiddleware,
  authorize(['read:metrics']),
  (req, res) => controller.getDeploymentMetrics(req, res)
);

// Get deployment metrics history
router.get(
  '/deployments/:id/history',
  rateLimiterMiddleware,
  authorize(['read:metrics']),
  (req, res) => controller.getDeploymentMetricsHistory(req, res)
);

// Get aggregated metrics by deployment type
router.get(
  '/aggregated/type',
  rateLimiterMiddleware,
  authorize(['read:metrics']),
  (req, res) => controller.getMetricsByType(req, res)
);

// Get cost metrics
router.get(
  '/cost',
  rateLimiterMiddleware,
  authorize(['read:metrics']),
  (req, res) => controller.getCostMetrics(req, res)
);

export default router; 