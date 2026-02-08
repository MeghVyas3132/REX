import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AINodeData {
  label: string;
  description?: string;
  icon?: string;
  subtype?: string;
  config?: any;
  output?: boolean;
}

export const AINode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = (data as unknown) as AINodeData;
  const status = (data as any)?.executionStatus as ('running' | 'success' | 'error' | undefined);
  const hasOutput = nodeData.output || nodeData.config?.userPrompt;
  
  return (
    <Card className={`workflow-node node-ai overflow-hidden relative ${selected ? 'selected' : ''} ${status === 'running' ? 'ring-2 ring-amber-400 animate-pulse bg-amber-50/40' : ''} ${status === 'error' ? 'ring-2 ring-red-400 bg-red-50/40' : ''} ${status === 'success' ? 'ring-2 ring-emerald-400 bg-emerald-50/40' : ''}`}>
      {status === 'running' && (
        <div className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white">
          Running
        </div>
      )}
      {status === 'running' && (
        <div className="h-1 w-full bg-amber-400 animate-pulse" />
      )}
      <div className="flex items-start gap-3">
        <div className="text-2xl">{nodeData.icon || '🤖'}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-sm truncate">{nodeData.label}</h3>
            <Badge variant="outline" className="text-xs bg-node-ai/10 text-node-ai border-node-ai/20">
              AI
            </Badge>
            {hasOutput && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                Ready
              </Badge>
            )}
          </div>
          {nodeData.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {nodeData.description}
            </p>
          )}
          {nodeData.config?.userPrompt && (
            <p className="text-xs text-blue-600 mt-1">
              Prompt: {nodeData.config.userPrompt.substring(0, 30)}...
            </p>
          )}
        </div>
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-node-ai !border-node-ai"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-node-ai !border-node-ai"
      />
    </Card>
  );
};