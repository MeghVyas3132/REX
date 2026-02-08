import { Request, Response } from 'express';
import { ExecutionService } from '../../services/execution.service';
import { logger } from "../../utils/logger";
import { APIResponse, PaginatedResponse } from '@rex/shared';

export class ExecutionController {
  private executionService: ExecutionService;

  constructor() {
    this.executionService = new ExecutionService();
  }

  async listExecutions(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId, userId, status, limit = 100, offset = 0 } = req.query;
      
      // If user is authenticated, automatically filter by their userId
      // This ensures users only see their own execution history
      const authenticatedUserId = (req as any).user?.id;
      const filterUserId = authenticatedUserId || (userId as string);
      
      const executions = await this.executionService.listExecutions({
        workflowId: workflowId as string,
        userId: filterUserId,
        status: status as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
      
      const response: PaginatedResponse<any> = {
        success: true,
        data: executions,
        pagination: {
          page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
          limit: parseInt(limit as string),
          total: executions.length,
          totalPages: Math.ceil(executions.length / parseInt(limit as string))
        },
        timestamp: new Date().toISOString()
      };
      
      res.json(response);
    } catch (error: any) {
      logger.error('Error listing executions:', error);
      const response: APIResponse = {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  async getExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const execution = await this.executionService.getExecution(id!);
      
      if (!execution) {
        const response: APIResponse = {
          success: false,
          error: 'Execution not found',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }
      
      // If user is authenticated, ensure they can only access their own executions
      const authenticatedUserId = (req as any).user?.id;
      if (authenticatedUserId && execution.userId && execution.userId !== authenticatedUserId) {
        const response: APIResponse = {
          success: false,
          error: 'Access denied',
          timestamp: new Date().toISOString()
        };
        res.status(403).json(response);
        return;
      }
      
      const response: APIResponse = {
        success: true,
        data: execution,
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error getting execution:', error);
      const response: APIResponse = {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  async retryExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.executionService.retryExecution(id!);
      
      const response: APIResponse = {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error retrying execution:', error);
      const response: APIResponse = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  async cancelExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.executionService.cancelExecution(id!);
      
      const response: APIResponse = {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error canceling execution:', error);
      const response: APIResponse = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  async getExecutionEvents(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit = 100, offset = 0 } = req.query;
      
      const events = await this.executionService.getExecutionEvents(
        id!,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      
      const response: PaginatedResponse<any> = {
        success: true,
        data: events,
        pagination: {
          page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
          limit: parseInt(limit as string),
          total: events.length,
          totalPages: Math.ceil(events.length / parseInt(limit as string))
        },
        timestamp: new Date().toISOString()
      };
      
      res.json(response);
    } catch (error: any) {
      logger.error('Error getting execution events:', error);
      const response: APIResponse = {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      // Get authenticated user ID
      const authenticatedUserId = (req as any).user?.id;
      
      if (!authenticatedUserId) {
        const response: APIResponse = {
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      const stats = await this.executionService.getExecutionStats(undefined, authenticatedUserId);
      
      const response: APIResponse = {
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      };
      
      res.json(response);
    } catch (error: any) {
      logger.error('Error getting user stats:', error);
      const response: APIResponse = {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }
}
