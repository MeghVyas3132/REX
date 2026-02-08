// Node service for fetching schemas and testing/executing nodes via backend
import { Node } from '@xyflow/react';
import { ApiService } from './errorService';

export interface NodeSchema {
  nodeType: string;
  schema: {
    fields: Array<{
      key: string;
      label: string;
      type: string;
      required?: boolean;
      options?: string[];
      min?: number;
      max?: number;
    }>;
  };
  capabilities: Record<string, any>;
  isN8nCompatible?: boolean;
  n8nDescription?: any; // n8n INodeTypeDescription
}

export interface NodeTestResult {
  nodeType: string;
  status: 'success' | 'error';
  message: string;
  config: any;
  capabilities?: any;
  timestamp: string;
}

export interface NodeExecuteResult {
  nodeType: string;
  result: any;
  executionTime: number;
}

export class NodeService {
  // Fetch node schema from backend
  static async getNodeSchema(nodeType: string): Promise<NodeSchema | null> {
    const result = await ApiService.get(`/api/workflows/nodes/${encodeURIComponent(nodeType)}/schema`, {
      toastTitle: 'Fetch Node Schema',
      silent: true
    });
    return result?.data || result;
  }

  // Test a single node via backend
  static async testNode(nodeType: string, config: any): Promise<NodeTestResult> {
    const result = await ApiService.post(`/api/workflows/nodes/${encodeURIComponent(nodeType)}/test`, 
      { config }, 
      { toastTitle: 'Test Node' }
    );
    
    if (result) {
      return result?.data || result;
    }
    
    return {
      nodeType,
      status: 'error',
      message: 'Test failed',
      config,
      timestamp: new Date().toISOString()
    };
  }

  // Execute a single node via backend
  static async executeNode(
    nodeType: string, 
    config: any, 
    input: any = {},
    options?: any,
    credentials?: any
  ): Promise<NodeExecuteResult> {
    const result = await ApiService.post(
      `/api/workflows/nodes/${encodeURIComponent(nodeType)}/execute`, 
      { 
        config, 
        input,
        options: options || {},
        credentials: credentials || {}
      }, 
      { toastTitle: 'Execute Node' }
    );
    
    if (!result) {
      throw new Error('Node execution failed');
    }
    
    return result?.data || result;
  }

  // Extract node type from node data
  static getNodeType(node: Node): string {
    return node.data?.subtype || node.type || 'unknown';
  }

  // Get node config from node data
  static getNodeConfig(node: Node): any {
    return node.data?.config || {};
  }

  // Get node credentials from node data (now merged into config)
  static getNodeCredentials(node: Node): any {
    // Credentials are now part of config, return empty object for backward compatibility
    return {};
  }

  // Load options dynamically for a node property
  static async loadOptions(
    nodeType: string,
    nodeId: string,
    methodName: string,
    config: any,
    credentials?: any
  ): Promise<Array<{ name: string; value: string | number }>> {
    const result = await ApiService.post(
      `/api/workflows/nodes/${encodeURIComponent(nodeType)}/loadOptions/${encodeURIComponent(methodName)}`,
      { nodeId, config, credentials },
      { toastTitle: 'Load Options', silent: true }
    );
    return result?.data || result || [];
  }
}
