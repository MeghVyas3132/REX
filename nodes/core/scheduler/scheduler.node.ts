import { WorkflowNode, ExecutionContext, ExecutionResult, NodeType } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;
import cron from 'node-cron';

export class SchedulerNode {
  private static scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  getNodeDefinition() {
    return {
      id: 'schedule',
      type: 'trigger' as NodeType,
      name: 'Scheduler',
      description: 'Trigger workflows on a schedule (cron) or after a delay',
      category: 'core',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'mode',
          type: 'options',
          displayName: 'Schedule Mode',
          description: 'Type of scheduling to use',
          required: true,
          default: 'cron',
          options: [
            { name: 'Cron Expression', value: 'cron' },
            { name: 'Delay', value: 'delay' },
            { name: 'Interval', value: 'interval' }
          ]
        },
        {
          name: 'cron',
          type: 'string',
          displayName: 'Cron Expression',
          description: 'Cron expression for scheduling',
          required: false,
          placeholder: '0 9 * * MON-FRI'
        },
        {
          name: 'delayMs',
          type: 'number',
          displayName: 'Delay (milliseconds)',
          description: 'Delay in milliseconds',
          required: false,
          default: 5000,
          min: 1000,
          max: 86400000
        },
        {
          name: 'intervalMs',
          type: 'number',
          displayName: 'Interval (milliseconds)',
          description: 'Interval in milliseconds',
          required: false,
          default: 60000,
          min: 1000,
          max: 86400000
        },
        {
          name: 'timezone',
          type: 'string',
          displayName: 'Timezone',
          description: 'Timezone for cron scheduling',
          required: false,
          default: 'UTC',
          placeholder: 'America/New_York'
        },
        {
          name: 'enabled',
          type: 'boolean',
          displayName: 'Enabled',
          description: 'Whether the schedule is active',
          required: false,
          default: true
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'mode',
          type: 'string',
          displayName: 'Dynamic Mode',
          description: 'Schedule mode from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'cron',
          type: 'string',
          displayName: 'Dynamic Cron',
          description: 'Cron expression from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'delayMs',
          type: 'number',
          displayName: 'Dynamic Delay',
          description: 'Delay from previous node (overrides configured)',
          required: false,
          dataType: 'number'
        },
        {
          name: 'intervalMs',
          type: 'number',
          displayName: 'Dynamic Interval',
          description: 'Interval from previous node (overrides configured)',
          required: false,
          dataType: 'number'
        },
        {
          name: 'enabled',
          type: 'boolean',
          displayName: 'Dynamic Enabled',
          description: 'Enable/disable from previous node (overrides configured)',
          required: false,
          dataType: 'boolean'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'triggeredAt',
          type: 'string',
          displayName: 'Triggered At',
          description: 'ISO timestamp when triggered',
          dataType: 'text'
        },
        {
          name: 'mode',
          type: 'string',
          displayName: 'Mode Used',
          description: 'Schedule mode that was used',
          dataType: 'text'
        },
        {
          name: 'nextTrigger',
          type: 'string',
          displayName: 'Next Trigger',
          description: 'ISO timestamp of next trigger',
          dataType: 'text'
        },
        {
          name: 'timezone',
          type: 'string',
          displayName: 'Timezone',
          description: 'Timezone used for scheduling',
          dataType: 'text'
        },
        {
          name: 'scheduleId',
          type: 'string',
          displayName: 'Schedule ID',
          description: 'Unique identifier for this schedule',
          dataType: 'text'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          mode: { type: 'string' },
          cron: { type: 'string' },
          delayMs: { type: 'number' },
          intervalMs: { type: 'number' },
          timezone: { type: 'string' },
          enabled: { type: 'boolean' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          mode: { type: 'string' },
          cron: { type: 'string' },
          delayMs: { type: 'number' },
          intervalMs: { type: 'number' },
          enabled: { type: 'boolean' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          triggeredAt: { type: 'string' },
          mode: { type: 'string' },
          nextTrigger: { type: 'string' },
          timezone: { type: 'string' },
          scheduleId: { type: 'string' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    
    // Validation for required parameters
    if (!config.mode && !context.input?.mode) {
      throw new Error('Required parameter "mode" is missing');
    }

    const startTime = Date.now();

    try {
      const mode = config.mode || 'cron';

      if (mode === 'cron') {
        if (!config.cron) throw new Error('Cron expression is required for cron mode');

        // Avoid duplicating tasks for the same node
        const key = `${context.workflowId}:${node.id}`;
        const existing = SchedulerNode.scheduledTasks.get(key);
        if (existing) existing.stop();

        const task = cron.schedule(config.cron, () => {
          context.emit?.('trigger', { nodeId: node.id, input: { triggeredAt: new Date().toISOString() } });
        });
        SchedulerNode.scheduledTasks.set(key, task);
        
        logger.info('Cron task scheduled', { nodeId: node.id, cron: config.cron });
        return { success: true, output: { triggeredAt: new Date().toISOString() }, duration: Date.now() - startTime };
      }

      if (mode === 'delay') {
        const delay = config.delayMs || 0;
        await new Promise(resolve => setTimeout(resolve, delay));
        return { success: true, output: { triggeredAt: new Date().toISOString() }, duration: Date.now() - startTime };
      }

      if (mode === 'interval') {
        const interval = config.intervalMs || 60000;
        setInterval(() => {
          context.emit?.('trigger', { nodeId: node.id, input: { triggeredAt: new Date().toISOString() } });
        }, interval);
        return { success: true, output: { triggeredAt: new Date().toISOString() }, duration: Date.now() - startTime };
      }

      throw new Error(`Unsupported mode: ${mode}`);
    } catch (error: any) {
      return { success: false, error: error.message, duration: Date.now() - startTime };
    }

}}

export default SchedulerNode;
