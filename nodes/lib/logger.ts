// =============================================================================
// REX Nodes - Shared Logger
// Lightweight logger for node executors.
// Mirrors the backend Logger API surface so node code can call
// logger.info / logger.externalService / etc. without importing from backend.
// =============================================================================

export interface NodeLogger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, context?: Record<string, any>): void;
  externalService(
    service: string,
    operation: string,
    duration: number,
    success: boolean,
    context?: Record<string, any>,
  ): void;
}

/**
 * Create a lightweight logger that writes to the console but exposes the same
 * method signatures the backend Logger class provides.
 *
 * If the runtime ever injects a richer logger (e.g. Winston), it can be
 * swapped in via `setLogger()`.
 */
function createDefaultLogger(): NodeLogger {
  return {
    debug(message: string, context?: Record<string, any>) {
      console.debug(`[DEBUG] ${message}`, context ?? '');
    },
    info(message: string, context?: Record<string, any>) {
      console.info(`[INFO] ${message}`, context ?? '');
    },
    warn(message: string, context?: Record<string, any>) {
      console.warn(`[WARN] ${message}`, context ?? '');
    },
    error(message: string, context?: Record<string, any>) {
      console.error(`[ERROR] ${message}`, context ?? '');
    },
    externalService(
      service: string,
      operation: string,
      duration: number,
      success: boolean,
      context?: Record<string, any>,
    ) {
      const level = success ? 'info' : 'error';
      const msg = `[${level.toUpperCase()}] External service call: ${service}#${operation} (${success ? 'success' : 'failure'}, ${duration}ms)`;
      const meta = { service, operation, duration, success, ...(context || {}) };
      if (success) {
        console.info(msg, meta);
      } else {
        console.error(msg, meta);
      }
    },
  };
}

/** The active logger instance used by all nodes. */
let _logger: NodeLogger = createDefaultLogger();

/**
 * Replace the default console logger with a richer implementation
 * (e.g. the backend Winston logger) at application startup.
 */
export function setLogger(custom: NodeLogger): void {
  _logger = custom;
}

/** Shared logger for node executors. */
export const logger: NodeLogger = new Proxy({} as NodeLogger, {
  get(_target, prop: string) {
    return (_logger as any)[prop];
  },
});
