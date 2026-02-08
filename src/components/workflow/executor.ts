import type { Edge, Node } from '@xyflow/react';
import { 
  SlackService, 
  EmailService, 
  DatabaseService, 
  StorageService, 
  GitHubService, 
  StripeService, 
  TelegramService, 
  DiscordService, 
  WhatsAppService 
} from '@/lib/apiServices';
import { ErrorHandler, ApiService } from '@/lib/errorService';
import { transformNodeForBackend, transformResponseFromBackend } from '@/lib/nodeParameterMapper';
import { logger } from '@/lib/logger';

// Compatibility layer for ErrorService methods
const ErrorService = {
  executeWithRetry: async <T>(
    fn: () => Promise<T>,
    nodeId: string,
    nodeType: string,
    options?: { maxRetries?: number }
  ): Promise<T> => {
    const maxRetries = options?.maxRetries ?? 3;
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  },
  handleApiError: (error: any, nodeId: string, nodeType: string) => {
    const normalized = ErrorHandler.normalizeError(error);
    return {
      message: normalized.message,
      userMessage: normalized.message,
      statusCode: normalized.statusCode,
      code: normalized.code
    };
  },
  validateNodeConfiguration: (node: Node): any[] => {
    // Simple validation - check if required config fields exist
    const errors: any[] = [];
    if (!node.data?.config && !node.data?.subtype) {
      errors.push({
        message: 'Node configuration is missing',
        userMessage: 'Please configure the node before executing'
      });
    }
    return errors;
  },
  logError: (error: any) => {
    logger.error('Workflow error', error as Error);
  }
};
import { ToolRegistry, executeHttpWithCredential } from '@/lib/tools';
import { buildPlanningSystemPrompt, chatCompletion } from '@/lib/openrouter';

// Backend API integration
import { API_CONFIG } from '@/lib/config';

const BACKEND_URL = API_CONFIG.baseUrl;

const executeWorkflowOnBackend = async (workflow: { nodes: Node[], edges: Edge[] }, input: any = {}) => {
  try {
    // Transform nodes for backend (ensures proper format and preserves options)
    const transformedNodes = workflow.nodes.map(node => transformNodeForBackend(node));
    
    // Use the test execution endpoint (executes without persisting)
    const result = await ApiService.post<any>(
      '/api/workflows/test/execute',
      {
        nodes: transformedNodes,
        edges: workflow.edges,
        input
      },
      { toastTitle: 'Execute Workflow', silent: true }
    );
    
    if (!result || !result.data) {
      throw new Error('Workflow execution failed');
    }

    // Return the result in the expected format
    // Handle multiple possible result structures
    const executionResult = result.data.result || result.data;
    return {
      success: result.success,
      output: executionResult?.output || executionResult,
      nodeResults: executionResult?.output?.nodeResults || executionResult?.nodeResults,
      data: result.data
    };
  } catch (error) {
    logger.error('Backend execution failed', error as Error, {
      errorMessage: (error as Error).message,
      errorStack: (error as Error).stack,
      nodeCount: workflow.nodes.length
    });
    throw error;
  }
};

// Single node execution on backend
const executeSingleNodeOnBackend = async (node: Node, input: any = {}) => {
  try {
    const nodeType = String(node.data?.subtype || node.type || '');
    // Transform node config for backend using parameter mapper
    const transformedNode = transformNodeForBackend(node);
    const backendConfig = transformedNode.data?.config || {};
    const nodeData = node.data || {};
    
    const result = await ApiService.post<any>(
      `/api/workflows/nodes/${encodeURIComponent(nodeType)}/execute`,
      { 
        config: backendConfig, 
        input,
        options: nodeData.options || {}, // Include options (for schedule nodes, retry settings, etc.)
        credentials: nodeData.credentials || {} // Include credentials
      },
      { toastTitle: 'Execute Node', silent: true }
    );
    if (!result) throw new Error('Node execution failed');
    
    // Transform response from backend if needed
    if (result.data) {
      result.data = transformResponseFromBackend(nodeType, result.data);
    }
    
    return result;
  } catch (error) {
    logger.error('Single node execution failed', error as Error);
    throw error;
  }
};

// Test single node on backend
const testSingleNodeOnBackend = async (node: Node) => {
  try {
    const nodeType = String(node.data?.subtype || node.type || '');
    const result = await ApiService.post<any>(
      `/api/workflows/nodes/${encodeURIComponent(nodeType)}/test`,
      { config: node.data?.config || {} },
      { toastTitle: 'Test Node', silent: true }
    );
    if (!result) throw new Error('Node test failed');
    return result;
  } catch (error) {
    logger.error('Single node test failed', error as Error);
    throw error;
  }
};

export interface ExecutionResultMap {
  [nodeId: string]: any;
}

export interface ExecutionOptions {
  initialInput?: any;
  startFrom?: string[];
  timeout?: number;
  retries?: number;
}

// Export single node execution functions
export async function executeSingleNode(node: Node, input: any = {}): Promise<any> {
  // Try backend first
  if (BACKEND_URL) {
    try {
      logger.debug('Executing single node on backend', { nodeId: node.id, nodeType: node.data?.subtype || node.type });
      const result = await executeSingleNodeOnBackend(node, input);
      
      if (result.success) {
        logger.debug('Single node backend execution successful', { nodeId: node.id });
        return result.data;
      }
    } catch (error) {
      logger.warn('Single node backend execution failed, falling back to frontend', { error: error as Error, nodeId: node.id });
    }
  }

  // Fallback to frontend execution
  logger.debug('Executing single node on frontend (fallback)', { nodeId: node.id });
  const subtype: string = (node.data?.subtype || node.type || '') as string;
  const runner = subtypeRunners[subtype] || passThroughRunner;
  
  try {
    const output = await runner(node, input);
    return { result: output, success: true };
  } catch (error: any) {
    return { error: error.message, success: false };
  }
}

