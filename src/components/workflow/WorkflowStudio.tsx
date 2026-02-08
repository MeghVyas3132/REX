import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WorkflowHeader } from './WorkflowHeader';
import { NodeSidebar } from './NodeSidebar';
import { WorkflowCanvas } from './WorkflowCanvas';
import { OutputPanel } from './OutputPanel';
import { WorkflowDashboard } from './WorkflowDashboard';
import { useWorkflowExecution } from './WorkflowExecution';
import { Node, Edge } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { workflowStorage, SavedWorkflow } from '@/lib/workflowStorage';
import { ApiService } from '@/lib/errorService';
import { logger } from '@/lib/logger';
import { normalizeWorkflowNodes } from '@/lib/nodeIdMappings';

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'draft' | 'archived';
  nodeCount: number;
  lastModified: string;
  lastRun?: string;
  nodes: Node[];
  edges: Edge[];
}

export const WorkflowStudio: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [outputPanelOpen, setOutputPanelOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'canvas'>('dashboard');
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [workflowName, setWorkflowName] = useState("My First Workflow");
  const [initialLoading, setInitialLoading] = useState(false);
  const [lastLoadedWorkflowId, setLastLoadedWorkflowId] = useState<string | null>(null);

  useEffect(() => {
    const workflowId = searchParams.get('id');
    
    // If no workflow ID in URL, don't do anything
    if (!workflowId) {
      return;
    }

    // Don't reload if it's the same workflow we already loaded
    if (workflowId === lastLoadedWorkflowId && currentWorkflow?.id === workflowId) {
      return;
    }

    // Use local cache immediately for responsiveness
    const cached = workflowStorage.getWorkflow(workflowId);
    if (cached) {
      const normalizedNodes = normalizeWorkflowNodes(cached.nodes as any);
      const normalizedWorkflow = { ...(cached as any), nodes: normalizedNodes };
      setCurrentWorkflow(normalizedWorkflow as any);
      setNodes(normalizedNodes);
      setEdges(cached.edges);
      setWorkflowName(cached.name);
      setLastLoadedWorkflowId(workflowId);
        setCurrentView('canvas');
    }

    // Fetch latest from backend explicitly
    setInitialLoading(true);
    ApiService.get<any>(`/api/workflows/${encodeURIComponent(workflowId)}`, { silent: true, toastTitle: 'Load Workflow' })
      .then((data) => {
        const wf = data?.data || data;
        if (!wf) return;
        const parsedNodes = Array.isArray(wf.nodes) ? wf.nodes : (typeof wf.nodes === 'string' ? JSON.parse(wf.nodes) : []);
        const parsedEdges = Array.isArray(wf.edges) ? wf.edges : (typeof wf.edges === 'string' ? JSON.parse(wf.edges) : []);
        const normalizedNodes = normalizeWorkflowNodes(parsedNodes as any);
        const normalized: any = {
          id: wf.id,
          name: wf.name || 'Untitled Workflow',
          description: wf.description || '',
          status: wf.isActive ? 'active' : 'draft',
          nodeCount: (parsedNodes || []).length,
          lastModified: wf.updatedAt || wf.updated_at,
          lastRun: wf.last_run || wf.lastRun,
          nodes: normalizedNodes,
          edges: parsedEdges
        };
        setCurrentWorkflow(normalized);
        setNodes(normalizedNodes);
        setEdges(parsedEdges);
        setWorkflowName(normalized.name);
        setLastLoadedWorkflowId(workflowId);
        setCurrentView('canvas');
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, [searchParams]); // Reload when URL search params change

  // Use the real workflow execution hook
  const { handleRun, handleStop, executions, autoSave, handleSave } = useWorkflowExecution({
    nodes,
    edges,
    workflowName,
    currentWorkflow,
    onSave: (saved) => {
      // adopt server-assigned id and reflect in URL
      setCurrentWorkflow((prev) => ({ ...(prev || {} as any), ...saved } as any));
      // Update workflow name if it changed
      if (saved?.name && saved.name !== workflowName) {
        setWorkflowName(saved.name);
      }
      if (saved?.id) {
        const params = new URLSearchParams(searchParams);
        params.set('id', saved.id);
        navigate({ search: params.toString() }, { replace: true });
      }
    },
    onDeploy: () => {},
    onRun: () => setOutputPanelOpen(true),
    onOutputs: (outputs) => {
      // Store outputs into nodes so NodeConfigPanel can show downloads
      setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, lastOutput: outputs[n.id] } })));
    }
  });

  // Reflect execution status onto node data for visual feedback
  useEffect(() => {
    if (!executions || executions.length === 0) {
      setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, executionStatus: undefined } })));
      return;
    }
    setNodes((nds) => nds.map((n) => {
      const exec = executions.find((e) => e.nodeId === n.id);
      const status = exec?.status === 'running' ? 'running' : undefined;
      return { ...n, data: { ...n.data, executionStatus: status } };
    }));
  }, [executions]);

  // Auto-save when nodes, edges, or workflow name change
  // Allow auto-save for both existing and new workflows
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      // Don't auto-save if workflow ID looks invalid (numeric IDs that might not exist in DB)
      const workflowId = (currentWorkflow as any)?.id;
      const hasValidId = workflowId && workflowId !== '6' && !/^[0-9]+$/.test(String(workflowId));
      
      // Only auto-save if workflow has proper ID or no ID (will create new)
      if (!workflowId || hasValidId || !String(workflowId).match(/^\d+$/)) {
        const timeoutId = setTimeout(() => {
          autoSave();
        }, 3000); // Auto-save after 3 seconds of inactivity (increased from 2s to reduce spam)

        return () => clearTimeout(timeoutId);
      }
    }
  }, [nodes, edges, workflowName, currentWorkflow, autoSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        // Allow saving even if currentWorkflow is null (for new workflows)
        if (nodes.length > 0 || edges.length > 0) {
          handleSave(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, handleSave]);

  const isRunning = executions.some(e => e.status === 'running');

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleNodeAdd = (nodeType: string, position: { x: number; y: number }) => {
    logger.debug('Node added', { nodeType, position });
  };

  const handleGetStarted = () => {
    setSidebarOpen(true);
  };

  const handleNodesChange = (newNodes: Node[]) => {
    setNodes(newNodes);
  };

  const handleEdgesChange = (newEdges: Edge[]) => {
    setEdges(newEdges);
  };

  const handleEditWorkflow = (workflow: Workflow) => {
    const normalizedNodes = normalizeWorkflowNodes(workflow.nodes as any);
    // Check if this is a sample workflow and preserve the original sample ID
    const sampleWorkflowIds = ['sample-gmail', 'sample-file-processing'];
    const isSampleWorkflow = sampleWorkflowIds.includes(workflow.id);
    
    const workflowWithSettings = {
      ...workflow,
      nodes: normalizedNodes,
      settings: {
        ...((workflow as any).settings || {}),
        ...(isSampleWorkflow && !(workflow as any).settings?.originalSampleId 
          ? { originalSampleId: workflow.id } 
          : {})
      }
    };
    
    setCurrentWorkflow(workflowWithSettings as any);
    setNodes(normalizedNodes);
    setEdges(workflow.edges);
    setWorkflowName(workflow.name);
    setLastLoadedWorkflowId(workflow.id);
    setCurrentView('canvas');
    // Update URL with workflow ID
    const params = new URLSearchParams();
    params.set('id', workflow.id);
    navigate({ search: params.toString() }, { replace: true });
  };

  const handleRunWorkflow = (workflow: Workflow) => {
    const normalizedNodes = normalizeWorkflowNodes(workflow.nodes as any);
    setCurrentWorkflow({ ...workflow, nodes: normalizedNodes });
    setNodes(normalizedNodes);
    setEdges(workflow.edges);
    setWorkflowName(workflow.name);
    setLastLoadedWorkflowId(workflow.id);
    setCurrentView('canvas');
    // Update URL with workflow ID
    const params = new URLSearchParams();
    params.set('id', workflow.id);
    navigate({ search: params.toString() }, { replace: true });
    // Auto-run the workflow after loading
    setTimeout(() => {
      handleRun();
    }, 500);
  };

  const handleCreateWorkflow = () => {
    setCurrentWorkflow(null);
    setNodes([]);
    setEdges([]);
    setWorkflowName("New Workflow");
    setLastLoadedWorkflowId(null);
    // Clear workflow ID from URL when creating new workflow
    const params = new URLSearchParams(searchParams);
    params.delete('id');
    navigate({ search: params.toString() }, { replace: true });
    setCurrentView('canvas');
  };

  const handleBackToDashboard = () => {
    // Navigate to home page instead of just switching view
    navigate('/');
  };

  // Convert executions to the format expected by OutputPanel
  const currentExecution = executions.length > 0 ? {
    id: `exec-${Date.now()}`,
    status: (executions.every(e => e.status === 'success') ? 'success' : 
           executions.some(e => e.status === 'error') ? 'error' : 
           executions.some(e => e.status === 'running') ? 'running' : 'stopped') as 'running' | 'success' | 'error' | 'stopped',
    startTime: new Date(Math.min(...executions.map(e => e.timestamp))).toISOString(),
    endTime: executions.every(e => e.status !== 'running') ? new Date().toISOString() : undefined,
    duration: executions.every(e => e.status !== 'running') ? 
      Date.now() - Math.min(...executions.map(e => e.timestamp)) : undefined,
    steps: executions.map(exec => ({
      id: `step-${exec.nodeId}`,
      nodeId: exec.nodeId,
      nodeName: (nodes.find(n => n.id === exec.nodeId)?.data?.label as string) || 'AI Node',
      status: exec.status,
      startTime: new Date(exec.timestamp).toISOString(),
      endTime: exec.status !== 'running' ? new Date().toISOString() : undefined,
      duration: exec.status !== 'running' ? 
        (exec.status === 'success' ? 1500 : 500) : undefined,
      input: exec.status === 'success' ? { prompt: 'AI generation request' } : undefined,
      output: exec.output,
      error: exec.error || undefined
    }))
  } : null;

  if (currentView === 'dashboard') {
    return (
      <div
        className="h-screen w-full bg-canvas-background overflow-auto"
        data-testid="workflow-dashboard-view"
      >
        <WorkflowDashboard
          onEditWorkflow={handleEditWorkflow}
          onRunWorkflow={handleRunWorkflow}
          onCreateWorkflow={handleCreateWorkflow}
        />
      </div>
    );
  }

  return (
    <div
      className="h-screen w-full bg-canvas-background flex flex-col overflow-hidden"
      data-testid="workflow-studio-view"
    >
      <WorkflowHeader 
        onSidebarToggle={handleSidebarToggle}
        workflowName={workflowName}
        isRunning={isRunning}
        nodes={nodes}
        edges={edges}
        onRunWorkflow={handleRun}
        onStopWorkflow={handleStop}
        onShowOutput={() => setOutputPanelOpen(true)}
        onWorkflowNameChange={setWorkflowName}
        onBackToDashboard={handleBackToDashboard}
        currentWorkflow={currentWorkflow}
        onSave={handleSave}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && (
          <div className="flex-shrink-0">
            <NodeSidebar 
              isOpen={sidebarOpen}
              onToggle={handleSidebarToggle}
            />
          </div>
        )}
        
        <div className="flex-1 h-full w-full min-w-0">
          <WorkflowCanvas 
            onNodeAdd={handleNodeAdd}
            onGetStarted={handleGetStarted}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onImmediateSave={() => handleSave(false)}
            initialNodes={nodes}
            initialEdges={edges}
          />
        </div>
      </div>
      
      <OutputPanel
        isOpen={outputPanelOpen}
        onToggle={() => setOutputPanelOpen(!outputPanelOpen)}
        execution={currentExecution}
      />
    </div>
  );
};