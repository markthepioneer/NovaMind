import { IDeployment } from '../models/deployment.schema';
import { DailyUsage, MonthlyBilling } from '../models/usage.schema';
import { logger } from '../utils/logger';

/**
 * Service for tracking agent usage and generating billing
 */
export class UsageTrackingService {
  /**
   * Record usage for a deployed agent
   */
  async recordUsage(
    deploymentId: string,
    userId: string,
    requestData: {
      inputTokens: number;
      outputTokens: number;
      latencyMs: number;
      isError: boolean;
    }
  ): Promise<void> {
    try {
      // Get today's date (UTC)
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      
      // Find or create usage record for today
      let dailyUsage = await DailyUsage.findOne({
        deploymentId,
        date: today
      });
      
      if (!dailyUsage) {
        dailyUsage = new DailyUsage({
          deploymentId,
          userId,
          date: today,
          requestCount: 0,
          tokenCount: {
            input: 0,
            output: 0,
            total: 0
          },
          latency: {
            avg: 0,
            min: Number.MAX_VALUE,
            max: 0,
            p95: 0,
            p99: 0
          },
          errorCount: 0,
          cost: {
            compute: 0,
            tokens: 0,
            total: 0
          }
        });
      }
      
      // Update request count
      dailyUsage.requestCount += 1;
      
      // Update token counts
      dailyUsage.tokenCount.input += requestData.inputTokens;
      dailyUsage.tokenCount.output += requestData.outputTokens;
      dailyUsage.tokenCount.total += requestData.inputTokens + requestData.outputTokens;
      
      // Update latency statistics
      const oldAvg = dailyUsage.latency.avg;
      const oldCount = dailyUsage.requestCount - 1;
      
      if (oldCount > 0) {
        dailyUsage.latency.avg = (oldAvg * oldCount + requestData.latencyMs) / dailyUsage.requestCount;
      } else {
        dailyUsage.latency.avg = requestData.latencyMs;
      }
      
      dailyUsage.latency.min = Math.min(dailyUsage.latency.min, requestData.latencyMs);
      dailyUsage.latency.max = Math.max(dailyUsage.latency.max, requestData.latencyMs);
      
      // For p95 and p99, we'd need to store all latencies in a separate collection
      // This is simplified for now
      
      // Update error count
      if (requestData.isError) {
        dailyUsage.errorCount += 1;
      }
      
      // Calculate costs
      const computeCost = this.calculateComputeCost(requestData.latencyMs);
      const tokenCost = this.calculateTokenCost(
        requestData.inputTokens,
        requestData.outputTokens
      );
      
      dailyUsage.cost.compute += computeCost;
      dailyUsage.cost.tokens += tokenCost;
      dailyUsage.cost.total += computeCost + tokenCost;
      
      // Save usage record
      await dailyUsage.save();
    } catch (error) {
      logger.error('Error recording usage:', error);
      // Don't throw to prevent API errors from affecting the user experience
    }
  }

  /**
   * Generate monthly billing report for a user
   */
  async generateMonthlyBilling(userId: string, year: number, month: number): Promise<MonthlyBilling> {
    try {
      // Check if billing has already been generated
      const existingBilling = await MonthlyBilling.findOne({
        userId,
        year,
        month
      });
      
      if (existingBilling) {
        return existingBilling;
      }
      
      // Get start and end dates for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of the month
      
      // Get all usage records for the user in this month
      const usageRecords = await DailyUsage.find({
        userId,
        date: {
          $gte: startDate,
          $lte: endDate
        }
      });
      
      // Group by deployment and calculate totals
      const deploymentCosts: Map<string, number> = new Map();
      let totalCost = 0;
      
      for (const record of usageRecords) {
        const deploymentId = record.deploymentId;
        const cost = record.cost.total;
        
        const currentCost = deploymentCosts.get(deploymentId) || 0;
        deploymentCosts.set(deploymentId, currentCost + cost);
        
        totalCost += cost;
      }
      
      // Get deployment names
      const deployments = await this.getDeploymentDetails(Array.from(deploymentCosts.keys()));
      
      // Create billing record
      const billing = new MonthlyBilling({
        userId,
        year,
        month,
        deployments: Array.from(deploymentCosts.entries()).map(([deploymentId, cost]) => ({
          deploymentId,
          name: deployments.get(deploymentId) || 'Unknown Deployment',
          cost
        })),
        totalCost,
        status: 'pending'
      });
      
      await billing.save();
      return billing;
    } catch (error) {
      logger.error('Error generating monthly billing:', error);
      throw error;
    }
  }

