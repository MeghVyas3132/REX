/**
 * Credential Storage
 * Handles secure storage and retrieval of credentials
 */

import { ICredentialDataDecryptedObject, ICredentialsEncrypted } from '../../types/n8n-types';
const logger = require("../../utils/logger");
import * as crypto from 'crypto';

// Simple in-memory storage for now - in production, use database
class CredentialStorage {
  private credentials: Map<string, ICredentialsEncrypted> = new Map();
  private encryptionKey: string;

  constructor() {
    // In production, get encryption key from environment or secure key management
    this.encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY || 'default-key-change-in-production';
  }

  /**
   * Encrypts credential data
   */
  private encrypt(data: ICredentialDataDecryptedObject): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Prepend IV to encrypted data
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypts credential data
   */
  private decrypt(encryptedData: string): ICredentialDataDecryptedObject {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * Saves credentials
   */
  public async saveCredentials(
    credentialId: string,
    name: string,
    type: string,
    data: ICredentialDataDecryptedObject
  ): Promise<ICredentialsEncrypted> {
    const encryptedData = this.encrypt(data);
    
    const credentials: ICredentialsEncrypted = {
      id: credentialId,
      name,
      type,
      data: encryptedData,
    };

    this.credentials.set(credentialId, credentials);
    logger.info(`Saved credentials: ${name} (${type})`);
    
    return credentials;
  }

  /**
   * Gets encrypted credentials
   */
  public async getCredentials(credentialId: string): Promise<ICredentialsEncrypted | undefined> {
    return this.credentials.get(credentialId);
  }

  /**
   * Gets decrypted credentials
   */
  public async getDecryptedCredentials(credentialId: string): Promise<ICredentialDataDecryptedObject | undefined> {
    const encrypted = this.credentials.get(credentialId);
    if (!encrypted || !encrypted.data) {
      return undefined;
    }

    try {
      return this.decrypt(encrypted.data);
    } catch (error: any) {
      logger.error(`Failed to decrypt credentials ${credentialId}:`, error);
      return undefined;
    }
  }

  /**
   * Updates credentials
   */
  public async updateCredentials(
    credentialId: string,
    updates: Partial<ICredentialDataDecryptedObject>
  ): Promise<ICredentialsEncrypted | undefined> {
    const existing = await this.getDecryptedCredentials(credentialId);
    if (!existing) {
      return undefined;
    }

    const updated = { ...existing, ...updates };
    const encrypted = this.credentials.get(credentialId);
    if (!encrypted) {
      return undefined;
    }

    return await this.saveCredentials(credentialId, encrypted.name, encrypted.type, updated);
  }

  /**
   * Deletes credentials
   */
  public async deleteCredentials(credentialId: string): Promise<boolean> {
    const deleted = this.credentials.delete(credentialId);
    if (deleted) {
      logger.info(`Deleted credentials: ${credentialId}`);
    }
    return deleted;
  }

  /**
   * Lists all credentials
   */
  public async listCredentials(): Promise<ICredentialsEncrypted[]> {
    return Array.from(this.credentials.values());
  }

  /**
   * Lists credentials by type
   */
  public async listCredentialsByType(type: string): Promise<ICredentialsEncrypted[]> {
    return Array.from(this.credentials.values()).filter(cred => cred.type === type);
  }
}

export const credentialStorage = new CredentialStorage();

