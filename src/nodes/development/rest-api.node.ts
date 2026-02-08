import { WorkflowNode, ExecutionContext, ExecutionResult, NodeType } from '../../utils/types';
const logger = require("../../utils/logger");
import axios, { AxiosRequestConfig } from 'axios';

export class RestApiNode {
  getNodeDefinition() {
    return {
      id: 'rest-api',
      type: 'action' as NodeType,
      name: 'REST API',
      description: 'Interact with REST APIs',
      category: 'development',
      version: '1.0.0',
      author: 'Workflow Studio',
      parameters: [
        {
          name: 'baseUrl',
          type: 'string',
          displayName: 'Base URL',
          description: 'API base URL',
          required: true,
          placeholder: 'https://api.example.com'
        },
        {
          name: 'endpoint',
          type: 'string',
          displayName: 'Endpoint',
          description: 'API endpoint path',
          required: true,
          placeholder: '/v1/users'
        },
        {
          name: 'method',
          type: 'options',
          displayName: 'HTTP Method',
          description: 'HTTP method to use',
          required: true,
          default: 'GET',
          options: [
            { name: 'GET', value: 'GET' },
            { name: 'POST', value: 'POST' },
            { name: 'PUT', value: 'PUT' },
            { name: 'DELETE', value: 'DELETE' },
            { name: 'PATCH', value: 'PATCH' }
          ]
        },
        {
          name: 'headers',
          type: 'object',
          displayName: 'Headers',
          description: 'HTTP headers',
          required: false
        },
        {
          name: 'authentication',
          type: 'options',
          displayName: 'Authentication',
          description: 'Authentication type',
          required: false,
          default: 'none',
          options: [
            { name: 'None', value: 'none' },
            { name: 'Bearer Token', value: 'bearer' },
            { name: 'API Key', value: 'apiKey' },
            { name: 'Basic Auth', value: 'basic' }
          ]
        }
      ],
      inputs: [
        {
          name: 'baseUrl',
          type: 'string',
          displayName: 'Dynamic Base URL',
          description: 'Base URL from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'endpoint',
          type: 'string',
          displayName: 'Dynamic Endpoint',
          description: 'Endpoint path from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'data',
          type: 'object',
          displayName: 'Request Data',
          description: 'Data to send in request',
          required: false,
          dataType: 'object'
        }
      ],
      outputs: [
        {
          name: 'response',
          type: 'object',
          displayName: 'API Response',
          description: 'REST API response data',
          dataType: 'object'
        },
        {
          name: 'status',
          type: 'number',
          displayName: 'Status Code',
          description: 'HTTP status code',
          dataType: 'number'
        }
      ],
      configSchema: {
        type: 'object',
        properties: {
          baseUrl: { type: 'string' },
          endpoint: { type: 'string' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
          headers: { type: 'object' },
          authentication: { type: 'string', enum: ['none', 'bearer', 'apiKey', 'basic'] }
        },
        required: ['baseUrl', 'endpoint', 'method']
      },
      outputSchema: {
        type: 'object',
        properties: {
          response: { type: 'object' },
          status: { type: 'number' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = node.data?.config || {};
    
    // Validation for required parameters
    if (!config.baseUrl && !context.input?.baseUrl) {
      throw new Error('Required parameter "baseUrl" is missing');
    }
    if (!config.endpoint && !context.input?.endpoint) {
      throw new Error('Required parameter "endpoint" is missing');
    }
    if (!config.method && !context.input?.method) {
      throw new Error('Required parameter "method" is missing');
    }

    
    try {
      const baseUrl = config.baseUrl || context.input?.baseUrl;
      const endpoint = config.endpoint || context.input?.endpoint;
      
      if (!baseUrl || !endpoint) {
        throw new Error('Base URL and endpoint are required');
      }

      const url = `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
      const method = (config.method || context.input?.method || 'GET').toUpperCase();
      const headers = config.headers || context.input?.headers || { 'Content-Type': 'application/json' };
      const payload = context.input?.data || context.input || {};

      const requestConfig: AxiosRequestConfig = {
        method: method as any,
        url,
        headers,
        data: method !== 'GET' ? payload : undefined,
        params: method === 'GET' ? payload : undefined,
        timeout: 30000
      };

      // Add authentication if configured
      const authType = config.authentication || 'none';
      if (authType === 'bearer' && config.bearerToken) {
        requestConfig.headers!['Authorization'] = `Bearer ${config.bearerToken}`;
      } else if (authType === 'apiKey' && config.apiKey) {
        requestConfig.headers![config.apiKeyHeader || 'X-API-Key'] = config.apiKey;
      } else if (authType === 'basic' && config.username && config.password) {
        requestConfig.auth = {
          username: config.username,
          password: config.password
        };
      }

      logger.info('REST API call executing', {
        nodeId: node.id,
        runId: context.runId,
        url,
        method
      });

      const response = await axios(requestConfig);

      return {
        success: true,
        output: {
          response: response.data,
          status: response.status,
          headers: response.headers
        },
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      logger.error('REST API call failed', error, {
        nodeId: node.id,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message || 'REST API call failed',
        duration: Date.now() - startTime
      };
    }

}}

export default RestApiNode;

