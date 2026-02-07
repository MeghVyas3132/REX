import crypto from 'crypto';
import { db } from '../db/database';
const logger = require('../utils/logger');

export interface Credential {
  id: string;
  user_id: string;
  name: string;
  type: string;
  service: string;
  encrypted_data: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CredentialData {
  name: string;
  type: string;
  service: string;
  data: Record<string, any>;
}

export interface DecryptedCredential extends Omit<Credential, 'encrypted_data'> {
  data: Record<string, any>;
}

export class CredentialService {
  private encryptionKey: Buffer;

  constructor() {
    const key = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here';
    
    // Ensure encryption key is 32 bytes for AES-256
    if (key.length === 32) {
      this.encryptionKey = Buffer.from(key, 'utf8');
    } else {
      // Use scrypt to derive a 32-byte key
      this.encryptionKey = crypto.scryptSync(key, 'salt', 32);
    }
  }

  /**
   * Encrypt sensitive data
   */
  private encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine iv and encrypted data
      return iv.toString('hex') + ':' + encrypted;
    } catch (error: any) {
      logger.error('Encryption failed', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0]!, 'hex');
      const encrypted = parts[1]!;

      const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error: any) {
      logger.error('Decryption failed', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Create a new credential
   */
  async createCredential(userId: string, credentialData: CredentialData): Promise<{ success: boolean; credential?: Credential; error?: string }> {
    try {
      // Validate required fields
      if (!credentialData.name || !credentialData.type || !credentialData.service || !credentialData.data) {
        return {
          success: false,
          error: 'Name, type, service, and data are required'
        };
      }

      // Check if credential with same name already exists for user
      const existing = await db.getCredentialByName(userId, credentialData.name);
      if (existing) {
        return {
          success: false,
          error: 'Credential with this name already exists'
        };
      }

      // Encrypt the credential data
      const encryptedData = this.encrypt(JSON.stringify(credentialData.data));

      // Save to database
      const credential = await db.createCredential(
        userId,
        credentialData.name,
        credentialData.type,
        credentialData.service,
        encryptedData
      );

      logger.info('Credential created successfully', {
        credentialId: credential.id,
        userId,
        name: credentialData.name,
        type: credentialData.type,
        service: credentialData.service
      });

      return {
        success: true,
        credential
      };

    } catch (error: any) {
      logger.error('Failed to create credential', error);
      return {
        success: false,
        error: error.message || 'Failed to create credential'
      };
    }
  }

  /**
   * Get credential by ID (decrypted)
   */
  async getCredential(userId: string, credentialId: string): Promise<{ success: boolean; credential?: DecryptedCredential; error?: string }> {
    try {
      const credential = await db.getCredentialById(credentialId);
      
      if (!credential) {
        return {
          success: false,
          error: 'Credential not found'
        };
      }

      // Check if user owns this credential
      if (credential.user_id !== userId) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      // Decrypt the data
      const decryptedData = JSON.parse(this.decrypt(credential.encrypted_data));

      const decryptedCredential: DecryptedCredential = {
        id: credential.id,
        user_id: credential.user_id,
        name: credential.name,
        type: credential.type,
        service: credential.service,
        is_active: credential.is_active,
        created_at: credential.created_at,
        updated_at: credential.updated_at,
        data: decryptedData
      };

      return {
        success: true,
        credential: decryptedCredential
      };

    } catch (error: any) {
      logger.error('Failed to get credential', error);
      return {
        success: false,
        error: error.message || 'Failed to get credential'
      };
    }
  }

  /**
   * Get all credentials for a user
   */
  async getUserCredentials(userId: string): Promise<{ success: boolean; credentials?: Credential[]; error?: string }> {
    try {
      const credentials = await db.getUserCredentials(userId);
      
      return {
        success: true,
        credentials
      };

    } catch (error: any) {
      logger.error('Failed to get user credentials', error);
      return {
        success: false,
        error: error.message || 'Failed to get credentials'
      };
    }
  }

  /**
   * Update credential
   */
  async updateCredential(userId: string, credentialId: string, updates: Partial<CredentialData>): Promise<{ success: boolean; credential?: Credential; error?: string }> {
    try {
      const existing = await db.getCredentialById(credentialId);
      
      if (!existing) {
        return {
          success: false,
          error: 'Credential not found'
        };
      }

      // Check if user owns this credential
      if (existing.user_id !== userId) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      // Prepare update data
      const updateData: any = {};
      
      if (updates.name !== undefined) {
        // Check if new name conflicts with existing credentials
        if (updates.name !== existing.name) {
          const nameConflict = await db.getCredentialByName(userId, updates.name);
          if (nameConflict && nameConflict.id !== credentialId) {
            return {
              success: false,
              error: 'Credential with this name already exists'
            };
          }
        }
        updateData.name = updates.name;
      }

      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.service !== undefined) updateData.service = updates.service;

      // If data is being updated, encrypt it
      if (updates.data !== undefined) {
        updateData.encrypted_data = this.encrypt(JSON.stringify(updates.data));
      }

      const credential = await db.updateCredential(credentialId, updateData);

      logger.info('Credential updated successfully', {
        credentialId,
        userId,
        updates: Object.keys(updateData)
      });

      return {
        success: true,
        credential
      };

    } catch (error: any) {
      logger.error('Failed to update credential', error);
      return {
        success: false,
        error: error.message || 'Failed to update credential'
      };
    }
  }

  /**
   * Delete credential
   */
  async deleteCredential(userId: string, credentialId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const credential = await db.getCredentialById(credentialId);
      
      if (!credential) {
        return {
          success: false,
          error: 'Credential not found'
        };
      }

      // Check if user owns this credential
      if (credential.user_id !== userId) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      await db.deleteCredential(credentialId);

      logger.info('Credential deleted successfully', {
        credentialId,
        userId
      });

      return {
        success: true
      };

    } catch (error: any) {
      logger.error('Failed to delete credential', error);
      return {
        success: false,
        error: error.message || 'Failed to delete credential'
      };
    }
  }

  /**
   * Get credential by service type
   */
  async getCredentialsByService(userId: string, service: string): Promise<{ success: boolean; credentials?: DecryptedCredential[]; error?: string }> {
    try {
      const credentials = await db.getCredentialsByService(userId, service);
      
      // Decrypt all credentials
      const decryptedCredentials: DecryptedCredential[] = credentials.map(cred => ({
        id: cred.id,
        user_id: cred.user_id,
        name: cred.name,
        type: cred.type,
        service: cred.service,
        is_active: cred.is_active,
        created_at: cred.created_at,
        updated_at: cred.updated_at,
        data: JSON.parse(this.decrypt(cred.encrypted_data))
      }));

      return {
        success: true,
        credentials: decryptedCredentials
      };

    } catch (error: any) {
      logger.error('Failed to get credentials by service', error);
      return {
        success: false,
        error: error.message || 'Failed to get credentials'
      };
    }
  }

  /**
   * Test credential (validate API keys, etc.)
   */
  async testCredential(userId: string, credentialId: string): Promise<{ success: boolean; valid?: boolean; error?: string }> {
    try {
      const result = await this.getCredential(userId, credentialId);
      
      if (!result.success || !result.credential) {
        return {
          success: false,
          error: result.error
        };
      }

      const credential = result.credential;
      
      // Test based on service type
      switch (credential.service) {
        case 'openai':
          return await this.testOpenAICredential(credential.data);
        case 'anthropic':
          return await this.testAnthropicCredential(credential.data);
        case 'google':
          return await this.testGoogleCredential(credential.data);
        case 'slack':
          return await this.testSlackCredential(credential.data);
        case 'discord':
          return await this.testDiscordCredential(credential.data);
        default:
          return {
            success: true,
            valid: true // Assume valid for unknown services
          };
      }

    } catch (error: any) {
      logger.error('Failed to test credential', error);
      return {
        success: false,
        error: error.message || 'Failed to test credential'
      };
    }
  }

  /**
   * Test OpenAI credential
   */
  private async testOpenAICredential(data: Record<string, any>): Promise<{ success: boolean; valid?: boolean; error?: string }> {
    try {
      if (!data.api_key) {
        return {
          success: false,
          error: 'API key is required'
        };
      }

      // Test with a simple API call
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${data.api_key}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        valid: response.ok
      };

    } catch (error: any) {
      return {
        success: true,
        valid: false
      };
    }
  }

  /**
   * Test Anthropic credential
   */
  private async testAnthropicCredential(data: Record<string, any>): Promise<{ success: boolean; valid?: boolean; error?: string }> {
    try {
      if (!data.api_key) {
        return {
          success: false,
          error: 'API key is required'
        };
      }

      // Test with a simple API call
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': data.api_key,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }]
        })
      });

      return {
        success: true,
        valid: response.ok
      };

    } catch (error: any) {
      return {
        success: true,
        valid: false
      };
    }
  }

  /**
   * Test Google credential
   */
  private async testGoogleCredential(data: Record<string, any>): Promise<{ success: boolean; valid?: boolean; error?: string }> {
    try {
      if (!data.client_id || !data.client_secret) {
        return {
          success: false,
          error: 'Client ID and Client Secret are required'
        };
      }

      // For Google, we can't easily test without OAuth flow
      // Just validate that required fields are present
      return {
        success: true,
        valid: true
      };

    } catch (error: any) {
      return {
        success: true,
        valid: false
      };
    }
  }

  /**
   * Test Slack credential
   */
  private async testSlackCredential(data: Record<string, any>): Promise<{ success: boolean; valid?: boolean; error?: string }> {
    try {
      if (!data.bot_token) {
        return {
          success: false,
          error: 'Bot token is required'
        };
      }

      // Test with auth.test endpoint
      const response = await fetch('https://slack.com/api/auth.test', {
        headers: {
          'Authorization': `Bearer ${data.bot_token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      return {
        success: true,
        valid: result.ok
      };

    } catch (error: any) {
      return {
        success: true,
        valid: false
      };
    }
  }

  /**
   * Test Discord credential
   */
  private async testDiscordCredential(data: Record<string, any>): Promise<{ success: boolean; valid?: boolean; error?: string }> {
    try {
      if (!data.bot_token) {
        return {
          success: false,
          error: 'Bot token is required'
        };
      }

      // Test with user endpoint
      const response = await fetch('https://discord.com/api/users/@me', {
        headers: {
          'Authorization': `Bot ${data.bot_token}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        valid: response.ok
      };

    } catch (error: any) {
      return {
        success: true,
        valid: false
      };
    }
  }
}

export const credentialService = new CredentialService();