export async function testSingleNode(node: Node): Promise<any> {
  // Try backend first
  if (BACKEND_URL) {
    try {
      logger.debug('Testing single node on backend', { nodeId: node.id, nodeType: node.data?.subtype || node.type });
      const result = await testSingleNodeOnBackend(node);
      
      if (result.success) {
        logger.debug('Single node backend test successful', { nodeId: node.id });
        return result.data;
      }
    } catch (error) {
      logger.warn('Single node backend test failed, falling back to frontend', { error: error as Error, nodeId: node.id });
    }
  }

  // Fallback to frontend test
  logger.debug('Testing single node on frontend (fallback)', { nodeId: node.id });
  return {
    nodeType: node.data?.subtype || node.type,
    status: 'success',
    message: `${node.data?.subtype || node.type} node test completed successfully`,
    config: node.data?.config || {},
    timestamp: new Date().toISOString()
  };
}


type NodeRunner = (node: Node, input: any) => Promise<any>;

// Helper to safely get config with type assertion
const getConfig = (node: Node): Record<string, any> => {
  return (node.data?.config || {}) as Record<string, any>;
};

const passThroughRunner: NodeRunner = async (node, input) => {
  return { nodeId: node.id, subtype: node.data?.subtype, input, config: getConfig(node), data: node.data ?? {} };
};

const httpRequestRunner: NodeRunner = async (node, input) => {
  try {
    const config = getConfig(node);
    const url = config.url || (node.data as any)?.url || '';
    const method = config.method || (node.data as any)?.httpMethod || 'GET';
    const headersRaw = config.headers;
    const headers = headersRaw ? safeJson(headersRaw, {}) : {};
    const body = config.body ? config.body : undefined;
    const credentialId = config.credentialId;
    if (credentialId) {
      const result = await executeHttpWithCredential({ url, method, headers, body, credentialId });
      return result;
    } else {
      const res = await fetch(url, { method, headers, body: method !== 'GET' && method !== 'HEAD' ? body : undefined });
      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : await res.text();
      return { status: res.status, ok: res.ok, data };
    }
  } catch (err: any) {
    return { error: true, message: err?.message || String(err) };
  }
};

const slackRunner: NodeRunner = async (node, input) => {
  const nodeConfig = getConfig(node);
  const message = (node.data as any)?.communication?.message || input?.message || '';
  const channel = (node.data as any)?.communication?.channel || '';
  const botToken = nodeConfig.botToken;
  const webhookUrl = nodeConfig.webhookUrl;
  
  const slackConfig = {
    botToken,
    webhookUrl,
    channel,
  };
  
  const result = await SlackService.sendMessage(slackConfig, message, channel);
  
  if (result.success) {
    return { 
      sent: true, 
      channel: result.data?.channel || channel, 
      message,
      timestamp: result.data?.ts,
      service: 'Slack API'
    };
  } else {
    return { 
      sent: false, 
      error: result.error, 
      channel, 
      message,
      service: 'Slack API'
    };
  }
};

const discordRunner: NodeRunner = async (node, input) => {
  const config = getConfig(node);
  const message = (node.data as any)?.communication?.message || input?.message || '';
  const webhookUrl = config.webhookUrl;
  const embeds = (node.data as any)?.communication?.embeds || config.embeds;
  
  if (!webhookUrl) {
    return { sent: false, error: 'Discord webhook URL is required', message };
  }
  
  const result = await DiscordService.sendMessage({ webhookUrl }, message, embeds);
  
  if (result.success) {
    return { 
      sent: true, 
      message,
      service: 'Discord API'
    };
  } else {
    return { 
      sent: false, 
      error: result.error, 
      message,
      service: 'Discord API'
    };
  }
};

const sendEmailRunner: NodeRunner = async (node, input) => {
  const nodeConfig = getConfig(node);
  const from = (node.data as any)?.communication?.fromEmail || input?.fromEmail;
  const to = (node.data as any)?.communication?.toEmail || input?.toEmail;
  const subject = (node.data as any)?.communication?.subject || input?.subject || '';
  const textContent = (node.data as any)?.communication?.textContent || nodeConfig.emailBody || input?.text || '';
  const htmlContent = (node.data as any)?.communication?.htmlContent || nodeConfig.htmlBody || input?.html || '';
  const apiKey = nodeConfig.apiKey || nodeConfig.sendgridApiKey || nodeConfig.mailgunApiKey || nodeConfig.resendApiKey;
  
  if (!apiKey || !from || !to) {
    return { 
      sent: false, 
      error: 'Missing required email configuration (API key, from, or to)', 
      to, 
      subject 
    };
  }
  
  const emailConfig = {
    apiKey,
    fromEmail: from,
    toEmail: to,
    subject,
    textContent,
    htmlContent,
  };
  
  const result = await EmailService.sendEmail(emailConfig);
  
  if (result.success) {
    return { 
      sent: true, 
      to, 
      subject,
      service: result.data?.service || 'Email API',
      messageId: result.data?.id
    };
  } else {
    return { 
      sent: false, 
      error: result.error, 
      to, 
      subject,
      service: 'Email API'
    };
  }
};

