import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;

export class ConditionNode {
  getNodeDefinition() {
    return {
  id: 'condition',
  type: 'action',
  name: 'Condition',
  description: 'Evaluate conditional logic',
  category: 'logic',
  version: '1.0.0',
  author: 'Workflow Studio',
  parameters: [
    {
      name: 'logic',
      type: 'options',
      displayName: 'Logic Operator',
      description: 'Whether all conditions must match (AND) or any condition can match (OR)',
      required: false,
      default: 'or',
      options: [
        { name: 'All conditions (AND)', value: 'and' },
        { name: 'Any condition (OR)', value: 'or' }
      ]
    },
    {
      name: 'conditions',
      type: 'array',
      displayName: 'Conditions',
      description: 'Array of conditions to evaluate. Each condition can include field, operator, value, and optional path.',
      required: true,
      placeholder: '[{"field":"data.value","operator":"greater_than","value":0,"path":"positive"}]'
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
      displayName: 'Case Sensitive Comparisons',
      description: 'When enabled, string comparisons respect casing',
      required: false,
      default: false
    },
    {
      name: 'strictMode',
      type: 'boolean',
      displayName: 'Strict Mode',
      description: 'Fail the condition if a referenced field is missing',
      required: false,
      default: false
    }
  ],
  inputs: [
    {
      name: 'data',
      type: 'object',
      displayName: 'Input Data',
      description: 'Data payload to evaluate',
      required: false,
      dataType: 'object'
    },
    {
      name: 'logic',
      type: 'string',
      displayName: 'Logic Operator',
      description: 'Overrides the configured logic operator',
      required: false,
      dataType: 'text'
    },
    {
      name: 'conditions',
      type: 'array',
      displayName: 'Conditions',
      description: 'Overrides the configured conditions',
      required: false,
      dataType: 'array'
    },
    {
      name: 'defaultPath',
      type: 'string',
      displayName: 'Default Path',
      description: 'Overrides the configured default path',
      required: false,
      dataType: 'text'
    },
    {
      name: 'caseSensitive',
      type: 'boolean',
      displayName: 'Case Sensitive',
      description: 'Override case sensitivity from previous node',
      required: false,
      dataType: 'boolean'
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
    const config = node.data?.config || {};
    const startTime = Date.now();

    let conditions: any = config.conditions ?? context.input?.conditions ?? [];
    if (typeof conditions === 'string') {
      try {
        conditions = JSON.parse(conditions);
      } catch {
        conditions = [];
      }
    }
    if (!Array.isArray(conditions)) {
      conditions = [];
    }

    if (conditions.length === 0) {
        throw new Error('At least one condition is required');
      }

    const logic = String(
      config.logic ?? config.conditionType ?? context.input?.logic ?? 'or'
    ).toLowerCase();
    const caseSensitive = Boolean(config.caseSensitive ?? context.input?.caseSensitive);
    const strictMode = Boolean(config.strictMode ?? context.input?.strictMode);
    const defaultPath = config.defaultPath ?? context.input?.defaultPath ?? 'default';

    const contextData = this.buildContextData(context);
    const evaluationOptions = { caseSensitive, strictMode };
    const matchedConditions: any[] = [];

      logger.info('Evaluating conditions', {
        nodeId: node.id,
        conditionCount: conditions.length,
      logic,
        runId: context.runId
    });

    if (logic === 'and') {
      const allMatch = conditions.every((condition) => {
        const matched = this.evaluateCondition(condition, contextData, evaluationOptions);
        if (matched) {
          matchedConditions.push(condition);
        }
        return matched;
      });

      const duration = Date.now() - startTime;

      return {
        success: true,
        output: {
          ...context.input,  // Preserve input data
          matched: allMatch,
          path: allMatch
            ? (conditions.find((c: any) => c?.path)?.path ?? defaultPath)
            : defaultPath,
          matchedConditions: allMatch ? matchedConditions : []
        },
        duration
      };
    }

      for (const condition of conditions) {
      const isMatch = this.evaluateCondition(condition, contextData, evaluationOptions);
        if (isMatch) {
        matchedConditions.push(condition);
          const duration = Date.now() - startTime;
          
          logger.info('Condition matched', {
            nodeId: node.id,
          path: condition?.path,
            runId: context.runId
          });

          return {
            success: true,
            output: {
            ...context.input,  // Preserve input data
              matched: true,
            path: condition?.path ?? defaultPath,
            condition,
            matchedConditions
            },
            duration
          };
        }
      }

      const duration = Date.now() - startTime;
      
      logger.info('No conditions matched, using default path', {
        nodeId: node.id,
        defaultPath,
        runId: context.runId
      });

    return {
      success: true,
      output: {
        ...context.input,  // Preserve input data
        matched: false,
        path: defaultPath,
        matchedConditions: []
      },
        duration
      };
  }

  private buildContextData(context: ExecutionContext): any {
    const base: any = {};

    if (context?.input && typeof context.input === 'object') {
      Object.assign(base, context.input);
    }
    if (context?.input?.data && typeof context.input.data === 'object') {
      base.data = context.input.data;
    }
    if (context?.variables && typeof context.variables === 'object') {
      base.variables = context.variables;
    }

    base.context = context;
    return base;
  }

  private evaluateCondition(
    condition: any,
    contextData: any,
    options: { caseSensitive: boolean; strictMode: boolean }
  ): boolean {
    if (!condition || typeof condition !== 'object') {
      return false;
    }

    const operator = String(condition.operator ?? 'equals').toLowerCase();
    const field = condition.field;

    let leftValue: any;
    if (field) {
      leftValue = this.getFieldValue(field, contextData);
    } else if ('left' in condition) {
      leftValue = condition.left;
    }

    const rightValue = condition.value;

    if (options.strictMode && field && leftValue === undefined) {
      return false;
    }

    const [normalizedLeft, normalizedRight] = this.normalizePair(leftValue, rightValue, options.caseSensitive);
    
    switch (operator) {
      case 'equals':
        return this.compareEquality(leftValue, rightValue, options.caseSensitive);
      
      case 'not_equals':
        return !this.compareEquality(leftValue, rightValue, options.caseSensitive);
      
      case 'greater_than':
        return Number(leftValue) > Number(rightValue);

      case 'greater_than_or_equal':
      case 'gte':
        return Number(leftValue) >= Number(rightValue);
      
      case 'less_than':
        return Number(leftValue) < Number(rightValue);

      case 'less_than_or_equal':
      case 'lte':
        return Number(leftValue) <= Number(rightValue);
      
      case 'contains':
        return String(normalizedLeft).includes(String(normalizedRight));
      
      case 'not_contains':
        return !String(normalizedLeft).includes(String(normalizedRight));

      case 'starts_with':
        return String(normalizedLeft).startsWith(String(normalizedRight));

      case 'ends_with':
        return String(normalizedLeft).endsWith(String(normalizedRight));

      case 'regex': {
        if (rightValue === undefined || rightValue === null) return false;
        try {
          const flags = condition.flags ?? (options.caseSensitive ? '' : 'i');
          const regex = new RegExp(String(rightValue), flags);
          return regex.test(String(leftValue ?? ''));
        } catch {
          return false;
        }
      }
      
      case 'exists':
        return leftValue !== undefined && leftValue !== null;
      
      case 'not_exists':
        return leftValue === undefined || leftValue === null;

      case 'in': {
        if (Array.isArray(rightValue)) {
          return rightValue
            .map((val) => (typeof val === 'string' && !options.caseSensitive ? val.toLowerCase() : val))
            .includes(normalizedLeft);
        }
        return false;
      }

      case 'expression': {
        if (!condition.expression) return false;
        try {
          const fn = new Function('context', 'data', `return (${condition.expression});`);
          return Boolean(fn(contextData, contextData.data ?? contextData));
        } catch (error) {
          logger.warn('Condition expression evaluation failed', error);
          return false;
        }
      }
      
      default:
        logger.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  private getFieldValue(field: string, data: any): any {
    if (!field) return undefined;
    const parts = field.split('.');
    let value: any = data;
    
    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      
      if (Array.isArray(value) && /^\d+$/.test(part)) {
        value = value[Number(part)];
      } else if (typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private normalizePair(left: any, right: any, caseSensitive: boolean): [any, any] {
    const normalize = (val: any) => {
      if (typeof val === 'string' && !caseSensitive) {
        return val.toLowerCase();
      }
      return val;
    };

    return [normalize(left), normalize(right)];
  }

  private compareEquality(left: any, right: any, caseSensitive: boolean): boolean {
    const [normalizedLeft, normalizedRight] = this.normalizePair(left, right, caseSensitive);

    const leftNumber = Number(left);
    const rightNumber = Number(right);
    const bothNumeric = !Number.isNaN(leftNumber) && !Number.isNaN(rightNumber);

    if (bothNumeric) {
      return leftNumber === rightNumber;
    }

    return normalizedLeft === normalizedRight;
  }
}

export default ConditionNode;
