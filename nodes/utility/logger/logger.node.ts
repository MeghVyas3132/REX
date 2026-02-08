import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;

export class LoggerNode {
  getNodeDefinition() {
    return {
      id: 'logger',
      type: 'action',
      name: 'Logger',
      description: 'Log messages to console or file with different log levels',
      category: 'utility',
      version: '1.0.0',
      author: 'Workflow Studio',
      parameters: [
        {
          name: 'message',
          type: 'string',
          displayName: 'Message',
          description: 'Log message',
          required: true,
          placeholder: 'Enter log message...'
        },
        {
          name: 'logLevel',
          type: 'options',
          displayName: 'Log Level',
          description: 'Logging level',
          required: true,
          default: 'info',
          options: [
            { name: 'Debug', value: 'debug' },
            { name: 'Info', value: 'info' },
            { name: 'Warn', value: 'warn' },
            { name: 'Error', value: 'error' }
          ]
        },
        {
          name: 'data',
          type: 'object',
          displayName: 'Additional Data',
          description: 'Additional data to include in log',
          required: false,
          placeholder: '{}'
        }
      ],
      inputs: [
        {
          name: 'message',
          type: 'string',
          displayName: 'Dynamic Message',
          description: 'Message from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'logLevel',
          type: 'string',
          displayName: 'Dynamic Log Level',
          description: 'Log level from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'data',
          type: 'object',
          displayName: 'Dynamic Data',
          description: 'Data from previous node',
          required: false,
          dataType: 'object'
        }
      ],
      outputs: [
        {
          name: 'logged',
          type: 'boolean',
          displayName: 'Logged',
          description: 'Whether the message was logged',
          dataType: 'boolean'
        },
        {
          name: 'timestamp',
          type: 'string',
          displayName: 'Timestamp',
          description: 'When the message was logged',
          dataType: 'text'
        },
        {
          name: 'message',
          type: 'string',
          displayName: 'Message',
          description: 'The logged message',
          dataType: 'text'
        }
      ]
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = node.data?.config || {};
    if (!config.message && !context.input?.message) {
      throw new Error('Required parameter "message" is missing');
    }

    if (!config.logLevel && !context.input?.logLevel) {
      throw new Error('Required parameter "logLevel" is missing');
    }

    
    try {
      const logLevel = config.logLevel || 'info';
      const message = config.message || context.input?.message || 'Workflow log entry';
      const logData = {
        nodeId: node.id,
        runId: context.runId,
        ...config.data,
        ...context.input?.data,
        ...context.input
      };

      // Log based on level
      switch (logLevel) {
        case 'debug':
          logger.debug(message, logData);
          break;
        case 'info':
          logger.info(message, logData);
          break;
        case 'warn':
          logger.warn(message, logData);
          break;
        case 'error':
          logger.error(message, logData);
          break;
        default:
          logger.info(message, logData);
      }

      return {
        success: true,
        output: {
          logged: true,
          timestamp: new Date().toISOString(),
          message,
          data: logData
        },
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      logger.error('Logger node failed', error, { nodeId: node.id, runId: context.runId });
      
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }}


export default LoggerNode;
