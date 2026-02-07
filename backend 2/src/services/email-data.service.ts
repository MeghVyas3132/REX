import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/error-handler';

export interface EmailData {
  id: string;
  eventId: string;
  recipient_email?: string;
  recipientEmail?: string;
  recipient_name?: string;
  sender_email?: string;
  senderEmail?: string;
  sender_name?: string;
  subject: string;
  body_html?: string; // legacy
  body_text?: string; // legacy
  bodyHtml?: string;
  bodyText?: string;
  template_id?: string; // legacy
  campaign_id?: string; // legacy
  templateId?: string;
  campaignId?: string;
  attachments?: any[];
  form_inputs?: any; // legacy
  formInputs?: any;
  trigger_source?: string; // legacy
  triggerSource?: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmailDataInput {
  eventId: string;
  recipient_email: string;
  recipient_name?: string;
  sender_email: string;
  sender_name?: string;
  subject: string;
  body_html?: string;
  body_text?: string;
  template_id?: string;
  campaign_id?: string;
  attachments?: any[];
  form_inputs?: any;
  trigger_source?: string;
}

export interface ListEmailDataOptions {
  userId?: string;
  page?: number;
  limit?: number;
  eventId?: string;
}

class EmailDataService {
  /**
   * Get email data by eventId
   */
  async getEmailDataByEventId(eventId: string): Promise<EmailData | null> {
    try {
      const emailData = await prisma.emailData.findFirst({
        where: { eventId }
      });

      return emailData as EmailData | null;
    } catch (error: any) {
      logger.error('Error getting email data by eventId:', error);
      throw error;
    }
  }

  /**
   * Create new email data entry
   */
  async createEmailData(
    data: CreateEmailDataInput,
    userId?: string
  ): Promise<EmailData> {
    try {
      // Validate required fields
      if (!data.eventId || !data.recipient_email || !data.sender_email || !data.subject) {
        throw new ValidationError('Missing required fields: eventId, recipient_email, sender_email, subject');
      }

      const emailData = await prisma.emailData.create({
        data: {
          id: `email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          eventId: data.eventId,
          recipientEmail: data.recipient_email,
          recipientName: data.recipient_name,
          senderEmail: data.sender_email,
          senderName: data.sender_name,
          subject: data.subject,
          bodyHtml: data.body_html,
          bodyText: data.body_text,
          templateId: data.template_id,
          campaignId: data.campaign_id,
          attachments: (data.attachments as any) || [],
          formInputs: (data.form_inputs as any) || {},
          triggerSource: data.trigger_source,
          userId: userId
        } as any
      });

      logger.info('Email data created', {
        emailDataId: emailData.id,
        eventId: emailData.eventId,
        recipient: (emailData as any).recipientEmail || (emailData as any).recipient_email
      });

      return emailData as EmailData;
    } catch (error: any) {
      logger.error('Error creating email data:', error);
      throw error;
    }
  }

  /**
   * Update email data entry
   */
  async updateEmailData(
    id: string,
    data: Partial<CreateEmailDataInput>,
    userId?: string
  ): Promise<EmailData | null> {
    try {
      // Check if email data exists and user has permission
      const existing = await prisma.emailData.findUnique({
        where: { id }
      });

      if (!existing) {
        return null;
      }

      // Check ownership if userId is provided
      if (userId && existing.userId && existing.userId !== userId) {
        throw new ValidationError('Unauthorized: You do not have permission to update this email data');
      }

      const emailData = await prisma.emailData.update({
        where: { id },
        data: {
          // Map legacy snake_case fields to camelCase expected by Prisma
          recipientEmail: (data as any).recipient_email,
          recipientName: (data as any).recipient_name,
          senderEmail: (data as any).sender_email,
          senderName: (data as any).sender_name,
          bodyHtml: (data as any).body_html,
          bodyText: (data as any).body_text,
          templateId: (data as any).template_id,
          campaignId: (data as any).campaign_id,
          attachments: (data as any).attachments,
          formInputs: (data as any).form_inputs,
          triggerSource: (data as any).trigger_source,
          subject: data.subject,
          updatedAt: new Date()
        } as any
      });

      logger.info('Email data updated', { emailDataId: id });
      return emailData as EmailData;
    } catch (error: any) {
      logger.error('Error updating email data:', error);
      throw error;
    }
  }

  /**
   * List email data entries with pagination
   */
  async listEmailData(options: ListEmailDataOptions): Promise<{
    data: EmailData[];
    total: number;
  }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (options.userId) {
        where.userId = options.userId;
      }
      if (options.eventId) {
        where.eventId = options.eventId;
      }

      const [data, total] = await Promise.all([
        prisma.emailData.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.emailData.count({ where })
      ]);

      return {
        data: data as EmailData[],
        total
      };
    } catch (error: any) {
      logger.error('Error listing email data:', error);
      throw error;
    }
  }

  /**
   * Delete email data entry
   */
  async deleteEmailData(id: string, userId?: string): Promise<boolean> {
    try {
      // Check if email data exists and user has permission
      const existing = await prisma.emailData.findUnique({
        where: { id }
      });

      if (!existing) {
        return false;
      }

      // Check ownership if userId is provided
      if (userId && existing.userId && existing.userId !== userId) {
        throw new ValidationError('Unauthorized: You do not have permission to delete this email data');
      }

      await prisma.emailData.delete({
        where: { id }
      });

      logger.info('Email data deleted', { emailDataId: id });
      return true;
    } catch (error: any) {
      logger.error('Error deleting email data:', error);
      throw error;
    }
  }
}

export const emailDataService = new EmailDataService();