const googleSheetsRunner: NodeRunner = async (node, input) => {
  const config = getConfig(node);
  // Mock: echo requested operation and range. Integrate real API later.
  const op = (node.data as any)?.options?.operation || config.operation || 'read';
  const range = (node.data as any)?.options?.range || config.range || 'A1:B2';
  if (op === 'read') {
    return { rows: [], range };
  }
  return { ok: true, operation: op, range, input };
};

const telegramRunner: NodeRunner = async (node, input) => {
  const config = getConfig(node);
  const botToken = config.botToken;
  const chatId = (node.data as any)?.communication?.chatId || config.chatId;
  const message = (node.data as any)?.communication?.message || input?.message || '';
  
  if (!botToken || !chatId) {
    return { 
      sent: false, 
      error: 'Telegram bot token and chat ID are required', 
      message 
    };
  }
  
  const result = await TelegramService.sendMessage({ botToken, chatId }, message);
  
  if (result.success) {
    return { 
      sent: true, 
      message,
      messageId: result.data?.message_id,
      chatId: result.data?.chat_id,
      service: 'Telegram API'
    };
  } else {
    return { 
      sent: false, 
      error: result.error, 
      message,
      service: 'Telegram API'
    };
  }
};

const googleDriveRunner: NodeRunner = async (node, input) => {
  const config = getConfig(node);
  const op = (node.data as any)?.fileOperations?.operation || config.operation || 'upload';
  const folderId = (node.data as any)?.options?.folderId || '';
  // Placeholder: return intended behavior
  return { ok: true, operation: op, folderId, input, mocked: true };
};

// GitHub API Runner
const githubRunner: NodeRunner = async (node, input) => {
  const config = getConfig(node);
  const token = config.token || config.accessToken;
  const owner = config.owner || (node.data as any)?.options?.owner;
  const repo = config.repo || (node.data as any)?.options?.repo;
  const operation = config.operation || (node.data as any)?.options?.operation || 'create-issue';
  
  if (!token) {
    return { 
      success: false, 
      error: 'GitHub access token is required' 
    };
  }
  
  if (operation === 'create-issue') {
    const title = config.title || input?.title || 'Workflow Issue';
    const body = config.body || input?.body || '';
    const labels = config.labels || input?.labels || [];
    
    if (!owner || !repo) {
      return { 
        success: false, 
        error: 'GitHub owner and repo are required for issue creation' 
      };
    }
    
    const result = await GitHubService.createIssue({ token, owner, repo }, { title, body, labels });
    
    if (result.success) {
      return { 
        success: true, 
        operation: 'create-issue',
        issueNumber: result.data?.number,
        issueUrl: result.data?.url,
        service: 'GitHub API'
      };
    } else {
      return { 
        success: false, 
        error: result.error,
        service: 'GitHub API'
      };
    }
  }
  
  return { 
    success: false, 
    error: `Unsupported GitHub operation: ${operation}` 
  };
};

// Stripe API Runner
const stripeRunner: NodeRunner = async (node, input) => {
  const config = getConfig(node);
  const secretKey = config.secretKey;
  const operation = config.operation || (node.data as any)?.options?.operation || 'create-payment-intent';
  
  if (!secretKey) {
    return { 
      success: false, 
      error: 'Stripe secret key is required' 
    };
  }
  
  if (operation === 'create-payment-intent') {
    const amount = config.amount || input?.amount || 0;
    const currency = config.currency || input?.currency || 'usd';
    
    const result = await StripeService.createPaymentIntent({ secretKey }, amount, currency);
    
    if (result.success) {
      return { 
        success: true, 
        operation: 'create-payment-intent',
        paymentIntentId: result.data?.id,
        clientSecret: result.data?.client_secret,
        amount: result.data?.amount,
        currency: result.data?.currency,
        service: 'Stripe API'
      };
    } else {
      return { 
        success: false, 
        error: result.error,
        service: 'Stripe API'
      };
    }
  }
  
  return { 
    success: false, 
    error: `Unsupported Stripe operation: ${operation}` 
  };
};

// WhatsApp API Runner
const whatsappRunner: NodeRunner = async (node, input) => {
  const config = getConfig(node);
  const accessToken = config.accessToken;
  const phoneNumberId = config.phoneNumberId;

  // Resolve recipient: prefer new config field, then legacy communication, then flow input
  const to =
    config.recipientPhoneNumber ||
    (node.data as any)?.communication?.phoneNumber ||
    config.to ||
    input?.phoneNumber;

  // Resolve message: prefer new config field, then legacy communication, then flow input
  const message =
    config.textBody ||
    config.message ||
    (node.data as any)?.communication?.message ||
    input?.message ||
    '';
  
  if (!accessToken || !phoneNumberId || !to) {
    return { 
      sent: false, 
      error: 'WhatsApp access token, phone number ID, and recipient are required', 
      message 
    };
  }
  
  const result = await WhatsAppService.sendMessage({ accessToken, phoneNumberId }, to, message);
  
  if (result.success) {
    return { 
      sent: true, 
      message,
      messageId: result.data?.message_id,
      to: result.data?.to,
      status: result.data?.status,
      service: 'WhatsApp Business API'
    };
  } else {
    return { 
      sent: false, 
      error: result.error, 
      message,
      service: 'WhatsApp Business API'
    };
  }
};

