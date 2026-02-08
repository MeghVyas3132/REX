import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { APIResponse } from '@rex/shared';
import { emailDataService } from '../../services/email-data.service';

export class EmailDataController {
  /**
   * GET /api/email-data
   * Get email data by eventId
   * Query params: eventId (required)
   */
  async getEmailData(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.query;

      if (!eventId || typeof eventId !== 'string') {
        const response: APIResponse = {
          success: false,
          error: 'eventId query parameter is required',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const emailData = await emailDataService.getEmailDataByEventId(eventId);

      if (!emailData) {
        const response: APIResponse = {
          success: false,
          error: 'Email data not found for the given eventId',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }

      const response: APIResponse = {
        success: true,
        data: emailData,
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error getting email data:', error);
      const response: APIResponse = {
        success: false,
        error: error?.message || 'Failed to get email data',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * POST /api/email-data
   * Create new email data entry
   */
  async createEmailData(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const emailData = await emailDataService.createEmailData(req.body, userId);

      const response: APIResponse = {
        success: true,
        data: emailData,
        timestamp: new Date().toISOString()
      };
      res.status(201).json(response);
    } catch (error: any) {
      logger.error('Error creating email data:', error);
      const response: APIResponse = {
        success: false,
        error: error?.message || 'Failed to create email data',
        timestamp: new Date().toISOString()
      };
      res.status(400).json(response);
    }
  }

  /**
   * PUT /api/email-data/:id
   * Update email data entry
   */
  async updateEmailData(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const emailData = await emailDataService.updateEmailData(id, req.body, userId);

      if (!emailData) {
        const response: APIResponse = {
          success: false,
          error: 'Email data not found',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }

      const response: APIResponse = {
        success: true,
        data: emailData,
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error updating email data:', error);
      const response: APIResponse = {
        success: false,
        error: error?.message || 'Failed to update email data',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * GET /api/email-data
   * List email data entries with pagination
   */
  async listEmailData(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const eventId = req.query.eventId as string | undefined;

      const result = await emailDataService.listEmailData({
        userId,
        page,
        limit,
        eventId
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
      logger.error('Error listing email data:', error);
      const response: APIResponse = {
        success: false,
        error: error?.message || 'Failed to list email data',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * DELETE /api/email-data/:id
   * Delete email data entry
   */
  async deleteEmailData(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const deleted = await emailDataService.deleteEmailData(id, userId);

      if (!deleted) {
        const response: APIResponse = {
          success: false,
          error: 'Email data not found',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }

      const response: APIResponse = {
        success: true,
        data: { id, deleted: true },
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error deleting email data:', error);
      const response: APIResponse = {
        success: false,
        error: error?.message || 'Failed to delete email data',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }
}

