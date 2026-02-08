/**
 * Frontend Logger Utility
 * Provides consistent logging for the frontend application
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.isDevelopment && level === 'debug') {
      return; // Skip debug logs in production
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(context && { context }),
      ...(error && { 
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      })
    };

    // In development, use console with colors
    if (this.isDevelopment) {
      const styles: Record<LogLevel, string> = {
        debug: 'color: #888',
        info: 'color: #2196F3',
        warn: 'color: #FF9800',
        error: 'color: #F44336'
      };

      const emoji: Record<LogLevel, string> = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌'
      };

      console[level === 'debug' ? 'log' : level](
        `%c${emoji[level]} [${level.toUpperCase()}] ${message}`,
        styles[level],
        logEntry
      );
    } else {
      // In production, send to backend logging service if available
      // For now, only log errors and warnings
      if (level === 'error' || level === 'warn') {
        console[level](`[${level.toUpperCase()}] ${message}`, logEntry);
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, context, error);
  }

  // Convenience methods for common use cases
  apiRequest(method: string, url: string, statusCode: number, duration?: number): void {
    this.debug('API request', { method, url, statusCode, duration });
  }

  apiError(method: string, url: string, error: Error, statusCode?: number): void {
    this.error('API request failed', error, { method, url, statusCode });
  }

  workflowExecution(workflowId: string, runId: string, event: string, data?: any): void {
    this.info('Workflow execution event', { workflowId, runId, event, data });
  }

  nodeExecution(nodeId: string, nodeType: string, event: string, data?: any): void {
    this.debug('Node execution event', { nodeId, nodeType, event, data });
  }
}

// Create singleton instance
export const logger = new Logger();

// Export default for convenience
export default logger;

