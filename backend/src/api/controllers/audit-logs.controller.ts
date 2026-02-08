import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { APIResponse } from '../../utils/types';
import { auditLogService } from '../../services/audit-logs.service';

export class AuditLogsController {
  /**
   * POST /api/audit-logs
   * Create new audit log entry
   */
  async createAuditLog(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const auditLog = await auditLogService.createAuditLog(req.body, userId);

      const response: APIResponse = {
        success: true,
        data: auditLog,
        timestamp: new Date().toISOString()
      };
      res.status(201).json(response);
    } catch (error: any) {
      logger.error('Error creating audit log:', error);
      const response: APIResponse = {
        success: false,
        error: error?.message || 'Failed to create audit log',
        timestamp: new Date().toISOString()
      };
      res.status(400).json(response);
    }
  }

  /**
   * POST /api/email-logs (alias for audit logs with email context)
   * Create email audit log entry
   */
  async createEmailLog(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      
      // Add email context to the log data
      const logData = {
        ...req.body,
        context: 'email',
        ...(req.body.status && { logType: req.body.status === 'failed' ? 'error' : 'success' })
      };

      const auditLog = await auditLogService.createAuditLog(logData, userId);

      const response: APIResponse = {
        success: true,
        data: auditLog,
        timestamp: new Date().toISOString()
      };
      res.status(201).json(response);
    } catch (error: any) {
      logger.error('Error creating email log:', error);
      const response: APIResponse = {
        success: false,
        error: error?.message || 'Failed to create email log',
        timestamp: new Date().toISOString()
      };
      res.status(400).json(response);
    }
  }

  /**
   * GET /api/audit-logs
   * List audit logs with pagination and filters
   */
  async listAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const type = req.query.type as string | undefined;
      const event = req.query.event as string | undefined;
      const workflowId = req.query.workflowId as string | undefined;

      const result = await auditLogService.listAuditLogs({
        userId,
        page,
        limit,
        type,
        event,
        workflowId
      });

      const response: APIResponse = {
        success: true,
        data: result.data,
        metadata: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        },
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error listing audit logs:', error);
      const response: APIResponse = {
        success: false,
        error: error?.message || 'Failed to list audit logs',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * GET /api/audit-logs/:id
   * Get audit log by ID
   */
  async getAuditLog(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const auditLog = await auditLogService.getAuditLog(id, userId);

      if (!auditLog) {
        const response: APIResponse = {
          success: false,
          error: 'Audit log not found',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }

      const response: APIResponse = {
        success: true,
        data: auditLog,
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error getting audit log:', error);
      const response: APIResponse = {
        success: false,
        error: error?.message || 'Failed to get audit log',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * DELETE /api/audit-logs/:id
   * Delete audit log (soft delete or permanent)
   */
  async deleteAuditLog(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const permanent = req.query.permanent === 'true';
      const deleted = await auditLogService.deleteAuditLog(id, userId, permanent);

      if (!deleted) {
        const response: APIResponse = {
          success: false,
          error: 'Audit log not found',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }

      const response: APIResponse = {
        success: true,
        data: { id, deleted: true, permanent },
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error deleting audit log:', error);
      const response: APIResponse = {
        success: false,
        error: error?.message || 'Failed to delete audit log',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }
}