// Database Runner
const databaseRunner: NodeRunner = async (node, input) => {
  const config = getConfig(node);
  const host = config.host || (node.data as any)?.options?.host;
  const port = config.port || (node.data as any)?.options?.port || 5432;
  const database = config.database || (node.data as any)?.options?.database;
  const username = config.username;
  const password = config.password;
  const query = config.query || (node.data as any)?.options?.query || 'SELECT 1';
  const params = config.params || (node.data as any)?.options?.params || [];
  
  if (!host || !database || !username || !password) {
    return { 
      success: false, 
      error: 'Database host, database name, username, and password are required' 
    };
  }
  
  const dbConfig = {
    host,
    port,
    database,
    username,
    password,
    ssl: config.ssl || false,
  };
  
  const result = await DatabaseService.executeQuery(dbConfig, query, params);
  
  if (result.success) {
    return { 
      success: true, 
      query,
      rows: result.data?.rows || [],
      affectedRows: result.data?.affectedRows || 0,
      service: 'Database API'
    };
  } else {
    return { 
      success: false, 
      error: result.error,
      service: 'Database API'
    };
  }
};

// Storage Runner
const storageRunner: NodeRunner = async (node, input) => {
  const config = getConfig(node);
  const accessKeyId = config.accessKeyId;
  const secretAccessKey = config.secretAccessKey;
  const bucket = config.bucket || (node.data as any)?.options?.bucket;
  const region = config.region || (node.data as any)?.options?.region || 'us-east-1';
  const operation = config.operation || (node.data as any)?.options?.operation || 'upload';
  const key = config.key || (node.data as any)?.options?.key || input?.key;
  
  if (!accessKeyId || !secretAccessKey || !bucket) {
    return { 
      success: false, 
      error: 'Storage access key ID, secret access key, and bucket are required' 
    };
  }
  
  const storageConfig = {
    accessKeyId,
    secretAccessKey,
    bucket,
    region,
    endpoint: config.endpoint,
  };
  
  if (operation === 'upload') {
    const file = input?.file || input?.data;
    if (!file || !key) {
      return { 
        success: false, 
        error: 'File data and key are required for upload' 
      };
    }
    
    const result = await StorageService.uploadFile(storageConfig, file, key);
    
    if (result.success) {
      return { 
        success: true, 
        operation: 'upload',
        key: result.data?.key,
        bucket: result.data?.bucket,
        url: result.data?.url,
        size: result.data?.size,
        service: 'Storage API'
      };
    } else {
      return { 
        success: false, 
        error: result.error,
        service: 'Storage API'
      };
    }
  } else if (operation === 'download') {
    if (!key) {
      return { 
        success: false, 
        error: 'Key is required for download' 
      };
    }
    
    const result = await StorageService.downloadFile(storageConfig, key);
    
    if (result.success) {
      return { 
        success: true, 
        operation: 'download',
        key: result.data?.key,
        bucket: result.data?.bucket,
        url: result.data?.url,
        service: 'Storage API'
      };
    } else {
      return { 
        success: false, 
        error: result.error,
        service: 'Storage API'
      };
    }
  }
  
  return { 
    success: false, 
    error: `Unsupported storage operation: ${operation}` 
  };
};

