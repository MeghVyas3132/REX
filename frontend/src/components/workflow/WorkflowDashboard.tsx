import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, History as HistoryIcon } from 'lucide-react';
import { workflowStorage } from '@/lib/workflowStorage';

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'draft' | 'archived';
  lastModified: string;
  lastRun?: string;
  nodes: any[];
  edges: any[];
}

interface WorkflowDashboardProps {
  onEditWorkflow: (workflow: Workflow) => void;
  onRunWorkflow: (workflow: Workflow) => void;
  onCreateWorkflow: () => void;
}

const SAMPLE_WORKFLOWS: Workflow[] = [
  {
    id: 'sample-gmail',
    name: 'Gmail Automation Workflow',
    description: 'Sequential Gmail operations: send, list, and read emails.',
    status: 'active',
    lastModified: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    lastRun: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    nodes: [
      {
        id: 'gmail-1',
        type: 'action',
        position: { x: 100, y: 100 },
        data: { label: 'Gmail Operation 1', baseLabel: 'Gmail', subtype: 'gmail' }
      },
      {
        id: 'gmail-2',
        type: 'action',
        position: { x: 400, y: 100 },
        data: { label: 'Gmail Operation 2', baseLabel: 'Gmail', subtype: 'gmail' }
      },
      {
        id: 'gmail-3',
        type: 'action',
        position: { x: 700, y: 100 },
        data: { label: 'Gmail Operation 3', baseLabel: 'Gmail', subtype: 'gmail' }
      }
    ],
    edges: [
      { id: 'e1', source: 'gmail-1', target: 'gmail-2' },
      { id: 'e2', source: 'gmail-2', target: 'gmail-3' }
    ]
  },
  {
    id: 'sample-gmail-mark-read',
    name: 'Mark as Read Mail',
    description: 'Schedule Gmail operations to send, list, and mark emails as read.',
    status: 'active',
    lastModified: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    lastRun: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    nodes: [
      {
        id: 'schedule-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: { label: 'Schedule Trigger', baseLabel: 'Schedule', subtype: 'schedule' }
      },
      {
        id: 'gmail-1',
        type: 'action',
        position: { x: 400, y: 100 },
        data: { label: 'Gmail Operation 1', baseLabel: 'Gmail', subtype: 'gmail' }
      },
      {
        id: 'gmail-2',
        type: 'action',
        position: { x: 700, y: 100 },
        data: { label: 'Gmail Operation 2', baseLabel: 'Gmail', subtype: 'gmail' }
      },
      {
        id: 'gmail-3',
        type: 'action',
        position: { x: 1000, y: 100 },
        data: { label: 'Gmail Operation 3', baseLabel: 'Gmail', subtype: 'gmail' }
      }
    ],
    edges: [
      { id: 'e1', source: 'schedule-1', target: 'gmail-1' },
      { id: 'e2', source: 'gmail-1', target: 'gmail-2' },
      { id: 'e3', source: 'gmail-2', target: 'gmail-3' }
    ]
  },
  {
    id: 'sample-file-processing',
    name: 'File Processing Pipeline',
    description: 'Upload files, clean data, and upload to Google Drive.',
    status: 'active',
    lastModified: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    lastRun: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    nodes: [
      {
        id: 'file-upload-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: { label: 'File Upload', baseLabel: 'File Upload', subtype: 'file-upload' }
      },
      {
        id: 'data-cleaning-1',
        type: 'action',
        position: { x: 400, y: 100 },
        data: { label: 'Data Cleaning', baseLabel: 'Action', subtype: 'data-cleaning' }
      },
      {
        id: 'google-drive-1',
        type: 'action',
        position: { x: 700, y: 100 },
        data: { label: 'Google Drive', baseLabel: 'Google Drive', subtype: 'google-drive' }
      }
    ],
    edges: [
      { id: 'e1', source: 'file-upload-1', target: 'data-cleaning-1' },
      { id: 'e2', source: 'data-cleaning-1', target: 'google-drive-1' }
    ]
  }
];

