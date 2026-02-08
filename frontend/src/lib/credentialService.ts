// Credential service for fetching credentials from backend API
import { ApiService } from './errorService';

export interface Credential {
  id: string;
  name: string;
  type: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CredentialType {
  name: string;
  displayName: string;
  icon?: string;
  properties?: any[];
  genericAuth?: boolean;
  supportedNodes?: string[];
}

export class CredentialService {
  // Fetch all credential types
  static async getCredentialTypes(): Promise<CredentialType[]> {
    const result = await ApiService.get('/api/credentials/types', {
      toastTitle: 'Fetch Credential Types',
      silent: true
    });
    return result?.data || result || [];
  }

  // Fetch a specific credential type
  static async getCredentialType(typeName: string): Promise<CredentialType | null> {
    const result = await ApiService.get(`/api/credentials/types/${encodeURIComponent(typeName)}`, {
      toastTitle: 'Fetch Credential Type',
      silent: true
    });
    return result?.data || result || null;
  }

  // Fetch all credentials
  static async getCredentials(): Promise<Credential[]> {
    const result = await ApiService.get('/api/credentials', {
      toastTitle: 'Fetch Credentials',
      silent: true
    });
    return result?.data || result || [];
  }

  // Fetch credentials filtered by type
  static async getCredentialsByType(typeName: string): Promise<Credential[]> {
    const allCredentials = await this.getCredentials();
    return allCredentials.filter(cred => cred.type === typeName);
  }

  // Fetch credentials that match credential type patterns
  // Patterns can be:
  // - Exact type name: 'postgres'
  // - Extends pattern: 'extends:oAuth2Api'
  // - Has pattern: 'has:authenticate', 'has:genericAuth'
  static async getCredentialsByPatterns(patterns: string[]): Promise<Credential[]> {
    if (!patterns || patterns.length === 0) {
      return [];
    }

    const allCredentials = await this.getCredentials();
    const allCredentialTypes = await this.getCredentialTypes();
    
    // Create a map of credential type name to type definition
    const typeMap = new Map<string, CredentialType>();
    allCredentialTypes.forEach(type => {
      typeMap.set(type.name, type);
    });

    // Filter credentials that match any pattern
    return allCredentials.filter(cred => {
      const credType = typeMap.get(cred.type);
      if (!credType) return false;

      return patterns.some(pattern => {
        // Exact match
        if (pattern === cred.type) {
          return true;
        }

        // Extends pattern: 'extends:oAuth2Api'
        if (pattern.startsWith('extends:')) {
          const extendsType = pattern.substring(8);
          // For now, we'll do a simple check - in a full implementation,
          // we'd check the actual inheritance chain
          return credType.name === extendsType || credType.name.includes(extendsType);
        }

        // Has pattern: 'has:authenticate', 'has:genericAuth'
        if (pattern.startsWith('has:')) {
          const hasProperty = pattern.substring(4);
          if (hasProperty === 'genericAuth') {
            return credType.genericAuth === true;
          }
          if (hasProperty === 'authenticate') {
            // Check if credential type has authenticate method
            // This would require checking the actual credential type definition
            // For now, we'll assume it's present if the type exists
            return true;
          }
        }

        return false;
      });
    });
  }

  // Create a new credential
  static async createCredential(name: string, type: string, data: any): Promise<Credential> {
    const result = await ApiService.post('/api/credentials', {
      name,
      type,
      data
    }, {
      toastTitle: 'Create Credential'
    });
    return result?.data || result;
  }

  // Update a credential
  static async updateCredential(id: string, name: string, data: any): Promise<Credential> {
    const result = await ApiService.put(`/api/credentials/${encodeURIComponent(id)}`, {
      name,
      data
    }, {
      toastTitle: 'Update Credential'
    });
    return result?.data || result;
  }

  // Delete a credential
  static async deleteCredential(id: string): Promise<void> {
    await ApiService.delete(`/api/credentials/${encodeURIComponent(id)}`, {
      toastTitle: 'Delete Credential'
    });
  }

  // Test a credential
  static async testCredential(typeName: string, data: any): Promise<{ status: 'OK' | 'Error'; message?: string }> {
    const result = await ApiService.post(`/api/credentials/${encodeURIComponent(typeName)}/test`, {
      data
    }, {
      toastTitle: 'Test Credential'
    });
    return result?.data || result;
  }
}
