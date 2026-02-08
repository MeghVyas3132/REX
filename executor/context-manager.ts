// =============================================================================
// REX Engine - Context Manager  
// Manages execution context and data flow between nodes
// =============================================================================

import type { 
  WorkflowNode, 
  ExecutionContext,
  NodeResult 
} from '../../shared/types/index.js';
import type { IWorkflowEdge } from '../interfaces/index.js';

/**
 * Manages execution context and data transformations between nodes
 */
export class ContextManager {
  /**
   * Create initial execution context for a workflow run
   */
  createInitialContext(
    runId: string,
    workflowId: string,
    input: Record<string, unknown> = {},
    userId?: string
  ): ExecutionContext {
    return {
      runId,
      workflowId,
      nodeId: '',
      input: { ...input, userId },
      output: {},
      variables: { ...input, userId },
      credentials: {},
      sessionId: (input.sessionId as string) || 'default-session',
      agentId: (input.agentId as string) || 'default-agent',
      userId,
      nodeOutputs: {}
    };
  }

  /**
   * Create context for a specific node execution
   */
  createNodeContext(
    baseContext: ExecutionContext,
    node: WorkflowNode,
    nodeOutputs: Record<string, unknown>,
    edges: IWorkflowEdge[]
  ): ExecutionContext {
    const isTriggerNode = !edges.some(edge => edge.target === node.id);
    
    // For trigger nodes, use initial workflow input
    // For other nodes, prepare input from previous node outputs
    const nodeInput = isTriggerNode 
      ? (baseContext.input || {})
      : this.prepareNodeInput(node, nodeOutputs, edges);

    return {
      ...baseContext,
      nodeId: node.id,
      input: nodeInput,
      output: {},
      variables: { ...baseContext.variables },
      nodeOutputs: { ...nodeOutputs }
    };
  }

  /**
   * Get input for a node from previous node outputs
   */
  getNodeInput(
    node: WorkflowNode,
    nodeOutputs: Record<string, unknown>,
    edges: IWorkflowEdge[]
  ): Record<string, unknown> {
    const inputEdges = edges.filter(edge => edge.target === node.id);
    const inputs: Record<string, unknown> = {};
    
    for (const edge of inputEdges) {
      const sourceNodeId = edge.source;
      const sourceOutput = nodeOutputs[sourceNodeId];
      
      if (sourceOutput !== undefined) {
        inputs[sourceNodeId] = sourceOutput;
        
        // Make AI output easily accessible
        const output = sourceOutput as Record<string, unknown>;
        if (output.provider === 'OpenRouter' || output.provider === 'OpenAI') {
          inputs.aiOutput = sourceOutput;
        }
      }
    }
    
    return inputs;
  }

  /**
   * Prepare complete input for node execution with mappings and transformations
   */
  prepareNodeInput(
    node: WorkflowNode,
    nodeOutputs: Record<string, unknown>,
    edges: IWorkflowEdge[]
  ): Record<string, unknown> {
    const rawInputs = this.getNodeInput(node, nodeOutputs, edges);
    
    if (Object.keys(rawInputs).length === 0) {
      return {};
    }

    // Apply edge-level mappings
    const inputEdges = edges.filter(e => e.target === node.id);
    const mapped: Record<string, unknown> = {};
    
    for (const edge of inputEdges) {
      const mappings = edge.data?.mappings;
      if (!mappings) continue;
      
      for (const [toPath, template] of Object.entries(mappings)) {
        const value = this.resolveTemplate(template, rawInputs, nodeOutputs);
        if (value !== undefined) {
          this.setByPath(mapped, toPath, value);
        }
      }
    }

    // Apply node-level mappings
    const nodeData = node.data as Record<string, unknown>;
    const nodeMappings = nodeData?.mappings as Record<string, string> | undefined;
    if (nodeMappings) {
      for (const [toPath, template] of Object.entries(nodeMappings)) {
        const value = this.resolveTemplate(template, rawInputs, nodeOutputs);
        if (value !== undefined) {
          this.setByPath(mapped, toPath, value);
        }
      }
    }

    // Merge raw inputs with mapped values (mapped takes precedence)
    const input = { ...rawInputs, ...mapped };

    // Auto-flatten single-source inputs for easier access
    const inputKeys = Object.keys(input).filter(
      key => key !== 'data' && key !== 'filePath' && key !== 'aiOutput'
    );
    
    if (inputKeys.length === 1) {
      const sourceNodeId = inputKeys[0];
      const sourceOutput = input[sourceNodeId];
      if (sourceOutput && typeof sourceOutput === 'object' && !Array.isArray(sourceOutput)) {
        Object.assign(input, sourceOutput);
      }
    }

    // Apply common field aliases
    this.applyAliases(input);

    return input;
  }

  /**
   * Resolve template expressions like {{nodeId.path.to.field}}
   */
  resolveTemplate(
    template: string,
    rawInputs: Record<string, unknown>,
    nodeOutputs: Record<string, unknown>
  ): unknown {
    if (typeof template !== 'string') return undefined;
    
    const re = /\{\{\s*([^}]+)\s*\}\}/g;
    const match = re.exec(template);
    
    if (!match) return template; // Literal value
    
    const expr = match[1];
    const [root, ...pathParts] = expr.split('.');
    
    let base: unknown;
    if (root === 'input') {
      base = rawInputs;
    } else {
      base = nodeOutputs[root];
    }
    
    return this.getByPath(base, pathParts.join('.'));
  }

  /**
   * Get value by dot-notation path
   */
  getByPath(obj: unknown, path: string): unknown {
    if (!obj || !path) return obj;
    
    return path.split('.').reduce(
      (acc: unknown, key: string) => {
        if (acc && typeof acc === 'object') {
          return (acc as Record<string, unknown>)[key];
        }
        return undefined;
      },
      obj
    );
  }

  /**
   * Set value by dot-notation path
   */
  setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let curr: Record<string, unknown> = obj;
    
    while (parts.length > 1) {
      const key = parts.shift() as string;
      curr[key] = curr[key] ?? {};
      curr = curr[key] as Record<string, unknown>;
    }
    
    curr[parts[0]] = value;
  }

  /**
   * Apply common field aliases to reduce friction
   */
  private applyAliases(input: Record<string, unknown>): void {
    const aliases: Array<[string, string]> = [
      ['prompt', 'text'],
      ['prompt', 'content'],
      ['text', 'content'],
      ['query', 'prompt']
    ];
    
    for (const [primary, alias] of aliases) {
      if (input[primary] === undefined && input[alias] !== undefined) {
        input[primary] = input[alias];
      }
    }
  }

  /**
   * Update context after node execution
   */
  updateContextAfterExecution(
    context: ExecutionContext,
    nodeId: string,
    result: { output?: unknown; variables?: Record<string, unknown> },
    nodeOutputs: Record<string, unknown>,
    nodeResults: Record<string, NodeResult>
  ): void {
    // Store node output
    nodeOutputs[nodeId] = result.output;
    
    // Merge variables
    if (result.variables) {
      context.variables = { ...context.variables, ...result.variables };
    }
  }

  /**
   * Create node result record
   */
  createNodeResult(
    node: WorkflowNode,
    success: boolean,
    result: unknown,
    error?: string,
    duration?: number
  ): NodeResult {
    const nodeData = node.data as Record<string, unknown>;
    
    return {
      success,
      result,
      error,
      node: (nodeData?.label as string) || node.type,
      nodeType: node.type,
      subtype: nodeData?.subtype as string,
      timestamp: new Date().toISOString(),
      duration
    };
  }
}

// Export singleton instance
export const contextManager = new ContextManager();
