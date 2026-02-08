import { Request, Response } from 'express';
import { CredentialsService } from '../../services/credentials.service';
import { logger } from "../../utils/logger";
import { APIResponse, PaginatedResponse } from '@rex/shared';

export class CredentialsController {
  private credentialsService: CredentialsService;

  constructor() {
    this.credentialsService = new CredentialsService();
  }

  async listCredentials(req: Request, res: Response): Promise<void> {
    try {
      const { type, limit = 100, offset = 0 } = req.query;
      const userId = (req as any).user?.id;
      
      const credentials = await this.credentialsService.listCredentials(
        userId,
        type as string,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      
      const response: PaginatedResponse<any> = {
        success: true,
        data: credentials,
        pagination: {
          page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
          limit: parseInt(limit as string),
          total: credentials.length,
          totalPages: Math.ceil(credentials.length / parseInt(limit as string))
        },
        timestamp: new Date().toISOString()
      };
      
      res.json(response);
    } catch (error: any) {
      logger.error('Error listing credentials:', error);
      const response: APIResponse = {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  async getCredential(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      
      const credential = await this.credentialsService.getCredential(id!, userId!);
      
      if (!credential) {
        const response: APIResponse = {
          success: false,
          error: 'Credential not found',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }
      
      const response: APIResponse = {
        success: true,
        data: credential,
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error getting credential:', error);
      const response: APIResponse = {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  async createCredential(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const credentialData = { ...req.body, userId };
      
      const credential = await this.credentialsService.createCredential(credentialData);
      
      const response: APIResponse = {
        success: true,
        data: credential,
        timestamp: new Date().toISOString()
      };
      res.status(201).json(response);
    } catch (error: any) {
      logger.error('Error creating credential:', error);
      const response: APIResponse = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(400).json(response);
    }
  }

  async updateCredential(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      
      const credential = await this.credentialsService.updateCredential(id!, req.body, userId!);
      
      if (!credential) {
        const response: APIResponse = {
          success: false,
          error: 'Credential not found',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }
      
      const response: APIResponse = {
        success: true,
        data: credential,
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error updating credential:', error);
      const response: APIResponse = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(400).json(response);
    }
  }

  async deleteCredential(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      
      const deleted = await this.credentialsService.deleteCredential(id!, userId!);
      
      if (!deleted) {
        const response: APIResponse = {
          success: false,
          error: 'Credential not found',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }
      
      const response: APIResponse = {
        success: true,
        data: { deleted: true },
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error deleting credential:', error);
      const response: APIResponse = {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  async testCredential(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      
      const result = await this.credentialsService.testCredential(id!, userId!);
      
      const response: APIResponse = {
        success: true,
        data: { testResult: result },
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error testing credential:', error);
      const response: APIResponse = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }
}
