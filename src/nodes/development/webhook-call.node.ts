import { WorkflowNode, ExecutionContext, ExecutionResult, NodeType } from '../../utils/types';
const logger = require("../../utils/logger");
import axios, { AxiosRequestConfig } from 'axios';

export class WebhookCallNode {
  getNodeDefinition() {
    return {
      id: 'webhook-call',
      type: 'action' as NodeType,
      name: 'Webhook Call',
      description: 'Send data to webhook URL',
      category: 'development',
      version: '1.0.0',
      author: 'Workflow Studio',
      parameters: [
        {
          name: 'url',
          type: 'string',
          displayName: 'Webhook URL',
          description: 'Webhook endpoint URL',
          required: true,
          placeholder: 'https://example.com/webhook'
        },
        {
          name: 'method',
          type: 'options',
          displayName: 'HTTP Method',
          description: 'HTTP method to use',
          required: true,
          default: 'POST',
          options: [
            { name: 'POST', value: 'POST' },
            { name: 'GET', value: 'GET' },
            { name: 'PUT', value: 'PUT' },
            { name: 'PATCH', value: 'PATCH' }
          ]
        },
        {
          name: 'headers',
          type: 'object',
          displayName: 'Headers',
          description: 'Custom headers to send',
          required: false
        },
        {
          name: 'timeout',
          type: 'number',
          displayName: 'Timeout (seconds)',
          description: 'Request timeout in seconds',
          required: false,
          default: 30
        }
      ],
      inputs: [
        {
          name: 'url',
          type: 'string',
          displayName: 'Dynamic URL',
          description: 'Webhook URL from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'data',
          type: 'object',
          displayName: 'Payload Data',
          description: 'Data to send to webhook',
          required: false,
          dataType: 'object'
        }
      ],
      outputs: [
        {
          name: 'response',
          type: 'object',
          displayName: 'Response',
          description: 'Webhook response data',
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
          url: { type: 'string' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH'] },
          headers: { type: 'object' },
          timeout: { type: 'number' }
        },
        required: ['url', 'method']
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
    if (!config.url && !context.input?.url) {
      throw new Error('Required parameter "url" is missing');
    }
    if (!config.method && !context.input?.method) {
      throw new Error('Required parameter "method" is missing');
    }

    
    try {
      const url = config.url || context.input?.url;
      if (!url) {
        throw new Error('Webhook URL is required');
      }

      const method = (config.method || context.input?.method || 'POST').toUpperCase();
      const headers = config.headers || context.input?.headers || { 'Content-Type': 'application/json' };
      const timeout = (config.timeout || 30) * 1000;
      const payload = context.input?.data || context.input || {};

      const requestConfig: AxiosRequestConfig = {
        method: method as any,
        url,
        headers,
        timeout,
        data: method !== 'GET' ? payload : undefined,
        params: method === 'GET' ? payload : undefined
      };

      logger.info('Webhook call executing', {
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
      logger.error('Webhook call failed', error, {
        nodeId: node.id,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message || 'Webhook call failed',
        duration: Date.now() - startTime
      };
    }

}}

export default WebhookCallNode;

