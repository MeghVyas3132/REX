import React, { useCallback, useState } from 'react';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { TriggerNode } from './nodes/TriggerNode';
import { ActionNode } from './nodes/ActionNode';
import { UtilityNode } from './nodes/UtilityNode';
import { AINode } from './nodes/AINode';
import { EmptyState } from './EmptyState';
import { logger } from '@/lib/logger';
import { NodeConfigPanel } from './NodeConfigPanel';
import { runWorkflow } from './executor';

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  utility: UtilityNode,
  ai: AINode,
};

const initialNodes: Node[] = [];

const initialEdges: Edge[] = [];

const deriveBaseLabel = (label?: string, fallback?: string) => {
  const resolved = label || fallback || 'Node';
  const separatorIndex = resolved.indexOf(' - ');
  return separatorIndex >= 0 ? resolved.substring(0, separatorIndex) : resolved;
};

const ensureNodeHasBaseLabel = (node: Node): Node => {
  const existingLabel = (node.data as any)?.label || (node.data as any)?.name || `${node.type} node`;
  const baseLabel = (node.data as any)?.baseLabel || deriveBaseLabel(existingLabel, existingLabel);

  return {
    ...node,
    data: {
      ...node.data,
      label: existingLabel,
      baseLabel,
    },
  };
};

interface WorkflowCanvasProps {
  onNodeAdd?: (nodeType: string, position: { x: number; y: number }) => void;
  onGetStarted?: () => void;
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  onImmediateSave?: () => void;
  initialNodes?: Node[];
  initialEdges?: Edge[];
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({ 
  onNodeAdd, 
  onGetStarted, 
  onNodesChange: onNodesChangeExternal, 
  onEdgesChange: onEdgesChangeExternal,
  onImmediateSave,
  initialNodes = [],
  initialEdges = []
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes.map(ensureNodeHasBaseLabel));
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [hasStarted, setHasStarted] = useState(initialNodes.length > 0);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    onNodesChangeExternal?.(nodes);
  }, [nodes, onNodesChangeExternal]);

  React.useEffect(() => {
    onEdgesChangeExternal?.(edges);
  }, [edges, onEdgesChangeExternal]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const nodeData = JSON.parse(event.dataTransfer.getData('application/nodedata') || '{}');


      if (typeof type === 'undefined' || !type) {
        return;
      }

      // Compute canvas-relative drop position so nodes appear where dropped
      let position = { x: 100, y: 100 };
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (rect) {
        position = {
          x: Math.max(20, event.clientX - rect.left - 40),
          y: Math.max(20, event.clientY - rect.top - 20),
        };
      }

      // Set default config based on node type
      let defaultConfig = {};
      if (nodeData.subtype === 'data-cleaning') {
        defaultConfig = {
          enableMlPreprocessing: true,
          imputeStrategy: 'mean',
          removeRowsWithNull: true,
          normalization: 'minmax',
          outlierHandling: 'clip'
        };
      }

      const nodeLabel = nodeData.label || `${type} node`;
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { 
          label: nodeLabel,
          baseLabel: nodeLabel,
          icon: nodeData.icon || '⚙️',
          subtype: nodeData.subtype || '',
          description: nodeData.description || '',
          config: defaultConfig,
          credentials: {},
          // Pass through all n8n parameters
          ...nodeData
        },
      };

      // Add the node to the canvas
      setNodes((nds) => {
        const updatedNodes = nds.concat(newNode);
        // Automatically select the newly created node to open the config panel
        setTimeout(() => {
          setSelectedNode(newNode);
        }, 100);
        return updatedNodes;
      });
      
      setHasStarted(true);
      onNodeAdd?.(type, position);
    },
    [setNodes, onNodeAdd],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    logger.debug('Node clicked', { nodeId: node.id, nodeType: node.type, nodeSubtype: node.data?.subtype });
    setSelectedNode(node);
  }, []);

  // Edge styling based on node execution status
  React.useEffect(() => {
    setEdges((current) => {
      return current.map((edge) => {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        const sourceStatus = (source?.data as any)?.executionStatus as string | undefined;
        const targetStatus = (target?.data as any)?.executionStatus as string | undefined;

        let style: any = { ...(edge.style || {}) };
        let className: string | undefined = edge.className;
        let animated = false;

        if (sourceStatus === 'running') {
          animated = true;
          style.stroke = '#3b82f6'; // blue
          className = 'edge-running';
        } else if (targetStatus === 'error' || sourceStatus === 'error') {
          animated = false;
          style.stroke = '#ef4444'; // red
          className = 'edge-error';
        } else if (sourceStatus === 'success' || sourceStatus === 'completed') {
          animated = false;
          style.stroke = '#10b981'; // green
          className = 'edge-success';
        } else {
          // default
          animated = false;
          className = undefined;
          // keep existing stroke if any
        }

        return { ...edge, style, className, animated } as Edge;
      });
    });
  }, [nodes, setEdges]);

  const onDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const handleConfigSave = (updatedNode: Node) => {
    setNodes((nds) =>
      nds.map((node) => (node.id === updatedNode.id ? updatedNode : node))
    );
    // Keep the side panel inputs in sync while typing (e.g., credentials)
    setSelectedNode(updatedNode);
    // Persist immediately to backend/local storage so revisiting shows saved values for all nodes
    try {
      onImmediateSave?.();
    } catch {}
  };

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'trigger': return '⚡';
      case 'action': return '🔧';
      case 'utility': return '🛠️';
      case 'ai': return '🤖';
      default: return '⚙️';
    }
  };

  if (!hasStarted && nodes.length === 0) {
    return <EmptyState onGetStarted={() => { setHasStarted(true); onGetStarted?.(); }} />;
  }

  return (
    <div
      className="h-full w-full relative"
      ref={wrapperRef}
      data-testid="workflow-canvas"
    >
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        className="workflow-canvas"
        nodeTypes={nodeTypes}
        proOptions={{ hideAttribution: true }}
        multiSelectionKeyCode={['Shift']}
        selectionKeyCode={null}
        panOnDrag={[1, 2]}
        selectNodesOnDrag={true}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        panOnScroll={false}
        zoomOnScroll={true}
        zoomOnPinch={true}
        preventScrolling={false}
      >
        <Controls 
          className="react-flow-controls" 
          showZoom={true}
          showFitView={true}
          showInteractive={true}
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      </ReactFlow>

      {selectedNode && (
        <NodeConfigPanel
          selectedNode={selectedNode}
          onClose={() => setSelectedNode(null)}
          onSave={handleConfigSave}
          onDelete={onDeleteNode}
          nodes={nodes}
        />
      )}
    </div>
  );
};