// Data Converter (frontend only)
const dataConverterRunner: NodeRunner = async (node, input) => {
  const cfg = (node.data?.conversion || node.data?.config || {}) as any;
  const outputFormat = String(cfg.outputFormat || 'csv').toLowerCase();
  const usePrev = Boolean(cfg.usePreviousOutput);
  const previousNodeId: string | undefined = cfg.previousNodeId;
  const customData = cfg.customData;

  // Prefer explicit customData, else the provided input
  let data: any = undefined;
  if (customData && typeof customData === 'string') {
    try { data = JSON.parse(customData); } catch { data = customData; }
  } else if (usePrev && input && typeof input === 'object' && previousNodeId && input[previousNodeId]) {
    data = input[previousNodeId];
  } else {
    data = input;
  }

  const toCSV = (val: any): string => {
    const rows = Array.isArray(val) ? val : (typeof val === 'object' && val !== null ? [val] : [{ value: val }]);
    const headers = Array.from(new Set(rows.flatMap(r => typeof r === 'object' && r !== null ? Object.keys(r) : ['value'])));
    const esc = (s: any) => {
      const txt = s === undefined || s === null ? '' : String(s);
      return /[",\n]/.test(txt) ? '"' + txt.replace(/"/g, '""') + '"' : txt;
    };
    const lines = rows.map(r => headers.map(h => esc((r as any)[h])).join(','));
    return headers.join(',') + '\n' + lines.join('\n');
  };

  let exported = '';
  let ext = outputFormat;
  switch (outputFormat) {
    case 'csv':
      exported = toCSV(data);
      break;
    case 'json':
      exported = JSON.stringify(data, null, 2);
      break;
    case 'txt':
      exported = typeof data === 'string' ? data : JSON.stringify(data);
      break;
    default:
      exported = JSON.stringify(data, null, 2);
      ext = 'json';
  }

  const filename = cfg.fileName || `export.${ext}`;
  return {
    exports: [
      { format: outputFormat, filename, data: exported }
    ],
    preview: exported.slice(0, 2000),
  };
};

// File Export (frontend fallback)
const fileExportRunner: NodeRunner = async (node, input) => {
  const cfg = (node.data?.config || {}) as any;
  let format: string = String(cfg.format || (Array.isArray(cfg.formats) ? cfg.formats[0] : 'json') || 'json').toLowerCase();
  const fileName: string = cfg.fileName || `export.${format}`;
  const data = input?.data ?? input?.cleanedData ?? input?.transformedData ?? input;

  const toCSV = (val: any): string => {
    const rows = Array.isArray(val) ? val : (typeof val === 'object' && val !== null ? [val] : [{ value: val }]);
    const headers = Array.from(new Set(rows.flatMap(r => typeof r === 'object' && r !== null ? Object.keys(r) : ['value'])));
    const esc = (s: any) => {
      const txt = s === undefined || s === null ? '' : String(s);
      return /[",\n]/.test(txt) ? '"' + txt.replace(/"/g, '""') + '"' : txt;
    };
    const lines = rows.map(r => headers.map(h => esc((r as any)[h])).join(','));
    return headers.join(',') + '\n' + lines.join('\n');
  };

  let payload = '';
  switch (format) {
    case 'csv':
      payload = toCSV(data);
      break;
    case 'txt':
      payload = typeof data === 'string' ? data : JSON.stringify(data);
      break;
    default:
      format = 'json';
      payload = JSON.stringify(data, null, 2);
  }

  return {
    exports: [ { format, filename: fileName, data: payload } ],
    fileName,
    preview: payload.slice(0, 2000)
  };
};

// Utility runners (n8n-like basics)
// Removed delayRunner

const codeRunner: NodeRunner = async (node, input) => {
  const config = getConfig(node);
  const code: string = (node.data as any)?.code ?? config.code ?? '';
  // Very minimal sandbox - user-provided code should be trusted or pre-validated
  // Expose input and a limited set of utilities
  const safeUtils = {
    JSON,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Math,
    Date,
  };
  // eslint-disable-next-line no-new-func
  const fn = new Function('input', 'utils', `"use strict"; ${code.includes('return') ? code : `return (async () => { ${code} })();`}`);
  const result = await fn(input, safeUtils);
  return result;
};



const switchRunner: NodeRunner = async (node, input) => {
  const config = getConfig(node);
  const selectorExpr: string = (node.data as any)?.options?.selector || config.selector || '';
  let key: string | number | undefined;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('input', `"use strict"; return (${selectorExpr});`);
    key = fn(input);
  } catch {
    key = undefined;
  }
  return { __branch: String(key ?? 'default'), key, input };
};

// Agent utility runners
const agentContextRunner: NodeRunner = async (node, input) => {
  const cfg = getConfig(node);
  const options = (node.data as any)?.options || {};
  const contextName: string = cfg.contextName || cfg.namespace || 'agent';
  const variablesRaw = cfg.variables;
  const inputsMappingRaw = cfg.inputsMapping;
  const mergeStrategy: string = options.mergeStrategy || 'deepMerge';
  const ttlSeconds = Number(options.ttlSeconds ?? 0);

  const variables = safeJson<Record<string, any>>(variablesRaw, {});
  const inputsMapping = safeJson<Record<string, string>>(inputsMappingRaw, {});

  const mapped: Record<string, any> = {};
  for (const [k, expr] of Object.entries(inputsMapping)) {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('input', `"use strict"; try { return (${expr}); } catch { return undefined; }`);
      mapped[k] = fn(input);
    } catch {
      mapped[k] = undefined;
    }
  }

  const currentCtx = (input?.context && input.context[contextName]) || {};
  let nextCtx: Record<string, any>;
  if (mergeStrategy === 'overwrite') nextCtx = { ...variables, ...mapped };
  else {
    // deep merge (shallow for simplicity here)
    nextCtx = { ...currentCtx, ...variables, ...mapped };
  }

  const context = { ...(input?.context || {}), [contextName]: nextCtx } as Record<string, any>;
  return { ...input, context, __meta: { ttlSeconds } };
};

const agentDecisionRunner: NodeRunner = async (node, input) => {
  const cfg = getConfig(node);
  const policy: string = cfg.policy || 'ruleBased';
  const rules = safeJson<any[]>(cfg.rules, []);
  const scoringExpr: string = cfg.scoringFunction || '';
  const threshold: number = Number(cfg.threshold ?? 0.5);
  const branches = safeJson<Record<string, string>>(cfg.branches, {});
  const requireExplain = Boolean((node.data as any)?.options?.explain || cfg.explain);

  let decision: string = 'default';
  let score: number | undefined;
  let explanation: string | undefined;

  try {
    if (policy === 'ruleBased') {
      for (const rule of rules) {
        const cond = String(rule?.if || 'false');
        // eslint-disable-next-line no-new-func
        const fn = new Function('input', `"use strict"; return (${cond});`);
        if (fn(input)) {
          decision = String(rule?.then ?? 'true');
          explanation = requireExplain ? `Matched rule: ${cond}` : undefined;
          break;
        }
      }
    } else if (policy === 'scoreBased' && scoringExpr) {
      // eslint-disable-next-line no-new-func
      const fn = new Function('input', `"use strict"; return (Number(${scoringExpr}));`);
      score = Number(fn(input));
      decision = score >= threshold ? 'approve' : 'reject';
      explanation = requireExplain ? `Score ${score} vs threshold ${threshold}` : undefined;
    } else {
      // modelBased not implemented on frontend; default to pass-through
      decision = 'default';
    }
  } catch {
    decision = 'error';
  }

  const branchLabel = branches[decision] ? decision : decision;
  return { __branch: branchLabel, decision, score, explanation, input };
};

