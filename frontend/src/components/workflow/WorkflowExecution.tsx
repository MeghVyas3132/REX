import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Node, Edge } from '@xyflow/react';
import { OPENROUTER_API_KEY } from '@/config';
import { uploadToGoogleDrive, validateGoogleDriveConfig } from '@/lib/googleDrive';
import { ApiService } from '@/lib/errorService';
import { workflowStorage, SavedWorkflow } from '@/lib/workflowStorage';
import { API_CONFIG } from '@/lib/config';
import { logger } from '@/lib/logger';

interface WorkflowExecutionProps {
  nodes: Node[];
  edges: Edge[];
  workflowName: string;
  currentWorkflow?: any;
  onSave?: (saved: SavedWorkflow) => void;
  onDeploy?: () => void;
  onRun?: () => void;
  onOutputs?: (outputs: { [nodeId: string]: any }) => void;
  isRunning?: boolean;
}

interface WorkflowExecution {
  id: string;
  nodeId: string;
  status: 'running' | 'success' | 'error' | 'cancelled';
  timestamp: number;
  output?: any;
  error?: string;
}

export const useWorkflowExecution = ({
  nodes,
  edges,
  workflowName,
  currentWorkflow,
  onSave,
  onDeploy,
  onRun,
  onOutputs,
  isRunning
}: WorkflowExecutionProps) => {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [currentEventSource, setCurrentEventSource] = useState<EventSource | null>(null);
  const { toast } = useToast();

  const handleSave = async (showToast = false) => {
    // Allow saving even if currentWorkflow is null (for new workflows)
    if (nodes.length === 0 && edges.length === 0) {
      if (showToast) {
        toast({
          title: "Cannot Save",
          description: "Please add at least one node to the workflow before saving.",
          variant: "destructive"
        });
      }
      return;
    }
    
    setIsSaving(true);
    try {
      // Ensure all node configurations are preserved when saving
      const nodesWithConfigs = nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          // Ensure config is always an object and preserved
          config: node.data?.config || {},
          // Preserve all other data fields
          subtype: node.data?.subtype,
          baseLabel: node.data?.baseLabel,
          label: node.data?.label,
          options: node.data?.options,
          credentials: node.data?.credentials,
        }
      }));

      // Use the current workflowName (which may have been edited by the user)
      // Don't prevent renaming - allow users to rename workflows freely
      
      // Check if this is a sample workflow and store the original sample ID in settings
      const sampleWorkflowIds = ['sample-gmail', 'sample-file-processing'];
      const isSampleWorkflow = currentWorkflow?.id && sampleWorkflowIds.some(sid => 
        currentWorkflow.id === sid || (currentWorkflow as any).settings?.originalSampleId === sid
      );
      
      // Find the original sample ID if this workflow came from a sample
      let originalSampleId: string | undefined;
      if (currentWorkflow) {
        originalSampleId = (currentWorkflow as any).settings?.originalSampleId;
        if (!originalSampleId && isSampleWorkflow) {
          // Try to match by node structure to find original sample ID
          const SAMPLE_WORKFLOWS = [
            { id: 'sample-gmail', nodes: [{ data: { subtype: 'gmail' } }, { data: { subtype: 'gmail' } }, { data: { subtype: 'gmail' } }] },
            { id: 'sample-file-processing', nodes: [{ data: { subtype: 'file-upload' } }, { data: { subtype: 'data-cleaning' } }, { data: { subtype: 'google-drive' } }] }
          ];
          for (const sample of SAMPLE_WORKFLOWS) {
            if (nodes.length === sample.nodes.length && 
                sample.nodes.every((sn, i) => nodes[i]?.data?.subtype === sn.data.subtype)) {
              originalSampleId = sample.id;
              break;
            }
          }
        }
      }
      
      const workflowData = {
        ...(currentWorkflow || {}),
        nodes: nodesWithConfigs, // Use nodes with preserved configs
        edges,
        name: workflowName.trim() || currentWorkflow?.name || 'Untitled Workflow', // Use edited name or fallback
        lastModified: new Date().toISOString(),
        description: currentWorkflow?.description || '',
        settings: {
          ...((currentWorkflow as any)?.settings || {}),
          ...(originalSampleId ? { originalSampleId } : {})
        }
      };

      const saved = await workflowStorage.saveWorkflow(workflowData as any);
      onSave?.(saved);
      setLastSaved(new Date());
      
      if (showToast) {
        toast({
          title: "Saved",
          description: "Workflow saved successfully!",
        });
      }
    } catch (error) {
      logger.error('Save error', error as Error);
      toast({
        title: "Error",
        description: "Failed to save workflow. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      // Deploy logic here
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Deployed",
        description: "Workflow deployed successfully!",
      });
    } catch (error) {
      logger.error('Deploy error', error as Error);
      toast({
        title: "Error",
        description: "Failed to deploy workflow",
        variant: "destructive"
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const autoSave = async () => {
    // Allow auto-save for workflows with nodes/edges, even if currentWorkflow is null
    if (nodes.length > 0 || edges.length > 0) {
      const workflowId = (currentWorkflow as any)?.id;
      // Skip auto-save for suspicious IDs that might not exist (like single numeric IDs)
      // These are often from frontend-only workflows that haven't been saved to backend yet
      if (workflowId && /^[0-9]+$/.test(String(workflowId)) && String(workflowId).length < 3) {
        // Likely invalid ID - skip auto-save to prevent 404 errors
        return;
      }
      await handleSave();
    }
  };

  const handleRun = async () => {
    try {
      const backendUrl = API_CONFIG.baseUrl;
      logger.info('Starting workflow run', { backendUrl });
      toast({ title: 'Starting run', description: `Backend: ${backendUrl}` });
      
      // Generate runId on client so we can attach SSE before posting
      const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setCurrentRunId(runId);

      // Optimistically mark nodes as running
      const nodeExecutionOrder = getNodeExecutionOrder(nodes, edges);
      setExecutions(nodeExecutionOrder.map(nodeId => ({
        id: `exec_${Date.now()}_${nodeId}`,
        nodeId,
        status: 'running',
        timestamp: Date.now()
      })));
      onRun?.();

      // Subscribe to SSE for live updates
      const eventSource = new EventSource(`${backendUrl}/api/workflows/runs/stream?runId=${encodeURIComponent(runId)}`);
      setCurrentEventSource(eventSource);

      // If no events arrive within 20s, surface a visible error so the user isn't stuck on "running"
      let receivedAnyEvent = false;
      const noEventTimeout = setTimeout(() => {
        if (!receivedAnyEvent) {
          setExecutions(prev => prev.map(e => ({ ...e, status: e.status === 'running' ? 'error' : e.status, error: 'No response from backend (timeout). Ensure server is running on VITE_BACKEND_URL.' })));
          toast({ title: 'Execution timeout', description: 'No response from backend. Check server and network.', variant: 'destructive' });
          try { eventSource.close(); } catch {}
        }
      }, 20000);
      let runTriggered = false;

      // Extract input data from Manual Trigger node if present
      const getInitialInput = () => {
        const manualTriggerNode = nodes.find((n: any) => n.type === 'trigger' && (n.data?.subtype === 'manual' || n.data?.subtype === 'Manual Trigger'));
        if (manualTriggerNode?.data?.config?.inputData) {
          const inputData = manualTriggerNode.data.config.inputData;
          // If it's a string, try to parse it
          if (typeof inputData === 'string') {
            try {
              return JSON.parse(inputData);
            } catch {
              return {};
            }
          }
          return inputData;
        }
        return {};
      };

      const triggerRun = async () => {
        if (runTriggered) return;
        runTriggered = true;
        const savedId = (currentWorkflow as any)?.id;
        const initialInput = getInitialInput();
        const runDirect = async () => {
          logger.debug('Fallback to direct run-workflow');
          try {
            const j = await ApiService.post<any>(
              '/api/workflows/run-workflow',
              { nodes, edges, initialInput, runId },
              { toastTitle: 'Run Workflow', silent: true }
            );
            if (!j) {
              const message = 'Direct run error: request failed';
              setExecutions(prev => prev.map(e => ({ ...e, status: e.status === 'running' ? 'error' : e.status, error: message })));
              toast({ title: 'Run failed', description: message, variant: 'destructive' });
              logger.error('Direct run failed', new Error('Direct run failed'));
            }
          } catch (err: any) {
            const message = err?.message || 'Direct run error';
            setExecutions(prev => prev.map(e => ({ ...e, status: e.status === 'running' ? 'error' : e.status, error: message })));
            toast({ title: 'Run failed', description: message, variant: 'destructive' });
            logger.error('Direct run failed', err as Error);
          }
        };

        const runSaved = async (id: string) => {
          try {
            const initialInput = getInitialInput();
            const res = await ApiService.post<any>(
              `/api/workflows/${encodeURIComponent(id)}/run`,
              { input: initialInput, runOptions: { runId } },
              { toastTitle: 'Run Saved Workflow', silent: true }
            );
            if (!res) {
              logger.warn('Saved run failed, falling back');
              await runDirect();
            }
          } catch (err) {
            logger.warn('Saved run exception, falling back', { error: err as Error });
            await runDirect();
          }
        };

        if (savedId) {
          await runSaved(savedId);
        } else {
          await runDirect();
        }
      };

      eventSource.addEventListener('connected', async () => {
        receivedAnyEvent = true;
        await triggerRun();
      });

      // Safety: if server didn’t emit 'connected', trigger the run after 1500ms
      setTimeout(() => {
        if (!runTriggered) {
          logger.warn('No connected event; triggering run anyway');
          triggerRun();
        }
      }, 1500);

      // Watchdog: if still nothing 5s after click, surface a visible error
      setTimeout(() => {
        if (!runTriggered) {
          const message = 'Run did not start: no server acknowledgement. Check backend URL and CORS.';
          setExecutions(prev => prev.map(e => ({ ...e, status: e.status === 'running' ? 'error' : e.status, error: message })));
          toast({ title: 'Run not started', description: message, variant: 'destructive' });
        }
      }, 5000);
      eventSource.addEventListener('workflow:start', (ev: MessageEvent) => {
        receivedAnyEvent = true;
        try {
          const { runId, data } = JSON.parse(ev.data);
          logger.workflowExecution('', runId, 'workflow-started', data);
        } catch {}
      });
      eventSource.addEventListener('node:start', (ev: MessageEvent) => {
        receivedAnyEvent = true;
        try {
          const { nodeId, data } = JSON.parse(ev.data);
          logger.nodeExecution(data?.nodeId || '', '', 'node-started', data);
          setExecutions(prev => prev.map(e => e.nodeId === nodeId ? { ...e, status: 'running', timestamp: Date.now() } : e));
        } catch {}
      });
      eventSource.addEventListener('node:success', (ev: MessageEvent) => {
        receivedAnyEvent = true;
        try {
          const { nodeId, data } = JSON.parse(ev.data);
          logger.nodeExecution(data?.nodeId || '', '', 'node-completed', data);
          setExecutions(prev => prev.map(e => e.nodeId === nodeId ? { ...e, status: 'success', output: data?.result, timestamp: Date.now() } : e));
        } catch {}
      });
      eventSource.addEventListener('node:error', (ev: MessageEvent) => {
        receivedAnyEvent = true;
        try {
          const { nodeId, data } = JSON.parse(ev.data);
          logger.nodeExecution(data?.nodeId || '', '', 'node-failed', data);
          setExecutions(prev => prev.map(e => e.nodeId === nodeId ? { ...e, status: 'error', error: data?.error, timestamp: Date.now() } : e));
        } catch {}
      });
      eventSource.addEventListener('workflow:complete', (ev: MessageEvent) => {
        receivedAnyEvent = true;
        try {
          const { runId, data } = JSON.parse(ev.data);
          logger.workflowExecution('', runId, 'workflow-completed', data);
          setExecutions(prev => prev.map(e => ({ ...e, status: e.status === 'running' ? 'success' : e.status })));
          // Clean up
          setCurrentRunId(null);
          setCurrentEventSource(null);
          eventSource.close();
        } catch {}
      });
      eventSource.addEventListener('workflow:error', (ev: MessageEvent) => {
        receivedAnyEvent = true;
        try {
          const { runId, data } = JSON.parse(ev.data);
          logger.workflowExecution('', runId, 'workflow-failed', data);
          const errMsg = data?.error || 'Workflow failed';
          setExecutions(prev => prev.map(e => ({ ...e, status: e.status === 'running' ? 'error' : e.status, error: e.error || errMsg })));
          toast({ title: 'Workflow error', description: errMsg, variant: 'destructive' });
          // Clean up
          setCurrentRunId(null);
          setCurrentEventSource(null);
          eventSource.close();
        } catch {}
      });
      eventSource.addEventListener('workflow:cancelled', (ev: MessageEvent) => {
        receivedAnyEvent = true;
        try {
          const { runId, data } = JSON.parse(ev.data);
          logger.workflowExecution('', runId, 'workflow-cancelled', data);
          setExecutions(prev => prev.map(e => ({ ...e, status: e.status === 'running' ? 'cancelled' : e.status })));
          toast({ title: 'Workflow cancelled', description: 'Workflow execution was stopped', variant: 'default' });
          // Clean up
          setCurrentRunId(null);
          setCurrentEventSource(null);
          eventSource.close();
        } catch {}
      });
      eventSource.addEventListener('run:complete', async (ev: MessageEvent) => {
        receivedAnyEvent = true;
        try {
          const payload = JSON.parse(ev.data);
          const runId = payload?.runId || payload?.data?.runId;
          const outputs = payload?.data?.nodeResults || {};
          onOutputs?.(outputs);
          
          // Fetch complete execution result from backend if we have a runId and workflowId
          const savedId = (currentWorkflow as any)?.id;
          if (runId && savedId) {
            try {
              const runsData = await ApiService.get<any>(`/api/workflows/${encodeURIComponent(savedId)}/runs?limit=1&offset=0`, { silent: true });
              if (runsData) {
                const latestRun = runsData?.data?.[0];
                if (latestRun && latestRun.id === runId) {
                  // Update executions with complete backend data
                  const nodeResults = latestRun.nodeResults || latestRun.node_results || {};
                  const executionOrder = latestRun.executionOrder || latestRun.execution_order || [];
                  
                  // Map backend run data to execution format
                  // Backend structure: nodeResults[nodeId] = { success, result, input, node, nodeType, subtype, timestamp, duration }
                  setExecutions(prevExecutions => {
                    const updatedExecutions = executionOrder.map((nodeId: string, idx: number) => {
                      const nodeResult = nodeResults[nodeId];
                      const existing = prevExecutions.find(e => e.nodeId === nodeId);
                      
                      // Backend stores output as 'result', not 'output'
                      // Also check if result has nested success/error structure
                      let nodeOutput = nodeResult?.result || nodeResult?.output || nodeResult;
                      let nodeError = nodeResult?.error || existing?.error;
                      
                      // Check if result itself contains error information
                      if (nodeOutput && typeof nodeOutput === 'object') {
                        if (nodeOutput.error && !nodeError) {
                          nodeError = nodeOutput.error;
                        }
                        // If result has success: false, extract error from details
                        if (nodeOutput.success === false) {
                          nodeError = nodeOutput.error || nodeOutput.details?.error || nodeError || 'Execution failed';
                        }
                      }
                      
                      // Backend now stores input that was passed to each node
                      const nodeInput = nodeResult?.input || existing?.input;
                      
                      // Determine success status - check multiple places
                      // nodeResult.success (top level)
                      // nodeResult.result.success (nested in result)
                      // nodeResult.error (if error exists, it's a failure)
                      let nodeSuccess = true;
                      if (nodeResult?.success === false) {
                        nodeSuccess = false;
                      } else if (nodeResult?.result?.success === false) {
                        nodeSuccess = false;
                      } else if (nodeResult?.error) {
                        nodeSuccess = false;
                      } else if (nodeOutput && typeof nodeOutput === 'object' && nodeOutput.success === false) {
                        nodeSuccess = false;
                      }
                      
                      return {
                        id: `exec_${runId}_${nodeId}`,
                        nodeId,
                        status: nodeSuccess ? 'success' : 'error',
                        timestamp: existing?.timestamp || (nodeResult?.timestamp ? new Date(nodeResult.timestamp).getTime() : Date.now()),
                        input: nodeInput, // Use the input from nodeResult
                        output: nodeSuccess ? nodeOutput : (nodeOutput || {}), // Show output even on error for debugging
                        error: nodeError
                      };
                    });
                    return updatedExecutions.length > 0 ? updatedExecutions : prevExecutions;
                  });
                }
              }
            } catch (fetchError) {
              logger.warn('Failed to fetch complete execution result', { error: fetchError as Error });
            }
          }
          
          toast({ title: 'Success', description: 'Workflow executed with live updates!' });
        } catch {}
        try { eventSource.close(); } catch {}
        clearTimeout(noEventTimeout);
      });

      eventSource.addEventListener('error', (e: any) => {
        // Network/SSE error – surface immediately
        const desc = (e && e.message) ? `SSE error: ${e.message}` : 'SSE connection error. Is backend running?';
        setExecutions(prev => prev.map(ex => ({ ...ex, status: ex.status === 'running' ? 'error' : ex.status, error: desc })));
        toast({ title: 'Stream error', description: desc, variant: 'destructive' });
        try { eventSource.close(); } catch {}
        clearTimeout(noEventTimeout);
      });
      
    } catch (error: any) {
      logger.error('Workflow execution error', error as Error);
      
      // Create error execution records
      const nodeExecutionOrder = getNodeExecutionOrder(nodes, edges);
      const newExecutions: WorkflowExecution[] = nodeExecutionOrder.map(nodeId => ({
        id: `exec_${Date.now()}_${nodeId}`,
        nodeId,
        status: 'error',
        timestamp: Date.now(),
          error: error.message || 'Failed to execute workflow'
      }));
      
      setExecutions(newExecutions);
      
      toast({
        title: "Error",
        description: `Failed to run workflow: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  // Helper function to get execution order based on edges
  const getNodeExecutionOrder = (nodes: Node[], edges: Edge[]): string[] => {
    const nodeIds = nodes.map(n => n.id);
    const executionOrder: string[] = [];
    const visited = new Set<string>();
    
    // Start with nodes that have no incoming edges
    const startNodes = nodeIds.filter(id => 
      !edges.some(edge => edge.target === id)
    );
    
    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      // Pre-order push so sources run before their dependents
      executionOrder.push(nodeId);
      
      // Visit all nodes that this node connects to
      const outgoingEdges = edges.filter(edge => edge.source === nodeId);
      for (const edge of outgoingEdges) {
        visit(edge.target);
      }
    };
    
    // Visit all start nodes
    for (const nodeId of startNodes) {
      visit(nodeId);
    }
    
    // Add any remaining nodes
    for (const nodeId of nodeIds) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }
    
    return executionOrder;
  };
  
  // Helper function to get input data for a node
  const getInputDataForNode = (node: Node, nodeOutputs: { [nodeId: string]: any }, edges: Edge[]): any => {
    const inputEdges = edges.filter(edge => edge.target === node.id);
    const inputs: any = {};
    
    for (const edge of inputEdges) {
      const sourceNodeId = edge.source;
      const sourceOutput = nodeOutputs[sourceNodeId];
      if (sourceOutput) {
        inputs[sourceNodeId] = sourceOutput;
        
        // If this is an AI node output, make it easily accessible
        if (sourceOutput.provider === 'OpenRouter') {
          inputs.aiOutput = sourceOutput;
        }
      }
    }
    
    return inputs;
  };

  const handleStop = async () => {
    try {
      if (!currentRunId) {
        toast({
          title: "No running workflow",
          description: "There is no workflow execution to stop",
          variant: "default"
        });
        return;
      }

      // Call the stop endpoint
      const backendUrl = API_CONFIG.baseUrl;
      const response = await fetch(`${backendUrl}/api/workflows/runs/${encodeURIComponent(currentRunId)}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        logger.info('Workflow execution stopped', { runId: currentRunId });
        
        // Update executions to show cancelled status - this will make isRunning false
        setExecutions(prev => prev.map(e => ({ 
          ...e, 
          status: e.status === 'running' ? 'cancelled' : e.status 
        })));
        
        // Clean up immediately to ensure state is reset
        if (currentEventSource) {
          currentEventSource.close();
          setCurrentEventSource(null);
        }
        setCurrentRunId(null);
        
        toast({
          title: "Workflow stopped",
          description: "Workflow execution has been cancelled",
        });
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to stop workflow' }));
        toast({
          title: "Error",
          description: errorData.error || 'Failed to stop workflow execution',
          variant: "destructive"
        });
        
        // Even on error, update executions and clean up
        setExecutions(prev => prev.map(e => ({ 
          ...e, 
          status: e.status === 'running' ? 'cancelled' : e.status 
        })));
        
        // Clean up - ensure state is reset so button changes back to "Run Workflow"
        if (currentEventSource) {
          currentEventSource.close();
          setCurrentEventSource(null);
        }
        setCurrentRunId(null);
      }
    } catch (error: any) {
      logger.error('Failed to stop workflow', error as Error);
      
      // Even on error, clean up and reset state so button changes back
      if (currentEventSource) {
        currentEventSource.close();
        setCurrentEventSource(null);
      }
      setCurrentRunId(null);
      
      // Update executions to ensure isRunning becomes false
      setExecutions(prev => prev.map(e => ({ 
        ...e, 
        status: e.status === 'running' ? 'cancelled' : e.status 
      })));
      
      toast({
        title: "Error",
        description: `Failed to stop workflow: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  return {
    handleSave,
    handleDeploy,
    handleRun,
    handleStop,
    autoSave,
    isSaving,
    isDeploying,
    executions,
    lastSaved
  };
};