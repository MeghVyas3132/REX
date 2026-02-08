import { logger } from '../utils/logger';

interface RunningExecution {
  runId: string;
  workflowId: string;
  startTime: number;
  cancelled: boolean;
  abortController?: AbortController;
}

export class ExecutionManager {
  private static instance: ExecutionManager;
  private runningExecutions: Map<string, RunningExecution> = new Map();

  private constructor() {}

  static getInstance(): ExecutionManager {
    if (!ExecutionManager.instance) {
      ExecutionManager.instance = new ExecutionManager();
    }
    return ExecutionManager.instance;
  }

  /**
   * Register a running execution
   */
  registerExecution(runId: string, workflowId: string, abortController?: AbortController): void {
    this.runningExecutions.set(runId, {
      runId,
      workflowId,
      startTime: Date.now(),
      cancelled: false,
      abortController
    });
    
    logger.info('Execution registered', { runId, workflowId, totalRunning: this.runningExecutions.size });
  }

  /**
   * Cancel a running execution
   */
  cancelExecution(runId: string): boolean {
    const execution = this.runningExecutions.get(runId);
    if (!execution) {
      logger.warn('Execution not found for cancellation', { runId });
      return false;
    }

    if (execution.cancelled) {
      logger.info('Execution already cancelled', { runId });
      return true;
    }

    execution.cancelled = true;
    
    // Signal abort if AbortController is available
    if (execution.abortController) {
      execution.abortController.abort();
    }

    logger.info('Execution cancelled', { 
      runId, 
      workflowId: execution.workflowId,
      duration: Date.now() - execution.startTime 
    });

    return true;
  }

  /**
   * Check if an execution is cancelled
   */
  isCancelled(runId: string): boolean {
    const execution = this.runningExecutions.get(runId);
    return execution?.cancelled || false;
  }

  /**
   * Unregister a completed execution
   */
  unregisterExecution(runId: string): void {
    const execution = this.runningExecutions.get(runId);
    if (execution) {
      this.runningExecutions.delete(runId);
      logger.info('Execution unregistered', { 
        runId, 
        workflowId: execution.workflowId,
        duration: Date.now() - execution.startTime,
        wasCancelled: execution.cancelled
      });
    }
  }

  /**
   * Get all running executions
   */
  getRunningExecutions(): RunningExecution[] {
    return Array.from(this.runningExecutions.values());
  }

  /**
   * Clean up old executions (older than 1 hour)
   */
  cleanupOldExecutions(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let cleaned = 0;
    
    for (const [runId, execution] of this.runningExecutions.entries()) {
      if (execution.startTime < oneHourAgo) {
        this.runningExecutions.delete(runId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info('Cleaned up old executions', { cleaned, remaining: this.runningExecutions.size });
    }
  }
}

// Cleanup old executions every 30 minutes
setInterval(() => {
  ExecutionManager.getInstance().cleanupOldExecutions();
}, 30 * 60 * 1000);

export default ExecutionManager;