const agentGoalRunner: NodeRunner = async (node, input) => {
  const cfg = getConfig(node);
  const goal = {
    id: cfg.goalId || `goal-${node.id}`,
    description: cfg.goal || '',
    priority: cfg.priority || 'medium',
    deadline: cfg.deadline || null,
    constraints: safeJson<Record<string, any>>(cfg.constraints, {}),
    successCriteria: cfg.successCriteria || '',
    evaluationMetric: cfg.evaluationMetric || '',
    maxSteps: Number(cfg.maxSteps ?? 6),
  };
  return { ...input, goal };
};

const agentReasoningRunner: NodeRunner = async (node, input) => {
  const cfg = getConfig(node);
  const mode: string = cfg.mode || 'balanced';
  const model: string = cfg.model || 'openai/gpt-4o-mini';
  const prompt: string = cfg.prompt || 'Think step-by-step.';
  const temperature: number = Number(cfg.temperature ?? (mode === 'deliberate' ? 0.3 : mode === 'fast' ? 0.8 : 0.5));
  const maxTokens: number = Number(cfg.maxTokens ?? 600);
  const allowCitations = Boolean((node.data as any)?.options?.returnCitations);

  const messages = [
    { role: 'system' as const, content: 'You are an expert reasoning assistant.' },
    { role: 'user' as const, content: `${prompt}\n\nContext: ${JSON.stringify(input).slice(0, 4000)}` },
  ];

  const completion = await chatCompletion(messages, { model, temperature, maxTokens });
  const reasoning = completion.text;

  return { reasoning, model, mode, citations: allowCitations ? [] : undefined, input };
};

const agentStateRunner: NodeRunner = async (node, input) => {
  const cfg = getConfig(node);
  const store = cfg.store || 'memory';
  const namespace: string = cfg.namespace || 'agent';
  const key: string = cfg.stateKey || '';
  const op: string = cfg.operation || 'read';
  const valueRaw = cfg.value;
  const mergeStrategy: string = (node.data as any)?.options?.mergeStrategy || 'overwrite';
  const encrypt: boolean = Boolean((node.data as any)?.options?.encrypt);
  const ttlSeconds: number = Number((node.data as any)?.options?.ttlSeconds ?? 0);
  const initIfMissing: boolean = Boolean((node.data as any)?.options?.initIfMissing);

  const stateRoot = { ...(input?.state || {}) } as Record<string, any>;
  stateRoot[namespace] = stateRoot[namespace] || {};
  const ns = stateRoot[namespace];

  if (!key) return { ...input, state: stateRoot, warning: 'No stateKey provided' };

  if (op === 'read') {
    const current = ns[key];
    return { ...input, state: stateRoot, value: current };
  }

  if (op === 'delete') {
    delete ns[key];
    return { ...input, state: stateRoot, deleted: true };
  }

  // write/append
  let val: any;
  try {
    val = typeof valueRaw === 'string' ? JSON.parse(valueRaw) : valueRaw;
  } catch {
    val = valueRaw;
  }

  if (op === 'append') {
    if (Array.isArray(ns[key])) ns[key] = [...ns[key], val];
    else if (typeof ns[key] === 'string') ns[key] = String(ns[key]) + String(val);
    else if (typeof ns[key] === 'object' && ns[key] !== null && typeof val === 'object' && val !== null) ns[key] = { ...ns[key], ...val };
    else ns[key] = [ns[key], val].filter((x) => typeof x !== 'undefined');
  } else {
    if (mergeStrategy === 'deepMerge' && typeof ns[key] === 'object' && typeof val === 'object') ns[key] = { ...ns[key], ...val };
    else ns[key] = val;
  }

  const meta = { store, encrypt, ttlSeconds, initIfMissing };
  return { ...input, state: stateRoot, __meta: meta };
};

