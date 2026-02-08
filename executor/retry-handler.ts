// =============================================================================
// REX Engine - Retry Handler
// Handles retry logic with exponential backoff
// =============================================================================

/// <reference lib="dom" />

import type { WorkflowNode, ExecutionContext, ExecutionResult } from '../../shared/types/index.js';
import type { INodeExecutor } from '../interfaces/index.js';

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxRetries: number;
  backoffMs: number;
  maxBackoffMs?: number;
  retryableErrors?: string[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  backoffMs: 1000,
  maxBackoffMs: 30000
};

/**
 * Handles retry logic for node execution
 */
export class RetryHandler {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Execute a node with retry logic
   */
  async executeWithRetry(
    node: WorkflowNode,
    context: ExecutionContext,
    executor: INodeExecutor,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<ExecutionResult> {
    let lastError: Error | null = null;
    const { maxRetries, backoffMs, maxBackoffMs } = this.config;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Calculate backoff with exponential increase
          const delay = Math.min(
            backoffMs * Math.pow(2, attempt - 1),
            maxBackoffMs || Infinity
          );
          
          // Notify about retry
          if (onRetry) {
            onRetry(attempt, lastError!);
          }
          
          // Wait before retry
          await this.delay(delay);
        }
        
        // Execute the node
        return await executor.execute(node, context);
        
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (!this.isRetryable(lastError)) {
          throw lastError;
        }
        
        // If this was the last attempt, don't continue
        if (attempt === maxRetries) {
          break;
        }
      }
    }
    
    // All retries exhausted
    throw lastError || new Error('Node execution failed after all retries');
  }

  /**
   * Execute with retry using a simple function
   */
  async executeFunction<T>(
    fn: () => Promise<T>,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    let lastError: Error | null = null;
    const { maxRetries, backoffMs, maxBackoffMs } = this.config;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(
            backoffMs * Math.pow(2, attempt - 1),
            maxBackoffMs || Infinity
          );
          
          if (onRetry) {
            onRetry(attempt, lastError!);
          }
          
          await this.delay(delay);
        }
        
        return await fn();
        
      } catch (error) {
        lastError = error as Error;
        
        if (!this.isRetryable(lastError)) {
          throw lastError;
        }
        
        if (attempt === maxRetries) {
          break;
        }
      }
    }
    
    throw lastError || new Error('Function execution failed after all retries');
  }

  /**
   * Check if an error is retryable
   */
  private isRetryable(error: Error): boolean {
    // Don't retry cancellation
    if (error.message.includes('cancelled')) {
      return false;
    }
    
    // Don't retry validation errors
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return false;
    }
    
    // Check against configured retryable errors
    if (this.config.retryableErrors) {
      return this.config.retryableErrors.some(
        pattern => error.message.toLowerCase().includes(pattern.toLowerCase())
      );
    }
    
    // Default: retry network and timeout errors
    const retryablePatterns = [
      'timeout',
      'network',
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'rate limit',
      '429',
      '503',
      '502',
      '504'
    ];
    
    return retryablePatterns.some(
      pattern => error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Promise-based delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update retry configuration
   */
  setConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }
}

// Export singleton with default config
export const retryHandler = new RetryHandler();
