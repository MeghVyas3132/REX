import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ActionNodeData {
  label: string;
  description?: string;
  icon?: string;
  subtype?: string;
  config?: any;
  // Storage Parameters
  operation?: string;
  authentication?: {
    type: 'none' | 'basicAuth' | 'apiKey' | 'oauth2' | 'aws' | 'custom';
    // Note: Credentials are now stored in config, not here (migrated from credentials section)
  };
  // File Operations
  fileOperations?: {
    operation: 'upload' | 'download' | 'list' | 'delete' | 'copy' | 'move' | 'create' | 'search';
    fileName?: string;
    filePath?: string;
    destinationPath?: string;
    fileContent?: string;
    mimeType?: string;
    fileExtension?: string;
    appendData?: boolean;
    overwrite?: boolean;
    createDirectories?: boolean;
  };
  // Bucket/Folder Operations
  bucketOperations?: {
    operation: 'create' | 'delete' | 'list' | 'get' | 'search';
    bucketName?: string;
    folderName?: string;
    folderPath?: string;
    recursive?: boolean;
  };
  // Storage-specific options
  options?: {
    // S3/AWS specific
    region?: string;
    bucketName?: string;
    acl?: string;
    storageClass?: string;
    serverSideEncryption?: string;
    multipartUpload?: boolean;
    chunkSize?: number;
    // Google Drive specific
    driveId?: string;
    sharedDrive?: boolean;
    convertToGoogleFormat?: boolean;
    // General options
    continueOnFail?: boolean;
    retryOnFail?: boolean;
    maxRetries?: number;
    timeout?: number;
    binaryData?: boolean;
    rawBody?: boolean;
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
  // Communication Parameters
  communication?: {
    operation: 'send' | 'reply' | 'forward' | 'schedule' | 'draft' | 'delete' | 'list' | 'get';
    // Email specific
    fromEmail?: string;
    toEmail?: string;
    ccEmail?: string;
    bccEmail?: string;
    subject?: string;
    emailFormat?: 'text' | 'html' | 'both';
    textContent?: string;
    htmlContent?: string;
    replyTo?: string;
    priority?: 'low' | 'normal' | 'high';
    // Message specific
    channel?: string;
    threadTs?: string;
    username?: string;
    iconEmoji?: string;
    iconUrl?: string;
    // SMS specific
    phoneNumber?: string;
    countryCode?: string;
    // General message
    message?: string;
    attachments?: Array<{
      filename?: string;
      content?: string;
      contentType?: string;
      size?: number;
    }>;
  };
  // Communication-specific options
  communicationOptions?: {
    // Email options
    ignoreSSL?: boolean;
    allowUnauthorizedCerts?: boolean;
    connectionTimeout?: number;
    greetingTimeout?: number;
    socketTimeout?: number;
    // Slack options
    unfurlLinks?: boolean;
    unfurlMedia?: boolean;
    linkNames?: boolean;
    parse?: 'full' | 'none';
    // Discord options
    tts?: boolean;
    embeds?: Array<{
      title?: string;
      description?: string;
      color?: number;
      fields?: Array<{
        name: string;
        value: string;
        inline?: boolean;
      }>;
      footer?: {
        text: string;
        iconUrl?: string;
      };
      timestamp?: string;
    }>;
    // Teams options
    markdown?: boolean;
    // Telegram options
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    disableWebPagePreview?: boolean;
    disableNotification?: boolean;
    // WhatsApp options
    mediaType?: 'text' | 'image' | 'document' | 'audio' | 'video';
    // General options
    retryOnFail?: boolean;
    maxRetries?: number;
    retryInterval?: number;
  };
  // Additional n8n parameters
  notes?: string;
  tags?: string[];
}

export const ActionNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = (data as unknown) as ActionNodeData;
  const status = (data as any)?.executionStatus as ('running' | 'success' | 'error' | undefined);
  
  
  const isConfigured = nodeData.config && Object.keys(nodeData.config).length > 0;
  const isStorageNode = nodeData.subtype && [
    'google-drive', 'aws-s3', 'onedrive',
    'azure-blob', 'google-cloud-storage'
  ].includes(nodeData.subtype);

  const isCommunicationNode = nodeData.subtype && [
    'email', 'slack', 'discord', 'teams', 'telegram', 'whatsapp',
    'microsoft-teams', 'zoom', 'wechat', 'instagram', 'twitter-dm',
    'linkedin-message'
  ].includes(nodeData.subtype);
  
  // Helper function to get authentication display
  const getAuthDisplay = () => {
    if (!nodeData.authentication || nodeData.authentication.type === 'none') return null;
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
        {nodeData.authentication.type === 'basicAuth' && 'Basic Auth'}
        {nodeData.authentication.type === 'apiKey' && 'API Key'}
        {nodeData.authentication.type === 'oauth2' && 'OAuth2'}
        {nodeData.authentication.type === 'aws' && 'AWS Credentials'}
        {nodeData.authentication.type === 'custom' && 'Custom Auth'}
      </div>
    );
  };

  // Helper function to get operation display
  const getOperationDisplay = () => {
    if (!nodeData.operation && !nodeData.fileOperations?.operation && !nodeData.bucketOperations?.operation) return null;
    
    const operation = nodeData.operation || nodeData.fileOperations?.operation || nodeData.bucketOperations?.operation;
    const operationLabels = {
      'upload': 'Upload',
      'download': 'Download',
      'list': 'List',
      'delete': 'Delete',
      'copy': 'Copy',
      'move': 'Move',
      'create': 'Create',
      'search': 'Search',
      'get': 'Get'
    };
    
    return (
      <Badge variant="secondary" className="text-xs">
        {operationLabels[operation as keyof typeof operationLabels] || operation}
      </Badge>
    );
  };

  // Helper function to get file info display
  const getFileInfoDisplay = () => {
    if (!nodeData.fileOperations) return null;
    
    const { fileName, filePath, mimeType } = nodeData.fileOperations;
    if (!fileName && !filePath) return null;
    
    return (
      <div className="text-xs text-muted-foreground">
        {fileName && `File: ${fileName}`}
        {filePath && `Path: ${filePath}`}
        {mimeType && ` (${mimeType})`}
      </div>
    );
  };

  // Helper function to get bucket info display
  const getBucketInfoDisplay = () => {
    if (!nodeData.bucketOperations && !nodeData.options?.bucketName) return null;
    
    const bucketName = nodeData.bucketOperations?.bucketName || nodeData.options?.bucketName;
    const region = nodeData.options?.region;
    
    if (!bucketName) return null;
    
    return (
      <div className="text-xs text-muted-foreground">
        Bucket: {bucketName}
        {region && ` (${region})`}
      </div>
    );
  };

  // Helper function to get storage type display
  const getStorageTypeDisplay = () => {
    if (!isStorageNode) return null;
    
    const storageTypes = {
      'google-drive': 'Google Drive',
      'aws-s3': 'AWS S3',
      'onedrive': 'OneDrive',
      'azure-blob': 'Azure Blob',
      'google-cloud-storage': 'GCS'
    };
    
    return (
      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
        {storageTypes[nodeData.subtype as keyof typeof storageTypes]}
      </Badge>
    );
  };

  // Helper function to get communication type display
  const getCommunicationTypeDisplay = () => {
    if (!isCommunicationNode) return null;
    
    const communicationTypes = {
      email: 'Email',
      'slack': 'Slack',
      'discord': 'Discord',
      'teams': 'Teams',
      'telegram': 'Telegram',
      'whatsapp': 'WhatsApp',
      'microsoft-teams': 'MS Teams',
      'zoom': 'Zoom',
      'wechat': 'WeChat',
      'instagram': 'Instagram',
      'twitter-dm': 'Twitter DM',
      'linkedin-message': 'LinkedIn',
    };
    
    return (
      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
        {communicationTypes[nodeData.subtype as keyof typeof communicationTypes]}
      </Badge>
    );
  };

  // Helper function to get communication operation display
  const getCommunicationOperationDisplay = () => {
    if (!isCommunicationNode || !nodeData.communication?.operation) return null;
    
    const operationLabels = {
      'send': 'Send',
      'reply': 'Reply',
      'forward': 'Forward',
      'schedule': 'Schedule',
      'draft': 'Draft',
      'delete': 'Delete',
      'list': 'List',
      'get': 'Get'
    };
    
    return (
      <Badge variant="secondary" className="text-xs">
        {operationLabels[nodeData.communication.operation as keyof typeof operationLabels]}
      </Badge>
    );
  };

  // Helper function to get communication details display
  const getCommunicationDetailsDisplay = () => {
    if (!isCommunicationNode || !nodeData.communication) return null;
    
    const { fromEmail, toEmail, channel, phoneNumber, subject } = nodeData.communication;
    
    if (fromEmail && toEmail) {
      return (
        <div className="text-xs text-muted-foreground">
          {fromEmail} → {toEmail}
        </div>
      );
    }
    
    if (channel) {
      return (
        <div className="text-xs text-muted-foreground">
          Channel: {channel}
        </div>
      );
    }
    
    if (phoneNumber) {
      return (
        <div className="text-xs text-muted-foreground">
          Phone: {phoneNumber}
        </div>
      );
    }
    
    if (subject) {
      return (
        <div className="text-xs text-muted-foreground">
          Subject: {subject}
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <Card className={`workflow-node node-action p-2 max-w-[220px] overflow-hidden ${selected ? 'selected' : ''} ${status === 'running' ? 'ring-2 ring-amber-400 animate-pulse bg-amber-50/40' : ''}`}>
      {status === 'running' && (
        <div className="h-1 w-full bg-amber-400 animate-pulse" />
      )}
      <div className="flex items-start gap-2">
        <div className="text-base">{nodeData.icon || '🔧'}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="font-medium text-xs truncate">{nodeData.label}</h3>
            <Badge variant="outline" className="text-xs bg-node-action/10 text-node-action border-node-action/20">
              Action
            </Badge>
            {getStorageTypeDisplay()}
            {getCommunicationTypeDisplay()}
            {getOperationDisplay()}
            {getCommunicationOperationDisplay()}
            {isConfigured && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                Configured
              </Badge>
            )}
          </div>
          {nodeData.description && (
            <p className="text-[10px] text-muted-foreground line-clamp-1 mb-1">
              {nodeData.description}
            </p>
          )}
          
          {/* Parameters Display */}
          <div className="space-y-0.5">
            {getAuthDisplay()}
            {getFileInfoDisplay()}
            {getBucketInfoDisplay()}
            {getCommunicationDetailsDisplay()}
            {nodeData.options?.multipartUpload && (
              <div className="text-[10px] text-muted-foreground">
                Multipart Upload
              </div>
            )}
            {nodeData.options?.binaryData && (
              <div className="text-[10px] text-muted-foreground">
                Binary Data
              </div>
            )}
            {nodeData.communicationOptions?.ignoreSSL && (
              <div className="text-[10px] text-orange-500">
                Ignore SSL
              </div>
            )}
            {nodeData.communicationOptions?.tts && (
              <div className="text-[10px] text-muted-foreground">
                Text-to-Speech
              </div>
            )}
            {nodeData.communicationOptions?.parseMode && (
              <div className="text-[10px] text-muted-foreground">
                Parse: {nodeData.communicationOptions.parseMode}
              </div>
            )}
            {nodeData.errorHandling?.continueOnFail && (
              <div className="text-[10px] text-orange-500">
                Continue on Fail
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-node-action !border-node-action"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-node-action !border-node-action"
      />
    </Card>
  );
};