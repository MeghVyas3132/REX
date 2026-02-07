import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require('../../utils/logger');

export class ConditionalNode {
  getNodeDefinition() {
    return {
      id: 'condition',
      type: 'action',
      name: 'Conditional Logic',
      description: 'Execute different paths based on conditions',
      category: 'utility',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'conditions',
          type: 'array',
          displayName: 'Conditions',
          description: 'Array of conditions to evaluate. Each condition: {field, operator, value, path}',
          required: true,
          default: [
            {
              field: 'value',
              operator: 'greater_than',
              value: 0,
              path: 'positive'
            }
          ],
          placeholder: 'JSON array of condition objects'
        },
        {
          name: 'logic',
          type: 'options',
          displayName: 'Logic Operator',
          description: 'How to combine multiple conditions',
          required: false,
          default: 'and',
          options: [
            { name: 'AND (All must be true)', value: 'and' },
            { name: 'OR (Any can be true)', value: 'or' }
          ]
        },
        {
          name: 'defaultPath',
          type: 'string',
          displayName: 'Default Path',
          description: 'Path to follow when no conditions match',
          required: false,
          default: 'default',
          placeholder: 'default'
        },
        {
          name: 'caseSensitive',
          type: 'boolean',
          displayName: 'Case Sensitive',
          description: 'Whether string comparisons should be case sensitive',
          required: false,
          default: false
        },
        {
          name: 'strictMode',
          type: 'boolean',
          displayName: 'Strict Mode',
          description: 'Fail if any condition field is missing',
          required: false,
          default: false
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'data',
          type: 'object',
          displayName: 'Input Data',
          description: 'Data object to evaluate conditions against from previous node',
          required: true,
          dataType: 'object'
        },
        {
          name: 'conditions',
          type: 'array',
          displayName: 'Dynamic Conditions',
          description: 'Conditions array from previous node (overrides configured)',
          required: false,
          dataType: 'array'
        },
        {
          name: 'logic',
          type: 'string',
          displayName: 'Dynamic Logic',
          description: 'Logic operator from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'defaultPath',
          type: 'string',
          displayName: 'Dynamic Default Path',
          description: 'Default path from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'result',
          type: 'boolean',
          displayName: 'Result',
          description: 'Boolean result of the condition evaluation',
          dataType: 'boolean'
        },
        {
          name: 'path',
          type: 'string',
          displayName: 'Selected Path',
          description: 'The path that was selected based on conditions',
          dataType: 'text'
        },
        {
          name: 'matched',
          type: 'boolean',
          displayName: 'Condition Matched',
          description: 'Whether any condition was matched',
          dataType: 'boolean'
        },
        {
          name: 'data',
          type: 'object',
          displayName: 'Output Data',
          description: 'Original input data passed through',
          dataType: 'object'
        },
        {
          name: 'matchedConditions',
          type: 'array',
          displayName: 'Matched Conditions',
          description: 'Array of conditions that were matched',
          dataType: 'array'
        },
        {
          name: 'evaluationDetails',
          type: 'object',
          displayName: 'Evaluation Details',
          description: 'Detailed information about condition evaluation',
          dataType: 'object'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          conditions: { 
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                operator: { type: 'string' },
                value: { type: ['string', 'number', 'boolean'] },
                path: { type: 'string' }
              },
              required: ['field', 'operator', 'value', 'path']
            }
          },
          logic: { type: 'string', enum: ['and', 'or'] },
          defaultPath: { type: 'string' },
          caseSensitive: { type: 'boolean' },
          strictMode: { type: 'boolean' }
        },
        required: ['conditions']
      },
      inputSchema: {
        type: 'object',
        properties: {
          data: { type: 'object' },
          conditions: { type: 'array' },
          logic: { type: 'string' },
          defaultPath: { type: 'string' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          result: { type: 'boolean' },
          path: { type: 'string' },
          matched: { type: 'boolean' },
          data: { type: 'object' },
          matchedConditions: { type: 'array' },
          evaluationDetails: { type: 'object' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    
    // Validation for required parameters
    if (!config.conditions && !context.input?.conditions) {
      throw new Error('Required parameter "conditions" is missing');
    }

    const startTime = Date.now();
    
    try {
      // Get conditions from config or input (input takes precedence)
      const conditions = context.input?.conditions || config.conditions || [];
      const defaultPath = context.input?.defaultPath || config.defaultPath;
      const logic = context.input?.logic || config.logic || 'and';

      if (!conditions || conditions.length === 0) {
        throw new Error('At least one condition is required. Please configure conditions in the node settings or provide them via input.');
      }

      logger.info('Conditional logic executed', {
        nodeId: node.id,
        conditionCount: conditions.length,
        logic,
        runId: context.runId
      });

      // Get data from input (preferred) or use empty object
      const data = context.input?.data || context.input || {};
      const matchedConditions: any[] = [];
      let result = logic === 'and';

      for (const condition of conditions) {
        const fieldValue = this.getFieldValue(data, condition.field);
        const conditionResult = this.evaluateCondition(fieldValue, condition.operator, condition.value);
        
        if (conditionResult) {
          matchedConditions.push(condition);
        }

        if (logic === 'and') {
          result = result && conditionResult;
        } else if (logic === 'or') {
          result = result || conditionResult;
        }
      }

      const selectedPath = result && matchedConditions.length > 0 
        ? matchedConditions[0].path 
        : defaultPath;

      return {
        success: true,
        output: {
          result,
          path: selectedPath,
          matchedConditions
        },
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Conditional logic failed', error, {
        nodeId: node.id,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  private getFieldValue(data: any, field: string): any {
    const parts = field.split('.');
    let value = data;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue;
      case 'not_equals':
        return fieldValue !== expectedValue;
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue);
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue);
      case 'contains':
        return String(fieldValue).includes(String(expectedValue));
      case 'regex':
        return new RegExp(expectedValue).test(String(fieldValue));
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      default:
        return false;
    }

}}

export default ConditionalNode;
