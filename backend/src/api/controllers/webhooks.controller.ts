import { Request, Response } from 'express';
import { webhookManager } from '../../core/webhooks/webhook-manager';
import { logger } from "../../utils/logger";
import { APIResponse, PaginatedResponse } from '../../utils/types';

export class WebhookController {
  async listWebhooks(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId, userId, limit = 100, offset = 0 } = req.query;
      
      const webhooks = await webhookManager.listWebhooks(
        workflowId as string,
        userId as string
      );
      
      const response: PaginatedResponse<any> = {
        success: true,
        data: webhooks,
        pagination: {
          page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
          limit: parseInt(limit as string),
          total: webhooks.length,
          totalPages: Math.ceil(webhooks.length / parseInt(limit as string))
        },
        timestamp: new Date().toISOString()
      };
      
      res.json(response);
    } catch (error: any) {
      logger.error('Error listing webhooks:', error);
      const response: APIResponse = {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  async getWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const webhook = await webhookManager.getWebhook(id!);
      
      if (!webhook) {
        const response: APIResponse = {
          success: false,
          error: 'Webhook not found',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }
      
      const response: APIResponse = {
        success: true,
        data: webhook,
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error getting webhook:', error);
      const response: APIResponse = {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  async createWebhook(req: Request, res: Response): Promise<void> {
    try {
      const webhook = await webhookManager.createWebhook(req.body);
      
      const response: APIResponse = {
        success: true,
        data: webhook,
        timestamp: new Date().toISOString()
      };
      res.status(201).json(response);
    } catch (error: any) {
      logger.error('Error creating webhook:', error);
      const response: APIResponse = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(400).json(response);
    }
  }

  async updateWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const webhook = await webhookManager.updateWebhook(id!, req.body);
      
      const response: APIResponse = {
        success: true,
        data: webhook,
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error updating webhook:', error);
      const response: APIResponse = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(400).json(response);
    }
  }

  async deleteWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await webhookManager.deleteWebhook(id!);
      
      const response: APIResponse = {
        success: true,
        data: { deleted: true },
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error deleting webhook:', error);
      const response: APIResponse = {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  async testWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { payload = {} } = req.body;
      
      const result = await webhookManager.testWebhook(id!, payload);
      
      const response: APIResponse = {
        success: true,
        data: { testResult: result },
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error testing webhook:', error);
      const response: APIResponse = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  async getWebhookEvents(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit = 100, offset = 0 } = req.query;
      
      const events = await webhookManager.getWebhookEvents(
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
      logger.error('Error getting webhook events:', error);
      const response: APIResponse = {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  async triggerWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const payload = req.body;
      const headers = req.headers as Record<string, string>;
      
      await webhookManager.processWebhook(id!, payload, headers);
      
      const response: APIResponse = {
        success: true,
        data: { processed: true },
        timestamp: new Date().toISOString()
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Error processing webhook:', error);
      const response: APIResponse = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }
}
