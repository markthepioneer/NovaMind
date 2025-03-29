import { Request, Response } from 'express';
import { UsageTrackingService } from '../services/usage-tracking.service';
import { DailyUsage, MonthlyBilling } from '../models/usage.schema';
import { logger } from '../utils/logger';
import { PipelineStage } from 'mongoose';
import { Types } from 'mongoose';
import { UsageModel, IUsage } from '../models/usage.model';
import { ValidationError, NotFoundError } from '@novamind/shared/utils/error-handling';

interface BillingDocument {
  _id: string;
  userId: string;
  month: string;
  year: number;
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  status: string;
}

interface UsageWithId extends IUsage {
  _id: Types.ObjectId;
}

export class UsageController {
  private usageTrackingService: UsageTrackingService;

  constructor() {
    this.usageTrackingService = new UsageTrackingService();
  }

  /**
   * Get daily usage for a deployment
   */
  public async getDailyUsage(req: Request, res: Response): Promise<void> {
    try {
      const { deploymentId } = req.params;
      const { startDate, endDate } = req.query;

      // Parse date range
      const start = startDate ? new Date(startDate as string) : new Date();
      start.setDate(start.getDate() - 30); // Default to last 30 days
      
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get daily usage records
      const usageRecords = await DailyUsage.find({
        deploymentId,
        date: {
          $gte: start,
          $lte: end
        }
      }).sort({ date: 1 });

      res.status(200).json({
        success: true,
        count: usageRecords.length,
        usage: usageRecords
      });
    } catch (error) {
      logger.error('Error getting daily usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get daily usage'
      });
    }
  }

  /**
   * Get user's daily usage across all deployments
   */
  public async getUserDailyUsage(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      // Parse date range
      const start = startDate ? new Date(startDate as string) : new Date();
      start.setDate(start.getDate() - 30); // Default to last 30 days
      
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get daily usage records
      const usageRecords = await DailyUsage.find({
        userId,
        date: {
          $gte: start,
          $lte: end
        }
      }).sort({ date: 1 });

      // Aggregate usage by date
      const aggregatedUsage = new Map<string, any>();
      
      for (const record of usageRecords) {
        const dateStr = record.date.toISOString().split('T')[0];
        
        if (!aggregatedUsage.has(dateStr)) {
          aggregatedUsage.set(dateStr, {
            date: dateStr,
            requestCount: 0,
            tokenCount: {
              input: 0,
              output: 0,
              total: 0
            },
            errorCount: 0,
            cost: {
              compute: 0,
              tokens: 0,
              total: 0
            },
            deployments: []
          });
        }
        
        const dailyData = aggregatedUsage.get(dateStr);
        
        // Add usage
        dailyData.requestCount += record.requestCount;
        dailyData.tokenCount.input += record.tokenCount.input;
        dailyData.tokenCount.output += record.tokenCount.output;
        dailyData.tokenCount.total += record.tokenCount.total;
        dailyData.errorCount += record.errorCount;
        dailyData.cost.compute += record.cost.compute;
        dailyData.cost.tokens += record.cost.tokens;
        dailyData.cost.total += record.cost.total;
        
        // Add deployment
        dailyData.deployments.push({
          deploymentId: record.deploymentId,
          requestCount: record.requestCount,
          cost: record.cost.total
        });
      }

      // Convert to array and sort by date
      const result = Array.from(aggregatedUsage.values())
        .sort((a, b) => a.date.localeCompare(b.date));

      res.status(200).json({
        success: true,
        count: result.length,
        usage: result
      });
    } catch (error) {
      logger.error('Error getting user daily usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user daily usage'
      });
    }
  }

  /**
   * Get billing history for a user
   */
  public async getUserBillingHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      // Get all monthly billing records for the user
      const billingRecords = await MonthlyBilling.find({
        userId
      }).sort({ year: -1, month: -1 });

      res.status(200).json({
        success: true,
        count: billingRecords.length,
        billing: billingRecords
      });
    } catch (error) {
      logger.error('Error getting user billing history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user billing history'
      });
    }
  }

  /**
   * Get monthly billing details
   */
  public async getMonthlyBilling(req: Request, res: Response): Promise<void> {
    try {
      const { userId, year, month } = req.params;

      // Get or generate monthly billing
      const monthlyBilling = await this.usageTrackingService.generateMonthlyBilling(
        userId,
        parseInt(year),
        parseInt(month)
      );

      res.status(200).json({
        success: true,
        billing: monthlyBilling
      });
    } catch (error) {
      logger.error('Error getting monthly billing:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get monthly billing'
      });
    }
  }

  /**
   * Get billing summary for a user
   */
  public async getBillingSummary(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const billingSummary = await this.usageTrackingService.getUserBillingSummary(userId);

      res.status(200).json({
        success: true,
        summary: billingSummary
      });
    } catch (error) {
      logger.error('Error getting billing summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get billing summary'
      });
    }
  }

  /**
   * Generate invoice for a monthly billing
   * This is just a stub - in a real system this would generate a PDF or similar
   */
  public async generateInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { billingId } = req.params;

      // Get billing record
      const billing = await MonthlyBilling.findById(billingId);

      if (!billing) {
        res.status(404).json({
          success: false,
          error: 'Billing record not found'
        });
        return;
      }

      // In a real system, this would generate an invoice
      // For now, just return the billing details
      res.status(200).json({
        success: true,
        invoice: {
          invoiceNumber: `INV-${billing.year}${billing.month.toString().padStart(2, '0')}-${billing._id.toString().substring(0, 8)}`,
          date: new Date(),
          dueDate: new Date(new Date().setDate(new Date().getDate() + 30)), // Due in 30 days
          customer: {
            id: billing.userId,
            // In a real system, we would fetch customer details
            name: 'Customer',
            email: 'customer@example.com',
            address: '123 Main St, Anytown, USA'
          },
          items: billing.deployments.map(deployment => ({
            description: `${deployment.name} deployment charges`,
            unitPrice: deployment.cost,
            quantity: 1,
            amount: deployment.cost
          })),
          subtotal: billing.totalCost,
          tax: 0, // Simplified - in reality would calculate tax
          total: billing.totalCost,
          status: billing.status
        }
      });
    } catch (error) {
      logger.error('Error generating invoice:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate invoice'
      });
    }
  }

  /**
   * Process monthly billing for all users (admin only)
   * This would normally be run as a scheduled job
   */
  public async processMonthlyBilling(req: Request, res: Response): Promise<void> {
    try {
      // Run monthly billing process
      const count = await this.usageTrackingService.processMonthlyBilling();

      res.status(200).json({
        success: true,
        message: `Processed monthly billing for ${count} users`
      });
    } catch (error) {
      logger.error('Error processing monthly billing:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process monthly billing'
      });
    }
  }

  /**
   * Get usage statistics for all deployments (admin only)
   */
  public async getAllUsageStats(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      // Parse date range
      const start = startDate ? new Date(startDate as string) : new Date();
      start.setDate(start.getDate() - 30); // Default to last 30 days
      
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get aggregated usage statistics
      const pipeline: PipelineStage[] = [
        { $match: { date: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: '$requestCount' },
            totalInputTokens: { $sum: '$tokenCount.input' },
            totalOutputTokens: { $sum: '$tokenCount.output' },
            totalTokens: { $sum: '$tokenCount.total' },
            totalErrors: { $sum: '$errorCount' },
            totalComputeCost: { $sum: '$cost.compute' },
            totalTokenCost: { $sum: '$cost.tokens' },
            totalCost: { $sum: '$cost.total' },
            uniqueUsers: { $addToSet: '$userId' },
            uniqueDeployments: { $addToSet: '$deploymentId' }
          }
        },
        {
          $project: {
            _id: 0,
            totalRequests: 1,
            totalTokens: 1,
            totalErrors: 1,
            errorRate: { 
              $multiply: [
                { $divide: ['$totalErrors', '$totalRequests'] },
                100
              ]
            },
            totalCost: 1,
            userCount: { $size: '$uniqueUsers' },
            deploymentCount: { $size: '$uniqueDeployments' },
            avgCostPerRequest: { 
              $divide: ['$totalCost', '$totalRequests'] 
            },
            avgCostPerUser: { 
              $divide: ['$totalCost', { $size: '$uniqueUsers' }] 
            },
            tokenBreakdown: {
              input: '$totalInputTokens',
              output: '$totalOutputTokens',
              total: '$totalTokens'
            },
            costBreakdown: {
              compute: '$totalComputeCost',
              tokens: '$totalTokenCost',
              total: '$totalCost'
            }
          }
        }
      ];

      const stats = await DailyUsage.aggregate(pipeline);

      res.status(200).json({
        success: true,
        stats: stats[0] || {
          totalRequests: 0,
          totalTokens: 0,
          totalErrors: 0,
          errorRate: 0,
          totalCost: 0,
          userCount: 0,
          deploymentCount: 0,
          avgCostPerRequest: 0,
          avgCostPerUser: 0,
          tokenBreakdown: {
            input: 0,
            output: 0,
            total: 0
          },
          costBreakdown: {
            compute: 0,
            tokens: 0,
            total: 0
          }
        }
      });
    } catch (error) {
      logger.error('Error getting all usage stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get usage statistics'
      });
    }
  }

  /**
   * Get daily system-wide usage trends (admin only)
   */
  public async getSystemUsageTrends(req: Request, res: Response): Promise<void> {
    try {
      const { days } = req.query;
      const daysToFetch = parseInt(days as string) || 30;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToFetch);

      // Get daily aggregated usage
      const pipeline: PipelineStage[] = [
        { $match: { date: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            requestCount: { $sum: '$requestCount' },
            tokenCount: { $sum: '$tokenCount' },
            errorCount: { $sum: '$errorCount' },
            cost: { $sum: '$cost' },
            uniqueDeployments: { $addToSet: '$deploymentId' }
          }
        },
        { $project: { date: '$_id', requestCount: 1, tokenCount: 1, errorCount: 1, cost: 1, uniqueDeployments: 1, _id: 0 } },
        { $sort: { date: -1 as const } }
      ];

      const trends = await DailyUsage.aggregate(pipeline);

      res.status(200).json({
        success: true,
        count: trends.length,
        trends
      });
    } catch (error) {
      logger.error('Error getting system usage trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system usage trends'
      });
    }
  }

  /**
   * Get top users by usage (admin only)
   */
  public async getTopUsers(req: Request, res: Response): Promise<void> {
    try {
      const { limit, period } = req.query;
      const userLimit = parseInt(limit as string) || 10;
      
      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case 'day':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          // Default to 30 days
          startDate.setDate(startDate.getDate() - 30);
      }

      // Get top users by cost
      const userPipeline: PipelineStage[] = [
        { $match: { date: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: '$userId',
            userId: { $first: '$userId' },
            requestCount: { $sum: '$requestCount' },
            tokenCount: { $sum: '$tokenCount' },
            errorCount: { $sum: '$errorCount' },
            cost: { $sum: '$cost' }
          }
        },
        { $project: { userId: 1, requestCount: 1, tokenCount: 1, errorCount: 1, cost: 1, _id: 0 } },
        { $sort: { requestCount: -1 as const } },
        { $limit: 10 }
      ];

      const topUsers = await DailyUsage.aggregate(userPipeline);

      // In a real system, we would fetch user details like name and email
      // For now, just return the user IDs and stats

      res.status(200).json({
        success: true,
        count: topUsers.length,
        period: period || '30d',
        users: topUsers
      });
    } catch (error) {
      logger.error('Error getting top users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get top users'
      });
    }
  }

  /**
   * Get top deployments by usage (admin only)
   */
  public async getTopDeployments(req: Request, res: Response): Promise<void> {
    try {
      const { limit, period } = req.query;
      const deploymentLimit = parseInt(limit as string) || 10;
      
      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case 'day':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          // Default to 30 days
          startDate.setDate(startDate.getDate() - 30);
      }

      // Get top deployments by request count
      const costPipeline: PipelineStage[] = [
        { $match: { date: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: '$deploymentId',
            requestCount: { $sum: '$requestCount' },
            tokenCount: { $sum: '$tokenCount' },
            cost: { $sum: '$cost' },
            uniqueDeployments: { $addToSet: '$deploymentId' }
          }
        },
        { $project: { deploymentId: '$_id', requestCount: 1, tokenCount: 1, cost: 1, _id: 0 } },
        { $sort: { cost: -1 as const } },
        { $limit: 10 }
      ];

      const topDeployments = await DailyUsage.aggregate(costPipeline);

      // In a real system, we would fetch deployment details like name
      // For now, just return the deployment IDs and stats

      res.status(200).json({
        success: true,
        count: topDeployments.length,
        period: period || '30d',
        deployments: topDeployments
      });
    } catch (error) {
      logger.error('Error getting top deployments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get top deployments'
      });
    }
  }

  async getDailyUsage(startDate: Date, endDate: Date) {
    try {
      const pipeline: PipelineStage[] = [
        { $match: { date: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            requestCount: { $sum: '$requestCount' },
            tokenCount: { $sum: '$tokenCount' },
            errorCount: { $sum: '$errorCount' },
            cost: { $sum: '$cost' },
            uniqueDeployments: { $addToSet: '$deploymentId' }
          }
        },
        { $project: { date: '$_id', requestCount: 1, tokenCount: 1, errorCount: 1, cost: 1, uniqueDeployments: 1, _id: 0 } },
        { $sort: { date: -1 as const } }
      ];

      const dailyUsage = await DailyUsage.aggregate(pipeline);
      return dailyUsage;
    } catch (error) {
      logger.error('Error getting daily usage:', error);
      throw error;
    }
  }

  async trackUsage(req: Request, res: Response): Promise<void> {
    try {
      const { deploymentId, metrics } = req.body;

      if (!deploymentId || !metrics) {
        throw new ValidationError('Missing required fields');
      }

      const usage = await UsageModel.create({
        deploymentId,
        metrics,
        timestamp: new Date()
      });

      res.status(201).json(usage);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error tracking usage:', error);
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  async getUsage(req: Request, res: Response): Promise<void> {
    try {
      const usage = await UsageModel.findById(req.params.id);
      if (!usage) {
        throw new NotFoundError('Usage record not found');
      }
      res.json(usage);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error getting usage:', error);
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  async listUsage(req: Request, res: Response): Promise<void> {
    try {
      const { deploymentId, startDate, endDate } = req.query;
      const query: any = {};

      if (deploymentId) {
        query.deploymentId = deploymentId;
      }

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) {
          query.timestamp.$gte = new Date(startDate as string);
        }
        if (endDate) {
          query.timestamp.$lte = new Date(endDate as string);
        }
      }

      const usage = await UsageModel.find(query);
      res.json(usage);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error listing usage:', error);
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }
}
