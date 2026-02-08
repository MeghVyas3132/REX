import { Request, Response, NextFunction } from 'express';
import { authService } from '../../services/auth.service';
const logger = require('../../utils/logger');

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    is_active: boolean;
  };
}

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
        is_active: boolean;
      };
    }
  }
}

/**
 * Authentication middleware - requires valid JWT token
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logger.warn('Authentication failed: missing token', {
        hasAuthHeader: !!authHeader,
        authHeaderPreview: authHeader ? `${authHeader.substring(0, 20)}...` : 'none'
      });
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    const result = await authService.verifyToken(token);
    
    if (!result.success || !result.user) {
      logger.warn('Authentication failed: token verification failed', {
        error: result.error,
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + '...'
      });
      return res.status(401).json({
        success: false,
        error: result.error || 'Invalid token',
        message: result.error === 'Token expired' 
          ? 'Your session has expired. Please log in again.'
          : result.error === 'Invalid token format'
          ? 'Authentication token format is invalid'
          : 'Authentication token is invalid or expired'
      });
    }

    // Add user to request object
    req.user = result.user;
    next();

  } catch (error: any) {
    logger.error('Authentication middleware error', {
      error: error.message,
      stack: error.stack
    });
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: 'Invalid authentication token'
    });
  }
};

/**
 * Optional authentication middleware - adds user if token is valid
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const result = await authService.verifyToken(token);
      if (result.success && result.user) {
        req.user = result.user;
      }
    }

    next();

  } catch (error: any) {
    // Continue without authentication for optional auth
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please authenticate first'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Admin-only middleware
 */
export const requireAdmin = requireRole('admin');

/**
 * User or Admin middleware
 */
export const requireUserOrAdmin = requireRole(['user', 'admin']);

/**
 * Check if user is active
 */
export const requireActiveUser = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please authenticate first'
    });
  }

  if (!req.user.is_active) {
    return res.status(403).json({
      success: false,
      error: 'Account deactivated',
      message: 'Your account has been deactivated. Please contact support.'
    });
  }

  next();
};

/**
 * Rate limiting middleware (basic implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetTime < windowStart) {
        rateLimitMap.delete(k);
      }
    }

    const current = rateLimitMap.get(key);
    
    if (!current) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (current.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${maxRequests} per ${windowMs / 1000} seconds`
      });
    }

    current.count++;
    next();
  };
};