// =============================================================================
// REX Nodes - Node Registry
// Central registry for all workflow nodes
// =============================================================================

import type { 
  WorkflowNode, 
  ExecutionContext, 
  ExecutionResult,
  NodeDefinition 
} from '../../shared/types/index';

/**
 * Interface that all node executors must implement
 */
export interface NodeExecutor {
  /**
   * Execute the node with the given context
   */
  execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult>;
  
  /**
   * Get the node definition for the UI
   */
  getNodeDefinition(): NodeDefinition | Record<string, unknown>;
}

/**
 * Node registration entry
 */
interface NodeRegistryEntry {
  executor: NodeExecutor;
  definition: NodeDefinition | Record<string, unknown>;
}

/**
 * Central registry for all workflow nodes
 */
class NodeRegistry {
  private nodes: Map<string, NodeRegistryEntry> = new Map();
  private aliases: Map<string, string> = new Map();
  
  /**
   * Register a node executor
   */
  register(type: string, executor: NodeExecutor): void {
    const definition = executor.getNodeDefinition?.() || { id: type, type, name: type };
    this.nodes.set(type, { executor, definition });
  }

  /**
   * Register a node with an alias
   */
  registerWithAlias(type: string, alias: string, executor: NodeExecutor): void {
    this.register(type, executor);
    this.aliases.set(alias, type);
  }

  /**
   * Register multiple aliases for a node type
   */
  registerAliases(type: string, aliases: string[]): void {
    for (const alias of aliases) {
      this.aliases.set(alias, type);
    }
  }

  /**
   * Get a node executor by type (resolves aliases)
   */
  get(type: string): NodeExecutor | undefined {
    // Try direct lookup first
    const entry = this.nodes.get(type);
    if (entry) return entry.executor;
    
    // Try alias resolution
    const resolvedType = this.aliases.get(type);
    if (resolvedType) {
      const aliasEntry = this.nodes.get(resolvedType);
      return aliasEntry?.executor;
    }
    
    return undefined;
  }

  /**
   * Get node definition by type
   */
  getDefinition(type: string): NodeDefinition | Record<string, unknown> | undefined {
    const entry = this.nodes.get(type);
    if (entry) return entry.definition;
    
    const resolvedType = this.aliases.get(type);
    if (resolvedType) {
      const aliasEntry = this.nodes.get(resolvedType);
      return aliasEntry?.definition;
    }
    
    return undefined;
  }

  /**
   * Check if a node type is registered
   */
  has(type: string): boolean {
    return this.nodes.has(type) || this.aliases.has(type);
  }

  /**
   * Get all registered node types
   */
  getTypes(): string[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * Get all node definitions
   */
  getAllDefinitions(): Array<NodeDefinition | Record<string, unknown>> {
    return Array.from(this.nodes.values()).map(entry => entry.definition);
  }

  /**
   * Get nodes by category
   */
  getByCategory(category: string): Array<NodeDefinition | Record<string, unknown>> {
    return this.getAllDefinitions().filter(
      def => (def as NodeDefinition).category === category
    );
  }

  /**
   * Execute a node by type
   */
  async execute(
    type: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const executor = this.get(type);
    
    if (!executor) {
      return {
        success: false,
        error: `Unknown node type: ${type}`
      };
    }

    try {
      return await executor.execute(node, context);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Node execution failed'
      };
    }
  }

  /**
   * Clear all registered nodes
   */
  clear(): void {
    this.nodes.clear();
    this.aliases.clear();
  }

  /**
   * Get registry statistics
   */
  getStats(): { totalNodes: number; categories: Record<string, number> } {
    const categories: Record<string, number> = {};
    
    for (const entry of this.nodes.values()) {
      const category = (entry.definition as NodeDefinition).category || 'unknown';
      categories[category] = (categories[category] || 0) + 1;
    }
    
    return {
      totalNodes: this.nodes.size,
      categories
    };
  }

  // ============================================
  // Backward compatibility methods
  // ============================================
  
  /**
   * @deprecated Use getAllDefinitions() instead
   */
  getAllNodeDefinitions(): Array<NodeDefinition | Record<string, unknown>> {
    return this.getAllDefinitions();
  }

  /**
   * @deprecated Use get() instead
   */
  getNodeExecutor(type: string): NodeExecutor | undefined {
    return this.get(type);
  }

  /**
   * @deprecated Use getDefinition() instead
   */
  getNodeDefinition(type: string): NodeDefinition | Record<string, unknown> | undefined {
    return this.getDefinition(type);
  }

  /**
   * @deprecated Use execute() instead
   */
  async executeNode(
    type: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    return this.execute(type, node, context);
  }

  /**
   * Validate node configuration
   */
  validateNodeConfig(type: string, config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const definition = this.getDefinition(type);
    
    if (!definition) {
      return { valid: false, errors: [`Unknown node type: ${type}`] };
    }

    const errors: string[] = [];
    const nodeDef = definition as NodeDefinition;
    
    // Check required parameters
    if (nodeDef.parameters) {
      for (const param of nodeDef.parameters) {
        if (param.required && (config[param.name] === undefined || config[param.name] === null || config[param.name] === '')) {
          errors.push(`Missing required parameter: ${param.name}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

// Export singleton instance
export const nodeRegistry = new NodeRegistry();

// Export class for testing
export { NodeRegistry };

// Helper functions
export const registerNode = (type: string, executor: NodeExecutor): void => {
  nodeRegistry.register(type, executor);
};

export const getNode = (type: string): NodeExecutor | undefined => {
  return nodeRegistry.get(type);
};

export const getAllNodes = (): string[] => {
  return nodeRegistry.getTypes();
};

export const getNodeDefinitions = (): Array<NodeDefinition | Record<string, unknown>> => {
  return nodeRegistry.getAllDefinitions();
};
