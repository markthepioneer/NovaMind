import axios from 'axios';
import { logger } from '../utils/logger';
import mcache from 'memory-cache';
import { RateLimitError } from '../utils/error-handling';

interface UsageData {
  inputTokens: number;
  outputTokens: number;
  processingTimeMs: number;
  isError: boolean;
}

interface UsageRecord {
  count: number;
  lastReset: number;
}

interface UsageLimit {
  maxRequests: number;
  windowMs: number;
}

/**
 * Service to track agent usage and send to deployment service
 */
export class UsageTracker {
  private apiUrl: string;
  private deploymentId: string;
  private batchSize: number;
  private batchInterval: number;
  private usageQueue: UsageData[];
  private timer: NodeJS.Timeout | null;
  private userAgentUsage: Map<string, Map<string, UsageRecord>>;
  private toolUsage: Map<string, Map<string, UsageRecord>>;
  private limits: {
    agent: UsageLimit;
    tool: UsageLimit;
  };
  
  constructor(limits?: {
    agent?: Partial<UsageLimit>;
    tool?: Partial<UsageLimit>;
  }) {
    this.apiUrl = process.env.API_BASE_URL || 'http://localhost:4000';
    this.deploymentId = process.env.DEPLOYMENT_ID || '';
    this.batchSize = parseInt(process.env.USAGE_BATCH_SIZE || '10');
    this.batchInterval = parseInt(process.env.USAGE_BATCH_INTERVAL || '60000'); // Default: 1 minute
    this.usageQueue = [];
    this.timer = null;
    this.userAgentUsage = new Map();
    this.toolUsage = new Map();
    this.limits = {
      agent: {
        maxRequests: limits?.agent?.maxRequests ?? 100,
        windowMs: limits?.agent?.windowMs ?? 60000 // 1 minute
      },
      tool: {
        maxRequests: limits?.tool?.maxRequests ?? 60,
        windowMs: limits?.tool?.windowMs ?? 60000 // 1 minute
      }
    };
    
    // Start the timer for sending batched usage data
    this.startTimer();
  }
  
  /**
   * Track usage for a request
   */
  public async trackUsage(data: UsageData): Promise<void> {
    // Add to queue
    this.usageQueue.push(data);
    
    // If queue has reached batch size, send immediately
    if (this.usageQueue.length >= this.batchSize) {
      this.sendBatchedUsage();
    }
  }
  
  /**
   * Start timer for sending batched usage data
   */
  private startTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    
    this.timer = setInterval(() => {
      if (this.usageQueue.length > 0) {
        this.sendBatchedUsage();
      }
    }, this.batchInterval);
  }
  
  /**
   * Send batched usage data to deployment service
   */
  private async sendBatchedUsage(): Promise<void> {
    if (!this.deploymentId) {
      logger.warn('Cannot send usage data: DEPLOYMENT_ID not set');
      return;
    }
    
    // Get batch of usage data
    const batch = [...this.usageQueue];
    this.usageQueue = [];
    
    if (batch.length === 0) {
      return;
    }
    
    try {
      // Calculate aggregated usage
      const aggregatedUsage = this.aggregateUsage(batch);
      
      // Check if we have a cached authorization token
      const apiKey = process.env.API_KEY || mcache.get('api_key');
      
      // Send to deployment service
      await axios.post(
        `${this.apiUrl}/api/deployments/${this.deploymentId}/record-usage`,
        aggregatedUsage,
        {
          headers: {
            'Authorization': apiKey ? `Bearer ${apiKey}` : undefined,
            'Content-Type': 'application/json'
          }
        }
      );
      
      logger.debug(`Sent usage data for ${batch.length} requests`);
    } catch (error) {
      logger.error('Error sending usage data:', error);
      
      // Put the batch back in the queue for retry
      this.usageQueue = [...batch, ...this.usageQueue];
      
      // Limit queue size to prevent memory issues
      if (this.usageQueue.length > 100) {
        this.usageQueue = this.usageQueue.slice(-100);
        logger.warn('Usage queue truncated to prevent memory issues');
      }
    }
  }
  
  /**
   * Aggregate usage data for batch sending
   */
  private aggregateUsage(batch: UsageData[]): {
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    isError: boolean;
  } {
    // Calculate totals
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalProcessingTime = 0;
    let hasErrors = false;
    
    for (const item of batch) {
      totalInputTokens += item.inputTokens;
      totalOutputTokens += item.outputTokens;
      totalProcessingTime += item.processingTimeMs;
      if (item.isError) {
        hasErrors = true;
      }
    }
    
    // Calculate average latency
    const avgLatency = batch.length > 0 ? totalProcessingTime / batch.length : 0;
    
    return {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      latencyMs: avgLatency,
      isError: hasErrors
    };
  }

  private getKey(userId: string, resourceId: string): string {
    return `${userId}:${resourceId}`;
  }

  private checkAndUpdateUsage(
    usageMap: Map<string, Map<string, UsageRecord>>,
    userId: string,
    resourceId: string,
    limit: UsageLimit
  ): void {
    const key = this.getKey(userId, resourceId);
    let userUsage = usageMap.get(userId);
    
    if (!userUsage) {
      userUsage = new Map();
      usageMap.set(userId, userUsage);
    }

    const now = Date.now();
    let record = userUsage.get(resourceId);

    if (!record || now - record.lastReset >= limit.windowMs) {
      record = { count: 0, lastReset: now };
    }

    if (record.count >= limit.maxRequests) {
      throw new RateLimitError(`Rate limit exceeded for ${resourceId}`);
    }

    record.count++;
    userUsage.set(resourceId, record);
  }

  trackAgentUsage(userId: string, agentId: string): void {
    this.checkAndUpdateUsage(
      this.userAgentUsage,
      userId,
      agentId,
      this.limits.agent
    );
  }

  trackToolUsage(userId: string, toolId: string): void {
    this.checkAndUpdateUsage(
      this.toolUsage,
      userId,
      toolId,
      this.limits.tool
    );
  }

  getUserAgentUsage(userId: string, agentId: string): number {
    const userUsage = this.userAgentUsage.get(userId);
    if (!userUsage) return 0;

    const record = userUsage.get(agentId);
    if (!record) return 0;

    const now = Date.now();
    if (now - record.lastReset >= this.limits.agent.windowMs) return 0;

    return record.count;
  }

  getUserToolUsage(userId: string, toolId: string): number {
    const userUsage = this.toolUsage.get(userId);
    if (!userUsage) return 0;

    const record = userUsage.get(toolId);
    if (!record) return 0;

    const now = Date.now();
    if (now - record.lastReset >= this.limits.tool.windowMs) return 0;

    return record.count;
  }

  resetUsage(userId: string): void {
    this.userAgentUsage.delete(userId);
    this.toolUsage.delete(userId);
  }

  getAgentLimit(): UsageLimit {
    return { ...this.limits.agent };
  }

  getToolLimit(): UsageLimit {
    return { ...this.limits.tool };
  }
}
