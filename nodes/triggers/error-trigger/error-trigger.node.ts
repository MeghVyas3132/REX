import { WorkflowNode, ExecutionContext, ExecutionResult, NodeType } from '@rex/shared';
import { logger } from '../../lib/logger.js';

export class ErrorTriggerNode {
  getNodeDefinition() {
    return {
      id: 'error-trigger',
      type: 'trigger' as NodeType,
      name: 'Error Trigger',
      description: 'Trigger workflow when an error occurs',
      category: 'core',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'errorTypes',
          type: 'array',
          displayName: 'Error Types',
          description: 'Types of errors to trigger on (empty for all)',
          required: false,
          default: [],
          options: [
            { name: 'Validation Error', value: 'validation' },
            { name: 'Network Error', value: 'network' },
            { name: 'Server Error', value: 'server' },
            { name: 'Timeout Error', value: 'timeout' },
            { name: 'Authentication Error', value: 'authentication' }
          ]
        },
        {
          name: 'minSeverity',
          type: 'options',
          displayName: 'Minimum Severity',
          description: 'Minimum error severity to trigger',
          required: false,
          default: 'error',
          options: [
            { name: 'Warning', value: 'warning' },
            { name: 'Error', value: 'error' },
            { name: 'Critical', value: 'critical' }
          ]
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'error',
          type: 'object',
          displayName: 'Error Data',
          description: 'Error information',
          required: false,
          dataType: 'object'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'error',
          type: 'object',
          displayName: 'Error Data',
          description: 'Error information including message, type, and stack',
          dataType: 'object'
        },
        {
          name: 'errorMessage',
          type: 'string',
          displayName: 'Error Message',
          description: 'Error message text',
          dataType: 'text'
        },
        {
          name: 'errorType',
          type: 'string',
          displayName: 'Error Type',
          description: 'Type of error',
          dataType: 'text'
        },
        {
          name: 'timestamp',
          type: 'string',
          displayName: 'Timestamp',
          description: 'When the error occurred',
          dataType: 'text'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          errorTypes: { type: 'array', items: { type: 'string' } },
          minSeverity: { type: 'string', enum: ['warning', 'error', 'critical'] }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          error: { type: 'object' },
          errorMessage: { type: 'string' },
          errorType: { type: 'string' },
          timestamp: { type: 'string' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Error trigger executed', {
        nodeId: node.id,
        runId: context.runId,
        inputKeys: Object.keys(context.input || {})
      });

      // Error trigger passes through error data
      // For manual execution, create a sample error structure if no error provided
      const errorData = context.input?.error || context.input || {
        message: 'Manual error trigger execution',
        type: 'manual',
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        output: {
          error: errorData,
          errorMessage: errorData.message || 'Error occurred',
          errorType: errorData.type || 'unknown',
          timestamp: errorData.timestamp || new Date().toISOString(),
          ...context.input
        },
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Error trigger failed', error, {
        nodeId: node.id,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }

}}

export default ErrorTriggerNode;

