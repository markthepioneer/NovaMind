import { Router } from 'express';
import { UsageController } from '../controllers/usage.controller';

const router = Router();
const usageController = new UsageController();

// Get daily usage for a deployment
router.get('/daily/:deploymentId', usageController.getDailyUsage.bind(usageController));

// Get user's daily usage across all deployments
router.get('/daily/user/:userId', usageController.getUserDailyUsage.bind(usageController));

// Get billing history for a user
router.get('/billing/history/:userId', usageController.getUserBillingHistory.bind(usageController));

// Get monthly billing details
router.get('/billing/:userId/:year/:month', usageController.getMonthlyBilling.bind(usageController));

// Get billing summary for a user
router.get('/billing/summary/:userId', usageController.getBillingSummary.bind(usageController));

// Generate invoice for a monthly billing
router.get('/billing/invoice/:billingId', usageController.generateInvoice.bind(usageController));

// Admin routes
// Process monthly billing for all users
router.post('/admin/process-billing', usageController.processMonthlyBilling.bind(usageController));

// Get usage statistics for all deployments
router.get('/admin/stats', usageController.getAllUsageStats.bind(usageController));

// Get daily system-wide usage trends
router.get('/admin/trends', usageController.getSystemUsageTrends.bind(usageController));

// Get top users by usage
router.get('/admin/top-users', usageController.getTopUsers.bind(usageController));

// Get top deployments by usage
router.get('/admin/top-deployments', usageController.getTopDeployments.bind(usageController));

export default router;
