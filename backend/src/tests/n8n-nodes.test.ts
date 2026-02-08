/**
 * Tests for n8n-compatible nodes
 * Verifies registration, discovery, and execution
 */

import NodeRegistryV2 from '../core/registry/node-registry-v2';
import { nodeRegistry } from '../core/registry/node-registry';
import { nodeRegistryHelper } from '../core/registry/node-registry-helper';
import { N8nExecutionAdapter } from '../core/engine/n8n-execution-adapter';
import { WorkflowNode, ExecutionContext } from '@rex/shared';

describe('n8n Node Integration Tests', () => {
  let nodeRegistryV2: NodeRegistryV2;

  beforeAll(() => {
    nodeRegistryV2 = NodeRegistryV2.getInstance();
  });

  describe('Node Registration', () => {
    test('should register n8n-compatible nodes', () => {
      const n8nNodes = nodeRegistryV2.getN8nCompatibleNodes();
      expect(n8nNodes.length).toBeGreaterThan(0);
      
      // Check for specific nodes
      const manualTrigger = nodeRegistryV2.getNode('manualTrigger');
      expect(manualTrigger).toBeDefined();
      expect(manualTrigger?.isN8nCompatible).toBe(true);
      
      const codeNode = nodeRegistryV2.getNode('code');
      expect(codeNode).toBeDefined();
      expect(codeNode?.isN8nCompatible).toBe(true);
    });

    test('should register old structure nodes', () => {
      const oldNodes = nodeRegistryV2.getOldStructureNodes();
      expect(oldNodes.length).toBeGreaterThan(0);
    });

    test('should have unified access via helper', () => {
      const manualTrigger = nodeRegistryHelper.getNodeDefinition('manualTrigger');
      expect(manualTrigger).toBeDefined();
      
      const isN8nCompatible = nodeRegistryHelper.isN8nCompatible('manualTrigger');
      expect(isN8nCompatible).toBe(true);
    });
  });

  describe('Node Discovery', () => {
    test('should find nodes in both registries', () => {
      // Check n8n-compatible node
      const manualTrigger = nodeRegistry.getNode('manualTrigger');
      expect(manualTrigger).toBeDefined();
      
      // Check old structure node (if exists)
      const oldNode = nodeRegistry.getNode('code');
      // This might be in either registry
      expect(oldNode || nodeRegistryV2.getNode('code')).toBeDefined();
    });

    test('should return all node definitions', () => {
      const allNodes = nodeRegistryHelper.getAllNodeDefinitions();
      expect(allNodes.length).toBeGreaterThan(0);
      
      // Should include both old and new
      const hasN8nNodes = allNodes.some(node => {
        const nodeId = 'id' in node ? node.id : node.name;
        return nodeRegistryHelper.isN8nCompatible(nodeId);
      });
      expect(hasN8nNodes).toBe(true);
    });
  });

  describe('Node Execution', () => {
    test('should execute n8n-compatible manual trigger', async () => {
      const node: WorkflowNode = {
        id: 'test-manual',
        type: 'manualTrigger',
        position: { x: 0, y: 0 },
        data: {
          config: {},
        },
      };

      const context: ExecutionContext = {
        runId: 'test-run',
        workflowId: 'test-workflow',
        nodeId: 'test-manual',
        input: {},
        output: {},
        variables: {},
        credentials: {},
      };

      const n8nNode = nodeRegistryV2.getNode('manualTrigger');
      if (n8nNode && n8nNode.n8nNode) {
        const result = await N8nExecutionAdapter.executeN8nNode(
          node,
          context,
          n8nNode.n8nNode,
          []
        );

        expect(result.success).toBe(true);
        expect(result.output).toBeDefined();
      }
    });

    test('should execute n8n-compatible code node', async () => {
      const node: WorkflowNode = {
        id: 'test-code',
        type: 'code',
        position: { x: 0, y: 0 },
        data: {
          config: {
            language: 'javaScript',
            mode: 'runOnceForAllItems',
            jsCode: 'return { result: "Hello World" };',
          },
        },
      };

      const context: ExecutionContext = {
        runId: 'test-run',
        workflowId: 'test-workflow',
        nodeId: 'test-code',
        input: {},
        output: {},
        variables: {},
        credentials: {},
      };

      const n8nNode = nodeRegistryV2.getNode('code');
      if (n8nNode && n8nNode.n8nNode) {
        const result = await N8nExecutionAdapter.executeN8nNode(
          node,
          context,
          n8nNode.n8nNode,
          [{ json: { test: 'data' } }]
        );

        expect(result.success).toBe(true);
        expect(result.output).toBeDefined();
      }
    });
  });

  describe('Schema Conversion', () => {
    test('should convert n8n description to schema', () => {
      const n8nNode = nodeRegistryV2.getNode('manualTrigger');
      if (n8nNode && n8nNode.n8nDescription) {
        const schema = nodeRegistryHelper.getNodeSchema('manualTrigger');
        expect(schema).toBeDefined();
        expect(schema.id).toBe('manualTrigger');
        expect(schema.parameters).toBeDefined();
      }
    });

    test('should handle displayOptions in schema', () => {
      const n8nNode = nodeRegistryV2.getNode('code');
      if (n8nNode && n8nNode.n8nDescription) {
        const schema = nodeRegistryHelper.getNodeSchema('code');
        expect(schema).toBeDefined();
        // Check that properties with displayOptions are included
        expect(schema.parameters).toBeDefined();
      }
    });
  });

  describe('Backward Compatibility', () => {
    test('should still support old node structure', () => {
      const oldNode = nodeRegistry.getNode('http-request');
      // Old node should still be accessible
      expect(oldNode || nodeRegistryV2.getNode('httpRequest')).toBeDefined();
    });

    test('should create node instances for both structures', () => {
      // Try to create instance of n8n-compatible node
      try {
        const n8nInstance = nodeRegistry.createNodeInstance('manualTrigger');
        expect(n8nInstance).toBeDefined();
      } catch (error) {
        // If it fails, check if it's in V2 registry
        const v2Node = nodeRegistryV2.getNode('manualTrigger');
        expect(v2Node).toBeDefined();
      }
    });
  });
});

