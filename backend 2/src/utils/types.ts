export type NodeType = 'trigger' | 'action' | 'condition' | 'loop' | 'data' | 'ai' | 'integration' | 'utility' | 'agent' | 'cloud' | 'llm' | 'logic';

export interface NodeDefinition {
  id: string;
  name: string;
  type: NodeType;
  category: string;
  version: string;
  description: string;
  author: string;
  parameters?: Array<{ // Add parameters property for compatibility
    name: string;
    displayName?: string;
    type: string;
    required?: boolean;
    description?: string;
    default?: any;
    options?: Array<{ name: string; value: any }>;
    [key: string]: any;
  }>;
  inputs: Array<{
    id: string;
    name: string;
    type: string;
    required?: boolean;
    description?: string;
  }>;
  outputs: Array<{
    id: string;
    name: string;
    type: string;
    description?: string;
  }>;
  credentials?: Array<{
    id: string;
    name: string;
    type: string;
    required?: boolean;
    description?: string;
  }>;
}

export interface WorkflowNode {
  id: string;
  type: string;
  subtype?: string;
  name?: string;
  position: { x: number; y: number };
  config?: Record<string, any>; // Add direct config access
  data: {
    label?: string;
    config?: Record<string, any>;
    credentials?: Record<string, any>;
    input?: Record<string, any>;
    subtype?: string;
    version?: number; // Add version property
    options?: {
      retries?: number;
      timeoutMs?: number;
      backoffMs?: number;
      continueOnError?: boolean;
      disabled?: boolean; // Add disabled property
      alwaysOutputData?: boolean; // Add alwaysOutputData property
      executeOnce?: boolean; // Add executeOnce property
      // Schedule node fields
      triggerInterval?: number;
      triggerIntervalUnit?: 'seconds' | 'minutes' | 'hours' | 'days';
      timezone?: string;
      continueOnFail?: boolean;
      retryOnFail?: boolean;
      maxRetries?: number;
      mergeStrategy?: 'all' | 'first' | 'last';
    };
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  condition?: string;
  animated?: boolean;
  style?: Record<string, any>;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  settings: WorkflowSettings;
  isActive: boolean;
  userId: string;
  author?: string;
  createdAt: Date;
  updatedAt: Date;
  version?: string;
}

export interface WorkflowSettings {
  retries?: number;
  timeout?: number;
  concurrency?: number;
  webhooks?: WebhookConfig[];
  schedule?: ScheduleConfig;
}

export interface WebhookConfig {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  secret?: string;
  events: string[];
}

export interface ScheduleConfig {
  enabled: boolean;
  cron: string;
  timezone?: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  nodeResults: Record<string, NodeResult>;
  executionOrder: string[];
  nodeOutputs: Record<string, any>;
  runOptions: RunOptions;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  userId: string;
  createdAt: Date;
}

export interface NodeResult {
  success: boolean;
  result?: any;
  error?: string;
  node: string;
  nodeType: string;
  subtype?: string;
  timestamp: string;
  duration?: number;
}

export interface RunOptions {
  retries?: number;
  timeout?: number;
  backoff?: number;
  concurrency?: number;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  model: string;
  instructions?: string;
  tools: Tool[];
  settings: AgentSettings;
  isActive: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tool {
  type: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  function?: string;
}

export interface AgentSettings {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface AgentRun {
  id: string;
  agentId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  messages: Message[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | ToolCall;
  timestamp: Date;
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: Record<string, any>;
  };
  result?: any;
}

export interface Credential {
  id: string;
  name: string;
  type: string;
  encryptedData: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookEvent {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, any>;
  headers: Record<string, string>;
  processed: boolean;
  createdAt: Date;
}

export interface QueueJob {
  id: string;
  type: string;
  data: Record<string, any>;
  options: JobOptions;
  attempts: number;
  maxAttempts: number;
  delay?: number;
  priority?: number;
  createdAt: Date;
  processedAt?: Date;
  failedAt?: Date;
}

export interface JobOptions {
  attempts?: number;
  delay?: number;
  priority?: number;
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
}

export interface ExecutionContext {
  runId: string;
  workflowId: string;
  nodeId: string;
  input: Record<string, any>;
  output: Record<string, any>;
  variables: Record<string, any>;
  credentials: Record<string, any>;
  config?: Record<string, any>; // Add config property
  sessionId?: string;
  agentId?: string;
  emit?: (event: string, data: any) => void;
  nodeOutputs?: Record<string, any>; // Outputs from all previous nodes in the workflow
}

export interface NodeExecutionContext extends ExecutionContext {
  node: WorkflowNode;
  previousOutputs: Record<string, any>;
  globalVariables: Record<string, any>;
}

export interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  duration?: number;
  executionTime?: number;
  nodeResults?: Record<string, NodeResult>; // Add nodeResults property
  coordinationLog?: any[];
  resourceUsage?: {
    memory: number;
    cpu: number;
    agents: string[];
  };
  data?: any;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
  // Allow special routing hints used by some nodes
  __branch?: string;
  __fanOut?: boolean;
  // Permit extensions without breaking strict object literal checks
  [key: string]: any;
}

export interface WebhookPayload {
  event: string;
  data: Record<string, any>;
  timestamp: string;
  signature?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  metadata?: Record<string, any>;
  details?: any;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  error?: Error;
}

export interface DatabaseConfig {
  url: string;
  ssl?: boolean;
  pool?: {
    min: number;
    max: number;
  };
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export interface ExternalServiceConfig {
  openai?: {
    apiKey: string;
    baseURL?: string;
  };
  anthropic?: {
    apiKey: string;
  };
  google?: {
    clientId: string;
    clientSecret: string;
  };
  slack?: {
    botToken: string;
    signingSecret: string;
  };
  discord?: {
    botToken: string;
  };
  telegram?: {
    botToken: string;
  };
  whatsapp?: {
    accessToken: string;
    phoneNumberId: string;
  };
}

// API Response Types for External Services
export interface OpenAIApiResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason?: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

export interface OpenAIImageResponse {
  data: Array<{
    url: string;
    revised_prompt?: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ReplicateApiResponse {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed';
  output?: string[];
  error?: string;
}

export interface GmailApiResponse {
  id: string;
  threadId: string;
  messages?: Array<{
    id: string;
    threadId: string;
  }>;
  resultSizeEstimate?: number;
}

export interface DiscordApiResponse {
  id: string;
  channel_id?: string;
  name?: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

// Database Entity Types
export interface Webhook {
  id: string;
  workflowId: string;
  name: string;
  url: string;
  method: string;
  headers: Record<string, any>;
  secret?: string;
  eventTypes: string[];
  events?: string[];
  isActive: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookEvent {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, any>;
  headers: Record<string, string>;
  processed: boolean;
  createdAt: Date;
}
