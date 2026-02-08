// Authentication service for managing OAuth2 and API key flows
// This service handles secure credential storage and token management
// All OAuth flows are now handled by the backend for security

export interface AuthConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scope?: string[];
  state?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export interface StoredCredentials {
  id: string;
  type: 'oauth2' | 'apiKey' | 'basic' | 'bearer';
  name: string;
  provider: string;
  credentials: {
    access_token?: string;
    refresh_token?: string;
    api_key?: string;
    username?: string;
    password?: string;
    expires_at?: number;
    scope?: string;
  };
  createdAt: string;
  updatedAt: string;
}

import { API_CONFIG } from './config';

const API_BASE = API_CONFIG.baseUrl;

// Secure credential storage using localStorage (in production, use encrypted storage)
export class AuthService {
  private static readonly STORAGE_KEY = 'workflow_credentials';
  private static readonly ENCRYPTION_KEY = 'workflow_studio_key'; // In production, use proper encryption

  // Store credentials securely
  static async storeCredentials(credentials: Omit<StoredCredentials, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    const fullCredentials: StoredCredentials = {
      ...credentials,
      id,
      createdAt: now,
      updatedAt: now,
    };

    const stored = this.getStoredCredentials();
    stored[id] = fullCredentials;
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored));
    
    return id;
  }

  // Retrieve credentials by ID
  static async getCredentials(id: string): Promise<StoredCredentials | null> {
    const stored = this.getStoredCredentials();
    return stored[id] || null;
  }

  // List all stored credentials
  static async listCredentials(): Promise<StoredCredentials[]> {
    const stored = this.getStoredCredentials();
    return Object.values(stored);
  }

  // Update credentials
  static async updateCredentials(id: string, updates: Partial<StoredCredentials>): Promise<boolean> {
    const stored = this.getStoredCredentials();
    if (!stored[id]) return false;

    stored[id] = {
      ...stored[id],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored));
    return true;
  }

  // Delete credentials
  static async deleteCredentials(id: string): Promise<boolean> {
    const stored = this.getStoredCredentials();
    if (!stored[id]) return false;

    delete stored[id];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored));
    return true;
  }

  // OAuth2 Authorization URL generation (now handled by backend)
  static generateOAuthUrl(provider: string, config: AuthConfig): string {
    // Redirect to backend OAuth initiation endpoint
    return `${API_BASE}/api/oauth/${provider}`;
  }

  // OAuth2 Token Exchange (now handled by backend)
  static async exchangeCodeForToken(provider: string, code: string, config: AuthConfig): Promise<TokenResponse> {
    // This should not be called from frontend anymore
    // OAuth exchange is handled by backend callback
    throw new Error('OAuth token exchange is now handled by the backend. Use the OAuth callback flow instead.');
  }

  // Refresh OAuth2 token (now handled by backend)
  static async refreshToken(provider: string, refreshToken: string, config: AuthConfig): Promise<TokenResponse> {
    try {
      const response = await fetch(`${API_BASE}/api/oauth/${provider}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  // Validate API key for various services (now handled by backend)
  static async validateApiKey(provider: string, apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/api/integrations/${provider}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({ apiKey })
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  // Get credentials for a specific node
  static async getNodeCredentials(nodeId: string, credentialId: string): Promise<StoredCredentials | null> {
    const credentials = await this.getCredentials(credentialId);
    if (!credentials) return null;

    // Store the credential ID in the node data for future reference
    const nodeData = JSON.parse(localStorage.getItem(`node_${nodeId}`) || '{}');
    nodeData.credentialId = credentialId;
    localStorage.setItem(`node_${nodeId}`, JSON.stringify(nodeData));

    return credentials;
  }

  // Helper methods
  private static getStoredCredentials(): Record<string, StoredCredentials> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  private static generateState(): string {
    return Math.random().toString(36).substr(2, 15);
  }

  // Check if credentials are expired
  static isCredentialsExpired(credentials: StoredCredentials): boolean {
    if (!credentials.credentials.expires_at) return false;
    return Date.now() >= credentials.credentials.expires_at;
  }

  // Get valid access token (refresh if needed)
  static async getValidAccessToken(credentials: StoredCredentials): Promise<string | null> {
    if (credentials.type !== 'oauth2') {
      return credentials.credentials.access_token || credentials.credentials.api_key || null;
    }

    if (!this.isCredentialsExpired(credentials)) {
      return credentials.credentials.access_token || null;
    }

    // Token is expired, try to refresh via backend
    if (credentials.credentials.refresh_token) {
      try {
        const newTokens = await this.refreshToken(
          credentials.provider,
          credentials.credentials.refresh_token,
          {
            clientId: '', // These would be stored securely
            clientSecret: '',
          }
        );

        // Update stored credentials
        await this.updateCredentials(credentials.id, {
          credentials: {
            ...credentials.credentials,
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token || credentials.credentials.refresh_token,
            expires_at: newTokens.expires_in 
              ? Date.now() + (newTokens.expires_in * 1000)
              : credentials.credentials.expires_at,
          },
        });

        return newTokens.access_token;
      } catch (error) {
        logger.error('Token refresh failed:', error as Error);
        return null;
      }
    }

    return null;
  }
}
