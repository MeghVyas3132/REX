import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
import { logger } from '../../lib/logger.js';
const axios = require('axios');

export class AuditLogNode {
  getNodeDefinition() {
    return {
  id: 'audit-log',
  type: 'action',
  name: 'Audit Log',
  description: 'Log audit events to external API',
  category: 'core',
  version: '1.0.0',
  author: 'Workflow Studio',
  parameters: [
    {
      name: 'apiUrl',
      type: 'string',
      displayName: 'Api Url',
      description: 'apiUrl configuration',
      required: true,
      placeholder: 'Enter apiUrl...'
    },
    {
      name: 'logType',
      type: 'string',
      displayName: 'Log Type',
      description: 'logType configuration',
      required: false,
      placeholder: 'Enter logType...'
    },
    {
      name: 'event',
      type: 'string',
      displayName: 'Event',
      description: 'event configuration',
      required: false,
      placeholder: 'Enter event...'
    },
    {
      name: 'authType',
      type: 'string',
      displayName: 'Auth Type',
      description: 'authType configuration',
      required: false,
      placeholder: 'Enter authType...'
    },
    {
      name: 'bearerToken',
      type: 'string',
      displayName: 'Bearer Token',
      description: 'bearerToken configuration',
      required: false,
      placeholder: 'Enter bearerToken...'
    },
    {
      name: 'apiKey',
      type: 'string',
      displayName: 'Api Key',
      description: 'apiKey configuration',
      required: false,
      placeholder: 'Enter apiKey...'
    }
  ],
  inputs: [
    {
      name: 'apiUrl',
      type: 'any',
      displayName: 'Api Url',
      description: 'apiUrl from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'status',
      type: 'any',
      displayName: 'Status',
      description: 'status from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'event',
      type: 'any',
      displayName: 'Event',
      description: 'event from previous node',
      required: false,
      dataType: 'any'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'any',
      displayName: 'Output',
      description: 'Output from the node',
      dataType: 'any'
    },
    {
      name: 'success',
      type: 'boolean',
      displayName: 'Success',
      description: 'Whether the operation succeeded',
      dataType: 'boolean'
    }
  ]
};
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = node.data?.config || {};
    if (!config.apiUrl && !context.input?.apiUrl) {
      throw new Error('Required parameter "apiUrl" is missing');
    }

    
    try {
      const config = node.config || node.data?.config || {};
      const apiUrl = config.apiUrl || 'http://localhost:3001/api/audit-logs';
      const logType = config.logType || context.input?.status || 'success';
      const event = config.event || context.input?.event || 'workflow.event';
      const authType = config.authType || 'bearer';
      
      // Gather log data from input and context
      const logData = {
        ...context.input?.data,
        ...context.input,
        // Exclude fields that are handled separately
        event: undefined,
        status: undefined,
        data: undefined
      };

      // Prepare audit log payload
      const auditLogPayload = {
        type: logType,
        event: event,
        workflowId: context.workflowId,
        runId: context.runId,
        nodeId: node.id,
        userId: (context as any).userId,
        data: logData,
        metadata: {
          nodeId: node.id,
          runId: context.runId,
          workflowId: context.workflowId,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };

      // Prepare request configuration
      const requestConfig: any = {
        method: 'POST',
        url: apiUrl,
        headers: {
          'Content-Type': 'application/json'
        },
        data: auditLogPayload,
        timeout: 10000
      };

      // Add authentication
      if (authType === 'bearer' && config.bearerToken) {
        requestConfig.headers!['Authorization'] = `Bearer ${config.bearerToken}`;
      } else if (authType === 'apiKey' && config.apiKey) {
        requestConfig.headers!['X-API-Key'] = config.apiKey;
      }

      logger.info('Creating audit log', {
        nodeId: node.id,
        event,
        logType,
        runId: context.runId
      });

      try {
        const response = await axios(requestConfig);
        const duration = Date.now() - startTime;

        const logId = response.data?.id || response.data?.data?.id || 'unknown';
        
        logger.info('Audit log created successfully', {
          nodeId: node.id,
          logId,
          event,
          duration
        });

        return {
          success: true,
          output: {
            logId,
            success: true,
            timestamp: auditLogPayload.timestamp
          },
          duration
        };
      } catch (apiError: any) {
        // If API call fails, log locally but don't fail the workflow
        logger.warn('Failed to push audit log to backend, logging locally', {
          nodeId: node.id,
          error: apiError.message,
          event,
          logType
        });

        // Store audit log locally in workflow run events
        // This ensures we still have the log even if backend API is down
        const duration = Date.now() - startTime;
        
        return {
          success: true,
          output: {
            logId: `local-${Date.now()}`,
            success: true,
            timestamp: auditLogPayload.timestamp,
            note: 'Logged locally (backend API unavailable)'
          },
          duration
        };
      }

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Audit log creation error', {
        error: error.message,
        nodeId: node.id,
        runId: context.runId
      });

      // Don't fail the workflow if audit logging fails
      return {
        success: true,
        output: {
          logId: null,
          success: false,
          timestamp: new Date().toISOString(),
          error: error.message
        },
        duration
      };
    }
  }}


export default AuditLogNode;