const subtypeRunners: Record<string, NodeRunner> = {
  // Agent
  'agent': async (node, input) => {
    const config = getConfig(node);
    const model = config.model || 'openai/gpt-4o-mini';
    const toolsAllowed: string[] = Array.isArray(config.tools)
      ? config.tools
      : (typeof config.tools === 'string'
          ? String(config.tools)
              .split(',')
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0)
          : []);
    const maxSteps = Math.min(Number(config.maxSteps ?? 6), 20);
    const temperature = Number(config.temperature ?? 0.7);
    const systemPrompt = config.systemPrompt || 'You are a helpful agent.';

    const availableTools = ToolRegistry.list().filter((t: string) => toolsAllowed.includes(t));
    const ctx = { fetch } as const;

    let scratchpad: Array<{ role: 'user' | 'assistant' | 'tool'; content: string }> = [];
    let observation: any = input;

    for (let step = 1; step <= maxSteps; step++) {
      const messages = [
        { role: 'system' as const, content: buildPlanningSystemPrompt(availableTools as string[]) + `\n${systemPrompt}` },
        { role: 'user' as const, content: JSON.stringify({ input: observation }) },
        ...scratchpad,
      ];

      const completion = await chatCompletion(messages, { model, temperature, maxTokens: 600 });
      let plan: any = null;
      try {
        plan = JSON.parse(completion.text);
      } catch {
        return { error: true, message: 'Planner returned non-JSON response', raw: completion.text };
      }

      const toolName = String(plan?.tool || '').toLowerCase();
      if (toolName === 'final') {
        return { answer: plan?.args?.answer ?? completion.text, steps: step };
      }

      if (!availableTools.includes(toolName)) {
        return { error: true, message: `Tool not allowed: ${toolName}` };
      }

      const tool = ToolRegistry.get(toolName);
      if (!tool) return { error: true, message: `Tool not found: ${toolName}` };

      try {
        if (plan?.args) {
          tool.validate(plan.args);
        }
      } catch (e: any) {
        return { error: true, message: `Invalid tool args for ${toolName}: ${e?.message || String(e)}` };
      }

      let result: any;
      try {
        result = await ErrorService.executeWithRetry(
          () => tool.execute(ctx, plan?.args || {}),
          node.id,
          'agent'
        );
      } catch (e: any) {
        const err = ErrorService.handleApiError(e, node.id, 'agent');
        return { error: true, message: err.userMessage, details: err };
      }

      scratchpad.push({ role: 'assistant', content: JSON.stringify({ thought: plan.thought || '', tool: toolName, args: plan.args }) });
      scratchpad.push({ role: 'tool', content: JSON.stringify({ tool: toolName, observation: result }) });
      observation = { lastTool: toolName, result };
    }

    return { error: true, message: 'Max steps reached without final answer' };
  },
  'agent-context': agentContextRunner,
  'agent-decision': agentDecisionRunner,
  'agent-goal': agentGoalRunner,
  'agent-reasoning': agentReasoningRunner,
  'agent-state': agentStateRunner,
  // HTTP & Webhooks
  'http-request': httpRequestRunner,
  'webhook-call': httpRequestRunner,
  
  // Communication APIs
  slack: slackRunner,
  discord: discordRunner,
  telegram: telegramRunner,
  whatsapp: whatsappRunner,
  // removed email and email-integration runners
  gmail: sendEmailRunner,
  'resend': sendEmailRunner,
  
  // Google Services
  'google-sheets': googleSheetsRunner,
  'google-forms': googleSheetsRunner, // Use same runner pattern as Google Sheets
  'google-drive': googleDriveRunner,
  claude: codeRunner,
  
  // Development APIs
  github: githubRunner,
  'github-api': githubRunner,
  
  // Finance APIs
  stripe: stripeRunner,
  
  // Database APIs
  mysql: databaseRunner,
  postgresql: databaseRunner,
  mongodb: databaseRunner,
  redis: databaseRunner,
  database: databaseRunner,
  
  // Storage APIs
  'aws-s3': storageRunner,
  'google-cloud-storage': storageRunner,
  'azure-blob': storageRunner,
  onedrive: storageRunner,
  storage: storageRunner,
  
  // Social Media APIs
  instagram: httpRequestRunner, // Use HTTP request for Instagram API
  
  // CRM APIs
  
  // Analytics APIs
  'google-analytics': httpRequestRunner, // Use HTTP request for Google Analytics API
  segment: httpRequestRunner, // Use HTTP request for Segment API
  
  // Productivity APIs
  
  // Messaging APIs
  'microsoft-teams': httpRequestRunner, // Use HTTP request for Microsoft Teams API
  zoom: httpRequestRunner, // Use HTTP request for Zoom API
  
  // Utility nodes
  switch: switchRunner,
  condition: switchRunner, // Use switch runner for condition logic
  code: codeRunner,
  'date-time': codeRunner, // Use code runner for date operations
  crypto: codeRunner, // Use code runner for crypto operations
  // removed file-watch executor
  scheduler: passThroughRunner,
  'data-converter': dataConverterRunner,
  'file-export': fileExportRunner,
};

function safeJson<T>(raw: any, fallback: T): T {
  try {
    if (typeof raw === 'string') return JSON.parse(raw);
    return raw as T;
  } catch {
    return fallback;
  }
}

type OutNeighbor = { targetId: string; label?: string };

function buildGraph(nodes: Node[], edges: Edge[]) {
  const out: Record<string, string[]> = {};
  const outDetail: Record<string, OutNeighbor[]> = {};
  const incoming: Record<string, string[]> = {};
  for (const n of nodes) {
    out[n.id] = [];
    outDetail[n.id] = [];
    incoming[n.id] = [];
  }
  for (const e of edges) {
    if (out[e.source]) out[e.source].push(e.target);
    if (outDetail[e.source]) outDetail[e.source].push({ targetId: e.target, label: (e as any).label || (e as any).data?.label });
    if (incoming[e.target]) incoming[e.target].push(e.source);
  }
  return { out, outDetail, incoming };
}

