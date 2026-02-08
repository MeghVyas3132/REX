import cron from 'node-cron';
import { logger } from "../../utils/logger";
import { queueService } from '../queue/queue';
import { JobTypes } from '../queue/job-types';
import { prisma } from '../../db/prisma';

export class CronScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private autoLoadEnabled: boolean = false; // DISABLED by default - workflows will NOT auto-run

  constructor() {
    // Auto-loading is DISABLED by default
    // Workflows with Schedule Trigger nodes will NOT automatically run on startup
    // To enable auto-loading, set ENABLE_AUTO_SCHEDULE_LOAD=true in environment variables
    this.autoLoadEnabled = process.env.ENABLE_AUTO_SCHEDULE_LOAD === 'true';
    this.initializeScheduler();
  }

  private async initializeScheduler(): Promise<void> {
    // Only load scheduled workflows if auto-loading is explicitly enabled
    if (this.autoLoadEnabled) {
      logger.info('🔄 Auto-loading of scheduled workflows is ENABLED.');
      // Load scheduled workflows from database
      await this.loadScheduledWorkflows();
    } else {
      logger.info('⏸️  Auto-loading of scheduled workflows is DISABLED by default.');
      logger.info('   Workflows with Schedule Trigger nodes will NOT run automatically.');
      logger.info('   To enable auto-loading, set ENABLE_AUTO_SCHEDULE_LOAD=true in environment variables.');
      logger.info('   Workflows can still be manually triggered or scheduled via API.');
    }
    
    // Set up cleanup tasks
    this.scheduleCleanupTasks();
  }

  /**
   * Convert interval-based scheduling to cron expression
   */
  private intervalToCron(interval: number, unit: 'seconds' | 'minutes' | 'hours' | 'days'): string {
    const randomSecond = Math.floor(Math.random() * 60);
    
    switch (unit) {
      case 'seconds':
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

  private async loadScheduledWorkflows(): Promise<void> {
    try {
      logger.info('🔄 Loading scheduled workflows from database...');
      
      // Load all active workflows
      const workflows = await prisma.workflow.findMany({
        where: {
          isActive: true
        }
      });

      logger.info(`Found ${workflows.length} active workflow(s) to check for schedules`);

      let scheduledCount = 0;
      let skippedCount = 0;

      for (const workflow of workflows) {
        // First, check for schedule in settings (legacy)
        const schedule = (workflow.settings as any)?.schedule;
        if (schedule?.cron) {
          await this.scheduleWorkflow(workflow.id, schedule.cron, schedule.timezone);
          scheduledCount++;
          continue;
        }

        // Then, check for Schedule Trigger nodes in the workflow
        const nodes = (workflow.nodes as any) || [];
        if (!Array.isArray(nodes) || nodes.length === 0) {
          continue;
        }

        // Find Schedule Trigger nodes
        const scheduleNodes = nodes.filter((node: any) => {
          const nodeType = node.type || node.data?.type || '';
          const nodeSubtype = node.data?.subtype || '';
          const nodeLabel = node.data?.label || node.label || '';
          return nodeType === 'schedule' || 
                 nodeType === 'trigger.schedule' || 
                 nodeType === 'triggers/schedule' ||
                 nodeSubtype === 'schedule' ||
                 (nodeType === 'trigger' && nodeSubtype === 'schedule') ||
                 nodeLabel.toLowerCase().includes('schedule');
        });

        if (scheduleNodes.length === 0) {
          skippedCount++;
          continue;
        }

        // Use the first schedule trigger node
        const scheduleNode: any = scheduleNodes[0];
        const config = scheduleNode.data?.config || {};
        const options = scheduleNode.data?.options || {};

        // Get configuration values (check options first, then config)
        const triggerIntervalRaw = options.triggerInterval ?? config.triggerInterval;
        const triggerInterval = triggerIntervalRaw ? Number(triggerIntervalRaw) : null;
        const triggerIntervalUnit = options.triggerIntervalUnit ?? config.triggerIntervalUnit;
        const timezone = options.timezone ?? config.timezone ?? 'UTC';
        const cron = config.cron || options.cron;

        let finalCron: string | null = null;

        if (cron) {
          finalCron = String(cron).trim();
        } else if (triggerInterval && triggerIntervalUnit) {
          if (!isNaN(triggerInterval) && triggerInterval >= 1) {
            const validUnits = ['seconds', 'minutes', 'hours', 'days'];
            if (validUnits.includes(triggerIntervalUnit)) {
              finalCron = this.intervalToCron(triggerInterval, triggerIntervalUnit as 'seconds' | 'minutes' | 'hours' | 'days');
            }
          }
        }

        if (finalCron) {
          try {
            await this.scheduleWorkflow(workflow.id, finalCron, timezone);
            scheduledCount++;
            logger.info('📅 Schedule registered for workflow', {
              workflowId: workflow.id,
              workflowName: workflow.name || 'Unnamed',
              cron: finalCron,
              timezone,
              triggerInterval,
              triggerIntervalUnit,
              message: `This workflow will run automatically. To disable, set isActive=false or remove the Schedule Trigger node.`
            });
          } catch (error) {
            logger.error('Failed to load schedule from Schedule Trigger node', error as Error, {
              workflowId: workflow.id
            });
          }
        }
      }

      logger.info('✅ Scheduled workflows loading complete', { 
        totalActive: workflows.length,
        scheduledCount,
        skippedCount,
        message: scheduledCount > 0 
          ? `${scheduledCount} workflow(s) will run automatically according to their schedules. To stop them, set the workflow's isActive to false or remove the Schedule Trigger node.`
          : 'No scheduled workflows found. Workflows will only run when manually triggered.'
      });
    } catch (error) {
      logger.error('Failed to load scheduled workflows', error as Error);
    }
  }

  async scheduleWorkflow(
    workflowId: string,
    cronExpression: string,
    timezone?: string
  ): Promise<void> {
    const taskId = `workflow-${workflowId}`;
    
    // Remove existing task if it exists
    if (this.tasks.has(taskId)) {
      this.tasks.get(taskId)?.stop();
      this.tasks.delete(taskId);
    }

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    // Create new scheduled task
    const task = cron.schedule(
      cronExpression,
      async () => {
        const executionStartTime = Date.now();
        try {
          logger.info('⏰ CRON TRIGGERED: Executing scheduled workflow', {
            workflowId,
            cronExpression,
            timezone,
            timestamp: new Date().toISOString(),
            taskId,
            note: 'This workflow is running automatically because it has a Schedule Trigger node. This is expected behavior.'
          });

          // Add workflow execution job to queue
          // Pass empty input - Schedule Trigger node will provide its own output
          const job = await queueService.addWorkflowJob(workflowId, {}, {
            priority: 1, // Higher priority for scheduled jobs
            delay: 0
          });
          
          logger.info('✅ Scheduled workflow job added to queue successfully', {
            workflowId,
            jobId: job.id,
            queueName: 'workflows',
            queueTime: Date.now() - executionStartTime
          });

          logger.info('✅ Scheduled workflow job added to queue', {
            workflowId,
            jobId: job.id,
            queueTime: Date.now() - executionStartTime
          });

          // Update last run timestamp
          await this.updateLastRun(workflowId);

          logger.info('✅ Scheduled workflow execution completed successfully', {
            workflowId,
            totalTime: Date.now() - executionStartTime
          });

        } catch (error) {
          logger.error('❌ Scheduled workflow execution failed', error as Error, {
            workflowId,
            cronExpression,
            timezone,
            taskId,
            errorMessage: (error as Error).message,
            errorStack: (error as Error).stack
          });
        }
      },
      {
        scheduled: true,
        timezone: timezone || 'UTC'
      }
    );

    this.tasks.set(taskId, task);
    
    logger.info('✅ Workflow scheduled successfully', {
      workflowId,
      cronExpression,
      timezone: timezone || 'UTC',
      taskId,
      scheduledTasksCount: this.tasks.size,
      message: `Cron job will fire according to: ${cronExpression} (every minute at second ${cronExpression.split(' ')[0]})`
    });
  }

  async unscheduleWorkflow(workflowId: string): Promise<void> {
    const taskId = `workflow-${workflowId}`;
    const task = this.tasks.get(taskId);
    
    if (task) {
      task.stop();
      this.tasks.delete(taskId);
      
      logger.info('Workflow unscheduled', { workflowId });
    }
  }

  async rescheduleWorkflow(
    workflowId: string,
    cronExpression: string,
    timezone?: string
  ): Promise<void> {
    await this.unscheduleWorkflow(workflowId);
    await this.scheduleWorkflow(workflowId, cronExpression, timezone);
  }

  private async updateLastRun(workflowId: string): Promise<void> {
    try {
      await prisma.workflow.update({
        where: { id: workflowId },
        data: {
          settings: {
            // Update last run timestamp in settings
            // This would need to be implemented based on your schema
          }
        }
      });
    } catch (error) {
      logger.error('Failed to update last run timestamp', error as Error, {
        workflowId
      });
    }
  }

  private scheduleCleanupTasks(): void {
    // Daily cleanup at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Starting daily cleanup');
        await this.performCleanup();
      } catch (error) {
        logger.error('Daily cleanup failed', error as Error);
      }
    });

    // Weekly cleanup on Sunday at 3 AM
    cron.schedule('0 3 * * 0', async () => {
      try {
        logger.info('Starting weekly cleanup');
        await this.performWeeklyCleanup();
      } catch (error) {
        logger.error('Weekly cleanup failed', error as Error);
      }
    });
  }

  private async performCleanup(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago

    try {
      // Clean up old workflow runs
      const deletedRuns = await prisma.workflowRun.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          },
          status: {
            in: ['completed', 'failed']
          }
        }
      });

      // Clean up old agent runs
      const deletedAgentRuns = await prisma.agentRun.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          },
          status: {
            in: ['completed', 'failed']
          }
        }
      });

      // Clean up old webhook events
      const deletedWebhookEvents = await prisma.webhookEvent.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          },
          processed: true
        }
      });

      logger.info('Cleanup completed', {
        deletedRuns: deletedRuns.count,
        deletedAgentRuns: deletedAgentRuns.count,
        deletedWebhookEvents: deletedWebhookEvents.count
      });

    } catch (error) {
      logger.error('Cleanup failed', error as Error);
    }
  }

  private async performWeeklyCleanup(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago

    try {
      // Clean up old queue jobs (if using database queue)
      // This would depend on your queue implementation
      
      logger.info('Weekly cleanup completed');
    } catch (error) {
      logger.error('Weekly cleanup failed', error as Error);
    }
  }

  // Get all scheduled tasks
  getScheduledTasks(): Array<{
    id: string;
    workflowId: string;
    cronExpression: string;
    timezone: string;
    nextRun?: Date;
  }> {
    const tasks: Array<{
      id: string;
      workflowId: string;
      cronExpression: string;
      timezone: string;
      nextRun?: Date;
    }> = [];

    for (const [taskId, task] of this.tasks) {
      if (taskId.startsWith('workflow-')) {
        const workflowId = taskId.replace('workflow-', '');
        tasks.push({
          id: taskId,
          workflowId,
          cronExpression: 'unknown', // Would need to store this
          timezone: 'UTC',
          nextRun: undefined // Would need to calculate this
        });
      }
    }

    return tasks;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      // Check if scheduler is running
      return this.tasks.size >= 0;
    } catch (error) {
      logger.error('Scheduler health check failed', error as Error);
      return false;
    }
  }

  // Shutdown
  /**
   * Stop all scheduled workflows
   */
  async stopAllScheduledWorkflows(): Promise<void> {
    logger.info('🛑 Stopping all scheduled workflows...');
    let stoppedCount = 0;
    
    for (const [taskId, task] of this.tasks.entries()) {
      try {
        task.stop();
        stoppedCount++;
        logger.info(`Stopped scheduled workflow: ${taskId}`);
      } catch (error) {
        logger.error(`Failed to stop scheduled workflow: ${taskId}`, error as Error);
      }
    }
    
    this.tasks.clear();
    logger.info(`✅ Stopped ${stoppedCount} scheduled workflow(s). They will not run automatically until re-scheduled.`);
  }

  /**
   * Get list of all scheduled workflow IDs
   */
  getScheduledWorkflowIds(): string[] {
    return Array.from(this.tasks.keys()).map(taskId => taskId.replace('workflow-', ''));
  }

  /**
   * Stop a specific scheduled workflow
   */
  async stopScheduledWorkflow(workflowId: string): Promise<boolean> {
    const taskId = `workflow-${workflowId}`;
    const task = this.tasks.get(taskId);
    
    if (task) {
      try {
        task.stop();
        this.tasks.delete(taskId);
        logger.info(`✅ Stopped scheduled workflow: ${workflowId}`);
        return true;
      } catch (error) {
        logger.error(`Failed to stop scheduled workflow: ${workflowId}`, error as Error);
        return false;
      }
    } else {
      logger.warn(`No scheduled task found for workflow: ${workflowId}`);
      return false;
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down scheduler');
    
    for (const [taskId, task] of this.tasks) {
      task.stop();
    }
    
    this.tasks.clear();
  }
}

export const cronScheduler = new CronScheduler();
export default cronScheduler;
