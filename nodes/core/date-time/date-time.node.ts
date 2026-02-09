import { WorkflowNode, ExecutionContext, ExecutionResult, NodeType } from '@rex/shared';
import { logger } from '../../lib/logger.js';

export class DateTimeNode {
  getNodeDefinition() {
    return {
      id: 'date-time',
      type: 'action' as NodeType,
      name: 'Date/Time',
      description: 'Get or format current date/time, add/subtract durations',
      category: 'core',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'operation',
          type: 'options',
          displayName: 'Operation',
          description: 'Date/time operation to perform',
          required: true,
          default: 'now',
          options: [
            { name: 'Get Current Time', value: 'now' },
            { name: 'Format Date', value: 'format' },
            { name: 'Add Duration', value: 'add' },
            { name: 'Subtract Duration', value: 'subtract' },
            { name: 'Parse Date', value: 'parse' }
          ]
        },
        {
          name: 'format',
          type: 'string',
          displayName: 'Date Format',
          description: 'Date format string',
          required: false,
          default: 'iso',
          placeholder: 'YYYY-MM-DD, DD/MM/YYYY, ISO'
        },
        {
          name: 'value',
          type: 'string',
          displayName: 'Date Value',
          description: 'Date string to parse or format',
          required: false,
          placeholder: '2024-01-01, 01/01/2024'
        },
        {
          name: 'amount',
          type: 'number',
          displayName: 'Amount',
          description: 'Number of units to add/subtract',
          required: false,
          default: 1,
          min: 0
        },
        {
          name: 'unit',
          type: 'options',
          displayName: 'Time Unit',
          description: 'Time unit for add/subtract operations',
          required: false,
          default: 'days',
          options: [
            { name: 'Milliseconds', value: 'milliseconds' },
            { name: 'Seconds', value: 'seconds' },
            { name: 'Minutes', value: 'minutes' },
            { name: 'Hours', value: 'hours' },
            { name: 'Days', value: 'days' },
            { name: 'Weeks', value: 'weeks' }
          ]
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'value',
          type: 'string',
          displayName: 'Dynamic Date Value',
          description: 'Date value from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'format',
          type: 'string',
          displayName: 'Dynamic Format',
          description: 'Date format from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'amount',
          type: 'number',
          displayName: 'Dynamic Amount',
          description: 'Amount from previous node (overrides configured)',
          required: false,
          dataType: 'number'
        },
        {
          name: 'unit',
          type: 'string',
          displayName: 'Dynamic Unit',
          description: 'Time unit from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'value',
          type: 'string',
          displayName: 'Formatted Date',
          description: 'Formatted date string',
          dataType: 'text'
        },
        {
          name: 'timestamp',
          type: 'number',
          displayName: 'Unix Timestamp',
          description: 'Unix timestamp in milliseconds',
          dataType: 'number'
        },
        {
          name: 'iso',
          type: 'string',
          displayName: 'ISO String',
          description: 'ISO 8601 date string',
          dataType: 'text'
        },
        {
          name: 'year',
          type: 'number',
          displayName: 'Year',
          description: 'Year component',
          dataType: 'number'
        },
        {
          name: 'month',
          type: 'number',
          displayName: 'Month',
          description: 'Month component (1-12)',
          dataType: 'number'
        },
        {
          name: 'day',
          type: 'number',
          displayName: 'Day',
          description: 'Day component',
          dataType: 'number'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string' },
          format: { type: 'string' },
          value: { type: 'string' },
          amount: { type: 'number' },
          unit: { type: 'string' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          format: { type: 'string' },
          amount: { type: 'number' },
          unit: { type: 'string' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          timestamp: { type: 'number' },
          iso: { type: 'string' },
          year: { type: 'number' },
          month: { type: 'number' },
          day: { type: 'number' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    const startTime = Date.now();

    
    // Validation for required parameters
    if (!config.operation && !context.input?.operation) {
      throw new Error('Required parameter "operation" is missing');
    }


    try {
      const operation = config.operation || 'now';
      const format = config.format || 'iso';
      const value = config.value || context.input?.value;
      const amount = config.amount || context.input?.amount || 0;
      const unit = config.unit || context.input?.unit || 'seconds';

      logger.info('Date/Time node execute', { nodeId: node.id, operation, runId: context.runId });

      let date = value ? new Date(value) : new Date();
      if (operation === 'parse' && !value) {
        throw new Error('Value is required for parse operation');
      }

      if (operation === 'add' || operation === 'subtract') {
        const ms = this.unitToMs(amount, unit);
        date = new Date(date.getTime() + (operation === 'add' ? ms : -ms));
      }

      const output = {
        value: this.formatDate(date, format),
        timestamp: date.getTime()
      };

      const duration = Date.now() - startTime;
      return { success: true, output, duration };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      return { success: false, error: error.message, duration };
    }
  }

  private unitToMs(amount: number, unit: string): number {
    switch (unit) {
      case 'milliseconds': return amount;
      case 'seconds': return amount * 1000;
      case 'minutes': return amount * 60 * 1000;
      case 'hours': return amount * 60 * 60 * 1000;
      case 'days': return amount * 24 * 60 * 60 * 1000;
      case 'weeks': return amount * 7 * 24 * 60 * 60 * 1000;
      default: return amount * 1000;
    }
  }

  private formatDate(date: Date, format: string): string {
    switch (format) {
      case 'iso':
        return date.toISOString();
      case 'unix':
        return Math.floor(date.getTime() / 1000).toString();
      case 'locale':
        return date.toLocaleString();
      default:
        return date.toISOString();
    }
  }

  private getCurrentDateTime(format: string): string {
    const now = new Date();
    return this.formatDate(now, format);
  }

  private formatDateTime(value: string, format: string): string {
    const date = new Date(value);
    return this.formatDate(date, format);
  }

  private addDuration(dateStr: string, amount: number, unit: string): string {
    const date = new Date(dateStr);
    const ms = this.unitToMs(amount, unit);
    const newDate = new Date(date.getTime() + ms);
    return this.formatDate(newDate, 'iso');
  }

  private subtractDuration(dateStr: string, amount: number, unit: string): string {
    const date = new Date(dateStr);
    const ms = this.unitToMs(amount, unit);
    const newDate = new Date(date.getTime() - ms);
    return this.formatDate(newDate, 'iso');
  }

  private parseDateTime(value: string): string {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${value}`);
    }
    return date.toISOString();
  }}


export default DateTimeNode;
