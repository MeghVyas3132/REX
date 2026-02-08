/**
 * Node Registry Helper
 * 
 * Provides helper functions for working with the node registry.
 * This is a compatibility layer that wraps the NodeRegistry singleton.
 */

import { nodeRegistry, NodeRegistryEntry } from './node-registry';
import { NodeDefinition } from '@rex/shared';

/**
 * Get a node definition by its ID
 */
export function getNodeDefinition(nodeId: string): NodeDefinition | undefined {
  return nodeRegistry.getNodeDefinition(nodeId);
}

/**
 * Get all node definitions
 */
export function getAllNodeDefinitions(): NodeDefinition[] {
  return nodeRegistry.getAllNodeDefinitions();
}

/**
 * Get a node's schema (config, input, output schemas)
 */
export function getNodeSchema(nodeId: string): any {
  return nodeRegistry.getNodeSchema(nodeId);
}

/**
 * Check if a node is n8n-compatible
 * Currently checks if the node has parameters defined (n8n-style)
 */
export function isN8nCompatible(nodeId: string): boolean {
  const node = nodeRegistry.getNode(nodeId);
  if (!node) {
    return false;
  }
  
  // A node is considered n8n-compatible if it has parameters array (n8n-style fields)
  return Array.isArray(node.parameters) && node.parameters.length > 0;
}

/**
 * Get n8n-style node description for compatible nodes
 */
export function getN8nNodeDescription(nodeId: string): any {
  const node = nodeRegistry.getNode(nodeId);
  if (!node || !isN8nCompatible(nodeId)) {
    return undefined;
  }
  
  return {
    displayName: node.name,
    name: node.id,
    group: [node.category],
    version: node.version,
    description: node.description,
    defaults: {
      name: node.name,
    },
    inputs: node.inputs || ['main'],
    outputs: node.outputs || ['main'],
    properties: node.parameters || [],
  };
}

/**
 * Get all categories of nodes
 */
export function getCategories(): string[] {
  return nodeRegistry.getCategories();
}

/**
 * Get nodes by category
 */
export function getNodesByCategory(category: string): NodeRegistryEntry[] {
  return nodeRegistry.getNodesByCategory(category);
}

/**
 * Validate node configuration
 */
export function validateNodeConfig(nodeId: string, config: any, options?: any): { valid: boolean; errors: string[] } {
  return nodeRegistry.validateNodeConfig(nodeId, config, options);
}

/**
 * Get node capabilities
 */
export function getNodeCapabilities(nodeId: string): any {
  return nodeRegistry.getNodeCapabilities(nodeId);
}

/**
 * Create a new instance of a node
 */
export function createNodeInstance(nodeId: string): any {
  return nodeRegistry.createNodeInstance(nodeId);
}

// Export as a helper object for backward compatibility
export const nodeRegistryHelper = {
  getNodeDefinition,
  getAllNodeDefinitions,
  getNodeSchema,
  isN8nCompatible,
  getN8nNodeDescription,
  getCategories,
  getNodesByCategory,
  validateNodeConfig,
  getNodeCapabilities,
  createNodeInstance,
};

export default nodeRegistryHelper;
