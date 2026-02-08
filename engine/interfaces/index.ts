// =============================================================================
// REX Engine - Interfaces
// Contracts that nodes and services must implement
// =============================================================================

import type { 
  WorkflowNode, 
  ExecutionContext, 
  ExecutionResult,
  NodeResult 
} from '../../shared/types/index.js';

/**
 * Interface for node execution
 * All nodes must implement this to be executable by the engine
 */
export interface INodeExecutor {
  /**
   * Execute the node with the given context
   */
  execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult>;
  
  /**
   * Get the node definition for registration
   */
  getNodeDefinition?(): Record<string, unknown>;
}

/**
 * Interface for the workflow engine
 */
export interface IWorkflowEngine {
  /**
   * Execute a complete workflow
   */
  executeWorkflow(
    workflow: IWorkflow,
    input?: Record<string, unknown>,
    options?: IRunOptions
  ): Promise<IWorkflowExecutionResult>;
  
  /**
   * Validate a workflow before execution
   */
  validateWorkflow(workflow: IWorkflow): IValidationResult;
  
  /**
   * Get the execution order for workflow nodes
   */
  getExecutionOrder(nodes: WorkflowNode[], edges: IWorkflowEdge[]): string[];
}

/**
 * Workflow structure for engine execution
 */
export interface IWorkflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: IWorkflowEdge[];
  settings?: IWorkflowSettings;
  userId?: string;
}

/**
 * Edge connecting two nodes
 */
export interface IWorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  condition?: string;
  data?: {
    mappings?: Record<string, string>;
  };
}

/**
 * Workflow execution settings
 */
export interface IWorkflowSettings {
  retries?: number;
  timeout?: number;
  concurrency?: number;
}

/**
 * Options for workflow execution
 */
export interface IRunOptions {
  runId?: string;
  userId?: string;
  retries?: number;
  timeout?: number;
  backoff?: number;
}

/**
 * Result of workflow execution
 */
export interface IWorkflowExecutionResult {
  success: boolean;
  output?: {
    text?: unknown;
    nodeResults: Record<string, NodeResult>;
    executionOrder: string[];
    nodeOutputs: Record<string, unknown>;
    duration: number;
  };
  error?: string;
  duration?: number;
}

/**
 * Result of workflow validation
 */
export interface IValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Interface for execution state management
 */
export interface IStateManager {
  /**
   * Get execution state
   */
  getState(runId: string): Promise<IExecutionState | null>;
  
  /**
   * Update execution state
   */
  setState(runId: string, state: Partial<IExecutionState>): Promise<void>;
  
  /**
   * Clear execution state
   */
  clearState(runId: string): Promise<void>;
}

/**
 * Execution state for persistence
 */
export interface IExecutionState {
  runId: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentNodeId?: string;
  nodeResults: Record<string, NodeResult>;
  nodeOutputs: Record<string, unknown>;
  variables: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Interface for execution monitoring
 */
export interface IExecutionMonitor {
  emitWorkflowStarted(runId: string, workflowId: string, data?: unknown): void;
  emitWorkflowCompleted(runId: string, workflowId: string, data?: unknown): void;
  emitWorkflowFailed(runId: string, workflowId: string, error: string, data?: unknown): void;
  emitWorkflowCancelled(runId: string, workflowId: string, data?: unknown): void;
  emitNodeStarted(runId: string, workflowId: string, nodeId: string, data?: unknown): void;
  emitNodeCompleted(runId: string, workflowId: string, nodeId: string, data?: unknown): void;
  emitNodeFailed(runId: string, workflowId: string, nodeId: string, error: string, data?: unknown): void;
}

/**
 * Interface for node registry
 */
export interface INodeRegistry {
  /**
   * Register a node executor
   */
  register(type: string, executor: INodeExecutor): void;
  
  /**
   * Get a node executor by type
   */
  get(type: string): INodeExecutor | undefined;
  
  /**
   * Check if a node type is registered
   */
  has(type: string): boolean;
  
  /**
   * Get all registered node types
   */
  getTypes(): string[];
}
