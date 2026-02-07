import { Queue, Job, QueueOptions, JobsOptions } from 'bullmq';
import { createClient } from 'redis';
import { logger } from "../../utils/logger";
import { QueueJob, JobTypes } from './job-types';

export class QueueService {
  private queues: Map<string, Queue> = new Map();
  private redis: ReturnType<typeof createClient>;

  constructor() {
    this.redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.redis.on('error', (error) => {
      logger.error('Redis connection error', error);
    });
    
    this.redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });
  }

  async connect(): Promise<void> {
    await this.redis.connect();
  }

  async disconnect(): Promise<void> {
    await this.redis.disconnect();
    
    // Close all queues
    for (const queue of this.queues.values()) {
      await queue.close();
    }
  }

  createQueue(name: string, options?: QueueOptions): Queue {
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    const queue = new Queue(name, {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      },
      ...options
    });

    // Set up queue event listeners (commented out due to BullMQ type issues)
    // queue.on('completed', (job) => {
    //   logger.info('Job completed', {
    //     queueName: name,
    //     jobId: job.id,
    //     jobType: job.data.type,
    //     duration: Date.now() - job.timestamp
    //   });
    // });

    // queue.on('failed', (job, err) => {
    //   logger.error('Job failed', err, {
    //     queueName: name,
    //     jobId: job.id,
    //     jobType: job.data.type,
    //     attempts: job.attemptsMade
    //   });
    // });

    // queue.on('stalled', (job) => {
    //   logger.warn('Job stalled', {
    //     queueName: name,
    //     jobId: job.id,
    //     jobType: job.data.type
    //   });
    // });

    this.queues.set(name, queue);
    return queue;
  }

  getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  async addJob(
    queueName: string,
    jobType: string,
    data: any,
    options?: JobsOptions
  ): Promise<Job> {
    // Get or create the queue if it doesn't exist
    let queue = this.getQueue(queueName);
    if (!queue) {
      logger.info('Queue not found, creating it', { queueName });
      queue = this.createQueue(queueName);
    }

    const job = await queue.add(jobType, data, options);
    
    logger.info('Job added to queue', {
      queueName,
      jobId: job.id,
      jobType,
      data: JSON.stringify(data).substring(0, 100) + '...'
    });

    return job;
  }

  async addWorkflowJob(
    workflowId: string,
    input: any,
    options?: JobsOptions
  ): Promise<Job> {
    return this.addJob(
      'workflows',
      JobTypes.WORKFLOW_EXECUTION,
      {
        workflowId,
        input,
        type: JobTypes.WORKFLOW_EXECUTION
      },
      options
    );
  }

  async addAgentJob(
    agentId: string,
    input: any,
    options?: JobsOptions
  ): Promise<Job> {
    return this.addJob(
      'agents',
      JobTypes.AGENT_EXECUTION,
      {
        agentId,
        input,
        type: JobTypes.AGENT_EXECUTION
      },
      options
    );
  }

  async addWebhookJob(
    webhookId: string,
    payload: any,
    options?: JobsOptions
  ): Promise<Job> {
    return this.addJob(
      'webhooks',
      JobTypes.WEBHOOK_PROCESSING,
      {
        webhookId,
        payload,
        type: JobTypes.WEBHOOK_PROCESSING
      },
      options
    );
  }

  async addScheduledJob(
    workflowId: string,
    cron: string,
    options?: JobsOptions
  ): Promise<Job> {
    return this.addJob(
      'scheduler',
      JobTypes.SCHEDULED_WORKFLOW,
      {
        workflowId,
        cron,
        type: JobTypes.SCHEDULED_WORKFLOW
      },
      options
    );
  }

  async getJob(queueName: string, jobId: string): Promise<Job | null> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      return null;
    }

    return await queue.getJob(jobId);
  }

  async getJobs(
    queueName: string,
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused',
    start = 0,
    end = 10
  ): Promise<Job[]> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      return [];
    }

    return await queue.getJobs([status], start, end);
  }

  async getJobCounts(queueName: string): Promise<any> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      return null;
    }

    return await queue.getJobCounts();
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    logger.info('Queue paused', { queueName });
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    logger.info('Queue resumed', { queueName });
  }

  async cleanQueue(
    queueName: string,
    grace: number = 0,
    status: 'completed' | 'failed' = 'completed'
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.clean(grace, status as any);
    logger.info('Queue cleaned', { queueName, grace, status });
  }

  async removeJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info('Job removed', { queueName, jobId });
    }
  }

  async retryJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (job) {
      await job.retry();
      logger.info('Job retried', { queueName, jobId });
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      logger.error('Queue health check failed', error as Error);
      return false;
    }
  }
}

export const queueService = new QueueService();
export default queueService;
