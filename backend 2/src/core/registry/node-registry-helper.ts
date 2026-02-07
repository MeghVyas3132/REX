/**
 * Node Registry Helper
 * Provides unified access to both old and new node structures
 */

import { nodeRegistry } from '../registry/node-registry';
import NodeRegistryV2 from './node-registry-v2';
import { INodeTypeDescription } from '../../types/n8n-types';
import { NodeDefinition } from '../../utils/types';

export class NodeRegistryHelper {
  private static instance: NodeRegistryHelper;
  private nodeRegistryV2: NodeRegistryV2;

  private constructor() {
    this.nodeRegistryV2 = NodeRegistryV2.getInstance();
  }

  public static getInstance(): NodeRegistryHelper {
    if (!NodeRegistryHelper.instance) {
      NodeRegistryHelper.instance = new NodeRegistryHelper();
    }
    return NodeRegistryHelper.instance;
  }

  /**
   * Gets node definition (old or new structure)
   */
  public getNodeDefinition(nodeId: string): NodeDefinition | INodeTypeDescription | undefined {
    // First check old structure
    const oldDefinition = nodeRegistry.getNodeDefinition(nodeId);
    if (oldDefinition) {
      return oldDefinition;
    }

    // Then check n8n-compatible nodes
    const n8nNode = this.nodeRegistryV2.getNode(nodeId);
    if (n8nNode && n8nNode.n8nDescription) {
      return n8nNode.n8nDescription;
    }

    return undefined;
  }

  /**
   * Gets all node definitions (both old and new)
   */
  public getAllNodeDefinitions(): Array<NodeDefinition | INodeTypeDescription> {
    const oldNodes = nodeRegistry.getAllNodeDefinitions();
    const n8nNodes = this.nodeRegistryV2.getAllNodes()
      .filter(node => !nodeRegistry.getNode(node.id)) // Don't duplicate
      .map(node => node.n8nDescription)
      .filter((desc): desc is INodeTypeDescription => desc !== undefined);

    return [...oldNodes, ...n8nNodes];
  }

  /**
   * Gets n8n-compatible node description
   */
  public getN8nNodeDescription(nodeId: string): INodeTypeDescription | undefined {
    const n8nNode = this.nodeRegistryV2.getNode(nodeId);
    return n8nNode?.n8nDescription;
  }

  /**
   * Gets all n8n-compatible node descriptions
   */
  public getAllN8nNodeDescriptions(): INodeTypeDescription[] {
    return this.nodeRegistryV2.getAllNodes()
      .map(node => node.n8nDescription)
      .filter((desc): desc is INodeTypeDescription => desc !== undefined);
  }

  /**
   * Checks if a node is n8n-compatible
   */
  public isN8nCompatible(nodeId: string): boolean {
    const n8nNode = this.nodeRegistryV2.getNode(nodeId);
    return n8nNode?.isN8nCompatible || false;
  }

  /**
   * Gets node schema (converts n8n description to old schema format if needed)
   */
  public getNodeSchema(nodeId: string): any {
    // First try old structure
    const oldSchema = nodeRegistry.getNodeSchema(nodeId);
    if (oldSchema) {
      return oldSchema;
    }

    // Then try n8n-compatible
    const n8nNode = this.nodeRegistryV2.getNode(nodeId);
    if (n8nNode && n8nNode.n8nDescription) {
      // Convert n8n description to old schema format
      return this.convertN8nDescriptionToSchema(n8nNode.n8nDescription);
    }

    return null;
  }

  /**
   * Converts n8n description to old schema format
   */
  private convertN8nDescriptionToSchema(description: INodeTypeDescription): any {
    return {
      id: description.name,
      type: this.mapGroupToNodeType(description.group[0]),
      name: description.displayName,
      description: description.description,
      category: description.group[0],
      version: Array.isArray(description.version) 
        ? String(description.version[description.version.length - 1])
        : String(description.version),
      author: 'n8n-compatible',
      parameters: description.properties.map(prop => ({
        name: prop.name,
        type: prop.type,
        displayName: prop.displayName,
        description: prop.description,
        required: prop.required,
        default: prop.default,
        placeholder: prop.placeholder,
        options: prop.options,
        typeOptions: prop.typeOptions,
        displayOptions: prop.displayOptions,
      })),
      inputs: description.inputs === 'main' || (Array.isArray(description.inputs) && description.inputs.includes('main'))
        ? [{ name: 'input', type: 'object', displayName: 'Input Data', description: 'Input data from previous node' }]
        : [],
      outputs: description.outputs === 'main' || (Array.isArray(description.outputs) && description.outputs.includes('main'))
        ? [{ name: 'output', type: 'object', displayName: 'Output Data', description: 'Output data for next node' }]
        : [],
    };
  }

  /**
   * Maps n8n group to node type
   */
  private mapGroupToNodeType(group: string): string {
    const groupMap: Record<string, string> = {
      'trigger': 'trigger',
      'transform': 'action',
      'input': 'action',
      'output': 'action',
      'organization': 'action',
      'schedule': 'trigger',
    };
    return groupMap[group] || 'action';
  }
}

export const nodeRegistryHelper = NodeRegistryHelper.getInstance();

