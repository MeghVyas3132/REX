import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Menu, Save, Play, Square, Settings, Terminal, Home, Edit2, Check, X, ArrowLeft } from 'lucide-react';
import { useWorkflowExecution } from './WorkflowExecution';
import { Node, Edge } from '@xyflow/react';
import { logger } from '@/lib/logger';

interface WorkflowHeaderProps {
  onSidebarToggle: () => void;
  workflowName: string;
  isRunning: boolean;
  nodes: Node[];
  edges: Edge[];
  onRunWorkflow: () => void;
  onStopWorkflow?: () => void;
  onShowOutput: () => void;
  onWorkflowNameChange: (name: string) => void;
  onBackToDashboard: () => void;
  currentWorkflow: any;
  onSave?: (showToast?: boolean) => void;
  isSaving?: boolean;
  handleDeploy?: () => void;
  isDeploying?: boolean;
  lastSaved?: Date | null;
}

export const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({ 
  onSidebarToggle, 
  workflowName = "Untitled Workflow",
  isRunning = false,
  nodes = [],
  edges = [],
  onRunWorkflow,
  onStopWorkflow,
  onShowOutput,
  onWorkflowNameChange,
  onBackToDashboard,
  currentWorkflow,
  onSave,
  isSaving = false,
  handleDeploy,
  isDeploying = false,
  lastSaved = null,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(workflowName);

  // keep tempName in sync when workflow changes
  React.useEffect(() => {
    setTempName(workflowName);
  }, [workflowName]);
  
  const handleNameEdit = () => {
    setTempName(workflowName);
    setIsEditingName(true);
  };

  const handleNameSave = () => {
    const trimmedName = tempName.trim();
    if (!trimmedName) {
      // Don't allow empty names
      setTempName(workflowName);
      setIsEditingName(false);
      return;
    }
    onWorkflowNameChange?.(trimmedName);
    setIsEditingName(false);
    // Trigger immediate save when name changes
    if (onSave && trimmedName !== workflowName) {
      onSave();
    }
  };

  const handleNameCancel = () => {
    setTempName(workflowName);
    setIsEditingName(false);
  };
  return (
    <header className="bg-surface-elevated border-b border-border p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSidebarToggle}
          className="hover:bg-accent/10 hover:border-accent/50 transition-all duration-200"
          title="Toggle Node Library"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          
          <div className="h-6 w-px bg-border" />
          
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="h-9 w-64"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleNameSave();
                    } else if (e.key === 'Escape') {
                      handleNameCancel();
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleNameSave}
                  className="text-green-500 hover:text-green-600"
                  title="Save name"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleNameCancel}
                  className="text-muted-foreground hover:text-foreground"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">{workflowName}</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNameEdit}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Rename workflow"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            {currentWorkflow && currentWorkflow.status && (
              <Badge variant="outline" className="text-xs">
                {currentWorkflow.status}
              </Badge>
            )}
            {isSaving && (
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
                Saving...
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Auto-save status indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isSaving ? (
            <div className="flex items-center gap-1">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
              <span>Saving...</span>
            </div>
          ) : lastSaved && (
            <div className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-500" />
              <span>Saved {lastSaved.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
        
        {/* Manual save button */}
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            if (onSave) {
              onSave(true);
            }
          }}
          disabled={isSaving || (nodes.length === 0 && edges.length === 0)}
          className="hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
          title={nodes.length === 0 && edges.length === 0 ? "Add nodes to save workflow" : "Save workflow (Ctrl+S)"}
        >
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
        
        <Button 
          variant="default" 
          size="sm" 
          className="bg-gradient-primary hover:bg-gradient-primary/90 text-white shadow-glow transition-all duration-200"
          onClick={handleDeploy}
          disabled={isDeploying}
        >
          <Settings className="h-4 w-4 mr-2" />
          {isDeploying ? 'Deploying...' : 'Deploy'}
        </Button>
        <Button 
          variant="outline"
          size="sm"
          onClick={() => {
            try {
              if (isRunning && onStopWorkflow) {
                logger.debug('Stop clicked');
                onStopWorkflow();
              } else {
                logger.debug('Run clicked');
                onRunWorkflow?.();
              }
            } catch (e) {
              logger.error('Run/Stop handler error', e as Error);
            }
          }}
          disabled={nodes.length === 0}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          data-testid="run-workflow-button"
        >
          {isRunning ? (
            <>
              <Square className="h-4 w-4 mr-2" />
              Stop
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Workflow
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onShowOutput}
          className="flex items-center gap-2 hover:bg-accent/10 hover:border-accent/50 transition-all duration-200"
        >
          <Terminal className="h-4 w-4" />
          Output
        </Button>
      </div>
    </header>
  );
};