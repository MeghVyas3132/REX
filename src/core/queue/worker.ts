import { Job } from 'bull';
import { logger } from "../../utils/logger";
import { WorkflowEngine } from '../engine/workflow-engine';
import { JobTypes, WorkflowJobData, AgentJobData, WebhookJobData } from './job-types';
import { prisma } from '../../db/prisma';

export class QueueWorker {
  private workflowEngine: WorkflowEngine;

  constructor() {
    this.workflowEngine = new WorkflowEngine();
  }

  async processWorkflowJob(job: Job<WorkflowJobData>): Promise<any> {
    const { workflowId, input, runId, userId, options } = job.data;
    
    logger.info('Processing workflow job', {
      jobId: job.id,
      workflowId,
      runId,
      userId
    });

    try {
      // Get workflow from database
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId }
      });

      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Create workflow run record
      const workflowRun = await prisma.workflowRun.create({
        data: {
          id: runId || `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          workflowId,
          status: 'running',
          input,
          userId,
          startedAt: new Date()
        }
      });

      // Execute workflow
      const result = await this.workflowEngine.executeWorkflow(
        workflow as any,
        input,
        options
      );

      // Update workflow run
      await prisma.workflowRun.update({
        where: { id: workflowRun.id },
        data: {
          status: result.success ? 'completed' : 'failed',
          output: result.output,
          error: result.error,
          completedAt: new Date(),
          duration: result.duration
        }
      });

      logger.info('Workflow job completed', {
        jobId: job.id,
        workflowId,
        runId: workflowRun.id,
        success: result.success
      });

      return result;

    } catch (error) {
      logger.error('Workflow job failed', error as Error, {
        jobId: job.id,
        workflowId
      });

      // Update workflow run with error
      if (runId) {
        await prisma.workflowRun.update({
          where: { id: runId },
          data: {
            status: 'failed',
            error: (error as Error).message,
            completedAt: new Date()
          }
        });
      }

      throw error;
    }
  }

  async processAgentJob(job: Job<AgentJobData>): Promise<any> {
    const { agentId, input, runId, userId, options } = job.data;
    
    logger.info('Processing agent job', {
      jobId: job.id,
      agentId,
      runId,
      userId
    });

    try {
      // Get agent from database
      const agent = await prisma.agent.findUnique({
        where: { id: agentId }
      });

      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Create agent run record
      const agentRun = await prisma.agentRun.create({
        data: {
          id: runId || `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          agentId,
          status: 'running',
          input,
          userId,
          createdAt: new Date()
        }
      });

      // Execute agent (simplified for now)
      const result = await this.executeAgent(agent as any, input);

      // Update agent run
      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: result.success ? 'completed' : 'failed',
          output: result.output,
          error: result.error,
          updatedAt: new Date()
        }
      });

      logger.info('Agent job completed', {
        jobId: job.id,
        agentId,
        runId: agentRun.id,
        success: result.success
      });

      return result;

    } catch (error) {
      logger.error('Agent job failed', error as Error, {
        jobId: job.id,
        agentId
      });

      // Update agent run with error
      if (runId) {
        await prisma.agentRun.update({
          where: { id: runId },
          data: {
            status: 'failed',
            error: (error as Error).message,
            updatedAt: new Date()
          }
        });
      }

      throw error;
    }
  }

  async processWebhookJob(job: Job<WebhookJobData>): Promise<any> {
    const { webhookId, payload, headers, timestamp } = job.data;
    
    logger.info('Processing webhook job', {
      jobId: job.id,
      webhookId
    });

    try {
      // Get webhook from database
      const webhook = await prisma.webhook.findUnique({
        where: { id: webhookId }
      });

      if (!webhook) {
        throw new Error(`Webhook ${webhookId} not found`);
      }

      // Create webhook event record
      await prisma.webhookEvent.create({
        data: {
          webhookId,
          event: 'webhook.received',
          payload,
          headers,
          processed: false
        }
      });

      // Process webhook (trigger workflow if configured)
      if (webhook.workflowId) {
        // Add workflow execution job
        // This would be handled by the queue system
        logger.info('Webhook triggered workflow', {
          webhookId,
          workflowId: webhook.workflowId
        });
      }

      logger.info('Webhook job completed', {
        jobId: job.id,
        webhookId
      });

      return { success: true };

    } catch (error) {
      logger.error('Webhook job failed', error as Error, {
        jobId: job.id,
        webhookId
      });

      throw error;
    }
  }

  private async executeAgent(agent: any, input: any): Promise<any> {
    // Simplified agent execution
    // In production, this would use the actual agent execution logic
    return {
      success: true,
      output: {
        message: 'Agent execution completed',
        input,
        agent: agent.name
      }
    };
  }

  // Register job processors
  registerProcessors(): void {
    // This would be called by the queue service to register processors
    logger.info('Queue workers registered');
  }
}

export const queueWorker = new QueueWorker();
export default queueWorker;
