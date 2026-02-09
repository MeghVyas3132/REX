// CommonJS compatibility shim for ts-node (backend runs with module: "commonjs")
// This file exists so that `import { logger } from '../../lib/logger.js'` resolves
// correctly under both NodeNext (finds .js) and CommonJS/ts-node (finds .js directly).

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * @typedef {Object} NodeLogger
 * @property {Function} debug
 * @property {Function} info
 * @property {Function} warn
 * @property {Function} error
 * @property {Function} externalService
 */

let _logger = null;

function getDefaultLogger() {
  return {
    debug: (...args) => console.debug('[nodes]', ...args),
    info: (...args) => console.info('[nodes]', ...args),
    warn: (...args) => console.warn('[nodes]', ...args),
    error: (...args) => console.error('[nodes]', ...args),
    externalService: (service, operation, duration, success, metadata) => {
      const level = success ? 'info' : 'error';
      console[level](`[nodes] External service call: ${service}.${operation} - ${success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`, metadata || '');
    },
  };
}

const handler = {
  get(target, prop) {
    const current = _logger || getDefaultLogger();
    if (typeof current[prop] === 'function') {
      return current[prop].bind(current);
    }
    return current[prop];
  },
};

const logger = new Proxy({}, handler);

function setLogger(newLogger) {
  _logger = newLogger;
}

exports.logger = logger;
exports.setLogger = setLogger;
exports.getDefaultLogger = getDefaultLogger;
