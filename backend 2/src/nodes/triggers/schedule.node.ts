import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
import logger from '../../utils/logger';
import { cronScheduler } from '../../core/scheduler/cron-scheduler';

export class ScheduleNode {
  /**
   * Convert interval-based scheduling to cron expression
   */
  private intervalToCron(interval: number, unit: 'seconds' | 'minutes' | 'hours' | 'days'): string {
    const randomSecond = Math.floor(Math.random() * 60);
    
    switch (unit) {
      case 'seconds':
        // For seconds, use 6-field cron: second minute hour day month weekday
        return `*/${interval} * * * * *`;
      case 'minutes':
        return `${randomSecond} */${interval} * * * *`;
      case 'hours':
        const randomMinute = Math.floor(Math.random() * 60);
        return `${randomSecond} ${randomMinute} */${interval} * * *`;
      case 'days':
        const randomMinuteDay = Math.floor(Math.random() * 60);
        const randomHour = Math.floor(Math.random() * 24);
        return `${randomSecond} ${randomMinuteDay} ${randomHour} */${interval} * *`;
      default:
        throw new Error(`Unsupported interval unit: ${unit}`);
    }
  }

  getNodeDefinition() {
    return {
      id: 'schedule',
      type: 'trigger',
      name: 'Schedule Trigger',
      description: 'Trigger workflow on a schedule using interval-based or cron expressions',
      category: 'trigger',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'triggerInterval',
          type: 'number',
          displayName: 'Trigger Interval',
          description: 'Interval value for scheduling',
          required: true,
          default: 1,
          min: 1,
          placeholder: '1'
        },
        {
          name: 'triggerIntervalUnit',
          type: 'string',
          displayName: 'Interval Unit',
          description: 'Unit for the trigger interval',
          required: true,
          default: 'minutes',
          options: [
            { value: 'seconds', label: 'Seconds' },
            { value: 'minutes', label: 'Minutes' },
            { value: 'hours', label: 'Hours' },
            { value: 'days', label: 'Days' }
          ]
        },
        {
          name: 'timezone',
          type: 'string',
          displayName: 'Timezone',
          description: 'Timezone for the schedule',
          required: true,
          default: 'UTC',
          options: [
            { value: 'UTC', label: 'UTC' },
            { value: 'America/New_York', label: 'America/New_York' },
            { value: 'Europe/London', label: 'Europe/London' },
            { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
            { value: 'Asia/Kolkata', label: 'Asia/Kolkata' },
            { value: 'America/Los_Angeles', label: 'America/Los_Angeles' }
          ]
        },
        {
          name: 'continueOnFail',
          type: 'boolean',
          displayName: 'Continue on Fail',
          description: 'Whether to continue workflow execution if this trigger fails',
          required: false,
          default: false
        },
        {
          name: 'retryOnFail',
          type: 'boolean',
          displayName: 'Retry on Fail',
          description: 'Whether to retry if this trigger fails',
          required: false,
          default: false
        },
        {
          name: 'maxRetries',
          type: 'number',
          displayName: 'Max Retries',
          description: 'Maximum number of retry attempts if retryOnFail is enabled',
          required: false,
          default: 3,
          min: 1,
          max: 10
        },
        // Legacy cron support (optional, for backward compatibility)
        {
          name: 'cron',
          type: 'string',
          displayName: 'Cron Expression (Legacy)',
          description: 'Cron expression for scheduling (overrides interval if provided)',
          required: false,
          placeholder: '0 9 * * MON-FRI',
          helpText: 'Examples: "0 9 * * MON-FRI" (weekdays 9 AM), "0 0 1 * *" (monthly), "0 */6 * * *" (every 6 hours)'
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'triggerInterval',
          type: 'number',
          displayName: 'Dynamic Trigger Interval',
          description: 'Trigger interval from previous node (overrides configured)',
          required: false,
          dataType: 'number'
        },
        {
          name: 'triggerIntervalUnit',
          type: 'string',
          displayName: 'Dynamic Interval Unit',
          description: 'Interval unit from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'timezone',
          type: 'string',
          displayName: 'Dynamic Timezone',
          description: 'Timezone from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'cron',
          type: 'string',
          displayName: 'Dynamic Cron Expression',
          description: 'Cron expression from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'triggerData',
          type: 'object',
          displayName: 'Trigger Data',
          description: 'Additional data to pass when triggered from previous node',
          required: false,
          dataType: 'object'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'triggerTime',
          type: 'string',
          displayName: 'Trigger Time',
          description: 'ISO timestamp when the schedule was triggered',
          dataType: 'text'
        },
        {
          name: 'timezone',
          type: 'string',
          displayName: 'Timezone Used',
          description: 'Timezone that was used for the trigger',
          dataType: 'text'
        },
        {
          name: 'cron',
          type: 'string',
          displayName: 'Cron Expression',
          description: 'Cron expression that triggered this execution',
          dataType: 'text'
        },
        {
          name: 'scheduleName',
          type: 'string',
          displayName: 'Schedule Name',
          description: 'Name of the schedule that triggered',
          dataType: 'text'
        },
        {
          name: 'executionCount',
          type: 'number',
          displayName: 'Execution Count',
          description: 'Number of times this schedule has executed',
          dataType: 'number'
        },
        {
          name: 'nextExecution',
          type: 'string',
          displayName: 'Next Execution',
          description: 'ISO timestamp of the next scheduled execution',
          dataType: 'text'
        },
        {
          name: 'triggerData',
          type: 'object',
          displayName: 'Trigger Data',
          description: 'Additional data passed with the trigger',
          dataType: 'object'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          triggerInterval: { type: 'number' },
          triggerIntervalUnit: { type: 'string', enum: ['seconds', 'minutes', 'hours', 'days'] },
          timezone: { type: 'string' },
          continueOnFail: { type: 'boolean' },
          retryOnFail: { type: 'boolean' },
          maxRetries: { type: 'number' },
          cron: { type: 'string' } // Legacy support
        },
        required: [] // Validation now checks both config and options, so no fields are strictly required in config
      },
      inputSchema: {
        type: 'object',
        properties: {
          triggerInterval: { type: 'number' },
          triggerIntervalUnit: { type: 'string' },
          timezone: { type: 'string' },
          cron: { type: 'string' },
          triggerData: { type: 'object' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          triggerTime: { type: 'string' },
          timezone: { type: 'string' },
          cron: { type: 'string' },
          triggerInterval: { type: 'number' },
          triggerIntervalUnit: { type: 'string' },
          triggerData: { type: 'object' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    const options = node.data?.options || {};
    
    // Get configuration values (from config or options, with input override)
    // Ensure triggerInterval is a number
    const triggerIntervalRaw = context.input?.triggerInterval ?? options.triggerInterval ?? config.triggerInterval;
    const triggerInterval = triggerIntervalRaw ? Number(triggerIntervalRaw) : null;
    const triggerIntervalUnit = context.input?.triggerIntervalUnit ?? options.triggerIntervalUnit ?? config.triggerIntervalUnit;
    const timezone = context.input?.timezone ?? options.timezone ?? config.timezone ?? 'UTC';
    const cron = context.input?.cron ?? config.cron;
    
    // Failure handling options
    const continueOnFail = options.continueOnFail ?? config.continueOnFail ?? false;
    const retryOnFail = options.retryOnFail ?? config.retryOnFail ?? false;
    const maxRetries = options.maxRetries ?? config.maxRetries ?? 3;

    const startTime = Date.now();
    
    try {
      // Validation for required parameters
      let finalCron: string | null = null;
      
      if (cron) {
        // Use provided cron expression (legacy support)
        finalCron = String(cron).trim();
        if (!finalCron) {
          throw new Error('Cron expression cannot be empty');
        }
      } else if (triggerInterval && triggerIntervalUnit) {
        // Validate triggerInterval is a valid number
        if (isNaN(triggerInterval) || triggerInterval < 1) {
          throw new Error(`Invalid trigger interval: ${triggerIntervalRaw}. Must be a number >= 1`);
        }
        
        // Validate triggerIntervalUnit is a valid unit
        const validUnits = ['seconds', 'minutes', 'hours', 'days'];
        if (!validUnits.includes(triggerIntervalUnit)) {
          throw new Error(`Invalid interval unit: ${triggerIntervalUnit}. Must be one of: ${validUnits.join(', ')}`);
        }
        
        // Convert interval to cron expression
        finalCron = this.intervalToCron(triggerInterval, triggerIntervalUnit as 'seconds' | 'minutes' | 'hours' | 'days');
      } else {
        // If running manually without configuration, allow pass-through
        logger.info('Schedule trigger executed without configuration (manual execution)', {
          nodeId: node.id,
          runId: context.runId,
          triggerInterval,
          triggerIntervalUnit
        });
        
        return {
          success: true,
          output: {
            triggerTime: new Date().toISOString(),
            timezone,
            cron: null,
            triggerInterval: triggerInterval || null,
            triggerIntervalUnit: triggerIntervalUnit || null,
            message: 'Manual execution - no schedule configuration',
            ...context.input
          },
          duration: Date.now() - startTime
        };
      }

      logger.info('Schedule trigger executed', {
        nodeId: node.id,
        cron: finalCron,
        triggerInterval,
        triggerIntervalUnit,
        timezone,
        runId: context.runId,
        workflowId: context.workflowId
      });

      // Register the schedule with CronScheduler for automatic execution
      // This will schedule the workflow to run automatically at the specified intervals
      if (finalCron && context.workflowId) {
        try {
          await cronScheduler.scheduleWorkflow(
            context.workflowId,
            finalCron,
            timezone || 'UTC'
          );
          
          logger.info('Schedule registered with CronScheduler', {
            workflowId: context.workflowId,
            nodeId: node.id,
            cron: finalCron,
            timezone: timezone || 'UTC'
          });
        } catch (scheduleError: any) {
          logger.error('Failed to register schedule with CronScheduler', scheduleError, {
            workflowId: context.workflowId,
            nodeId: node.id,
            cron: finalCron,
            timezone
          });
          // Don't fail the node execution if scheduling fails - just log the error
          // The workflow can still be executed manually
        }
      }

      return {
        success: true,
        output: {
          triggerTime: new Date().toISOString(),
          timezone,
          cron: finalCron,
          triggerInterval: triggerInterval || null,
          triggerIntervalUnit: triggerIntervalUnit || null,
          message: finalCron && context.workflowId 
            ? 'Workflow scheduled for automatic execution' 
            : 'Workflow triggered by schedule',
          scheduled: !!(finalCron && context.workflowId)
        },
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      const errorMessage = error?.message || String(error) || 'Unknown error';
      
      logger.error('Schedule trigger failed', error, {
        nodeId: node.id,
        runId: context.runId,
        continueOnFail,
        retryOnFail,
        maxRetries,
        triggerInterval,
        triggerIntervalUnit,
        timezone,
        cron,
        errorMessage
      });

      // Handle failure based on configuration
      if (continueOnFail) {
        return {
          success: true,
          output: {
            triggerTime: new Date().toISOString(),
            timezone,
            error: true,
            errorMessage: errorMessage,
            message: 'Schedule trigger failed but continuing due to continueOnFail setting'
          },
          duration
        };
      }

      // If retryOnFail is enabled, the retry logic should be handled by the execution engine
      // This node just reports the error
      return {
        success: false,
        error: errorMessage,
        retryable: retryOnFail,
        maxRetries: retryOnFail ? maxRetries : 0,
        duration
      };
    }

}}

export default ScheduleNode;
