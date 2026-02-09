import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
import { logger } from '../../lib/logger.js';

export class StateNode {
  getNodeDefinition() {
    return {
      id: 'agent-state',
      type: 'action',
      name: 'State',
      description: 'Manage agent state and state transitions',
      category: 'agent',
      version: '1.0.0',
      author: 'Workflow Studio',

      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'stateOperation',
          type: 'options',
          displayName: 'State Operation',
          description: 'Type of state operation to perform',
          required: true,
          default: 'get',
          options: [
            { name: 'Get State', value: 'get' },
            { name: 'Set State', value: 'set' },
            { name: 'Update State', value: 'update' },
            { name: 'Reset State', value: 'reset' },
            { name: 'Transition State', value: 'transition' }
          ]
        },
        {
          name: 'stateKey',
          type: 'string',
          displayName: 'State Key',
          description: 'Key for the state to manage',
          required: false,
          placeholder: 'user_preferences, session_data, workflow_state'
        },
        {
          name: 'defaultValue',
          type: 'object',
          displayName: 'Default Value',
          description: 'Default value for the state',
          required: false,
          placeholder: '{}'
        },
        {
          name: 'persistState',
          type: 'boolean',
          displayName: 'Persist State',
          description: 'Whether to persist state across sessions',
          required: false,
          default: true
        },
        {
          name: 'stateExpiry',
          type: 'number',
          displayName: 'State Expiry (seconds)',
          description: 'Time in seconds before state expires (0 = never)',
          required: false,
          default: 0,
          min: 0
        },
        {
          name: 'stateValidation',
          type: 'string',
          displayName: 'State Validation',
          description: 'Validation rules for state data',
          required: false,
          placeholder: 'schema validation rules'
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'stateData',
          type: 'object',
          displayName: 'State Data',
          description: 'State data to set/update from previous node',
          required: false,
          dataType: 'object'
        },
        {
          name: 'stateKey',
          type: 'string',
          displayName: 'Dynamic State Key',
          description: 'State key from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'stateOperation',
          type: 'string',
          displayName: 'Dynamic State Operation',
          description: 'State operation from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'transitionRules',
          type: 'array',
          displayName: 'Transition Rules',
          description: 'State transition rules from previous node',
          required: false,
          dataType: 'array'
        },
        {
          name: 'context',
          type: 'object',
          displayName: 'Context Data',
          description: 'Context for state management from previous node',
          required: false,
          dataType: 'object'
        },
        {
          name: 'mergeStrategy',
          type: 'string',
          displayName: 'Merge Strategy',
          description: 'Strategy for merging state data from previous node',
          required: false,
          dataType: 'text'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'state',
          type: 'object',
          displayName: 'Current State',
          description: 'Current state data',
          dataType: 'object'
        },
        {
          name: 'stateKey',
          type: 'string',
          displayName: 'State Key',
          description: 'Key of the managed state',
          dataType: 'text'
        },
        {
          name: 'operation',
          type: 'string',
          displayName: 'Operation Performed',
          description: 'State operation that was performed',
          dataType: 'text'
        },
        {
          name: 'previousState',
          type: 'object',
          displayName: 'Previous State',
          description: 'Previous state before operation',
          dataType: 'object'
        },
        {
          name: 'stateChanged',
          type: 'boolean',
          displayName: 'State Changed',
          description: 'Whether the state was modified',
          dataType: 'boolean'
        },
        {
          name: 'stateHistory',
          type: 'array',
          displayName: 'State History',
          description: 'History of state changes',
          dataType: 'array'
        },
        {
          name: 'expiryTime',
          type: 'string',
          displayName: 'Expiry Time',
          description: 'When the state will expire (ISO timestamp)',
          dataType: 'text'
        },
        {
          name: 'metadata',
          type: 'object',
          displayName: 'State Metadata',
          description: 'Additional metadata about the state',
          dataType: 'object'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          stateOperation: { type: 'string' },
          stateKey: { type: 'string' },
          defaultValue: { type: 'object' },
          persistState: { type: 'boolean' },
          stateExpiry: { type: 'number' },
          stateValidation: { type: 'string' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          stateData: { type: 'object' },
          stateKey: { type: 'string' },
          stateOperation: { type: 'string' },
          transitionRules: { type: 'array' },
          context: { type: 'object' },
          mergeStrategy: { type: 'string' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          state: { type: 'object' },
          stateKey: { type: 'string' },
          operation: { type: 'string' },
          previousState: { type: 'object' },
          stateChanged: { type: 'boolean' },
          stateHistory: { type: 'array' },
          expiryTime: { type: 'string' },
          metadata: { type: 'object' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    const startTime = Date.now();

    // Validation
    if (!config.stateOperation && !context.input?.stateOperation) {
      throw new Error('Required parameter "stateOperation" is missing');
    }

    try {
      const stateOperation = config.stateOperation || context.input?.stateOperation || 'get';
      const stateKey = config.stateKey || 'default';
      const inputData = node.data?.input || {};
      
      logger.info(`Executing state node with operation: ${stateOperation}`);

      let result: any = {};

      switch (stateOperation) {
        case 'get':
          result = await this.getState(stateKey, config);
          break;
        case 'set':
          result = await this.setState(stateKey, inputData.stateData, config);
          break;
        case 'update':
          result = await this.updateState(stateKey, inputData.stateData, config);
          break;
        case 'reset':
          result = await this.resetState(stateKey, config);
          break;
        case 'transition':
          result = await this.transitionState(stateKey, inputData.transitionRules, config);
          break;
        default:
          throw new Error(`Unknown state operation: ${stateOperation}`);
      }

      const duration = Date.now() - startTime;
      
      return {
        success: true,
        output: {
          ...context.input,  // Preserve input data
          ...result  // Add new state data
        },
        duration,
        metadata: {
          stateOperation,
          stateKey,
          persistState: config.persistState || true
        }
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('State node execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      };
    }
  }

  private async getState(stateKey: string, config: any) {
    // Mock state retrieval
    return {
      state: { value: 'retrieved_state', timestamp: new Date().toISOString() },
      stateKey,
      operation: 'get',
      previousState: null,
      stateChanged: false,
      stateHistory: [],
      expiryTime: config.stateExpiry ? new Date(Date.now() + config.stateExpiry * 1000).toISOString() : null,
      metadata: { operation: 'get', persistState: config.persistState }
    };
  }

  private async setState(stateKey: string, stateData: any, config: any) {
    // Mock state setting
    return {
      state: stateData || { value: 'new_state', timestamp: new Date().toISOString() },
      stateKey,
      operation: 'set',
      previousState: null,
      stateChanged: true,
      stateHistory: [{ operation: 'set', timestamp: new Date().toISOString() }],
      expiryTime: config.stateExpiry ? new Date(Date.now() + config.stateExpiry * 1000).toISOString() : null,
      metadata: { operation: 'set', persistState: config.persistState }
    };
  }

  private async updateState(stateKey: string, stateData: any, config: any) {
    // Mock state update
    return {
      state: { ...stateData, updated: true, timestamp: new Date().toISOString() },
      stateKey,
      operation: 'update',
      previousState: { value: 'old_state' },
      stateChanged: true,
      stateHistory: [{ operation: 'update', timestamp: new Date().toISOString() }],
      expiryTime: config.stateExpiry ? new Date(Date.now() + config.stateExpiry * 1000).toISOString() : null,
      metadata: { operation: 'update', persistState: config.persistState }
    };
  }

  private async resetState(stateKey: string, config: any) {
    // Mock state reset
    return {
      state: config.defaultValue || { value: 'reset_state', timestamp: new Date().toISOString() },
      stateKey,
      operation: 'reset',
      previousState: { value: 'previous_state' },
      stateChanged: true,
      stateHistory: [{ operation: 'reset', timestamp: new Date().toISOString() }],
      expiryTime: config.stateExpiry ? new Date(Date.now() + config.stateExpiry * 1000).toISOString() : null,
      metadata: { operation: 'reset', persistState: config.persistState }
    };
  }

  private async transitionState(stateKey: string, transitionRules: any[], config: any) {
    // Mock state transition
    return {
      state: { value: 'transitioned_state', timestamp: new Date().toISOString() },
      stateKey,
      operation: 'transition',
      previousState: { value: 'previous_state' },
      stateChanged: true,
      stateHistory: [{ operation: 'transition', timestamp: new Date().toISOString() }],
      expiryTime: config.stateExpiry ? new Date(Date.now() + config.stateExpiry * 1000).toISOString() : null,
      metadata: { operation: 'transition', persistState: config.persistState, rules: transitionRules }
    };
  }
}

export default StateNode;