  /**
   * Get billing summary for a user
   */
  async getUserBillingSummary(userId: string): Promise<{
    currentMonth: {
      totalCost: number;
      projectedCost: number;
    };
    previousMonth: {
      totalCost: number;
    };
    mostExpensiveDeployments: {
      deploymentId: string;
      name: string;
      cost: number;
    }[];
  }> {
    try {
      // Get current month and previous month
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      let previousYear = currentYear;
      let previousMonth = currentMonth - 1;
      
      if (previousMonth === 0) {
        previousMonth = 12;
        previousYear -= 1;
      }
      
      // Get current month billing
      const currentMonthBilling = await this.getCurrentMonthUsage(userId, currentYear, currentMonth);
      
      // Get previous month billing
      const previousMonthBilling = await MonthlyBilling.findOne({
        userId,
        year: previousYear,
        month: previousMonth
      }) || { totalCost: 0 };
      
      // Calculate projected cost for current month
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const dayOfMonth = now.getDate();
      const projectedCost = (currentMonthBilling.totalCost / dayOfMonth) * daysInMonth;
      
      // Get most expensive deployments
      const deploymentCosts: Map<string, number> = new Map();
      
      for (const usage of currentMonthBilling.usageRecords) {
        const deploymentId = usage.deploymentId;
        const cost = usage.cost.total;
        
        const currentCost = deploymentCosts.get(deploymentId) || 0;
        deploymentCosts.set(deploymentId, currentCost + cost);
      }
      
      // Sort deployments by cost
      const sortedDeployments = Array.from(deploymentCosts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Top 5
      
      // Get deployment names
      const deployments = await this.getDeploymentDetails(sortedDeployments.map(([id]) => id));
      
      const mostExpensiveDeployments = sortedDeployments.map(([deploymentId, cost]) => ({
        deploymentId,
        name: deployments.get(deploymentId) || 'Unknown Deployment',
        cost
      }));
      
      return {
        currentMonth: {
          totalCost: currentMonthBilling.totalCost,
          projectedCost
        },
        previousMonth: {
          totalCost: previousMonthBilling.totalCost
        },
        mostExpensiveDeployments
      };
    } catch (error) {
      logger.error('Error getting user billing summary:', error);
      
      // Return default summary
      return {
        currentMonth: {
          totalCost: 0,
          projectedCost: 0
        },
        previousMonth: {
          totalCost: 0
        },
        mostExpensiveDeployments: []
      };
    }
  }

  /**
   * Get current month usage
   */
  private async getCurrentMonthUsage(
    userId: string,
    year: number,
    month: number
  ): Promise<{
    totalCost: number;
    usageRecords: any[];
  }> {
    // Get start and end dates for the month
    const startDate = new Date(year, month - 1, 1);
    const now = new Date();
    
    // Get all usage records for the user in this month up to now
    const usageRecords = await DailyUsage.find({
      userId,
      date: {
        $gte: startDate,
        $lte: now
      }
    });
    
    // Calculate total cost
    let totalCost = 0;
    
    for (const record of usageRecords) {
      totalCost += record.cost.total;
    }
    
    return { totalCost, usageRecords };
  }

  /**
   * Get deployment details by IDs
   */
  private async getDeploymentDetails(deploymentIds: string[]): Promise<Map<string, string>> {
    // This would normally fetch deployment details from the database
    // For now, we'll return a mock map
    const result = new Map<string, string>();
    
    // Fetch deployments from the database
    try {
      const Deployment = require('../models/deployment.schema').Deployment;
      const deployments = await Deployment.find({
        _id: { $in: deploymentIds }
      }, 'name');
      
      for (const deployment of deployments) {
        result.set(deployment._id.toString(), deployment.name);
      }
    } catch (error) {
      logger.error('Error fetching deployment details:', error);
    }
    
    // Fill in any missing deployments
    for (const id of deploymentIds) {
      if (!result.has(id)) {
        result.set(id, `Deployment ${id}`);
      }
    }
    
    return result;
  }

  /**
   * Calculate compute cost based on execution time
   */
  private calculateComputeCost(executionTimeMs: number): number {
    // Example compute pricing:
    // $0.00000008 per millisecond of execution time
    const computeRate = 0.00000008;
    return executionTimeMs * computeRate;
  }

  /**
   * Calculate token cost based on input and output tokens
   */
  private calculateTokenCost(inputTokens: number, outputTokens: number): number {
    // Example token pricing:
    // Input tokens: $0.0000015 per token
    // Output tokens: $0.000002 per token
    const inputRate = 0.0000015;
    const outputRate = 0.000002;
    
    return (inputTokens * inputRate) + (outputTokens * outputRate);
  }

  /**
   * Process monthly billing for all users
   * This would be run by a scheduled job at the end of each month
   */
  async processMonthlyBilling(): Promise<number> {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      // Calculate previous month
      let billingMonth = currentMonth - 1;
      let billingYear = currentYear;
      
      if (billingMonth === 0) {
        billingMonth = 12;
        billingYear -= 1;
      }
      
      // Get all users with usage in the billing month
      const startDate = new Date(billingYear, billingMonth - 1, 1);
      const endDate = new Date(billingYear, billingMonth, 0);
      
      const uniqueUserIds = await DailyUsage.distinct('userId', {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      });
      
      // Generate billing for each user
      let count = 0;
      
      for (const userId of uniqueUserIds) {
        await this.generateMonthlyBilling(userId, billingYear, billingMonth);
        count++;
      }
      
      return count;
    } catch (error) {
      logger.error('Error processing monthly billing:', error);
      throw error;
    }
  }

