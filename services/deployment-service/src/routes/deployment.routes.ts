import { Router } from 'express';
import { DeploymentController } from '../controllers/deployment.controller';

const router = Router();
const deploymentController = new DeploymentController();

// Create a new deployment
router.post('/', deploymentController.createDeployment.bind(deploymentController));

// Get deployment by ID
router.get('/:id', deploymentController.getDeployment.bind(deploymentController));

// Get all deployments for a user
router.get('/user/:userId', deploymentController.getUserDeployments.bind(deploymentController));

// Update deployment
router.put('/:id', deploymentController.updateDeployment.bind(deploymentController));

// Stop a deployment
router.post('/:id/stop', deploymentController.stopDeployment.bind(deploymentController));

// Start a deployment
router.post('/:id/start', deploymentController.startDeployment.bind(deploymentController));

// Delete a deployment
router.delete('/:id', deploymentController.deleteDeployment.bind(deploymentController));

// Get deployment metrics
router.get('/:id/metrics', deploymentController.getDeploymentMetrics.bind(deploymentController));

// Get deployment logs
router.get('/:id/logs', deploymentController.getDeploymentLogs.bind(deploymentController));

// Get deployment usage statistics
router.get('/:id/usage', deploymentController.getDeploymentUsage.bind(deploymentController));

// Record usage for a deployment
router.post('/:deploymentId/record-usage', deploymentController.recordUsage.bind(deploymentController));

// Get billing summary for a user
router.get('/billing/:userId/summary', deploymentController.getUserBillingSummary.bind(deploymentController));

export default router;
