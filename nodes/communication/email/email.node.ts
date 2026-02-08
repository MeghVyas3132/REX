import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;

export class EmailNode {
  getNodeDefinition() {
    return {
      id: 'send-email',
      type: 'action',
      name: 'Send Email',
      description: 'Send emails via SMTP, SendGrid, Mailgun, or AWS SES',
      category: 'communication',
      version: '1.0.0',
      author: 'Workflow Studio',
      
      parameters: [
        {
          name: 'service',
          type: 'options',
          displayName: 'Email Service',
          description: 'Email service provider',
          required: true,
          default: 'smtp',
          options: [
            { name: 'Gmail (OAuth)', value: 'gmail' },
            { name: 'SMTP', value: 'smtp' },
            { name: 'SendGrid', value: 'sendgrid' },
            { name: 'Mailgun', value: 'mailgun' },
            { name: 'AWS SES', value: 'ses' },
            { name: 'Resend', value: 'resend' }
          ]
        },
        {
          name: 'fromEmail',
          type: 'string',
          displayName: 'From Email',
          description: 'Sender email address',
          required: true,
          placeholder: 'sender@example.com'
        },
        {
          name: 'toEmail',
          type: 'string',
          displayName: 'To Email',
          description: 'Recipient email address',
          required: true,
          placeholder: 'recipient@example.com'
        },
        {
          name: 'subject',
          type: 'string',
          displayName: 'Subject',
          description: 'Email subject line',
          required: true,
          placeholder: 'Workflow Notification'
        },
        {
          name: 'emailFormat',
          type: 'options',
          displayName: 'Email Format',
          description: 'Email content format',
          required: true,
          default: 'text',
          options: [
            { name: 'Plain Text', value: 'text' },
            { name: 'HTML', value: 'html' },
            { name: 'Both', value: 'both' }
          ]
        },
        {
          name: 'textContent',
          type: 'string',
          displayName: 'Text Content',
          description: 'Plain text email content',
          required: false,
          placeholder: 'Hello, this is a workflow notification.'
        },
        {
          name: 'htmlContent',
          type: 'string',
          displayName: 'HTML Content',
          description: 'HTML email content',
          required: false,
          placeholder: '<h1>Hello</h1><p>This is a workflow notification.</p>'
        },
        {
          name: 'apiKey',
          type: 'string',
          displayName: 'API Key',
          description: 'Service API key (for SendGrid, Mailgun, etc.)',
          required: false,
          placeholder: 'API Key',
          credentialType: 'email_api_key'
        },
        {
          name: 'smtpHost',
          type: 'string',
          displayName: 'SMTP Host',
          description: 'SMTP server hostname',
          required: false,
          placeholder: 'smtp.gmail.com'
        },
        {
          name: 'smtpPort',
          type: 'number',
          displayName: 'SMTP Port',
          description: 'SMTP server port',
          required: false,
          default: 587,
          min: 1,
          max: 65535
        },
        {
          name: 'smtpUsername',
          type: 'string',
          displayName: 'SMTP Username',
          description: 'SMTP username',
          required: false,
          placeholder: 'username'
        },
        {
          name: 'smtpPassword',
          type: 'string',
          displayName: 'SMTP Password',
          description: 'SMTP password',
          required: false,
          placeholder: 'password',
          credentialType: 'smtp_password'
        },
        {
          name: 'attachments',
          type: 'string',
          displayName: 'Attachments (JSON)',
          description: 'Email attachments in JSON format',
          required: false,
          placeholder: '[{"filename":"report.pdf","content":"base64content","type":"application/pdf"}]'
        }
      ],

      inputs: [
        {
          name: 'toEmail',
          type: 'string',
          description: 'Recipient email from previous node',
          required: false
        },
        {
          name: 'subject',
          type: 'string',
          description: 'Subject from previous node',
          required: false
        },
        {
          name: 'content',
          type: 'string',
          description: 'Email content from previous node',
          required: false
        },
        {
          name: 'attachments',
          type: 'array',
          description: 'Attachments from previous node',
          required: false
        }
      ],

      outputs: [
        {
          name: 'messageId',
          type: 'string',
          description: 'Email message ID'
        },
        {
          name: 'status',
          type: 'string',
          description: 'Email send status'
        },
        {
          name: 'service',
          type: 'string',
          description: 'Email service used'
        }
      ]
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.config || node.data?.config || {};
      
      // Map frontend authType to backend service
      // Frontend uses authType: 'gmail', backend expects service: 'gmail'
      let service = config.service;
      if (!service && config.authType) {
        service = config.authType; // Map authType to service
        // Handle special case: frontend might use 'gmail' but backend needs 'gmail' (already correct)
      }
      service = service || 'smtp'; // Default to smtp if not specified
      
      // Log config for debugging
      logger.info('Email node config received', {
        nodeId: node.id,
        hasConfig: !!config,
        configKeys: Object.keys(config),
        configFromEmail: config.fromEmail,
        configToEmail: config.toEmail,
        configSubject: config.subject,
        configService: config.service,
        configAuthType: config.authType,
        finalService: service,
        // Also check alternative field names
        configFrom: config.from,
        configTo: config.to,
        hasDataConfig: !!node.data?.config,
        dataConfigKeys: node.data?.config ? Object.keys(node.data.config) : []
      });
      
      const emailData = {
        from: context.input?.fromEmail || config.fromEmail || config.from,
        to: context.input?.toEmail || config.toEmail || config.to,
        subject: context.input?.subject || config.subject,
        text: context.input?.content || config.textContent || config.text,
        html: context.input?.htmlContent || config.htmlContent || config.html,
        attachments: context.input?.attachments || this.parseAttachments(config.attachments)
      };

      logger.info('Email node data extracted', {
        nodeId: node.id,
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        hasText: !!emailData.text,
        hasHtml: !!emailData.html
      });

      if (!emailData.from || !emailData.to || !emailData.subject) {
        logger.error('Email node validation failed', {
          nodeId: node.id,
          missingFields: {
            from: !emailData.from,
            to: !emailData.to,
            subject: !emailData.subject
          },
          configKeys: Object.keys(config),
          config
        });
        throw new Error('to, from, and subject are required');
      }

      let result: any = {};

      switch (service) {
        case 'gmail':
          result = await this.sendViaGmailOAuth(config, emailData, context);
          break;
        case 'smtp':
          result = await this.sendViaSMTP(config, emailData);
          break;
        case 'sendgrid':
          result = await this.sendViaSendGrid(config.apiKey, emailData);
          break;
        case 'mailgun':
          result = await this.sendViaMailgun(config.apiKey, emailData);
          break;
        case 'ses':
          result = await this.sendViaSES(config.apiKey, emailData);
          break;
        case 'resend':
          result = await this.sendViaResend(config.apiKey, emailData);
          break;
        default:
          throw new Error(`Unsupported email service: ${service}`);
      }

      const duration = Date.now() - startTime;
      
      logger.info('Email node executed successfully', {
        service,
        to: emailData.to,
        subject: emailData.subject,
        duration
      });

      return {
        success: true,
        output: {
          ...context.input,  // Preserve input data
          messageId: result.messageId,
          status: result.status || 'sent',
          service,
          to: emailData.to,
          subject: emailData.subject,
          timestamp: new Date().toISOString(),
          duration
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Email node execution failed', {
        error: error.message,
        service: node.config.service,
        duration
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  private parseAttachments(attachmentsStr?: string): any[] {
    if (!attachmentsStr) return [];
    
    try {
      return JSON.parse(attachmentsStr);
    } catch (e) {
      logger.warn('Invalid attachments JSON, ignoring', { attachmentsStr });
      return [];
    }
  }

  private async sendViaGmailOAuth(config: any, emailData: any, context: ExecutionContext) {
    const nodemailer = require('nodemailer');
    
    // Get OAuth tokens using the same service as Google Drive
    let accessToken = config.accessToken;
    let refreshToken = config.refreshToken;
    
    if (!accessToken) {
      try {
        const { oauthService } = await import('../../services/oauth.service');
        
        if (!oauthService) {
          throw new Error('OAuth service not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
        }
        
        // Use context.userId (same as Google Drive node)
        const userId = (context as any).userId;
        
        if (!userId) {
          throw new Error('User ID is required for Gmail OAuth. Please ensure you are logged in and the workflow is executed with authentication.');
        }
        
        logger.info('Getting Gmail OAuth token', {
          nodeId: (context as any).nodeId,
          userId: userId
        });
        
        // Get valid access token (will refresh if needed)
        accessToken = await oauthService.getValidAccessToken(userId, 'google');
        
        // Also get refresh token for nodemailer (for automatic token refresh)
        try {
          const storedTokens = await oauthService.getStoredTokens(userId, 'google');
          if (storedTokens && storedTokens.refreshToken) {
            refreshToken = storedTokens.refreshToken;
          }
        } catch (refreshTokenError: any) {
          logger.warn('Could not get refresh token for nodemailer', {
            error: refreshTokenError?.message,
            nodeId: (context as any).nodeId
          });
          // Continue without refresh token - nodemailer will use access token only
        }
      } catch (oauthError: any) {
        const errorMessage = oauthError?.message || oauthError?.toString() || String(oauthError);
        logger.error('Gmail OAuth token retrieval failed', {
          error: errorMessage,
          nodeId: (context as any).nodeId
        });
        throw new Error(`Gmail OAuth access token is required. Please connect your Google account via OAuth first. Error: ${errorMessage}`);
      }
    }

    // Create nodemailer transporter with Gmail OAuth
    // If refresh token is available, nodemailer can auto-refresh tokens
    const authConfig: any = {
      type: 'OAuth2',
      user: config.fromEmail || emailData.from,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      accessToken: accessToken
    };
    
    if (refreshToken) {
      authConfig.refreshToken = refreshToken;
      authConfig.accessUrl = 'https://oauth2.googleapis.com/token';
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: authConfig
    });

    const mailOptions = {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
      attachments: emailData.attachments
    };

    logger.info('Sending email via Gmail OAuth', {
      to: emailData.to,
      subject: emailData.subject,
      nodeId: (context as any).nodeId
    });

    const result = await transporter.sendMail(mailOptions);
    
    return {
      messageId: result.messageId,
      status: 'sent'
    };
  }

  private async sendViaSMTP(config: any, emailData: any) {
    // For SMTP, we'll use nodemailer in a real implementation
    // This is a simplified version
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter({
      host: config.smtpHost,
      port: config.smtpPort || 587,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUsername,
        pass: config.smtpPassword
      }
    });

    const mailOptions = {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
      attachments: emailData.attachments
    };

    const result = await transporter.sendMail(mailOptions);
    
    return {
      messageId: result.messageId,
      status: 'sent'
    };
  }

  private async sendViaSendGrid(apiKey: string, emailData: any) {
    const url = 'https://api.sendgrid.com/v3/mail/send';
    
    const payload: any = {
      personalizations: [{
        to: [{ email: emailData.to }],
        subject: emailData.subject
      }],
      from: { email: emailData.from },
      content: []
    };

    if (emailData.text) {
      payload.content.push({
        type: 'text/plain',
        value: emailData.text
      });
    }

    if (emailData.html) {
      payload.content.push({
        type: 'text/html',
        value: emailData.html
      });
    }

    if (emailData.attachments && emailData.attachments.length > 0) {
      payload.attachments = emailData.attachments.map((att: any) => ({
        content: att.content,
        filename: att.filename,
        type: att.type || 'application/octet-stream'
      }));
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid API error: ${response.status} ${error}`);
    }

    const messageId = response.headers.get('X-Message-Id');
    
    return {
      messageId: messageId || 'unknown',
      status: 'sent'
    };
  }

  private async sendViaMailgun(apiKey: string, emailData: any) {
    const domain = apiKey.split('-')[1]; // Extract domain from API key
    const url = `https://api.mailgun.net/v3/${domain}/messages`;
    
    const formData = new FormData();
    formData.append('from', emailData.from);
    formData.append('to', emailData.to);
    formData.append('subject', emailData.subject);
    
    if (emailData.text) formData.append('text', emailData.text);
    if (emailData.html) formData.append('html', emailData.html);

    if (emailData.attachments && emailData.attachments.length > 0) {
      emailData.attachments.forEach((att: any, index: number) => {
        formData.append(`attachment[${index}]`, att.content, att.filename);
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mailgun API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    
    return {
      messageId: result.id,
      status: 'sent'
    };
  }

  private async sendViaSES(apiKey: string, emailData: any) {
    // AWS SES implementation would go here
    // This is a simplified version
    throw new Error('AWS SES implementation not yet available');
  }

  private async sendViaResend(apiKey: string, emailData: any) {
    const url = 'https://api.resend.com/emails';
    
    const payload: any = {
      from: emailData.from,
      to: [emailData.to],
      subject: emailData.subject
    };

    if (emailData.text) payload.text = emailData.text;
    if (emailData.html) payload.html = emailData.html;

    if (emailData.attachments && emailData.attachments.length > 0) {
      payload.attachments = emailData.attachments.map((att: any) => ({
        content: att.content,
        filename: att.filename
      }));
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    
    return {
      messageId: result.id,
      status: 'sent'
    };
  }

}
export default EmailNode;
