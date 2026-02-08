import * as winston from 'winston';
import { LogEntry } from './types';

class Logger {
  private winston: winston.Logger;

  constructor() {
    this.winston = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'workflow-studio' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });

    // Add file transport in production
    if (process.env.NODE_ENV === 'production') {
      this.winston.add(new winston.transports.File({ 
        filename: 'logs/error.log', 
        level: 'error' 
      }));
      this.winston.add(new winston.transports.File({ 
        filename: 'logs/combined.log' 
      }));
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.winston.debug(message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.winston.info(message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.winston.warn(message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    const meta: Record<string, any> = { error: error?.stack };
    if (context && typeof context === 'object') Object.assign(meta, context);
    this.winston.error(message, meta);
  }

  log(entry: LogEntry): void {
    this.winston.log(entry.level, entry.message, {
      timestamp: entry.timestamp,
      context: entry.context,
      error: entry.error?.stack
    });
  }

  // Structured logging for workflow execution
  workflowStart(workflowId: string, runId: string, context?: Record<string, any>): void {
    this.info('Workflow execution started', {
      workflowId,
      runId,
      ...(context || {})
    });
  }

  workflowComplete(workflowId: string, runId: string, duration: number, context?: Record<string, any>): void {
    this.info('Workflow execution completed', {
      workflowId,
      runId,
      duration,
      ...(context || {})
    });
  }

  workflowError(workflowId: string, runId: string, error: Error, context?: Record<string, any>): void {
    this.error('Workflow execution failed', error, {
      workflowId,
      runId,
      ...(context || {})
    });
  }

  nodeStart(nodeId: string, nodeType: string, runId: string, context?: Record<string, any>): void {
    this.info('Node execution started', {
      nodeId,
      nodeType,
      runId,
      ...(context || {})
    });
  }

  nodeComplete(nodeId: string, nodeType: string, runId: string, duration: number, context?: Record<string, any>): void {
    this.info('Node execution completed', {
      nodeId,
      nodeType,
      runId,
      duration,
      ...(context || {})
    });
  }

  nodeError(nodeId: string, nodeType: string, runId: string, error: Error, context?: Record<string, any>): void {
    this.error('Node execution failed', error, {
      nodeId,
      nodeType,
      runId,
      ...(context || {})
    });
  }

  // API request logging
  apiRequest(method: string, url: string, statusCode: number, duration: number, context?: Record<string, any>): void {
    this.info('API request', {
      method,
      url,
      statusCode,
      duration,
      ...(context || {})
    });
  }

  // Database operation logging
  dbQuery(query: string, duration: number, context?: Record<string, any>): void {
    this.debug('Database query executed', {
      query,
      duration,
      ...(context || {})
    });
  }

  // External service logging
  externalService(service: string, operation: string, duration: number, success: boolean, context?: Record<string, any>): void {
    const level = success ? 'info' : 'error';
    this.winston.log(level, 'External service call', {
      service,
      operation,
      duration,
      success,
      ...(context || {})
    });
  }
}

// Create logger instance
const loggerInstance = new Logger();

// Export for both ES6 and CommonJS
export const logger = loggerInstance;
export default loggerInstance;

// Also export for CommonJS require()
if (typeof module !== 'undefined' && module.exports) {
  module.exports = loggerInstance;
  module.exports.logger = loggerInstance;
}
