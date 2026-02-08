export enum JobTypes {
  WORKFLOW_EXECUTION = 'workflow-execution',
  AGENT_EXECUTION = 'agent-execution',
  WEBHOOK_PROCESSING = 'webhook-processing',
  SCHEDULED_WORKFLOW = 'scheduled-workflow',
  EMAIL_SENDING = 'email-sending',
  SLACK_MESSAGE = 'slack-message',
  DISCORD_MESSAGE = 'discord-message',
  TELEGRAM_MESSAGE = 'telegram-message',
  WHATSAPP_MESSAGE = 'whatsapp-message',
  HTTP_REQUEST = 'http-request',
  CODE_EXECUTION = 'code-execution',
  DATA_PROCESSING = 'data-processing',
  FILE_UPLOAD = 'file-upload',
  FILE_DOWNLOAD = 'file-download',
  DATABASE_QUERY = 'database-query',
  AI_INFERENCE = 'ai-inference',
  IMAGE_GENERATION = 'image-generation',
  TEXT_PROCESSING = 'text-processing',
  NOTIFICATION = 'notification',
  CLEANUP = 'cleanup'
}

export interface QueueJob {
  id: string;
  type: JobTypes;
  data: any;
  options?: {
    retries?: number;
    timeout?: number;
    priority?: number;
    delay?: number;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
}

export interface WorkflowJobData {
  workflowId: string;
  input: any;
  runId?: string;
  userId?: string;
  options?: {
    retries?: number;
    timeout?: number;
    priority?: number;
  };
}

export interface AgentJobData {
  agentId: string;
  input: any;
  runId?: string;
  userId?: string;
  options?: {
    retries?: number;
    timeout?: number;
    priority?: number;
  };
}

export interface WebhookJobData {
  webhookId: string;
  payload: any;
  headers: Record<string, string>;
  timestamp: string;
}

export interface ScheduledWorkflowJobData {
  workflowId: string;
  cron: string;
  lastRun?: string;
  nextRun?: string;
}

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  html?: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export interface SlackJobData {
  channel: string;
  message: string;
  blocks?: any[];
  attachments?: any[];
  threadTs?: string;
}

export interface DiscordJobData {
  channelId: string;
  content: string;
  embeds?: any[];
  components?: any[];
}

export interface TelegramJobData {
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown';
  replyToMessageId?: number;
}

export interface WhatsAppJobData {
  to: string;
  message: string;
  type?: 'text' | 'image' | 'document' | 'audio' | 'video';
  mediaUrl?: string;
}

export interface HttpRequestJobData {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
}

export interface CodeExecutionJobData {
  code: string;
  language: 'javascript' | 'python' | 'typescript';
  input: any;
  timeout?: number;
}

export interface DataProcessingJobData {
  data: any;
  operation: string;
  parameters?: Record<string, any>;
}

export interface FileUploadJobData {
  filename: string;
  content: string;
  contentType: string;
  destination: string;
  metadata?: Record<string, any>;
}

export interface FileDownloadJobData {
  url: string;
  destination: string;
  filename?: string;
  headers?: Record<string, string>;
}

export interface DatabaseQueryJobData {
  query: string;
  parameters?: any[];
  database: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
}

export interface AIInferenceJobData {
  model: string;
  input: any;
  parameters?: Record<string, any>;
  provider: 'openai' | 'anthropic' | 'cohere' | 'huggingface';
}

export interface ImageGenerationJobData {
  prompt: string;
  model: string;
  parameters?: Record<string, any>;
  provider: 'openai' | 'stability' | 'midjourney';
}

export interface TextProcessingJobData {
  text: string;
  operation: 'summarize' | 'translate' | 'sentiment' | 'extract' | 'classify';
  parameters?: Record<string, any>;
}

export interface NotificationJobData {
  type: 'email' | 'sms' | 'push' | 'slack' | 'discord';
  recipient: string;
  message: string;
  title?: string;
  data?: Record<string, any>;
}

export interface CleanupJobData {
  resource: 'workflow-runs' | 'agent-runs' | 'webhook-events' | 'queue-jobs';
  olderThan: string; // ISO date string
  batchSize?: number;
}
