import { Request, Response } from 'express';
import { authService, RegisterData, LoginCredentials } from '../../services/auth.service';
const logger = require('../../utils/logger');

export interface APIResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  timestamp: string;
}

export class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name }: RegisterData = req.body;

      // Validate required fields
      if (!email || !password) {
        const response: APIResponse = {
          success: false,
          error: 'Email and password are required',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        const response: APIResponse = {
          success: false,
          error: 'Invalid email format',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Validate password strength
      if (password.length < 8) {
        const response: APIResponse = {
          success: false,
          error: 'Password must be at least 8 characters long',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const result = await authService.register({ email, password, name });

      if (result.success) {
        const response: APIResponse = {
          success: true,
          data: {
            user: result.user,
            token: result.token
          },
          message: 'User registered successfully',
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
      logger.error('Registration error:', error);
      const response: APIResponse = {
        success: false,
        error: 'Registration failed',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginCredentials = req.body;

      // Validate required fields
      if (!email || !password) {
        const response: APIResponse = {
          success: false,
          error: 'Email and password are required',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const result = await authService.login({ email, password });

      if (result.success) {
        const response: APIResponse = {
          success: true,
          data: {
            user: result.user,
            token: result.token
          },
          message: 'Login successful',
          timestamp: new Date().toISOString()
        };
        res.status(200).json(response);
      } else {
        const response: APIResponse = {
          success: false,
          error: result.error || 'Operation failed',
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
      }

    } catch (error: any) {
      logger.error('Login error:', error);
      const response: APIResponse = {
        success: false,
        error: 'Login failed',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
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

      const response: APIResponse = {
        success: true,
        data: {
          user: req.user
        },
        timestamp: new Date().toISOString()
      };
      res.status(200).json(response);

    } catch (error: any) {
      logger.error('Get profile error:', error);
      const response: APIResponse = {
        success: false,
        error: 'Failed to get profile',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
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

      const { name, email } = req.body;
      const updates: any = {};

      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;

      const result = await authService.updateUser(req.user.id, updates);

      if (result.success) {
        const response: APIResponse = {
          success: true,
          data: {
            user: result.user
          },
          message: 'Profile updated successfully',
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
      logger.error('Update profile error:', error);
      const response: APIResponse = {
        success: false,
        error: 'Failed to update profile',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * Change password
   * POST /api/auth/change-password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
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

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        const response: APIResponse = {
          success: false,
          error: 'Current password and new password are required',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      if (newPassword.length < 8) {
        const response: APIResponse = {
          success: false,
          error: 'New password must be at least 8 characters long',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const result = await authService.changePassword(req.user.id, currentPassword, newPassword);

      if (result.success) {
        const response: APIResponse = {
          success: true,
          message: 'Password changed successfully',
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
      logger.error('Change password error:', error);
      const response: APIResponse = {
        success: false,
        error: 'Failed to change password',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * Logout user (client-side token removal)
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      // For JWT tokens, logout is handled client-side by removing the token
      // Server-side logout would require token blacklisting (not implemented here)
      
      const response: APIResponse = {
        success: true,
        message: 'Logout successful. Please remove the token from client storage.',
        timestamp: new Date().toISOString()
      };
      res.status(200).json(response);

    } catch (error: any) {
      logger.error('Logout error:', error);
      const response: APIResponse = {
        success: false,
        error: 'Logout failed',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * Refresh JWT token
   * POST /api/auth/refresh
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        const response: APIResponse = {
          success: false,
          error: 'Refresh token is required',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Verify refresh token (in a real implementation, you'd validate against stored refresh tokens)
      // For now, we'll verify it as a JWT token
      const result = await authService.verifyToken(refreshToken);
      
      if (!result.success || !result.user) {
        const response: APIResponse = {
          success: false,
          error: 'Invalid or expired refresh token',
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      // Generate new access token
      const newToken = await authService.generateToken(result.user.id);
      
      // Optionally generate new refresh token (for token rotation)
      const newRefreshToken = await authService.generateToken(result.user.id);

      const response: APIResponse = {
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
          user: result.user
        },
        message: 'Token refreshed successfully',
        timestamp: new Date().toISOString()
      };
      res.status(200).json(response);

    } catch (error: any) {
      logger.error('Refresh token error:', error);
      const response: APIResponse = {
        success: false,
        error: 'Token refresh failed',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }
}