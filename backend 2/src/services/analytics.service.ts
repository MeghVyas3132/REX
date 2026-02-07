import { PrismaClient } from '@prisma/client';
import { logger } from "../utils/logger";

export class AnalyticsService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // Track a metric
  async trackMetric(data: {
    type: 'workflow' | 'agent' | 'node';
    entityId: string;
    metric: string;
    value: number;
    metadata?: any;
    userId: string;
  }) {
    try {
      const analytics = await this.prisma.analytics.create({
        data: {
          type: data.type,
          entityId: data.entityId,
          metric: data.metric,
          value: data.value,
          metadata: data.metadata || {},
          userId: data.userId,
        },
      });

      logger.info(`Tracked metric: ${data.metric} for ${data.type}:${data.entityId}`);
      return analytics;
    } catch (error) {
      logger.error('Error tracking metric:', error as Error);
      throw error;
    }
  }

  // Get analytics for a specific entity
  async getEntityAnalytics(entityId: string, type: string, userId: string) {
    try {
      const analytics = await this.prisma.analytics.findMany({
        where: {
          entityId,
          type,
          userId,
        },
        orderBy: { createdAt: 'desc' },
      });

      return analytics;
    } catch (error) {
      logger.error('Error fetching entity analytics:', error as Error);
      throw error;
    }
  }

  // Get user's workflow analytics
  async getWorkflowAnalytics(userId: string, workflowId?: string) {
    try {
      const where: any = {
        type: 'workflow',
        userId,
      };

      if (workflowId) {
        where.entityId = workflowId;
      }

      const analytics = await this.prisma.analytics.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      // Group by metric type
      const grouped = analytics.reduce((acc: any, item: any) => {
        if (!acc[item.metric]) {
          acc[item.metric] = [];
        }
        acc[item.metric].push(item);
        return acc;
      }, {} as Record<string, any[]>);

      return grouped;
    } catch (error) {
      logger.error('Error fetching workflow analytics:', error as Error);
      throw error;
    }
  }

  // Get dashboard stats
  async getDashboardStats(userId: string) {
    try {
      // Use findMany instead of groupBy since it's not available in simple Prisma
      const allStats = await this.prisma.analytics.findMany({
        where: {
          userId,
        },
      });
      
      // Group manually
      const stats = allStats.reduce((acc: any, item: any) => {
        if (!acc[item.metric]) {
          acc[item.metric] = { count: 0, sum: 0 };
        }
        acc[item.metric].count++;
        acc[item.metric].sum += item.value || 0;
        return acc;
      }, {});

      return stats;
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error as Error);
      throw error;
    }
  }

  // Track workflow run
  async trackWorkflowRun(workflowId: string, userId: string, success: boolean, duration: number) {
    try {
      await Promise.all([
        this.trackMetric({
          type: 'workflow',
          entityId: workflowId,
          metric: 'runs',
          value: 1,
          userId,
        }),
        this.trackMetric({
          type: 'workflow',
          entityId: workflowId,
          metric: success ? 'successful_runs' : 'failed_runs',
          value: 1,
          userId,
        }),
        this.trackMetric({
          type: 'workflow',
          entityId: workflowId,
          metric: 'avg_duration',
          value: duration,
          userId,
        }),
      ]);

      logger.info(`Tracked workflow run: ${workflowId}, success: ${success}, duration: ${duration}ms`);
    } catch (error) {
      logger.error('Error tracking workflow run:', error as Error);
      throw error;
    }
  }

  // Track agent run
  async trackAgentRun(agentId: string, userId: string, success: boolean, duration: number) {
    try {
      await Promise.all([
        this.trackMetric({
          type: 'agent',
          entityId: agentId,
          metric: 'runs',
          value: 1,
          userId,
        }),
        this.trackMetric({
          type: 'agent',
          entityId: agentId,
          metric: success ? 'successful_runs' : 'failed_runs',
          value: 1,
          userId,
        }),
        this.trackMetric({
          type: 'agent',
          entityId: agentId,
          metric: 'avg_duration',
          value: duration,
          userId,
        }),
      ]);

      logger.info(`Tracked agent run: ${agentId}, success: ${success}, duration: ${duration}ms`);
    } catch (error) {
      logger.error('Error tracking agent run:', error as Error);
      throw error;
    }
  }
}
