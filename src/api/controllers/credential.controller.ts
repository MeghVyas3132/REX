import { Request, Response } from 'express';
import { credentialService, CredentialData } from '../../services/credential.service';
const logger = require('../../utils/logger');

export interface APIResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  timestamp: string;
}

export class CredentialController {
  /**
   * Create a new credential
   * POST /api/credentials
   */
  async createCredential(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: APIResponse = {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      const { name, type, service, data }: CredentialData = req.body;

      // Validate required fields
      if (!name || !type || !service || !data) {
        const response: APIResponse = {
          success: false,
          error: 'Name, type, service, and data are required',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Validate service types
      const validServices = ['openai', 'anthropic', 'google', 'slack', 'discord', 'email', 'webhook'];
      if (!validServices.includes(service)) {
        const response: APIResponse = {
          success: false,
          error: `Invalid service. Must be one of: ${validServices.join(', ')}`,
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Validate credential type
      const validTypes = ['api_key', 'oauth', 'basic_auth', 'bearer_token'];
      if (!validTypes.includes(type)) {
        const response: APIResponse = {
          success: false,
          error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const result = await credentialService.createCredential(req.user.id, {
        name,
        type,
        service,
        data
      });

      if (result.success) {
        const response: APIResponse = {
          success: true,
          data: {
            credential: result.credential
          },
          message: 'Credential created successfully',
          timestamp: new Date().toISOString()
        };
        res.status(201).json(response);
      } else {
        const response: APIResponse = {
          success: false,
          error: result.error || 'Operation failed',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
      }

    } catch (error: any) {
      logger.error('Create credential error:', error);
      const response: APIResponse = {
        success: false,
        error: 'Failed to create credential',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get all credentials for the authenticated user
   * GET /api/credentials
   */
  async getUserCredentials(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: APIResponse = {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      const result = await credentialService.getUserCredentials(req.user.id);

      if (result.success) {
        const response: APIResponse = {
          success: true,
          data: {
            credentials: result.credentials
          },
          timestamp: new Date().toISOString()
        };
        res.status(200).json(response);
      } else {
        const response: APIResponse = {
          success: false,
          error: result.error || 'Operation failed',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
      }

    } catch (error: any) {
      logger.error('Get user credentials error:', error);
      const response: APIResponse = {
        success: false,
        error: 'Failed to get credentials',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get a specific credential by ID
   * GET /api/credentials/:id
   */
  async getCredential(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: APIResponse = {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;

      if (!id) {
        const response: APIResponse = {
          success: false,
          error: 'Credential ID is required',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const result = await credentialService.getCredential(req.user.id, id);

      if (result.success) {
        const response: APIResponse = {
          success: true,
          data: {
            credential: result.credential
          },
          timestamp: new Date().toISOString()
        };
        res.status(200).json(response);
      } else {
        const response: APIResponse = {
          success: false,
          error: result.error || 'Operation failed',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
      }

    } catch (error: any) {
      logger.error('Get credential error:', error);
      const response: APIResponse = {
        success: false,
        error: 'Failed to get credential',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * Update a credential
   * PUT /api/credentials/:id
   */
  async updateCredential(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: APIResponse = {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;
      const updates = req.body;

      if (!id) {
        const response: APIResponse = {
          success: false,
          error: 'Credential ID is required',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const result = await credentialService.updateCredential(req.user.id, id, updates);

      if (result.success) {
        const response: APIResponse = {
          success: true,
          data: {
            credential: result.credential
          },
          message: 'Credential updated successfully',
          timestamp: new Date().toISOString()
        };
        res.status(200).json(response);
      } else {
        const response: APIResponse = {
          success: false,
          error: result.error || 'Operation failed',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
      }

    } catch (error: any) {
      logger.error('Update credential error:', error);
      const response: APIResponse = {
        success: false,
        error: 'Failed to update credential',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * Delete a credential
   * DELETE /api/credentials/:id
   */
  async deleteCredential(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: APIResponse = {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;

      if (!id) {
        const response: APIResponse = {
          success: false,
          error: 'Credential ID is required',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const result = await credentialService.deleteCredential(req.user.id, id);

      if (result.success) {
        const response: APIResponse = {
          success: true,
          message: 'Credential deleted successfully',
          timestamp: new Date().toISOString()
        };
        res.status(200).json(response);
      } else {
        const response: APIResponse = {
          success: false,
          error: result.error || 'Operation failed',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
      }

    } catch (error: any) {
      logger.error('Delete credential error:', error);
      const response: APIResponse = {
        success: false,
        error: 'Failed to delete credential',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get credentials by service
   * GET /api/credentials/service/:service
   */
  async getCredentialsByService(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: APIResponse = {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      const { service } = req.params;

      if (!service) {
        const response: APIResponse = {
          success: false,
          error: 'Service is required',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const result = await credentialService.getCredentialsByService(req.user.id, service);

      if (result.success) {
        const response: APIResponse = {
          success: true,
          data: {
            credentials: result.credentials
          },
          timestamp: new Date().toISOString()
        };
        res.status(200).json(response);
      } else {
        const response: APIResponse = {
          success: false,
          error: result.error || 'Operation failed',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
      }

    } catch (error: any) {
      logger.error('Get credentials by service error:', error);
      const response: APIResponse = {
        success: false,
        error: 'Failed to get credentials',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * Test a credential
   * POST /api/credentials/:id/test
   */
  async testCredential(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: APIResponse = {
          success: false,
          error: 'User not authenticated',
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;

      if (!id) {
        const response: APIResponse = {
          success: false,
          error: 'Credential ID is required',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const result = await credentialService.testCredential(req.user.id, id);

      if (result.success) {
        const response: APIResponse = {
          success: true,
          data: {
            valid: result.valid
          },
          message: result.valid ? 'Credential is valid' : 'Credential is invalid',
          timestamp: new Date().toISOString()
        };
        res.status(200).json(response);
      } else {
        const response: APIResponse = {
          success: false,
          error: result.error || 'Operation failed',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
      }

    } catch (error: any) {
      logger.error('Test credential error:', error);
      const response: APIResponse = {
        success: false,
        error: 'Failed to test credential',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }
}
