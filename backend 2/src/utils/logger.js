const winston = require('winston');

class Logger {
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

  info(message, meta = {}) {
    this.winston.info(message, meta);
  }

  error(message, error = null, meta = {}) {
    if (error) {
      this.winston.error(message, { error: error.message, stack: error.stack, ...meta });
    } else {
      this.winston.error(message, meta);
    }
  }

  warn(message, meta = {}) {
    this.winston.warn(message, meta);
  }

  debug(message, meta = {}) {
    this.winston.debug(message, meta);
  }

  // Workflow-specific logging
  workflowStart(workflowId, runId, meta = {}) {
    this.info('Workflow started', { workflowId, runId, ...meta });
  }

  workflowComplete(workflowId, runId, duration, meta = {}) {
    this.info('Workflow completed', { workflowId, runId, duration, ...meta });
  }

  workflowError(workflowId, runId, error, meta = {}) {
    this.error('Workflow failed', error, { workflowId, runId, ...meta });
  }

  nodeStart(nodeId, nodeType, runId, meta = {}) {
    this.info('Node started', { nodeId, nodeType, runId, ...meta });
  }

  nodeComplete(nodeId, nodeType, runId, duration, meta = {}) {
    this.info('Node completed', { nodeId, nodeType, runId, duration, ...meta });
  }

  nodeError(nodeId, nodeType, runId, error, meta = {}) {
    this.error('Node failed', error, { nodeId, nodeType, runId, ...meta });
  }

  // Database logging
  dbQuery(query, duration, context = {}) {
    this.debug('Database query executed', {
      query,
      duration,
      ...context
    });
  }

  // External service logging
  externalService(service, operation, duration, success, context = {}) {
    const level = success ? 'info' : 'error';
    this.winston.log(level, 'External service call', {
      service,
      operation,
      duration,
      success,
      ...context
    });
  }
}

// Create and export logger instance
const logger = new Logger();

module.exports = logger;
module.exports.logger = logger;
module.exports.Logger = Logger;