import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TriggerNodeData {
  label: string;
  description?: string;
  icon?: string;
  // Standard Parameters
  authentication?: {
    type: 'none' | 'basicAuth' | 'apiKey' | 'oauth2' | 'custom';
    // Note: Credentials are now stored in config, not here (migrated from credentials section)
  };
  responseMode?: 'responseToWebhook' | 'responseToUser' | 'usingLastNode' | 'onReceived';
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  path?: string;
  options?: {
    // Webhook specific options
    rawBody?: boolean;
    binaryData?: boolean;
    responseHeaders?: Record<string, string>;
    // Schedule specific options
    triggerInterval?: number;
    triggerIntervalUnit?: 'seconds' | 'minutes' | 'hours' | 'days';
    timezone?: string;
    // Email specific options
    mailbox?: string;
    markSeen?: boolean;
    downloadAttachments?: boolean;
    // Form specific options
    formUrl?: string;
    allowedOrigins?: string[];
    // General options
    continueOnFail?: boolean;
    retryOnFail?: boolean;
    maxRetries?: number;
  };
  errorHandling?: {
    continueOnFail?: boolean;
    retryOnFail?: boolean;
    maxRetries?: number;
    retryInterval?: number;
  };
  // Node execution settings
  executionOrder?: 'parallel' | 'sequential';
  maxConcurrentExecutions?: number;
  // Additional n8n parameters
  webhookId?: string;
  webhookUrl?: string;
  isActive?: boolean;
  notes?: string;
}

export const TriggerNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = (data as unknown) as TriggerNodeData;
  const status = (data as any)?.executionStatus as ('running' | 'success' | 'error' | undefined);
  
  
  // Helper function to get authentication display
  const getAuthDisplay = () => {
    if (!nodeData.authentication || nodeData.authentication.type === 'none') return null;
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
        {nodeData.authentication.type === 'basicAuth' && 'Basic Auth'}
        {nodeData.authentication.type === 'apiKey' && 'API Key'}
        {nodeData.authentication.type === 'oauth2' && 'OAuth2'}
        {nodeData.authentication.type === 'custom' && 'Custom Auth'}
      </div>
    );
  };

  // Helper function to get HTTP method display
  const getHttpMethodDisplay = () => {
    if (!nodeData.httpMethod) return null;
    return (
      <Badge variant="secondary" className="text-xs">
        {nodeData.httpMethod}
      </Badge>
    );
  };

  // Helper function to get response mode display
  const getResponseModeDisplay = () => {
    if (!nodeData.responseMode) return null;
    const modeLabels = {
      'responseToWebhook': 'Webhook Response',
      'responseToUser': 'User Response',
      'usingLastNode': 'Last Node',
      'onReceived': 'On Received'
    };
    return (
      <div className="text-xs text-muted-foreground">
        {modeLabels[nodeData.responseMode]}
      </div>
    );
  };

  return (
    <Card className={`workflow-node node-trigger p-2 max-w-[220px] overflow-hidden relative ${selected ? 'selected' : ''} ${status === 'running' ? 'ring-2 ring-amber-400 animate-pulse bg-amber-50/40' : ''} ${status === 'error' ? 'ring-2 ring-red-400 bg-red-50/40' : ''} ${status === 'success' ? 'ring-2 ring-emerald-400 bg-emerald-50/40' : ''}`}>
      {status === 'running' && (
        <div className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white">
          Running
        </div>
      )}
      {status === 'running' && (
        <div className="h-1 w-full bg-amber-400 animate-pulse" />
      )}
      <div className="flex items-start gap-2">
        <div className="text-base">{nodeData.icon || '⚡'}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="font-medium text-xs truncate">{nodeData.label}</h3>
            <Badge variant="outline" className="text-xs bg-node-trigger/10 text-node-trigger border-node-trigger/20">
              Trigger
            </Badge>
            {getHttpMethodDisplay()}
          </div>
          {nodeData.description && (
            <p className="text-[10px] text-muted-foreground line-clamp-1 mb-1">
              {nodeData.description}
            </p>
          )}
          
          {/* Parameters Display */}
          <div className="space-y-0.5">
            {getAuthDisplay()}
            {getResponseModeDisplay()}
            {nodeData.path && (
              <div className="text-[10px] text-muted-foreground font-mono">
                {nodeData.path}
              </div>
            )}
            {nodeData.options?.triggerInterval && (
              <div className="text-[10px] text-muted-foreground">
                Every {nodeData.options.triggerInterval} {nodeData.options.triggerIntervalUnit}
              </div>
            )}
            {nodeData.isActive === false && (
              <div className="text-[10px] text-orange-500">
                Inactive
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-node-trigger !border-node-trigger"
      />
    </Card>
  );
};