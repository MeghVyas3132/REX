// =============================================================================
// Example Unit Test - Engine Graph Builder
// =============================================================================

import { describe, it, expect } from 'vitest';
import { GraphBuilder } from '../../../engine/graph/graph-builder.js';

describe('GraphBuilder', () => {
  const graphBuilder = new GraphBuilder();

  describe('getExecutionOrder', () => {
    it('should return nodes in topological order', () => {
      const nodes = [
        { id: 'node1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
        { id: 'node2', type: 'action', position: { x: 100, y: 0 }, data: {} },
        { id: 'node3', type: 'action', position: { x: 200, y: 0 }, data: {} },
      ];
      const edges = [
        { id: 'e1', source: 'node1', target: 'node2' },
        { id: 'e2', source: 'node2', target: 'node3' },
      ];

      const order = graphBuilder.getExecutionOrder(nodes, edges);

      expect(order).toEqual(['node1', 'node2', 'node3']);
    });

    it('should handle multiple start nodes', () => {
      const nodes = [
        { id: 'trigger1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
        { id: 'trigger2', type: 'trigger', position: { x: 0, y: 100 }, data: {} },
        { id: 'merge', type: 'action', position: { x: 100, y: 50 }, data: {} },
      ];
      const edges = [
        { id: 'e1', source: 'trigger1', target: 'merge' },
        { id: 'e2', source: 'trigger2', target: 'merge' },
      ];

      const order = graphBuilder.getExecutionOrder(nodes, edges);

      expect(order).toContain('trigger1');
      expect(order).toContain('trigger2');
      expect(order).toContain('merge');
      expect(order.indexOf('merge')).toBeGreaterThan(order.indexOf('trigger1'));
    });

    it('should handle single node workflow', () => {
      const nodes = [
        { id: 'single', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
      ];
      const edges: any[] = [];

      const order = graphBuilder.getExecutionOrder(nodes, edges);

      expect(order).toEqual(['single']);
    });
  });

  describe('validateGraph', () => {
    it('should validate a valid workflow', () => {
      const nodes = [
        { id: 'node1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
        { id: 'node2', type: 'action', position: { x: 100, y: 0 }, data: {} },
      ];
      const edges = [
        { id: 'e1', source: 'node1', target: 'node2' },
      ];

      const result = graphBuilder.validateGraph(nodes, edges);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty workflow', () => {
      const result = graphBuilder.validateGraph([], []);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow must have at least one node');
    });

    it('should warn about orphaned nodes', () => {
      const nodes = [
        { id: 'node1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
        { id: 'node2', type: 'action', position: { x: 100, y: 0 }, data: {} },
        { id: 'orphan', type: 'action', position: { x: 200, y: 0 }, data: {} },
      ];
      const edges = [
        { id: 'e1', source: 'node1', target: 'node2' },
      ];

      const result = graphBuilder.validateGraph(nodes, edges);

      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some(w => w.includes('orphan'))).toBe(true);
    });
  });

  describe('isTriggerNode', () => {
    it('should identify trigger nodes', () => {
      const edges = [
        { id: 'e1', source: 'node1', target: 'node2' },
      ];

      expect(graphBuilder.isTriggerNode('node1', edges)).toBe(true);
      expect(graphBuilder.isTriggerNode('node2', edges)).toBe(false);
    });
  });

  describe('isTerminalNode', () => {
    it('should identify terminal nodes', () => {
      const edges = [
        { id: 'e1', source: 'node1', target: 'node2' },
      ];

      expect(graphBuilder.isTerminalNode('node1', edges)).toBe(false);
      expect(graphBuilder.isTerminalNode('node2', edges)).toBe(true);
    });
  });
});
