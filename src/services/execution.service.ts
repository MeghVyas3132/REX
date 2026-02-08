import { prisma } from '../db/prisma';
import { WorkflowRun } from '../utils/types';
import { logger } from "../utils/logger";
import { NotFoundError } from '../utils/error-handler';

export interface ExecutionFilters {
  workflowId?: string;
  userId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export class ExecutionService {
  async listExecutions(filters: ExecutionFilters): Promise<WorkflowRun[]> {
    try {
      const where: any = {};
      
      if (filters.workflowId) {
        where.workflowId = filters.workflowId;
      }
      
      // If userId is provided, filter by it; otherwise show all (for admin/debugging)
      // But if userId is explicitly null/undefined and we want user-specific, we can handle it
      if (filters.userId !== undefined && filters.userId !== null) {
        where.userId = filters.userId;
      }
      
      if (filters.status) {
        where.status = filters.status;
      }

      const executions = await prisma.workflowRun.findMany({
        where,
        include: {
          workflow: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0
      });

      // Map to include workflow name
      return executions.map((exec: any) => ({
        ...exec,
        workflowName: exec.workflow?.name
      })) as WorkflowRun[];
    } catch (error: any) {
      logger.error('Error listing executions:', error);
      throw error;
    }
  }

  async getExecution(executionId: string): Promise<WorkflowRun | null> {
    try {
      const execution = await prisma.workflowRun.findUnique({
        where: { id: executionId }
      });

      return (execution as unknown) as WorkflowRun;
    } catch (error: any) {
      logger.error('Error getting execution:', error);
      throw error;
    }
  }

  async retryExecution(executionId: string): Promise<any> {
    try {
      const execution = await this.getExecution(executionId);
      if (!execution) {
        throw new NotFoundError('Execution not found');
      }

      if (execution.status === 'running') {
        throw new Error('Execution is already running');
      }

      // Create a new execution based on the original
      const newExecution = await prisma.workflowRun.create({
        data: {
          id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          workflowId: execution.workflowId,
          status: 'running',
          input: execution.input,
          runOptions: (execution.runOptions as any),
          userId: execution.userId,
          startedAt: new Date()
        }
      });

      logger.info('Execution retry created', {
        originalExecutionId: executionId,
        newExecutionId: newExecution.id,
        workflowId: execution.workflowId
      });

      // Here you would trigger the actual workflow execution
      // This would typically involve adding a job to the queue

      return {
        executionId: newExecution.id,
        status: 'retry_initiated',
        message: 'Execution retry has been initiated'
      };

    } catch (error: any) {
      logger.error('Error retrying execution:', error);
      throw error;
    }
  }

  async cancelExecution(executionId: string): Promise<any> {
    try {
      const execution = await this.getExecution(executionId);
      if (!execution) {
        throw new NotFoundError('Execution not found');
      }

      if (execution.status !== 'running') {
        throw new Error('Only running executions can be cancelled');
      }

      // Update execution status to cancelled
      await prisma.workflowRun.update({
        where: { id: executionId },
        data: {
          status: 'cancelled',
          completedAt: new Date()
        }
      });

      logger.info('Execution cancelled', {
        executionId,
        workflowId: execution.workflowId
      });

      return {
        executionId,
        status: 'cancelled',
        message: 'Execution has been cancelled'
      };

    } catch (error: any) {
      logger.error('Error cancelling execution:', error);
      throw error;
    }
  }

  async getExecutionEvents(
    executionId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const events = await prisma.workflowRunEvent.findMany({
        where: { runId: executionId },
        orderBy: { ts: 'desc' },
        take: limit,
        skip: offset
      });

      return events;
    } catch (error: any) {
      logger.error('Error getting execution events:', error);
      throw error;
    }
  }

  async createExecutionEvent(
    executionId: string,
    eventType: string,
    nodeId: string | null,
    payload: any
  ): Promise<void> {
    try {
      await prisma.workflowRunEvent.create({
        data: {
          runId: executionId,
          eventType,
          nodeId,
          payload,
          ts: Date.now()
        }
      });

      logger.debug('Execution event created', {
        executionId,
        eventType,
        nodeId
      });
    } catch (error: any) {
      logger.error('Error creating execution event:', error);
      throw error;
    }
  }

  async getExecutionStats(workflowId?: string, userId?: string): Promise<any> {
    try {
      const where: any = {};
      
      if (workflowId) {
        where.workflowId = workflowId;
      }
      
      if (userId) {
        where.userId = userId;
      }

      const stats = await prisma.workflowRun.groupBy({
        by: ['status'],
        where,
        _count: {
          status: true
        }
      });

      const totalExecutions = await prisma.workflowRun.count({ where });
      
      const avgDuration = await prisma.workflowRun.aggregate({
        where: {
          ...where,
          duration: { not: null }
        },
        _avg: {
          duration: true
        }
      });

      return {
        totalExecutions,
        statusBreakdown: stats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.status;
          return acc;
        }, {} as Record<string, number>),
        averageDuration: avgDuration._avg.duration || 0
      };

    } catch (error: any) {
      logger.error('Error getting execution stats:', error);
      throw error;
    }
  }
}
