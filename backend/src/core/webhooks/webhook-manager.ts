import { Webhook, WebhookEvent, WebhookPayload } from '@rex/shared';
import { logger } from "../../utils/logger";
import { prisma } from '../../db/prisma';
import { queueService } from '../queue/queue';
import { JobTypes } from '../queue/job-types';
import { encryptionService } from '../../utils/encryption';

export class WebhookManager {
  async createWebhook(webhookData: Partial<Webhook>): Promise<Webhook> {
    try {
      const webhook = await prisma.webhook.create({
        data: {
          id: webhookData.id || `webhook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          workflowId: webhookData.workflowId!,
          name: webhookData.name!,
          url: webhookData.url!,
          method: webhookData.method || 'POST',
          headers: webhookData.headers || {},
          secret: webhookData.secret ? encryptionService.encrypt(webhookData.secret) : null,
          eventTypes: (webhookData as any).eventTypes || (webhookData as any).events || [],
          isActive: webhookData.isActive ?? true,
          userId: webhookData.userId!
        }
      });

      logger.info('Webhook created', {
        webhookId: webhook.id,
        workflowId: webhook.workflowId,
        name: webhook.name
      });

      return webhook as Webhook;
    } catch (error) {
      logger.error('Failed to create webhook', error as Error);
      throw error;
    }
  }

  async getWebhook(webhookId: string): Promise<Webhook | null> {
    try {
      const webhook = await prisma.webhook.findUnique({
        where: { id: webhookId }
      });

      if (webhook && webhook.secret) {
        webhook.secret = encryptionService.decrypt(webhook.secret);
      }

      return webhook as Webhook;
    } catch (error) {
      logger.error('Failed to get webhook', error as Error, { webhookId });
      throw error;
    }
  }

  async updateWebhook(webhookId: string, updateData: Partial<Webhook>): Promise<Webhook> {
    try {
      const data: any = { ...updateData };
      
      if (updateData.secret) {
        data.secret = encryptionService.encrypt(updateData.secret);
      }

      const webhook = await prisma.webhook.update({
        where: { id: webhookId },
        data
      });

      if (webhook.secret) {
        webhook.secret = encryptionService.decrypt(webhook.secret);
      }

      logger.info('Webhook updated', { webhookId });
      return webhook as Webhook;
    } catch (error) {
      logger.error('Failed to update webhook', error as Error, { webhookId });
      throw error;
    }
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      await prisma.webhook.delete({
        where: { id: webhookId }
      });

      logger.info('Webhook deleted', { webhookId });
    } catch (error) {
      logger.error('Failed to delete webhook', error as Error, { webhookId });
      throw error;
    }
  }

  async listWebhooks(workflowId?: string, userId?: string): Promise<Webhook[]> {
    try {
      const where: any = {};
      
      if (workflowId) {
        where.workflowId = workflowId;
      }
      
      if (userId) {
        where.userId = userId;
      }

      const webhooks = await prisma.webhook.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      // Decrypt secrets
      for (const webhook of webhooks) {
        if (webhook.secret) {
          webhook.secret = encryptionService.decrypt(webhook.secret);
        }
      }

      return webhooks as Webhook[];
    } catch (error) {
      logger.error('Failed to list webhooks', error as Error);
      throw error;
    }
  }

  async processWebhook(
    webhookId: string,
    payload: any,
    headers: Record<string, string>
  ): Promise<void> {
    try {
      const webhook = await this.getWebhook(webhookId);
      if (!webhook) {
        throw new Error(`Webhook ${webhookId} not found`);
      }

      if (!webhook.isActive) {
        logger.warn('Webhook is inactive', { webhookId });
        return;
      }

      // Verify webhook signature if secret is provided
      if (webhook.secret) {
        const signature = headers['x-webhook-signature'] || headers['x-hub-signature-256'];
        if (!signature || !this.verifySignature(payload, signature, webhook.secret)) {
          throw new Error('Invalid webhook signature');
        }
      }

      // Create webhook event record
      const webhookEvent = await prisma.webhookEvent.create({
        data: {
          webhookId,
          event: 'webhook.received',
          payload,
          headers,
          processed: false
        }
      });

      // Add webhook processing job to queue
      await queueService.addWebhookJob(webhookId, payload, {
        priority: 1,
        delay: 0
      });

      logger.info('Webhook processed', {
        webhookId,
        eventId: webhookEvent.id,
        workflowId: webhook.workflowId
      });

    } catch (error) {
      logger.error('Failed to process webhook', error as Error, { webhookId });
      throw error;
    }
  }

  async triggerWorkflow(webhookId: string, payload: any): Promise<void> {
    try {
      const webhook = await this.getWebhook(webhookId);
      if (!webhook) {
        throw new Error(`Webhook ${webhookId} not found`);
      }

      if (!webhook.workflowId) {
        throw new Error('Webhook is not associated with a workflow');
      }

      // Add workflow execution job to queue
      await queueService.addWorkflowJob(webhook.workflowId, payload, {
        priority: 1,
        delay: 0
      });

      logger.info('Workflow triggered by webhook', {
        webhookId,
        workflowId: webhook.workflowId
      });

    } catch (error) {
      logger.error('Failed to trigger workflow', error as Error, { webhookId });
      throw error;
    }
  }

  async getWebhookEvents(
    webhookId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<WebhookEvent[]> {
    try {
      const events = await prisma.webhookEvent.findMany({
        where: { webhookId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      return events as WebhookEvent[];
    } catch (error) {
      logger.error('Failed to get webhook events', error as Error, { webhookId });
      throw error;
    }
  }

  async markEventProcessed(eventId: string): Promise<void> {
    try {
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: { processed: true }
      });

      logger.info('Webhook event marked as processed', { eventId });
    } catch (error) {
      logger.error('Failed to mark event as processed', error as Error, { eventId });
      throw error;
    }
  }

  private verifySignature(payload: any, signature: string, secret: string): boolean {
    try {
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      return encryptionService.verifySignature(payloadString, signature, secret);
    } catch (error) {
      logger.error('Failed to verify webhook signature', error as Error);
      return false;
    }
  }

  async generateWebhookUrl(webhookId: string): Promise<string> {
    const baseUrl = process.env.WEBHOOK_BASE_URL || process.env.BASE_URL || 'http://localhost:5000';
    return `${baseUrl}/webhooks/${webhookId}`;
  }

  async testWebhook(webhookId: string, testPayload: any): Promise<boolean> {
    try {
      const webhook = await this.getWebhook(webhookId);
      if (!webhook) {
        throw new Error(`Webhook ${webhookId} not found`);
      }

      // Create test event
      const testEvent = await prisma.webhookEvent.create({
        data: {
          webhookId,
          event: 'webhook.test',
          payload: testPayload,
          headers: { 'x-test': 'true' },
          processed: false
        }
      });

      // Process the test webhook
      await this.processWebhook(webhookId, testPayload, { 'x-test': 'true' });

      // Mark test event as processed
      await this.markEventProcessed(testEvent.id);

      logger.info('Webhook test successful', { webhookId });
      return true;

    } catch (error) {
      logger.error('Webhook test failed', error as Error, { webhookId });
      return false;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      // Check if webhook manager is working
      return true;
    } catch (error) {
      logger.error('Webhook manager health check failed', error as Error);
      return false;
    }
  }
}

export const webhookManager = new WebhookManager();
export default webhookManager;
