import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;

export class EmailTriggerNode {
  getNodeDefinition() {
    return {
      id: 'email-trigger',
      type: 'trigger',
      name: 'Email Trigger',
      description: 'Trigger workflow when emails are received matching criteria',
      category: 'trigger',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'email',
          type: 'string',
          displayName: 'Email Address',
          description: 'Email address to monitor for incoming messages',
          required: true,
          placeholder: 'monitor@example.com'
        },
        {
          name: 'subject',
          type: 'string',
          displayName: 'Subject Filter',
          description: 'Subject line filter (supports regex patterns)',
          required: false,
          placeholder: '^URGENT|^ALERT|.*report.*'
        },
        {
          name: 'from',
          type: 'string',
          displayName: 'Sender Filter',
          description: 'Sender email address filter',
          required: false,
          placeholder: 'boss@company.com, alerts@system.com'
        },
        {
          name: 'keywords',
          type: 'array',
          displayName: 'Content Keywords',
          description: 'Keywords to match in email content (any match triggers)',
          required: false,
          placeholder: 'urgent, alert, error, report'
        },
        {
          name: 'checkInterval',
          type: 'number',
          displayName: 'Check Interval (seconds)',
          description: 'How often to check for new emails',
          required: false,
          default: 300,
          min: 60,
          max: 3600
        },
        {
          name: 'useOAuth',
          type: 'boolean',
          displayName: 'Use OAuth',
          description: 'Use OAuth for Gmail/Outlook authentication',
          required: false,
          default: false
        },
        {
          name: 'accessToken',
          type: 'string',
          displayName: 'Access Token',
          description: 'OAuth access token (optional - OAuth will be used if not provided)',
          required: false,
          placeholder: 'your-oauth-token',
          credentialType: 'email_oauth_token'
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'email',
          type: 'string',
          displayName: 'Dynamic Email Address',
          description: 'Email address from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'subject',
          type: 'string',
          displayName: 'Dynamic Subject Filter',
          description: 'Subject filter from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'from',
          type: 'string',
          displayName: 'Dynamic Sender Filter',
          description: 'Sender filter from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'keywords',
          type: 'array',
          displayName: 'Dynamic Keywords',
          description: 'Keywords from previous node (overrides configured)',
          required: false,
          dataType: 'array'
        },
        {
          name: 'checkInterval',
          type: 'number',
          displayName: 'Dynamic Check Interval',
          description: 'Check interval from previous node (overrides configured)',
          required: false,
          dataType: 'number'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'email',
          type: 'string',
          displayName: 'Email Address',
          description: 'Email address that received the message',
          dataType: 'text'
        },
        {
          name: 'subject',
          type: 'string',
          displayName: 'Subject',
          description: 'Subject line of the received email',
          dataType: 'text'
        },
        {
          name: 'from',
          type: 'string',
          displayName: 'From',
          description: 'Sender email address',
          dataType: 'text'
        },
        {
          name: 'body',
          type: 'string',
          displayName: 'Email Body',
          description: 'Text content of the email',
          dataType: 'text'
        },
        {
          name: 'htmlBody',
          type: 'string',
          displayName: 'HTML Body',
          description: 'HTML content of the email',
          dataType: 'text'
        },
        {
          name: 'attachments',
          type: 'array',
          displayName: 'Attachments',
          description: 'Array of email attachments',
          dataType: 'array'
        },
        {
          name: 'receivedAt',
          type: 'string',
          displayName: 'Received Time',
          description: 'ISO timestamp when the email was received',
          dataType: 'text'
        },
        {
          name: 'messageId',
          type: 'string',
          displayName: 'Message ID',
          description: 'Unique message ID from email service',
          dataType: 'text'
        },
        {
          name: 'threadId',
          type: 'string',
          displayName: 'Thread ID',
          description: 'Email thread ID',
          dataType: 'text'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          subject: { type: 'string' },
          from: { type: 'string' },
          keywords: { type: 'array' },
          checkInterval: { type: 'number' },
          useOAuth: { type: 'boolean' },
          accessToken: { type: 'string' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          subject: { type: 'string' },
          from: { type: 'string' },
          keywords: { type: 'array' },
          checkInterval: { type: 'number' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          subject: { type: 'string' },
          from: { type: 'string' },
          body: { type: 'string' },
          htmlBody: { type: 'string' },
          attachments: { type: 'array' },
          receivedAt: { type: 'string' },
          messageId: { type: 'string' },
          threadId: { type: 'string' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    
    // Validation for required parameters
    if (!config.email && !context.input?.email) {
      throw new Error('Required parameter "email" is missing');
    }

    const startTime = Date.now();
    
    try {
      const email = config.email;
      const subject = config.subject;
      const from = config.from;
      const keywords = config.keywords || [];
      const checkInterval = config.checkInterval || 300;

      if (!email) {
        throw new Error('Email address is required for email trigger');
      }

      logger.info('Email trigger executed', {
        nodeId: node.id,
        email,
        subject,
        from,
        runId: context.runId
      });

      // Simulate email data
      const emailData = {
        email: context.input?.email || email,
        subject: context.input?.subject || 'Test Email',
        from: context.input?.from || 'sender@example.com',
        body: context.input?.body || 'Email content here',
        attachments: context.input?.attachments || [],
        receivedAt: new Date().toISOString()
      };

      return {
        success: true,
        output: emailData,
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Email trigger failed', error, {
        nodeId: node.id,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }

}}

export default EmailTriggerNode;