  /**
   * Get usage statistics for a deployment
   */
  async getDeploymentUsageStats(
    deploymentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRequests: number;
    totalTokens: number;
    averageLatency: number;
    errorRate: number;
    totalCost: number;
    dailyStats: {
      date: string;
      requests: number;
      tokens: number;
      cost: number;
    }[];
  }> {
    try {
      // Get usage records for the deployment in the date range
      const usageRecords = await DailyUsage.find({
        deploymentId,
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }).sort({ date: 1 });
      
      // Calculate totals
      let totalRequests = 0;
      let totalTokens = 0;
      let totalLatency = 0;
      let totalErrors = 0;
      let totalCost = 0;
      
      // Daily statistics
      const dailyStats: {
        date: string;
        requests: number;
        tokens: number;
        cost: number;
      }[] = [];
      
      for (const record of usageRecords) {
        totalRequests += record.requestCount;
        totalTokens += record.tokenCount.total;
        totalLatency += record.latency.avg * record.requestCount;
        totalErrors += record.errorCount;
        totalCost += record.cost.total;
        
        // Add daily stats
        dailyStats.push({
          date: record.date.toISOString().split('T')[0],
          requests: record.requestCount,
          tokens: record.tokenCount.total,
          cost: record.cost.total
        });
      }
      
      // Calculate averages
      const averageLatency = totalRequests > 0 ? totalLatency / totalRequests : 0;
      const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
      
      return {
        totalRequests,
        totalTokens,
        averageLatency,
        errorRate,
        totalCost,
        dailyStats
      };
    } catch (error) {
      logger.error('Error getting deployment usage stats:', error);
      
      // Return default stats
      return {
        totalRequests: 0,
        totalTokens: 0,
        averageLatency: 0,
        errorRate: 0,
        totalCost: 0,
        dailyStats: []
      };
    }
  }
}