export const WorkflowDashboard: React.FC<WorkflowDashboardProps> = ({
  onEditWorkflow,
  onRunWorkflow,
  onCreateWorkflow
}) => {
  const [savedSampleWorkflows, setSavedSampleWorkflows] = useState<Map<string, Workflow>>(new Map());

  const loadSavedSampleWorkflows = () => {
    // Load saved workflows and check if any sample workflows have been saved
    const allWorkflows = workflowStorage.getAllWorkflows();
    const savedMap = new Map<string, Workflow>();
    
    SAMPLE_WORKFLOWS.forEach(sample => {
      // Try to find a saved version of this sample workflow
      // First, try to match by original sample ID stored in settings/metadata
      let savedVersions = allWorkflows.filter(w => {
        const settings = (w as any).settings || {};
        return settings.originalSampleId === sample.id;
      });
      
      // If not found by sample ID, try matching by name (for backwards compatibility)
      if (savedVersions.length === 0) {
        savedVersions = allWorkflows.filter(w => w.name === sample.name);
      }
      
      // If still not found, try matching by node structure (same node types in same order)
      if (savedVersions.length === 0) {
        savedVersions = allWorkflows.filter(w => {
          if (!w.nodes || w.nodes.length !== sample.nodes.length) return false;
          return sample.nodes.every((sampleNode, index) => {
            const savedNode = w.nodes[index];
            return savedNode?.data?.subtype === sampleNode.data?.subtype;
          });
        });
      }
      
      if (savedVersions.length > 0) {
        // Sort by updated_at descending to get the most recent
        const saved = savedVersions.sort((a, b) => {
          const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
          const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
          return bTime - aTime;
        })[0];
        
        // Use the saved workflow as-is - it already contains all configurations
        savedMap.set(sample.id, saved as Workflow);
      }
    });
    
    setSavedSampleWorkflows(savedMap);
  };

  useEffect(() => {
    loadSavedSampleWorkflows();
    
    // Listen for storage changes to refresh when workflows are saved
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'workflow_studio_workflows') {
        loadSavedSampleWorkflows();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events when workflows are saved in the same window
    const handleWorkflowSaved = () => {
      setTimeout(loadSavedSampleWorkflows, 100); // Small delay to ensure storage is updated
    };
    
    window.addEventListener('workflow-saved', handleWorkflowSaved);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('workflow-saved', handleWorkflowSaved);
    };
  }, []);

  const handleCreateWorkflow = () => {
    // Just call the parent handler - it will create the workflow in the studio
    onCreateWorkflow();
  };

  const handleEditSampleWorkflow = (sampleWorkflow: Workflow) => {
    // Check if this sample workflow has been saved before
    const saved = savedSampleWorkflows.get(sampleWorkflow.id);
    if (saved) {
      // Use the saved version with all configurations
      onEditWorkflow(saved);
    } else {
      // Use the sample template
      onEditWorkflow(sampleWorkflow);
    }
  };

  const handleRunSampleWorkflow = (sampleWorkflow: Workflow) => {
    // Check if this sample workflow has been saved before
    const saved = savedSampleWorkflows.get(sampleWorkflow.id);
    if (saved) {
      // Use the saved version with all configurations
      onRunWorkflow(saved);
    } else {
      // Use the sample template
      onRunWorkflow(sampleWorkflow);
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="workflow-dashboard">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Workflow Studio</h1>
          <p className="text-muted-foreground mt-2">All workflows are stored in History</p>
        </div>
        <Button 
          onClick={handleCreateWorkflow}
          className="flex items-center gap-2"
          data-testid="create-workflow-button"
        >
          <Plus className="h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      <Card className="p-12 text-center">
        <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-foreground mb-4">
          {SAMPLE_WORKFLOWS.length > 0 ? 'Featured Sample Workflows' : 'Welcome to Workflow Studio'}
        </h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto">
          {SAMPLE_WORKFLOWS.length > 0 
            ? 'Start quickly with curated samples. All your own workflows are still stored in History.'
            : 'Create and manage your automation workflows. All your workflows are stored in History.'}
        </p>
        {SAMPLE_WORKFLOWS.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left mb-8">
            {SAMPLE_WORKFLOWS.map((wf) => {
              const saved = savedSampleWorkflows.get(wf.id);
              const displayWorkflow = saved || wf;
              return (
                <Card key={wf.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground truncate">{displayWorkflow.name}</h3>
                    <span className="text-xs text-muted-foreground">{displayWorkflow.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{displayWorkflow.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Updated: {saved ? saved.lastModified || saved.updated_at : wf.lastModified}</span>
                    {(saved?.lastRun || wf.lastRun) && <span>Last run: {saved?.lastRun || wf.lastRun}</span>}
                  </div>
                  {saved && (
                    <div className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">
                      ✓ Saved configuration
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleEditSampleWorkflow(wf)}
                    >
                      Edit
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleRunSampleWorkflow(wf)}
                    >
                      Run
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link to="/history">
            <Button variant="outline" size="lg" className="flex items-center gap-2">
              <HistoryIcon className="h-5 w-5" />
              View All Workflows
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
