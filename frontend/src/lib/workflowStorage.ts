import { Node, Edge } from '@xyflow/react';
import { ApiService } from './errorService';
import { logger } from '@/lib/logger';

export interface SavedWorkflow {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  nodes_count: number;
  status: 'draft' | 'active' | 'paused';
  last_run?: string;
  nodes: Node[];
  edges: Edge[];
}

import { API_CONFIG } from './config';
import { normalizeWorkflowNodes, normalizeWorkflowPayloadNodes } from './nodeIdMappings';

const STORAGE_KEY = 'workflow_studio_workflows';
const API_BASE = API_CONFIG.baseUrl;

export const workflowStorage = {
  // Normalize backend workflow (camelCase, prisma) to SavedWorkflow (snake_case) shape
  _normalize(workflow: any): SavedWorkflow {
    const nodes: any[] = Array.isArray(workflow?.nodes)
      ? workflow.nodes
      : (typeof workflow?.nodes === 'string' ? (() => { try { return JSON.parse(workflow.nodes); } catch { return []; } })() : []);
    const edges: any[] = Array.isArray(workflow?.edges)
      ? workflow.edges
      : (typeof workflow?.edges === 'string' ? (() => { try { return JSON.parse(workflow.edges); } catch { return []; } })() : []);
    const normalizedNodes = normalizeWorkflowNodes(nodes as any);
    const createdAt = workflow?.created_at || workflow?.createdAt || new Date().toISOString();
    const updatedAt = workflow?.updated_at || workflow?.updatedAt || createdAt;
    const status: 'draft' | 'active' | 'paused' = workflow?.status
      ? workflow.status
      : (workflow?.isActive ? 'active' : 'draft');

    return {
      id: workflow?.id || `workflow_${Date.now()}`,
      name: workflow?.name || 'Untitled Workflow',
      description: workflow?.description || '',
      created_at: createdAt,
      updated_at: updatedAt,
      nodes_count: typeof workflow?.nodes_count === 'number' ? workflow.nodes_count : normalizedNodes.length,
      status,
      last_run: workflow?.last_run || workflow?.lastRun,
      nodes: normalizedNodes,
      edges,
      // Preserve settings (including originalSampleId) for matching renamed workflows
      settings: workflow?.settings || (workflow as any)?.settings || {}
    } as SavedWorkflow;
  },
  // Save a workflow (tries backend POST/PUT, falls back to localStorage)
  saveWorkflow: async (workflow: Omit<SavedWorkflow, 'id' | 'created_at' | 'updated_at' | 'nodes_count'>): Promise<SavedWorkflow> => {
    const workflows = workflowStorage.getAllWorkflows();
    const canonicalNodes = normalizeWorkflowNodes(workflow.nodes as any);

    const localWorkflow: SavedWorkflow = {
      ...workflow,
      id: (workflow as any).id || `workflow_${Date.now()}`,
      created_at: (workflow as any).created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      nodes: canonicalNodes,
      nodes_count: canonicalNodes.length
    };

    // Attempt backend first with error handling
    if (API_BASE) {
      const hasId = Boolean((workflow as any).id);
      const workflowId = (workflow as any).id;
      
      // If workflow has ID, check if it exists before trying to update
      // This prevents auto-save from trying to update non-existent workflows
      if (hasId) {
        try {
          // Check if workflow exists first
          const existing = await ApiService.get(`/api/workflows/${encodeURIComponent(workflowId)}`, { 
            silent: true,
            toastTitle: 'Check Workflow' 
          });
          
          // If workflow doesn't exist, treat it as new workflow
          if (!existing || !existing.data) {
            // Workflow doesn't exist - create new one instead of updating
            const endpoint = '/api/workflows';
            const payload: any = {
              name: workflow.name,
              description: (workflow as any).description ?? '',
              nodes: normalizeWorkflowPayloadNodes(canonicalNodes),
              edges: workflow.edges,
              settings: (workflow as any).settings || {} // Preserve settings including originalSampleId
            };
            
            const result = await ApiService.post(endpoint, payload, { toastTitle: 'Save Workflow', silent: true });
            
            if (result?.data) {
              const normalized = workflowStorage._normalize(result.data);
              const current = workflowStorage.getAllWorkflows();
              const updated = [...current.filter(w => w.id !== workflowId), normalized];
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
              return normalized;
            }
            
            // Fallback to localStorage if backend fails
            const existingIndex = workflows.findIndex(w => w.id === workflowId);
            if (existingIndex >= 0) {
              workflows[existingIndex] = localWorkflow;
            } else {
              workflows.push(localWorkflow);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
            return localWorkflow;
          }
        } catch (checkError: any) {
          // If check fails (404), treat as new workflow
          if (checkError?.statusCode === 404 || checkError?.message?.includes('not found')) {
            // Workflow doesn't exist - create new one instead
            const endpoint = '/api/workflows';
            const payload: any = {
              name: workflow.name,
              description: (workflow as any).description ?? '',
              nodes: normalizeWorkflowPayloadNodes(canonicalNodes),
              edges: workflow.edges,
              settings: (workflow as any).settings || {} // Preserve settings including originalSampleId
            };
            
            try {
              const result = await ApiService.post(endpoint, payload, { toastTitle: 'Save Workflow', silent: true });
              
              if (result?.data) {
                const normalized = workflowStorage._normalize(result.data);
                const current = workflowStorage.getAllWorkflows();
                const updated = [...current.filter(w => w.id !== workflowId), normalized];
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                return normalized;
              }
            } catch (createError) {
              // Silent fallback to localStorage
            }
            
            // Fallback to localStorage
            const existingIndex = workflows.findIndex(w => w.id === workflowId);
            if (existingIndex >= 0) {
              workflows[existingIndex] = localWorkflow;
            } else {
              workflows.push(localWorkflow);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
            return localWorkflow;
          }
        }
      }
      
      const endpoint = hasId ? `/api/workflows/${encodeURIComponent(workflowId)}` : '/api/workflows';
      const payload: any = {
        name: workflow.name,
        description: (workflow as any).description ?? '',
        nodes: normalizeWorkflowPayloadNodes(canonicalNodes),
        edges: workflow.edges,
        settings: (workflow as any).settings || {} // Preserve settings including originalSampleId
      };

      try {
        const result = hasId 
          ? await ApiService.put(endpoint, payload, { toastTitle: 'Save Workflow', silent: true })
          : await ApiService.post(endpoint, payload, { toastTitle: 'Save Workflow', silent: true });

        if (result?.data) {
          const normalized = workflowStorage._normalize(result.data);
          const current = workflowStorage.getAllWorkflows();
          const idx = current.findIndex(w => w.id === normalized.id);
          if (idx >= 0) current[idx] = normalized; else current.push(normalized);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
          
          // Dispatch custom event to notify other components
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('workflow-saved'));
          }
          
          return normalized;
        }
      } catch (error) {
        logger.warn('Backend save failed, using local storage:', error);
      }
    }

    // Persist local copy immediately for responsive UX
    const existingIndex = workflows.findIndex(w => w.id === localWorkflow.id);
    if (existingIndex >= 0) {
      workflows[existingIndex] = localWorkflow;
    } else {
      workflows.push(localWorkflow);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
    
    // Dispatch custom event to notify other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('workflow-saved'));
    }
    
    return localWorkflow;
  },

  // Get all workflows (prefers backend, falls back to localStorage)
  getAllWorkflows: (): SavedWorkflow[] => {
    // Note: synchronous API required by callers; we opportunistically refresh in background
    if (API_BASE) {
      ApiService.get('/api/workflows', { silent: true }).then((data) => {
        if (data?.data) {
          try {
            const normalized = Array.isArray(data.data) ? data.data.map((w: any) => workflowStorage._normalize(w)) : [];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
          } catch {}
        } else {
          // If backend returns nothing (e.g., unauthenticated), clear cache to avoid showing other users' data
          localStorage.removeItem(STORAGE_KEY);
        }
      }).catch(() => {});
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((w: any) => workflowStorage._normalize(w));
    } catch (error) {
      logger.error('Error loading workflows from localStorage:', error as Error);
      return [];
    }
  },

  // Get a specific workflow by ID (prefers backend, falls back to local)
  getWorkflow: (id: string): SavedWorkflow | null => {
    if (API_BASE) {
      ApiService.get(`/api/workflows/${encodeURIComponent(id)}`, { silent: true }).then((wf) => {
        if (wf) {
          try {
            const normalized = workflowStorage._normalize(wf?.data || wf);
            const workflows = workflowStorage.getAllWorkflows();
            const idx = workflows.findIndex(w => w.id === normalized.id);
            if (idx >= 0) workflows[idx] = normalized; else workflows.push(normalized);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
          } catch {}
        }
      }).catch(() => {});
    }
    const workflows = workflowStorage.getAllWorkflows();
    return workflows.find(w => w.id === id) || null;
  },

  // Delete a workflow (prefers backend, falls back to local)
  deleteWorkflow: async (id: string): Promise<boolean> => {
    if (API_BASE) {
      try {
        await ApiService.delete(`/api/workflows/${encodeURIComponent(id)}`, { toastTitle: 'Delete Workflow' });
      } catch (error) {
        logger.warn('Backend delete failed, using local storage:', error);
      }
    }
    const workflows = workflowStorage.getAllWorkflows();
    const filtered = workflows.filter(w => w.id !== id);
    
    if (filtered.length !== workflows.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return true;
    }
    return false;
  },

  // Update workflow status (local only; optional: add backend field)
  updateWorkflowStatus: (id: string, status: 'draft' | 'active' | 'paused'): boolean => {
    const workflows = workflowStorage.getAllWorkflows();
    const workflow = workflows.find(w => w.id === id);
    
    if (workflow) {
      workflow.status = status;
      workflow.updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
      return true;
    }
    return false;
  },

  // Update last run time (local only; server updates last_run on completion in future)
  updateLastRun: (id: string): boolean => {
    const workflows = workflowStorage.getAllWorkflows();
    const workflow = workflows.find(w => w.id === id);
    
    if (workflow) {
      workflow.last_run = new Date().toISOString();
      workflow.updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
      return true;
    }
    return false;
  }
};

