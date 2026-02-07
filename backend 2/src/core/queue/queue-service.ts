import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { getRedis } from '../../db/redis';
import { WorkflowEngine } from '../engine/workflow-engine';
import { db } from '../../db/database';
const logger = require('../../utils/logger');

export interface JobData {
  type: string;
  workflowId?: string;
  workflowData?: any;
  executionId?: string;
  input?: any;
  userId?: string;
  priority?: number;
  delay?: number;
  retries?: number;
}

export class QueueService {
  private redis: Redis;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private workflowEngine: WorkflowEngine;

  constructor() {
    this.redis = getRedis();
    this.workflowEngine = new WorkflowEngine();
  }

  // Initialize queues
  async initializeQueues() {
    const queueConfigs = [
      { name: 'workflow', priority: 1 },
      { name: 'agent', priority: 2 },
      { name: 'webhook', priority: 3 },
      { name: 'scheduler', priority: 4 },
      { name: 'email', priority: 5 },
      { name: 'notification', priority: 6 }
    ];

    for (const config of queueConfigs) {
      await this.createQueue(config.name, config.priority);
    }

    logger.info('Queue service initialized with 6 queues');
  }

  // Create a new queue
  async createQueue(name: string, priority: number = 1): Promise<Queue> {
    const queue = new Queue(name, {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.queues.set(name, queue);
    logger.info(`Created queue: ${name} with priority ${priority}`);
    return queue;
  }

  // Add job to queue
  async addJob(queueName: string, jobData: JobData, options?: any): Promise<Job> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.add(jobData.type, jobData, {
      priority: jobData.priority || 1,
      delay: jobData.delay || 0,
      attempts: jobData.retries || 3,
      ...options
    });

    logger.info(`Added job ${job.id} to queue ${queueName}`);
    return job;
  }

  // Process workflow jobs
  async processWorkflowJob(job: Job<JobData>) {
    let executionId: string | undefined;
    
    try {
      logger.info(`Processing workflow job ${job.id}`);
      
      // DEBUG: Log the entire job data
      logger.info(`Job data:`, JSON.stringify(job.data, null, 2));
      
      const { workflowId, input, userId } = job.data;
      
      // Get workflow from job data first, then fallback to database
      let workflow = job.data.workflowData;
      if (!workflow) {
        if (!workflowId) {
          throw new Error('Either workflowId or workflow data is required');
        }
        // If no workflow data in job, try to get from database
        logger.warn(`No workflow data in job, fetching from database`);
        workflow = await db.getWorkflowById(workflowId);
        
        if (!workflow) {
          throw new Error(`Workflow ${workflowId} not found and no workflow data provided in job`);
        }
      } else {
        logger.info(`Using workflow data from job:`, JSON.stringify(workflow, null, 2));
      }

      // Create execution record if not provided
      executionId = job.data.executionId;
      if (!executionId) {
        // Ensure we have a valid workflow
        if (!workflow || !workflow.id) {
          throw new Error('Workflow ID is required to create execution record');
        }
        
        // Get userId from job data, workflow (check both userId and user_id fields), or input
        // Database may return user_id (snake_case) or userId (camelCase) depending on how it's stored
        const userId = job.data.userId || workflow?.userId || workflow?.user_id || input?.userId || null;
        
        // Log userId for debugging
        if (!userId || userId === 'default-user') {
          logger.warn(`Workflow ${workflow.id} has no userId or using default-user. Gmail OAuth may fail.`, {
            workflowId: workflow.id,
            workflowUserId: workflow?.userId,
            workflowUserIdSnake: workflow?.user_id,
            jobUserId: job.data.userId,
            inputUserId: input?.userId
          });
        }
        
        // Try to create execution record - the database method will handle UUID conversion
        // If the workflow has a custom ID, it will look it up to get the database UUID
        try {
          const execution = await db.createWorkflowExecution(workflow.id, input, userId);
          executionId = execution.id;
          logger.info(`Created workflow execution record: ${executionId} for workflow: ${workflow.id}`);
        } catch (error: any) {
          // If creating execution record fails due to UUID issues, log it but continue
          // The workflow execution can still proceed without the database record
          logger.warn(`Failed to create workflow execution record: ${error.message}. Continuing without database record.`);
          // Generate a temporary execution ID for tracking (must start with "temp_")
          const { v4: uuidv4 } = require('uuid');
          executionId = `temp_${uuidv4()}`;
        }
      }

      // Update execution status (only if executionId is not a temp ID)
      if (executionId && !executionId.startsWith('temp_')) {
        try {
      await db.updateWorkflowExecution(executionId, 'running');
        } catch (error: any) {
          logger.warn(`Failed to update workflow execution status: ${error.message}. Continuing execution.`);
        }
      }

      // Execute workflow
      const result = await this.workflowEngine.executeWorkflow(
        workflow,
        input || {},
        { userId, executionId }
      );

      // Update execution with result (only if executionId is not a temp ID)
      if (executionId && !executionId.startsWith('temp_')) {
        try {
      await db.updateWorkflowExecution(executionId, 'completed', result);
        } catch (error: any) {
          logger.warn(`Failed to update workflow execution result: ${error.message}. Execution completed successfully.`);
        }
      }

      logger.info(`Workflow job ${job.id} completed successfully`);
      return result;

    } catch (error) {
      logger.error(`Workflow job ${job.id} failed:`, error);
      
      // Update execution status (only if executionId is not a temp ID)
      if (executionId && !executionId.startsWith('temp_')) {
        try {
        await db.updateWorkflowExecution(executionId, 'failed', { error: (error as Error).message });
        } catch (updateError: any) {
          logger.warn(`Failed to update workflow execution status to failed: ${updateError.message}`);
        }
      }
      
      throw error;
    }
  }

  // Process agent jobs
  async processAgentJob(job: Job<JobData>) {
    try {
      logger.info(`Processing agent job ${job.id}`);
      
      const { type, input } = job.data;
      
      // Handle different agent job types
      switch (type) {
        case 'memory_cleanup':
          await this.cleanupAgentMemory();
          break;
        case 'state_sync':
          await this.syncAgentStates();
          break;
        case 'goal_evaluation':
          await this.evaluateAgentGoals(input);
          break;
        default:
          logger.warn(`Unknown agent job type: ${type}`);
      }

      logger.info(`Agent job ${job.id} completed successfully`);
      return { success: true };

    } catch (error) {
      logger.error(`Agent job ${job.id} failed:`, error);
      throw error;
    }
  }

  // Process webhook jobs
  async processWebhookJob(job: Job<JobData>) {
    try {
      logger.info(`Processing webhook job ${job.id}`);
      
      const { type, input } = job.data;
      
      // Handle webhook processing
      switch (type) {
        case 'deliver':
          await this.deliverWebhook(input);
          break;
        case 'retry':
          await this.retryWebhook(input);
          break;
        default:
          logger.warn(`Unknown webhook job type: ${type}`);
      }

      logger.info(`Webhook job ${job.id} completed successfully`);
      return { success: true };

    } catch (error) {
      logger.error(`Webhook job ${job.id} failed:`, error);
      throw error;
    }
  }

  // Process scheduler jobs
  async processSchedulerJob(job: Job<JobData>) {
    try {
      logger.info(`Processing scheduler job ${job.id}`);
      
      const { type, input } = job.data;
      
      // Handle scheduled tasks
      switch (type) {
        case 'workflow_trigger':
          await this.triggerScheduledWorkflow(input);
          break;
        case 'cleanup':
          await this.cleanupScheduledTasks();
          break;
        default:
          logger.warn(`Unknown scheduler job type: ${type}`);
      }

      logger.info(`Scheduler job ${job.id} completed successfully`);
      return { success: true };

    } catch (error) {
      logger.error(`Scheduler job ${job.id} failed:`, error);
      throw error;
    }
  }

  // Process email jobs
  async processEmailJob(job: Job<JobData>) {
    try {
      logger.info(`Processing email job ${job.id}`);
      
      const { type, input } = job.data;
      
      // Handle email operations
      switch (type) {
        case 'send':
          await this.sendEmail(input);
          break;
        case 'template':
          await this.processEmailTemplate(input);
          break;
        default:
          logger.warn(`Unknown email job type: ${type}`);
      }

      logger.info(`Email job ${job.id} completed successfully`);
      return { success: true };

    } catch (error) {
      logger.error(`Email job ${job.id} failed:`, error);
      throw error;
    }
  }

  // Process notification jobs
  async processNotificationJob(job: Job<JobData>) {
    try {
      logger.info(`Processing notification job ${job.id}`);
      
      const { type, input } = job.data;
      
      // Handle notifications
      switch (type) {
        case 'push':
          await this.sendPushNotification(input);
          break;
        case 'slack':
          await this.sendSlackNotification(input);
          break;
        case 'discord':
          await this.sendDiscordNotification(input);
          break;
        default:
          logger.warn(`Unknown notification job type: ${type}`);
      }

      logger.info(`Notification job ${job.id} completed successfully`);
      return { success: true };

    } catch (error) {
      logger.error(`Notification job ${job.id} failed:`, error);
      throw error;
    }
  }

  // Start workers
  async startWorkers() {
    const workerConfigs = [
      { queue: 'workflows', processor: this.processWorkflowJob.bind(this), concurrency: 5 },
      { queue: 'agent', processor: this.processAgentJob.bind(this), concurrency: 3 },
      { queue: 'webhook', processor: this.processWebhookJob.bind(this), concurrency: 10 },
      { queue: 'scheduler', processor: this.processSchedulerJob.bind(this), concurrency: 2 },
      { queue: 'email', processor: this.processEmailJob.bind(this), concurrency: 5 },
      { queue: 'notification', processor: this.processNotificationJob.bind(this), concurrency: 5 }
    ];

    for (const config of workerConfigs) {
      const worker = new Worker(config.queue, config.processor, {
        connection: this.redis,
        concurrency: config.concurrency,
      });

      worker.on('completed', (job) => {
        logger.info(`Job ${job.id} completed in queue ${config.queue}`);
      });

      worker.on('failed', (job, err) => {
        logger.error(`Job ${job?.id} failed in queue ${config.queue}:`, err);
      });

      this.workers.set(config.queue, worker);
    }

    logger.info('Started workers for all queues');
  }

  // Helper methods for job processing
  private async cleanupAgentMemory() {
    // Implementation for memory cleanup
    logger.info('Cleaning up agent memory');
  }

  private async syncAgentStates() {
    // Implementation for state synchronization
    logger.info('Syncing agent states');
  }

  private async evaluateAgentGoals(input: any) {
    // Implementation for goal evaluation
    logger.info('Evaluating agent goals');
  }

  private async deliverWebhook(input: any) {
    // Implementation for webhook delivery
    logger.info('Delivering webhook');
  }

  private async retryWebhook(input: any) {
    // Implementation for webhook retry
    logger.info('Retrying webhook');
  }

  private async triggerScheduledWorkflow(input: any) {
    // Implementation for scheduled workflow trigger
    logger.info('Triggering scheduled workflow');
  }

  private async cleanupScheduledTasks() {
    // Implementation for cleanup
    logger.info('Cleaning up scheduled tasks');
  }

  private async sendEmail(input: any) {
    // Implementation for email sending
    logger.info('Sending email');
  }

  private async processEmailTemplate(input: any) {
    // Implementation for email template processing
    logger.info('Processing email template');
  }

  private async sendPushNotification(input: any) {
    // Implementation for push notifications
    logger.info('Sending push notification');
  }

  private async sendSlackNotification(input: any) {
    // Implementation for Slack notifications
    logger.info('Sending Slack notification');
  }

  private async sendDiscordNotification(input: any) {
    // Implementation for Discord notifications
    logger.info('Sending Discord notification');
  }

  // Get queue statistics
  async getQueueStats() {
    const stats: any = {};
    
    for (const [name, queue] of this.queues) {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();
      
      stats[name] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length
      };
    }
    
    return stats;
  }

  // Pause/Resume queue
  async pauseQueue(queueName: string) {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.pause();
      logger.info(`Paused queue: ${queueName}`);
    }
  }

  async resumeQueue(queueName: string) {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.resume();
      logger.info(`Resumed queue: ${queueName}`);
    }
  }

  // Cleanup
  async close() {
    // Close all workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      logger.info(`Closed worker for queue: ${name}`);
    }

    // Close all queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.info(`Closed queue: ${name}`);
    }

    logger.info('Queue service closed');
  }
}

export const queueService = new QueueService();
