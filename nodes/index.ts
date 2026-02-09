// =============================================================================
// REX Nodes Package
// All workflow nodes for the REX automation platform
// =============================================================================

export const NODES_VERSION = '1.0.0';

// Registry
export { 
  nodeRegistry, 
  NodeRegistry,
  registerNode, 
  getNode, 
  getAllNodes,
  getNodeDefinitions
} from './registry/node-registry';
export type { NodeExecutor } from './registry/node-registry';

// Re-export shared types for convenience
export type { 
  NodeDefinition, 
  NodeType,
  NodeCategory,
  WorkflowNode,
  ExecutionContext, 
  ExecutionResult,
  NodeResult 
} from '../shared/types/index';

// Node category exports
export * from './triggers/index';

// TODO: Add more category exports as needed
// export * from './agent/index.js';
// export * from './ai/index.js';
// export * from './communication/index.js';
// export * from './core/index.js';
// etc.

