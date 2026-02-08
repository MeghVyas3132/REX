import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/error-handler';

export interface AuditLog {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  event: string;
  workflowId?: string;
  runId?: string;
  nodeId?: string;
  userId?: string;
  data?: any;
  metadata?: any;
  timestamp: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateAuditLogInput {
  type?: 'success' | 'error' | 'info' | 'warning';
  event: string;
  workflowId?: string;
  runId?: string;
  nodeId?: string;
  data?: any;
  metadata?: any;
  timestamp?: Date;
  context?: string; // For email-logs alias
  logType?: 'success' | 'error' | 'info' | 'warning'; // Alternative field name
}

export interface ListAuditLogsOptions {
  userId?: string;
  page?: number;
  limit?: number;
  type?: string;
  event?: string;
  workflowId?: string;
}

class AuditLogsService {
  /**
   * Create new audit log entry
   */
  async createAuditLog(
    data: CreateAuditLogInput,
    userId?: string
  ): Promise<AuditLog> {
    try {
      // Use logType if type is not provided (for email-logs compatibility)
      const logType = data.type || data.logType || 'info';

      // Validate event
      if (!data.event) {
        throw new ValidationError('Event is required');
      }

      const auditLog = await prisma.auditLog.create({
        data: {
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: logType,
          event: data.event,
          workflowId: data.workflowId,
          runId: data.runId,
          nodeId: data.nodeId,
          userId: userId,
          data: data.data || {},
          metadata: data.metadata || {},
          timestamp: data.timestamp || new Date()
        }
      });

      logger.info('Audit log created', {
        auditLogId: auditLog.id,
        event: auditLog.event,
        type: auditLog.type
      });

      return auditLog as AuditLog;
    } catch (error: any) {
      logger.error('Error creating audit log:', error);
      throw error;
    }
  }

  /**
   * Get audit log by ID
   */
  async getAuditLog(id: string, userId?: string): Promise<AuditLog | null> {
    try {
      const where: any = { id };
      if (userId) {
        where.userId = userId;
      }

      const auditLog = await prisma.auditLog.findFirst({
        where
      });

      return auditLog as AuditLog | null;
    } catch (error: any) {
      logger.error('Error getting audit log:', error);
      throw error;
    }
  }

  /**
   * List audit logs with pagination and filters
   */
  async listAuditLogs(options: ListAuditLogsOptions): Promise<{
    data: AuditLog[];
    total: number;
  }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (options.userId) {
        where.userId = options.userId;
      }
      if (options.type) {
        where.type = options.type;
      }
      if (options.event) {
        where.event = options.event;
      }
      if (options.workflowId) {
        where.workflowId = options.workflowId;
      }

      const [data, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { timestamp: 'desc' }
        }),
        prisma.auditLog.count({ where })
      ]);

      return {
        data: data as AuditLog[],
        total
      };
    } catch (error: any) {
      logger.error('Error listing audit logs:', error);
      throw error;
    }
  }

  /**
   * Delete audit log (soft delete or permanent)
   */
  async deleteAuditLog(
    id: string,
    userId?: string,
    permanent: boolean = false
  ): Promise<boolean> {
    try {
      const where: any = { id };
      if (userId) {
        where.userId = userId;
      }

      const existing = await prisma.auditLog.findFirst({ where });

      if (!existing) {
        return false;
      }

      if (permanent) {
        // Permanent delete
        await prisma.auditLog.delete({
          where: { id }
        });
      } else {
        // Soft delete - update metadata
        await prisma.auditLog.update({
          where: { id },
          data: {
            metadata: {
              ...(existing.metadata as any || {}),
              deleted: true,
              deletedAt: new Date().toISOString()
            }
          }
        });
      }

      logger.info('Audit log deleted', { auditLogId: id, permanent });
      return true;
    } catch (error: any) {
      logger.error('Error deleting audit log:', error);
      throw error;
    }
  }
}

export const auditLogService = new AuditLogsService();

