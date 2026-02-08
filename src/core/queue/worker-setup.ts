import { Worker } from 'bullmq';
import { config } from '../../config';
import { logger } from "../../utils/logger";
import { queueWorker } from './worker';
import { JobTypes } from './job-types';

export class WorkerSetup {
  private workers: Map<string, Worker> = new Map();

  async startWorkers(): Promise<void> {
    logger.info('Starting queue workers...');

    // Start workflow worker
    await this.startWorkflowWorker();
    
    // Start agent worker
    await this.startAgentWorker();
    
    // Start webhook worker
    await this.startWebhookWorker();
    
    // Start scheduler worker
    await this.startSchedulerWorker();

    logger.info('All queue workers started');
  }

  private async startWorkflowWorker(): Promise<void> {
    const worker = new Worker(
      'workflows',
      async (job) => {
        logger.info('Processing workflow job', {
          jobId: job.id,
          jobType: job.name,
          data: job.data
        });

        try {
          const result = await queueWorker.processWorkflowJob(job as any);
          logger.info('Workflow job completed successfully', {
            jobId: job.id,
            result: result.success
          });
          return result;
        } catch (error: any) {
          logger.error('Workflow job failed', error, {
            jobId: job.id,
            workflowId: job.data.workflowId
          });
          throw error;
        }
      },
      {
        connection: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password
        },
        concurrency: config.workflow.maxConcurrent,
        limiter: {
          max: 10,
          duration: 1000
        }
      }
    );

    worker.on('completed', (job) => {
      logger.info('Workflow job completed', {
        jobId: job.id,
        duration: Date.now() - job.timestamp
      });
    });

    worker.on('failed', (job, err) => {
      logger.error('Workflow job failed', err, {
        jobId: job.id,
        attempts: job.attemptsMade
      });
    });

    worker.on('error', (err) => {
      logger.error('Workflow worker error', err);
    });

    this.workers.set('workflows', worker);
    logger.info('Workflow worker started');
  }

  private async startAgentWorker(): Promise<void> {
    const worker = new Worker(
      'agents',
      async (job) => {
        logger.info('Processing agent job', {
          jobId: job.id,
          jobType: job.name,
          data: job.data
        });

        try {
          const result = await queueWorker.processAgentJob(job as any);
          logger.info('Agent job completed successfully', {
            jobId: job.id,
            result: result.success
          });
          return result;
        } catch (error: any) {
          logger.error('Agent job failed', error, {
            jobId: job.id,
            agentId: job.data.agentId
          });
          throw error;
        }
      },
      {
        connection: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password
        },
        concurrency: 5,
        limiter: {
          max: 5,
          duration: 1000
        }
      }
    );

    worker.on('completed', (job) => {
      logger.info('Agent job completed', {
        jobId: job.id,
        duration: Date.now() - job.timestamp
      });
    });

    worker.on('failed', (job, err) => {
      logger.error('Agent job failed', err, {
        jobId: job.id,
        attempts: job.attemptsMade
      });
    });

    worker.on('error', (err) => {
      logger.error('Agent worker error', err);
    });

    this.workers.set('agents', worker);
    logger.info('Agent worker started');
  }

  private async startWebhookWorker(): Promise<void> {
    const worker = new Worker(
      'webhooks',
      async (job) => {
        logger.info('Processing webhook job', {
          jobId: job.id,
          jobType: job.name,
          data: job.data
        });

        try {
          const result = await queueWorker.processWebhookJob(job as any);
          logger.info('Webhook job completed successfully', {
            jobId: job.id,
            result: result.success
          });
          return result;
        } catch (error: any) {
          logger.error('Webhook job failed', error, {
            jobId: job.id,
            webhookId: job.data.webhookId
          });
          throw error;
        }
      },
      {
        connection: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password
        },
        concurrency: 10,
        limiter: {
          max: 20,
          duration: 1000
        }
      }
    );

    worker.on('completed', (job) => {
      logger.info('Webhook job completed', {
        jobId: job.id,
        duration: Date.now() - job.timestamp
      });
    });

    worker.on('failed', (job, err) => {
      logger.error('Webhook job failed', err, {
        jobId: job.id,
        attempts: job.attemptsMade
      });
    });

    worker.on('error', (err) => {
      logger.error('Webhook worker error', err);
    });

    this.workers.set('webhooks', worker);
    logger.info('Webhook worker started');
  }

  private async startSchedulerWorker(): Promise<void> {
    const worker = new Worker(
      'scheduler',
      async (job) => {
        logger.info('Processing scheduled job', {
          jobId: job.id,
          jobType: job.name,
          data: job.data
        });

        try {
          // Handle scheduled workflow execution
          const result = await queueWorker.processWorkflowJob(job as any);
          logger.info('Scheduled job completed successfully', {
            jobId: job.id,
            result: result.success
          });
          return result;
        } catch (error: any) {
          logger.error('Scheduled job failed', error, {
            jobId: job.id,
            workflowId: job.data.workflowId
          });
          throw error;
        }
      },
      {
        connection: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password
        },
        concurrency: 3,
        limiter: {
          max: 5,
          duration: 1000
        }
      }
    );

    worker.on('completed', (job) => {
      logger.info('Scheduled job completed', {
        jobId: job.id,
        duration: Date.now() - job.timestamp
      });
    });

    worker.on('failed', (job, err) => {
      logger.error('Scheduled job failed', err, {
        jobId: job.id,
        attempts: job.attemptsMade
      });
    });

    worker.on('error', (err) => {
      logger.error('Scheduler worker error', err);
    });

    this.workers.set('scheduler', worker);
    logger.info('Scheduler worker started');
  }

  async stopWorkers(): Promise<void> {
    logger.info('Stopping queue workers...');

    for (const [name, worker] of this.workers) {
      await worker.close();
      logger.info(`Worker ${name} stopped`);
    }

    this.workers.clear();
    logger.info('All queue workers stopped');
  }

  getWorker(name: string): Worker | undefined {
    return this.workers.get(name);
  }

  getWorkerStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [name, worker] of this.workers) {
      status[name] = {
        isRunning: worker.isRunning(),
        concurrency: worker.concurrency,
        name: worker.name
      };
    }

    return status;
  }
}

export const workerSetup = new WorkerSetup();
