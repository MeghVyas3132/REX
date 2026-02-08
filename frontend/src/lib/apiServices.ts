// Backend-proxied API integrations for workflow nodes
// This file routes all external API calls through the backend for security

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface SlackConfig {
  botToken?: string;
  webhookUrl?: string;
  channel?: string;
  signingSecret?: string;
}

export interface EmailConfig {
  apiKey?: string;
  fromEmail?: string;
  toEmail?: string;
  subject?: string;
  textContent?: string;
  htmlContent?: string;
}

export interface DatabaseConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
}

export interface StorageConfig {
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket?: string;
  region?: string;
  endpoint?: string;
}

import { API_CONFIG } from './config';

const API_BASE = API_CONFIG.baseUrl;

// Generic backend proxy call
async function callBackendProxy(service: string, action: string, config: any, data?: any): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/integrations/${service}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
      },
      body: JSON.stringify({ config, data })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}`,
        statusCode: response.status
      };
    }

    const result = await response.json();
    return {
      success: true,
      data: result.data || result,
      statusCode: response.status
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error occurred'
    };
  }
}

// Slack API Integration (via backend proxy)
export class SlackService {
  static async sendMessage(config: SlackConfig, message: string, channel?: string): Promise<ApiResponse> {
    return callBackendProxy('slack', 'send-message', config, { message, channel });
  }
}

// Email API Integration (via backend proxy)
export class EmailService {
  static async sendEmail(config: EmailConfig): Promise<ApiResponse> {
    return callBackendProxy('email', 'send', config);
  }
}

// Database Service Integration (via backend proxy)
export class DatabaseService {
  static async executeQuery(config: DatabaseConfig, query: string, params?: any[]): Promise<ApiResponse> {
    return callBackendProxy('database', 'execute', config, { query, params });
  }
}

// Storage Service Integration (via backend proxy)
export class StorageService {
  static async uploadFile(config: StorageConfig, file: File | Buffer, key: string): Promise<ApiResponse> {
    return callBackendProxy('storage', 'upload', config, { key, fileSize: file instanceof File ? file.size : file.length });
  }

  static async downloadFile(config: StorageConfig, key: string): Promise<ApiResponse> {
    return callBackendProxy('storage', 'download', config, { key });
  }
}

// GitHub API Integration (via backend proxy)
export class GitHubService {
  static async createIssue(config: { token: string; owner: string; repo: string }, issue: { title: string; body: string; labels?: string[] }): Promise<ApiResponse> {
    return callBackendProxy('github', 'create-issue', config, issue);
  }
}

// Stripe API Integration (via backend proxy)
export class StripeService {
  static async createPaymentIntent(config: { secretKey: string }, amount: number, currency: string = 'usd'): Promise<ApiResponse> {
    return callBackendProxy('stripe', 'create-payment-intent', config, { amount, currency });
  }
}

// Telegram API Integration (via backend proxy)
export class TelegramService {
  static async sendMessage(config: { botToken: string; chatId: string }, message: string): Promise<ApiResponse> {
    return callBackendProxy('telegram', 'send-message', config, { message });
  }
}

// Discord API Integration (via backend proxy)
export class DiscordService {
  static async sendMessage(config: { webhookUrl: string }, message: string, embeds?: any[]): Promise<ApiResponse> {
    return callBackendProxy('discord', 'send-message', config, { message, embeds });
  }
}

// WhatsApp Business API Integration (via backend proxy)
export class WhatsAppService {
  static async sendMessage(config: { accessToken: string; phoneNumberId: string }, to: string, message: string): Promise<ApiResponse> {
    return callBackendProxy('whatsapp', 'send-message', config, { to, message });
  }
}

// Google Drive API Integration (via backend proxy)
export class GoogleDriveService {
  static async uploadFile(config: { refreshToken: string }, file: File | Buffer, fileName: string, folderId?: string): Promise<ApiResponse> {
    return callBackendProxy('google-drive', 'upload', config, { fileName, folderId, fileSize: file instanceof File ? file.size : file.length });
  }

  static async downloadFile(config: { refreshToken: string }, fileId: string): Promise<ApiResponse> {
    return callBackendProxy('google-drive', 'download', config, { fileId });
  }

  static async listFiles(config: { refreshToken: string }, folderId?: string): Promise<ApiResponse> {
    return callBackendProxy('google-drive', 'list', config, { folderId });
  }
}

// Google Sheets API Integration (via backend proxy)
export class GoogleSheetsService {
  static async readSheet(config: { refreshToken: string }, spreadsheetId: string, range: string): Promise<ApiResponse> {
    return callBackendProxy('google-sheets', 'read', config, { spreadsheetId, range });
  }

  static async writeSheet(config: { refreshToken: string }, spreadsheetId: string, range: string, values: any[][]): Promise<ApiResponse> {
    return callBackendProxy('google-sheets', 'write', config, { spreadsheetId, range, values });
  }
}

// OpenAI API Integration (via backend proxy)
export class OpenAIService {
  static async generateText(config: { apiKey: string }, prompt: string, options?: any): Promise<ApiResponse> {
    return callBackendProxy('openai', 'generate', config, { prompt, options });
  }

  static async generateImage(config: { apiKey: string }, prompt: string, options?: any): Promise<ApiResponse> {
    return callBackendProxy('openai', 'generate-image', config, { prompt, options });
  }
}

// Anthropic Claude API Integration (via backend proxy)
export class AnthropicService {
  static async generateText(config: { apiKey: string }, prompt: string, options?: any): Promise<ApiResponse> {
    return callBackendProxy('anthropic', 'generate', config, { prompt, options });
  }
}

// HTTP Request Service (via backend proxy)
export class HttpRequestService {
  static async makeRequest(config: { url: string; method: string; headers?: any; body?: any }): Promise<ApiResponse> {
    return callBackendProxy('http', 'request', {}, config);
  }
}

// Utility function to check if backend integration is available
export async function checkBackendIntegration(service: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/integrations/${service}/status`);
    return response.ok;
  } catch {
    return false;
  }
}

// Utility function to get available integrations from backend
export async function getAvailableIntegrations(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE}/api/integrations`);
    if (response.ok) {
      const data = await response.json();
      return data?.integrations || [];
    }
    return [];
  } catch {
    return [];
  }
}