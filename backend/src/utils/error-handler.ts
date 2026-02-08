import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { APIResponse } from './types';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public readonly errors: ValidationError[];

  constructor(message: string, errors: ValidationError[] = []) {
    super(message, 400, true, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, true, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, true, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, true, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, true, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, true, 'RATE_LIMIT');
  }
}

export class ExternalServiceError extends AppError {
  public readonly service: string;
  public readonly operation: string;

  constructor(service: string, operation: string, message: string) {
    super(`External service error: ${message}`, 502, true, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
    this.operation = operation;
  }
}

export class WorkflowExecutionError extends AppError {
  public readonly workflowId: string;
  public readonly runId: string;
  public readonly nodeId?: string;

  constructor(workflowId: string, runId: string, message: string, nodeId?: string) {
    super(`Workflow execution error: ${message}`, 500, true, 'WORKFLOW_EXECUTION_ERROR');
    this.workflowId = workflowId;
    this.runId = runId;
    this.nodeId = nodeId;
  }
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    logger.error('Unhandled error', error, {
      url: req.url,
      method: req.method,
      body: req.body,
      user: (req as any).user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  } catch (e) {
    // Fallback logging to avoid cascading failures in error handler
    try {
      logger.error('Unhandled error', error as Error, {
        message: error?.message,
        stack: error?.stack,
        url: req?.url,
        method: req?.method
      });
    } catch (_) {
      // no-op
    }
  }

  const isDevelopment = process.env.NODE_ENV === 'development';
  
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details: any = undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code || 'APP_ERROR';
    
    if (error instanceof ValidationError) {
      details = { errors: error.errors };
    }
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
    code = 'UNAUTHORIZED';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
    code = 'FORBIDDEN';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Not found';
    code = 'NOT_FOUND';
  } else if (error.name === 'ConflictError') {
    statusCode = 409;
    message = 'Conflict';
    code = 'CONFLICT';
  } else if (error.name === 'RateLimitError') {
    statusCode = 429;
    message = 'Too many requests';
    code = 'RATE_LIMIT';
  }

  const response: APIResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };

  if (details) {
    (response as any).details = details;
  }

  if (isDevelopment) {
    (response as any).stack = error.stack;
    (response as any).code = code;
  }

  res.status(statusCode).json(response);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const response: APIResponse = {
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  };

  res.status(404).json(response);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const handleUncaughtException = (): void => {
  process.on('uncaughtException', (error: Error) => {
    try {
      logger.error('Uncaught Exception', error);
    } catch (e) {
      logger.error('Uncaught Exception', error as Error);
    }
    // Do not force-exit; keep server alive and rely on route-level error handling
  });
};

export const handleUnhandledRejection = (): void => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    try {
      logger.error('Unhandled Rejection', new Error(reason), { promise });
    } catch (e) {
      logger.error('Unhandled Rejection', reason as Error);
    }
    // Do not force-exit; keep server alive and rely on route-level error handling
  });
};
