// =============================================================================
// REX Shared Types
// Extracted from backend/src/utils/types.ts
// This is the single source of truth for all type definitions
// =============================================================================

// =============================================================================
// NODE TYPES
// =============================================================================

export type NodeType = 
  | 'trigger' 
  | 'action' 
  | 'condition' 
  | 'loop' 
  | 'data' 
  | 'ai' 
  | 'integration' 
  | 'utility' 
  | 'agent' 
  | 'cloud' 
  | 'llm' 
  | 'logic';

export type NodeCategory =
  | 'agent'
  | 'ai'
  | 'analytics'
  | 'cloud'
  | 'communication'
  | 'core'
  | 'data'
  | 'development'
  | 'file-processing'
  | 'finance'
  | 'integrations'
  | 'llm'
  | 'logic'
  | 'productivity'
  | 'triggers'
  | 'utility';

export interface NodeParameter {
  name: string;
  displayName?: string;
  type: string;
  required?: boolean;
  description?: string;
  default?: unknown;
  options?: Array<{ name: string; value: unknown }>;
  placeholder?: string;
  dataType?: string;
  [key: string]: unknown;
}

export interface NodeInput {
  id?: string;
  name: string;
  type: string;
  displayName?: string;
  required?: boolean;
  description?: string;
  dataType?: string;
}

export interface NodeOutput {
  id?: string;
  name: string;
  type: string;
  displayName?: string;
  description?: string;
}

export interface NodeCredential {
  id: string;
  name: string;
  type: string;
  required?: boolean;
  description?: string;
}

export interface NodeDefinition {
  id: string;
  name: string;
  type: NodeType;
  category: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  color?: string;
  parameters?: NodeParameter[];
  inputs: NodeInput[];
  outputs: NodeOutput[];
  credentials?: NodeCredential[];
}

// =============================================================================
// WORKFLOW TYPES
// =============================================================================

export interface WorkflowNodeOptions {
  retries?: number;
  timeoutMs?: number;
  backoffMs?: number;
  continueOnError?: boolean;
  disabled?: boolean;
  alwaysOutputData?: boolean;
  executeOnce?: boolean;
  triggerInterval?: number;
  triggerIntervalUnit?: 'seconds' | 'minutes' | 'hours' | 'days';
  timezone?: string;
  continueOnFail?: boolean;
  retryOnFail?: boolean;
  maxRetries?: number;
  mergeStrategy?: 'all' | 'first' | 'last';
}

export interface WorkflowNodeData {
  label?: string;
  config?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  input?: Record<string, unknown>;
  subtype?: string;
  version?: number;
  options?: WorkflowNodeOptions;
}

export interface WorkflowNode {
  id: string;
  type: string;
  subtype?: string;
  name?: string;
  position: { x: number; y: number };
  config?: Record<string, unknown>;
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  condition?: string;
  animated?: boolean;
  style?: Record<string, unknown>;
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

export interface WorkflowSettings {
  retries?: number;
  timeout?: number;
  concurrency?: number;
  webhooks?: WebhookConfig[];
  schedule?: ScheduleConfig;
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

// =============================================================================
// EXECUTION TYPES
// =============================================================================

export type ExecutionStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'cancelled'
  | 'waiting';

export interface NodeResult {
  success: boolean;
  result?: unknown;
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
  runId?: string;
  userId?: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  nodeResults: Record<string, NodeResult>;
  executionOrder: string[];
  nodeOutputs: Record<string, unknown>;
  runOptions: RunOptions;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  userId: string;
  createdAt: Date;
}

export interface ExecutionContext {
  runId: string;
  workflowId: string;
  nodeId: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  variables: Record<string, unknown>;
  credentials: Record<string, unknown>;
  config?: Record<string, unknown>;
  sessionId?: string;
  agentId?: string;
  userId?: string;
  emit?: (event: string, data: unknown) => void;
  nodeOutputs?: Record<string, unknown>;
}

export interface NodeExecutionContext extends ExecutionContext {
  node: WorkflowNode;
  previousOutputs: Record<string, unknown>;
  globalVariables: Record<string, unknown>;
}

export interface ExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  duration?: number;
  executionTime?: number;
  nodeResults?: Record<string, NodeResult>;
  coordinationLog?: unknown[];
  resourceUsage?: {
    memory: number;
    cpu: number;
    agents: string[];
  };
  data?: unknown;
  variables?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  __branch?: string;
  __fanOut?: boolean;
  [key: string]: unknown;
}

// =============================================================================
// AGENT TYPES
// =============================================================================

export interface Tool {
  type: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  function?: string;
}

export interface AgentSettings {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
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

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
  result?: unknown;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | ToolCall;
  timestamp: Date;
}

export interface AgentRun {
  id: string;
  agentId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  messages: Message[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// CREDENTIAL TYPES
// =============================================================================

export interface Credential {
  id: string;
  name: string;
  type: string;
  encryptedData: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CredentialProperty {
  name: string;
  displayName: string;
  type: 'string' | 'password' | 'oauth2';
  required?: boolean;
  default?: string;
  description?: string;
}

export interface CredentialDefinition {
  type: string;
  displayName: string;
  properties: CredentialProperty[];
  test?: (credential: Record<string, unknown>) => Promise<boolean>;
}

// =============================================================================
// WEBHOOK TYPES
// =============================================================================

export interface Webhook {
  id: string;
  workflowId: string;
  name: string;
  url: string;
  method: string;
  headers: Record<string, unknown>;
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
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  processed: boolean;
  createdAt: Date;
}

export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
  signature?: string;
}

// =============================================================================
// QUEUE TYPES
// =============================================================================

export interface JobOptions {
  attempts?: number;
  delay?: number;
  priority?: number;
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
}

export interface QueueJob {
  id: string;
  type: string;
  data: Record<string, unknown>;
  options: JobOptions;
  attempts: number;
  maxAttempts: number;
  delay?: number;
  priority?: number;
  createdAt: Date;
  processedAt?: Date;
  failedAt?: Date;
}

// =============================================================================
// API TYPES
// =============================================================================

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  details?: unknown;
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
  value?: unknown;
}

// =============================================================================
// LOG TYPES
// =============================================================================

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  error?: Error;
}

// =============================================================================
// CONFIG TYPES
// =============================================================================

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

// =============================================================================
// EXTERNAL API RESPONSE TYPES
// =============================================================================

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

// =============================================================================
// CONSTANTS
// =============================================================================

export const NODE_CATEGORIES: NodeCategory[] = [
  'agent',
  'ai',
  'analytics',
  'cloud',
  'communication',
  'core',
  'data',
  'development',
  'file-processing',
  'finance',
  'integrations',
  'llm',
  'logic',
  'productivity',
  'triggers',
  'utility',
];

export const EXECUTION_STATUSES: ExecutionStatus[] = [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
  'waiting',
];

export const NODE_TYPES: NodeType[] = [
  'trigger',
  'action',
  'condition',
  'loop',
  'data',
  'ai',
  'integration',
  'utility',
  'agent',
  'cloud',
  'llm',
  'logic',
];
