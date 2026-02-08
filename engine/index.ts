// =============================================================================
// REX Engine Package
// Node-agnostic workflow execution engine
// =============================================================================

export const ENGINE_VERSION = '1.0.0';

// Interfaces - contracts for implementations
export type {
  INodeExecutor,
  IWorkflowEngine,
  IWorkflow,
  IWorkflowEdge,
  IWorkflowSettings,
  IRunOptions,
  IWorkflowExecutionResult,
  IValidationResult,
  IStateManager,
  IExecutionState,
  IExecutionMonitor,
  INodeRegistry
} from './interfaces/index.js';

// Graph operations
export { GraphBuilder, graphBuilder } from './graph/index.js';

// Executor utilities
export { 
  ContextManager, 
  contextManager,
  RetryHandler,
  retryHandler,
  DEFAULT_RETRY_CONFIG
} from './executor/index.js';
export type { RetryConfig } from './executor/index.js';

// Re-export shared types for convenience
export type {
  WorkflowNode,
  WorkflowEdge,
  Workflow,
  ExecutionContext,
  NodeExecutionContext,
  ExecutionResult,
  NodeResult,
  RunOptions
} from '../shared/types/index.js';
