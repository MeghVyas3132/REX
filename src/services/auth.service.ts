import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { db } from '../db/database';
const logger = require('../utils/logger');

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export class AuthService {
  private jwtSecret: string;
  private jwtExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await db.getUserByEmail(data.email);
      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists'
        };
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(data.password, saltRounds);

      // Create user (ensure name is provided to satisfy potential NOT NULL constraints)
      const user = await db.createUser(data.email, passwordHash, data.name || data.email);
      
      // Generate JWT token
      const token = this.generateToken(user.id);

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        name: data.name
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: data.name,
          role: user.role || 'user',
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_login_at: user.last_login_at
        },
        token
      };

    } catch (error: any) {
      logger.error('User registration failed', error);
      return {
        success: false,
        error: error.message || 'Registration failed'
      };
    }
  }

  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      // Get user by email
      const user = await db.getUserByEmail(credentials.email);
      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Check if user is active
      if (!user.is_active) {
        return {
          success: false,
          error: 'Account is deactivated'
        };
      }

      // Verify password (support legacy schema with either password_hash or password)
      const storedHash: string | undefined = (user as any).password_hash || (user as any).password;
      if (!storedHash) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }
      const isValidPassword = await bcrypt.compare(credentials.password, storedHash);
      if (!isValidPassword) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Update last login
      await db.updateUserLastLogin(user.id);

      // Generate JWT token
      const token = this.generateToken(user.id);

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_login_at: user.last_login_at
        },
        token
      };

    } catch (error: any) {
      logger.error('User login failed', error);
      return {
        success: false,
        error: error.message || 'Login failed'
      };
    }
  }

  /**
   * Verify JWT token and get user
   */
  async verifyToken(token: string): Promise<AuthResult> {
    try {
      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        logger.warn('Token verification failed: empty or invalid token format');
        return {
          success: false,
          error: 'Invalid token format'
        };
      }

      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      if (!decoded || !decoded.userId) {
        logger.warn('Token verification failed: missing userId in token');
        return {
          success: false,
          error: 'Invalid token payload'
        };
      }

      const user = await db.getUserById(decoded.userId);

      if (!user) {
        logger.warn('Token verification failed: user not found', { userId: decoded.userId });
        return {
          success: false,
          error: 'User not found'
        };
      }

      if (!user.is_active) {
        logger.warn('Token verification failed: account deactivated', { userId: user.id });
        return {
          success: false,
          error: 'Account is deactivated'
        };
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_login_at: user.last_login_at
        }
      };

    } catch (error: any) {
      // Log detailed error for debugging
      const errorMessage = error.message || 'Unknown error';
      const errorName = error.name || 'Unknown';
      logger.error('Token verification failed', {
        error: errorMessage,
        name: errorName,
        tokenLength: token?.length || 0,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'empty'
      });
      
      // Provide more specific error messages
      if (errorName === 'JsonWebTokenError') {
        return {
          success: false,
          error: 'Invalid token format'
        };
      } else if (errorName === 'TokenExpiredError') {
        return {
          success: false,
          error: 'Token expired'
        };
      } else if (errorName === 'NotBeforeError') {
        return {
          success: false,
          error: 'Token not yet valid'
        };
      }
      
      return {
        success: false,
        error: `Invalid token: ${errorMessage}`
      };
    }
  }

  /**
   * Generate JWT token
   */
  generateToken(userId: string): string {
    return jwt.sign(
      { userId, iat: Math.floor(Date.now() / 1000) },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn } as jwt.SignOptions
    );
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await db.getUserById(userId);
      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login_at: user.last_login_at
      };
    } catch (error: any) {
      logger.error('Failed to get user by ID', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<AuthResult> {
    try {
      const user = await db.updateUser(userId, updates);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      return {
        success: true,
        user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_login_at: user.last_login_at
        }
      };
    } catch (error: any) {
      logger.error('Failed to update user', error);
      return {
        success: false,
        error: error.message || 'Update failed'
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<AuthResult> {
    try {
      const user = await db.getUserById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Verify current password (support legacy schema with either password_hash or password)
      const storedHash: string | undefined = (user as any).password_hash || (user as any).password;
      if (!storedHash) {
        return {
          success: false,
          error: 'Current password is incorrect'
        };
      }
      const isValidPassword = await bcrypt.compare(currentPassword, storedHash);
      if (!isValidPassword) {
    return {
          success: false,
          error: 'Current password is incorrect'
        };
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await db.updateUserPassword(userId, newPasswordHash);

      logger.info('Password changed successfully', { userId });

      return {
        success: true
      };

    } catch (error: any) {
      logger.error('Failed to change password', error);
      return {
        success: false,
        error: error.message || 'Password change failed'
      };
    }
  }
}

export const authService = new AuthService();