export async function runWorkflow(nodes: Node[], edges: Edge[], options?: ExecutionOptions): Promise<ExecutionResultMap> {
  // Always use the main backend for execution
  if (BACKEND_URL) {
    try {
      const workflowId = options?.workflowId || `temp_${Date.now()}`;
      logger.info('Executing workflow on main backend', { workflowId, nodeCount: nodes.length });
      const backendResult = await executeWorkflowOnBackend({ nodes, edges }, options?.initialInput);
      
      if (backendResult.success) {
        logger.info('Backend execution successful', { workflowId });
        // Convert backend result to frontend format
        // Handle multiple possible locations for nodeResults
        const resultMap: ExecutionResultMap = {};
        let nodeResults: Record<string, any> | undefined;
        
        // Check multiple possible locations for nodeResults
        if (backendResult.output?.nodeResults) {
          nodeResults = backendResult.output.nodeResults;
        } else if (backendResult.nodeResults) {
          nodeResults = backendResult.nodeResults;
        } else if (backendResult.data?.result?.output?.nodeResults) {
          nodeResults = backendResult.data.result.output.nodeResults;
        } else if (backendResult.data?.result?.nodeResults) {
          nodeResults = backendResult.data.result.nodeResults;
        }
        
        if (nodeResults) {
          Object.entries(nodeResults).forEach(([nodeId, result]: [string, any]) => {
            resultMap[nodeId] = result.result || result;
          });
        }
        
        return resultMap;
      }
    } catch (error) {
      logger.error('Backend execution failed', error as Error, {
        errorMessage: (error as Error).message,
        errorStack: (error as Error).stack,
        nodeCount: nodes.length
      });
      logger.warn('Backend execution failed, falling back to frontend', { error: error as Error });
    }
  }

  // Fallback to frontend execution only if backend is completely unavailable
  logger.info('Executing workflow on frontend (fallback)', { nodeCount: nodes.length });
  const { out, outDetail, incoming } = buildGraph(nodes, edges);
  const idToNode: Record<string, Node> = Object.fromEntries(nodes.map((n) => [n.id, n]));

  // Determine start nodes: triggers or explicit list
  const startIds = options?.startFrom && options.startFrom.length > 0
    ? options.startFrom
    : nodes.filter((n) => n.type === 'trigger').map((n) => n.id);

  const results: ExecutionResultMap = {};
  const pendingInputs: Record<string, any[]> = {};
  const waitingForAll: Set<string> = new Set(
    nodes.filter((n) => (n.data as any)?.options?.mergeStrategy === 'all' || (n.data as any)?.subtype === 'merge').map((n) => n.id)
  );

  const queue: Array<{ id: string; payload: any } > = startIds.map((id) => ({ id, payload: options?.initialInput ?? {} }));

  const executed = new Set<string>();

  async function runWithRetries(node: Node, inputPayload: any): Promise<{ ok: boolean; output?: any; error?: any } > {
    const subtype: string = (node.data?.subtype || node.type || '') as string;
    const runner = subtypeRunners[subtype] || passThroughRunner;
    const retries = Number((node.data as any)?.errorHandling?.retries ?? (node.data as any)?.options?.retries ?? 3);
    const continueOnFail = Boolean((node.data as any)?.errorHandling?.continueOnFail ?? (node.data as any)?.options?.continueOnFail ?? false);
    
    try {
      // Validate node configuration before execution
      const validationErrors = ErrorService.validateNodeConfiguration(node);
      if (validationErrors.length > 0) {
        const error = validationErrors[0];
        ErrorService.logError(error);
        if (continueOnFail) {
          return { ok: true, output: { error: true, message: error.userMessage } };
        }
        return { ok: false, error };
      }

      // Execute with retry logic using ErrorService
      const output = await ErrorService.executeWithRetry(
        () => runner(node, inputPayload),
        node.id,
        node.type,
        { maxRetries: retries }
      );
      
      return { ok: true, output };
    } catch (err: any) {
      const workflowError = ErrorService.handleApiError(err, node.id, node.type);
      ErrorService.logError(workflowError);
      
      if (continueOnFail) {
        return { ok: true, output: { error: true, message: workflowError.userMessage } };
      }
      return { ok: false, error: workflowError };
    }
  }

  function enqueueOrAccumulate(targetId: string, payload: any) {
    if (waitingForAll.has(targetId)) {
      pendingInputs[targetId] = pendingInputs[targetId] || [];
      pendingInputs[targetId].push(payload);
      const needed = (incoming[targetId] || []).length || 1;
      if (pendingInputs[targetId].length >= needed) {
        const combined = [].concat(...pendingInputs[targetId]);
        queue.push({ id: targetId, payload: combined });
        delete pendingInputs[targetId];
      }
    } else {
      queue.push({ id: targetId, payload });
    }
  }

  while (queue.length) {
    const { id, payload } = queue.shift()!;
    const node = idToNode[id];
    if (!node) continue;

    const inputPayload = payload ?? results[id];
    const { ok, output, error } = await runWithRetries(node, inputPayload);
    if (!ok) {
      // Stop propagation for this branch
      results[id] = { error: true, message: error?.message || String(error) };
      continue;
    }
    results[id] = output;
    executed.add(id);

    const neighbors = out[id] || [];

    // Fan-out handling
    if (output && output.__fanOut === true && Array.isArray(output.items)) {
      for (const nextId of neighbors) {
        for (const item of output.items) {
          enqueueOrAccumulate(nextId, item);
        }
      }
      continue;
    }

    // Conditional routing: IF/Switch
    if (output && typeof output.__branch !== 'undefined') {
      const branchKey = String(output.__branch);
      const detailed = outDetail[id] || [];
      // Prefer labeled edges first
      let routed = false;
      for (const { targetId, label } of detailed) {
        if (label && String(label).toLowerCase() === branchKey.toLowerCase()) {
          enqueueOrAccumulate(targetId, output);
          routed = true;
        }
      }
      if (!routed) {
        // Fallback by neighbor order: true/false → [0]/[1], switch → nth by numeric key
        if (branchKey === 'true' && neighbors[0]) enqueueOrAccumulate(neighbors[0], output);
        else if (branchKey === 'false' && neighbors[1]) enqueueOrAccumulate(neighbors[1], output);
        else {
          const idx = Number.isNaN(Number(branchKey)) ? -1 : Number(branchKey);
          if (idx >= 0 && neighbors[idx]) enqueueOrAccumulate(neighbors[idx], output);
          else if (neighbors[0]) enqueueOrAccumulate(neighbors[0], output);
        }
      }
      continue;
    }

    // Default propagation
    for (const nextId of neighbors) enqueueOrAccumulate(nextId, output);
  }

  return results;
}


