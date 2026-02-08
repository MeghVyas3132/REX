// =============================================================================
// REX Engine - Graph Builder
// Builds and validates workflow execution graphs
// =============================================================================

import type { WorkflowNode } from '../../shared/types/index.js';
import type { IWorkflowEdge, IValidationResult } from '../interfaces/index.js';

/**
 * Graph operations for workflow execution
 */
export class GraphBuilder {
  /**
   * Calculate topological execution order for workflow nodes
   * Uses DFS to ensure nodes are executed in dependency order
   */
  getExecutionOrder(nodes: WorkflowNode[], edges: IWorkflowEdge[]): string[] {
    const nodeIds = nodes.map(n => n.id);
    const executionOrder: string[] = [];
    const visited = new Set<string>();
    
    // Find start nodes (nodes with no incoming edges)
    const startNodes = nodeIds.filter(id => 
      !edges.some(edge => edge.target === id)
    );
    
    const visit = (nodeId: string): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      // Add current node to execution order
      executionOrder.push(nodeId);
      
      // Visit all downstream nodes
      const outgoingEdges = edges.filter(edge => edge.source === nodeId);
      for (const edge of outgoingEdges) {
        visit(edge.target);
      }
    };
    
    // Start from all entry points
    for (const nodeId of startNodes) {
      visit(nodeId);
    }
    
    // Add any remaining disconnected nodes
    for (const nodeId of nodeIds) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }
    
    return executionOrder;
  }

  /**
   * Validate workflow graph structure
   */
  validateGraph(nodes: WorkflowNode[], edges: IWorkflowEdge[]): IValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check for empty workflow
    if (!nodes || nodes.length === 0) {
      errors.push('Workflow must have at least one node');
      return { valid: false, errors, warnings };
    }

    // Allow single-node workflows
    if (nodes.length > 1 && (!edges || edges.length === 0)) {
      errors.push('Multi-node workflows must have edges connecting nodes');
    }

    const nodeIds = new Set(nodes.map(n => n.id));
    
    // Validate edge references
    for (const edge of edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge references non-existent source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge references non-existent target node: ${edge.target}`);
      }
    }

    // Check for orphaned nodes (nodes not connected by any edge)
    const connectedNodes = new Set([
      ...edges.map(e => e.source),
      ...edges.map(e => e.target)
    ]);

    for (const node of nodes) {
      if (!connectedNodes.has(node.id) && nodes.length > 1) {
        warnings.push(`Node '${node.id}' is not connected to any other node`);
      }
    }

    // Check for cycles (would cause infinite execution)
    const hasCycle = this.detectCycle(nodes, edges);
    if (hasCycle) {
      errors.push('Workflow contains a cycle which would cause infinite execution');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Detect cycles in the workflow graph using DFS
   */
  private detectCycle(nodes: WorkflowNode[], edges: IWorkflowEdge[]): boolean {
    const nodeIds = nodes.map(n => n.id);
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoing = edges.filter(e => e.source === nodeId);
      for (const edge of outgoing) {
        if (!visited.has(edge.target)) {
          if (hasCycleDFS(edge.target)) {
            return true;
          }
        } else if (recursionStack.has(edge.target)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of nodeIds) {
      if (!visited.has(nodeId)) {
        if (hasCycleDFS(nodeId)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get all nodes that are upstream (predecessors) of the given node
   */
  getUpstreamNodes(nodeId: string, edges: IWorkflowEdge[]): string[] {
    const upstream: string[] = [];
    const visited = new Set<string>();

    const visit = (id: string): void => {
      const incomingEdges = edges.filter(e => e.target === id);
      for (const edge of incomingEdges) {
        if (!visited.has(edge.source)) {
          visited.add(edge.source);
          upstream.push(edge.source);
          visit(edge.source);
        }
      }
    };

    visit(nodeId);
    return upstream;
  }

  /**
   * Get all nodes that are downstream (successors) of the given node
   */
  getDownstreamNodes(nodeId: string, edges: IWorkflowEdge[]): string[] {
    const downstream: string[] = [];
    const visited = new Set<string>();

    const visit = (id: string): void => {
      const outgoingEdges = edges.filter(e => e.source === id);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          downstream.push(edge.target);
          visit(edge.target);
        }
      }
    };

    visit(nodeId);
    return downstream;
  }

  /**
   * Get immediate predecessor node IDs
   */
  getImmediatePredecessors(nodeId: string, edges: IWorkflowEdge[]): string[] {
    return edges
      .filter(e => e.target === nodeId)
      .map(e => e.source);
  }

  /**
   * Get immediate successor node IDs
   */
  getImmediateSuccessors(nodeId: string, edges: IWorkflowEdge[]): string[] {
    return edges
      .filter(e => e.source === nodeId)
      .map(e => e.target);
  }

  /**
   * Check if a node is a trigger node (entry point)
   */
  isTriggerNode(nodeId: string, edges: IWorkflowEdge[]): boolean {
    return !edges.some(e => e.target === nodeId);
  }

  /**
   * Check if a node is a terminal node (exit point)
   */
  isTerminalNode(nodeId: string, edges: IWorkflowEdge[]): boolean {
    return !edges.some(e => e.source === nodeId);
  }

  /**
   * Get all trigger nodes in the workflow
   */
  getTriggerNodes(nodes: WorkflowNode[], edges: IWorkflowEdge[]): WorkflowNode[] {
    return nodes.filter(n => this.isTriggerNode(n.id, edges));
  }

  /**
   * Get all terminal nodes in the workflow
   */
  getTerminalNodes(nodes: WorkflowNode[], edges: IWorkflowEdge[]): WorkflowNode[] {
    return nodes.filter(n => this.isTerminalNode(n.id, edges));
  }
}

// Export singleton instance
export const graphBuilder = new GraphBuilder();
