import { prisma } from '../db/prisma';
import { Credential } from '../utils/types';
import { logger } from "../utils/logger";
import { encryptionService } from '../utils/encryption';
import { NotFoundError, ValidationError } from '../utils/error-handler';

export class CredentialsService {
  async createCredential(credentialData: Partial<Credential>): Promise<Credential> {
    try {
      // Validate required fields
      if (!credentialData.name || !credentialData.type || !credentialData.encryptedData) {
        throw new ValidationError('Missing required fields', [
          new ValidationError('Name is required', []),
          new ValidationError('Type is required', []),
          new ValidationError('Encrypted data is required', [])
        ]);
      }

      const credential = await prisma.credential.create({
        data: {
          id: credentialData.id || `cred_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: credentialData.name,
          type: credentialData.type,
          encryptedData: credentialData.encryptedData, // Should already be encrypted
          userId: credentialData.userId!
        }
      });

      logger.info('Credential created', {
        credentialId: credential.id,
        name: credential.name,
        type: credential.type,
        userId: credential.userId
      });

      return credential as Credential;
    } catch (error: any) {
      logger.error('Error creating credential:', error);
      throw error;
    }
  }

  async getCredential(credentialId: string, userId: string): Promise<Credential | null> {
    try {
      const credential = await prisma.credential.findFirst({
        where: {
          id: credentialId,
          userId
        }
      });

      if (!credential) {
        return null;
      }

      // Decrypt the data for the user
      const decryptedCredential = {
        ...credential,
        encryptedData: encryptionService.decrypt(credential.encryptedData)
      };

      return decryptedCredential as Credential;
    } catch (error: any) {
      logger.error('Error getting credential:', error);
      throw error;
    }
  }

  async updateCredential(
    credentialId: string,
    updateData: Partial<Credential>,
    userId: string
  ): Promise<Credential> {
    try {
      const existingCredential = await prisma.credential.findFirst({
        where: {
          id: credentialId,
          userId
        }
      });

      if (!existingCredential) {
        throw new NotFoundError('Credential not found');
      }

      const data: any = {
        name: updateData.name,
        type: updateData.type
      };

      // Only update encrypted data if provided
      if (updateData.encryptedData) {
        data.encryptedData = updateData.encryptedData; // Should already be encrypted
      }

      const credential = await prisma.credential.update({
        where: { id: credentialId },
        data
      });

      logger.info('Credential updated', {
        credentialId,
        name: credential.name,
        type: credential.type,
        userId
      });

      // Decrypt for response
      const decryptedCredential = {
        ...credential,
        encryptedData: encryptionService.decrypt(credential.encryptedData)
      };

      return decryptedCredential as Credential;
    } catch (error: any) {
      logger.error('Error updating credential:', error);
      throw error;
    }
  }

  async deleteCredential(credentialId: string, userId: string): Promise<boolean> {
    try {
      const deleted = await prisma.credential.deleteMany({
        where: {
          id: credentialId,
          userId
        }
      });

      if (deleted.count === 0) {
        throw new NotFoundError('Credential not found');
      }

      logger.info('Credential deleted', {
        credentialId,
        userId
      });

      return true;
    } catch (error: any) {
      logger.error('Error deleting credential:', error);
      throw error;
    }
  }

  async listCredentials(
    userId: string,
    type?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<Credential[]> {
    try {
      const where: any = { userId };
      
      if (type) {
        where.type = type;
      }

      const credentials = await prisma.credential.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      // Decrypt all credentials
      const decryptedCredentials = credentials.map((credential: any) => ({
        ...credential,
        encryptedData: encryptionService.decrypt(credential.encryptedData)
      }));

      return decryptedCredentials as Credential[];
    } catch (error: any) {
      logger.error('Error listing credentials:', error);
      throw error;
    }
  }

  async testCredential(credentialId: string, userId: string): Promise<boolean> {
    try {
      const credential = await this.getCredential(credentialId, userId);
      if (!credential) {
        throw new NotFoundError('Credential not found');
      }

      // Test the credential based on its type
      const testResult = await this.performCredentialTest(credential);
      
      logger.info('Credential test completed', {
        credentialId,
        type: credential.type,
        success: testResult
      });

      return testResult;
    } catch (error: any) {
      logger.error('Error testing credential:', error);
      throw error;
    }
  }

  private async performCredentialTest(credential: Credential): Promise<boolean> {
    try {
      const decryptedData = JSON.parse(credential.encryptedData);
      
      switch (credential.type) {
        case 'openai':
          return await this.testOpenAICredential(decryptedData);
        case 'anthropic':
          return await this.testAnthropicCredential(decryptedData);
        case 'slack':
          return await this.testSlackCredential(decryptedData);
        case 'discord':
          return await this.testDiscordCredential(decryptedData);
        case 'telegram':
          return await this.testTelegramCredential(decryptedData);
        case 'email':
          return await this.testEmailCredential(decryptedData);
        case 'database':
          return await this.testDatabaseCredential(decryptedData);
        default:
          logger.warn('Unknown credential type for testing', { type: credential.type });
          return true; // Assume valid for unknown types
      }
    } catch (error: any) {
      logger.error('Credential test failed', error);
      return false;
    }
  }

  private async testOpenAICredential(data: any): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${data.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async testAnthropicCredential(data: any): Promise<boolean> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': data.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }]
        })
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async testSlackCredential(data: any): Promise<boolean> {
    try {
      const response = await fetch('https://slack.com/api/auth.test', {
        headers: {
          'Authorization': `Bearer ${data.botToken}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json() as any;
      return result.ok;
    } catch {
      return false;
    }
  }

  private async testDiscordCredential(data: any): Promise<boolean> {
    try {
      const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          'Authorization': `Bot ${data.botToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async testTelegramCredential(data: any): Promise<boolean> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${data.botToken}/getMe`);
      const result = await response.json() as any;
      return result.ok;
    } catch {
      return false;
    }
  }

  private async testEmailCredential(data: any): Promise<boolean> {
    // Email credential testing would depend on the specific service
    // For now, just validate that required fields are present
    return !!(data.apiKey && data.fromEmail);
  }

  private async testDatabaseCredential(data: any): Promise<boolean> {
    try {
      // This would require importing a database client
      // For now, just validate that required fields are present
      return !!(data.host && data.database && data.username);
    } catch {
      return false;
    }
  }

  async encryptCredentialData(data: any): Promise<string> {
    return encryptionService.encrypt(JSON.stringify(data));
  }

  async decryptCredentialData(encryptedData: string): Promise<any> {
    return JSON.parse(encryptionService.decrypt(encryptedData));
  }
}
