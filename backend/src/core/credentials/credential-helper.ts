/**
 * Credential Helper
 * Provides unified access to credentials for nodes
 */

import { ICredentialDataDecryptedObject, ICredentialsEncrypted } from '../../types/n8n-types';
import { credentialTypes } from './credential-types';
import { credentialStorage } from './credential-storage';
const logger = require("../../utils/logger");

export class CredentialHelper {
  private static instance: CredentialHelper;

  private constructor() {}

  public static getInstance(): CredentialHelper {
    if (!CredentialHelper.instance) {
      CredentialHelper.instance = new CredentialHelper();
    }
    return CredentialHelper.instance;
  }

  /**
   * Gets decrypted credentials for a node
   */
  public async getCredentials(
    credentialId: string | null | undefined,
    credentialType: string
  ): Promise<ICredentialDataDecryptedObject | undefined> {
    if (!credentialId) {
      return undefined;
    }

    try {
      const decrypted = await credentialStorage.getDecryptedCredentials(credentialId);
      if (!decrypted) {
        logger.warn(`Credentials not found: ${credentialId}`);
        return undefined;
      }

      // Validate credential type matches
      const encrypted = await credentialStorage.getCredentials(credentialId);
      if (encrypted && encrypted.type !== credentialType) {
        logger.warn(`Credential type mismatch: expected ${credentialType}, got ${encrypted.type}`);
        return undefined;
      }

      return decrypted;
    } catch (error: any) {
      logger.error(`Failed to get credentials ${credentialId}:`, error);
      return undefined;
    }
  }

  /**
   * Gets credentials from node credentials object
   */
  public async getNodeCredentials(
    nodeCredentials: Record<string, { id: string; name: string }> | undefined,
    credentialType: string
  ): Promise<ICredentialDataDecryptedObject | undefined> {
    if (!nodeCredentials || !nodeCredentials[credentialType]) {
      return undefined;
    }

    const credentialId = nodeCredentials[credentialType].id;
    return await this.getCredentials(credentialId, credentialType);
  }

  /**
   * Tests credentials
   */
  public async testCredentials(
    credentialType: string,
    credentials: ICredentialDataDecryptedObject
  ): Promise<{ status: 'OK' | 'Error'; message?: string }> {
    try {
      const result = await credentialTypes.testCredentials(credentialType, credentials);
      return result;
    } catch (error: any) {
      logger.error(`Credential test failed for ${credentialType}:`, error);
      return {
        status: 'Error',
        message: error.message || 'Credential test failed',
      };
    }
  }

  /**
   * Gets credential properties for a type
   */
  public getCredentialProperties(credentialType: string): any[] {
    return credentialTypes.getCredentialProperties(credentialType);
  }

  /**
   * Checks if credential type is recognized
   */
  public recognizes(credentialType: string): boolean {
    return credentialTypes.recognizes(credentialType);
  }

  /**
   * Gets all credential types
   */
  public getAllCredentialTypes(): any[] {
    return credentialTypes.getAllCredentialTypes();
  }
}

export const credentialHelper = CredentialHelper.getInstance();

