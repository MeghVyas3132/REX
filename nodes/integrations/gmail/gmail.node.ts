import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;

export class GmailNode {
  // Helper function to validate email addresses
  private validateEmail(email: string, fieldName: string): void {
    if (!email || typeof email !== 'string') {
      throw new Error(`Invalid email address in '${fieldName}' field: email is required and must be a string`);
    }
    
    // Check for @ symbol (basic validation like n8n)
    if (email.indexOf('@') === -1) {
      throw new Error(`Invalid email address in '${fieldName}' field: '${email}' is not a valid email address`);
    }
    
    // Additional validation: check for basic email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error(`Invalid email address in '${fieldName}' field: '${email}' is not a valid email address`);
    }
  }

  // Helper function to validate multiple email addresses (comma-separated or array)
  private validateEmails(emails: string | string[], fieldName: string): void {
    if (!emails) return; // Optional field
    
    const emailList = Array.isArray(emails) ? emails : emails.split(',').map(e => e.trim());
    
    for (const email of emailList) {
      if (email && email.trim()) {
        this.validateEmail(email.trim(), fieldName);
      }
    }
  }

  // Helper function to safely parse JSON from response
  private async safeJsonParse(response: Response): Promise<any> {
    try {
      const text = await response.text();
      if (!text) {
        return { error: { message: response.statusText || 'Empty response' } };
      }
      return JSON.parse(text);
    } catch (e) {
      return { error: { message: response.statusText || 'Failed to parse response as JSON' } };
    }
  }

  // Helper function to get better error messages based on HTTP status code
  private getErrorMessage(response: Response, error: any, operation: string, resource?: string): string {
    const status = response.status;
    const errorMessage = error?.error?.message || error?.message || response.statusText || 'Unknown error';
    
    // Handle specific status codes with helpful messages (like n8n)
    if (status === 400) {
      if (errorMessage.includes('Invalid id value') || errorMessage.includes('Invalid id')) {
        const resourceName = resource || 'resource';
        return `Invalid ${resourceName} ID. ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} IDs should look something like this: 182b676d244938bd`;
      }
      return `Bad request - please check your parameters: ${errorMessage}`;
    }
    
    if (status === 401) {
      return `Authorization failed - please check your credentials: ${errorMessage}`;
    }
    
    if (status === 403) {
      return `Forbidden - please check your credentials and permissions: ${errorMessage}`;
    }
    
    if (status === 404) {
      const resourceName = resource || 'Resource';
      return `${resourceName} not found: ${errorMessage}`;
    }
    
    if (status === 409) {
      if (resource === 'label') {
        return `Label name already exists: ${errorMessage}`;
      }
      return `Conflict - resource may already exist: ${errorMessage}`;
    }
    
    if (status === 429) {
      return `Rate limit exceeded - too many requests. Please try again later: ${errorMessage}`;
    }
    
    if (status >= 500) {
      return `Gmail API server error (${status}): ${errorMessage}`;
    }
    
    return `Gmail ${operation} error: ${errorMessage}`;
  }

  // Helper function to clean unresolved template expressions from content
  // This is useful when AI-generated content includes template syntax as literal text
  private cleanUnresolvedTemplates(value: string): string {
    if (typeof value !== 'string') return value;
    
    // Remove template expressions that look like they're part of AI-generated content
    // Keep valid workflow templates like {{steps.nodeId.output.field}} or {{input.field}}
    // Remove n8n-style templates like {{$json.field}} or JSONPath expressions that AI might include
    
    // Remove {{$json...}} templates (n8n-style, often in AI-generated content)
    value = value.replace(/\{\{\s*\$json[^}]*\}\}/g, '');
    
    // Remove {{$node[...]...}} templates (n8n-style)
    value = value.replace(/\{\{\s*\$node\[[^\]]+\][^}]*\}\}/g, '');
    
    // Remove JSONPath expressions like [?(...)] (often in AI-generated templates)
    value = value.replace(/\{\{\s*[^}]*\[[^\]]*\?\([^}]*\)[^}]*\}\}/g, '');
    
    // Clean up any double spaces or newlines that might result from removals
    value = value.replace(/\n\s*\n\s*\n/g, '\n\n'); // Max 2 consecutive newlines
    value = value.replace(/[ \t]+/g, ' '); // Multiple spaces to single space
    
    return value.trim();
  }

  // Helper function to validate template resolution
  private validateTemplateResolved(value: any, fieldName: string, isContentField: boolean = false): void {
    if (typeof value === 'string' && value.match(/\{\{\s*[^}]+\s*\}\}/)) {
      // For content fields (body, htmlBody), clean up unresolved templates first
      // These might be part of AI-generated content, not actual config templates
      if (isContentField) {
        const cleaned = this.cleanUnresolvedTemplates(value);
        // If cleaning removed templates, use cleaned version and don't throw error
        if (cleaned !== value && !cleaned.match(/\{\{\s*steps\.|input\.|nodeId[^}]*\}\}/)) {
          return; // Content was cleaned, no config templates remain
        }
      }
      
      // Extract the field name from the template expression for better error messages
      const fieldMatch = value.match(/\.([^.}]+)\s*\}\}/);
      const requestedField = fieldMatch ? fieldMatch[1] : 'unknown';
      
      // Provide helpful suggestions based on common field name mismatches
      let suggestion = '';
      if (requestedField === 'result') {
        suggestion = ' For AI/LLM nodes, try using "content" instead of "result" (e.g., {{steps.nodeId.output.content}}).';
      }
      
      throw new Error(`Template expression not resolved for '${fieldName}': ${value.substring(0, 200)}${value.length > 200 ? '...' : ''}. Please ensure the referenced node has executed successfully and the field path is correct.${suggestion}`);
    }
  }

  getNodeDefinition() {
    return {
      id: 'gmail',
      type: 'action',
      name: 'Gmail',
      description: 'Send and read emails using Gmail API with automatic OAuth',
      category: 'integrations',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'operation',
          type: 'options',
          displayName: 'Gmail Operation',
          description: 'Gmail operation to perform',
          required: true,
          default: 'read',
          options: [
            { name: 'Send Email', value: 'send' },
            { name: 'List Messages', value: 'list' },
            { name: 'Read Emails', value: 'read' },
            { name: 'Search Emails', value: 'search' },
            { name: 'Get Email', value: 'get' },
            { name: 'Reply to Email', value: 'reply' },
            { name: 'Create Draft', value: 'createDraft' },
            { name: 'List Drafts', value: 'listDrafts' },
            { name: 'Get Draft', value: 'getDraft' },
            { name: 'Delete Draft', value: 'deleteDraft' },
            { name: 'List Labels', value: 'listLabels' },
            { name: 'Create Label', value: 'createLabel' },
            { name: 'Get Label', value: 'getLabel' },
            { name: 'Delete Label', value: 'deleteLabel' },
            { name: 'List Threads', value: 'listThreads' },
            { name: 'Get Thread', value: 'getThread' },
            { name: 'Trash Thread', value: 'trashThread' },
            { name: 'Untrash Thread', value: 'untrashThread' },
            { name: 'Add Label to Thread', value: 'addLabelToThread' },
            { name: 'Remove Label from Thread', value: 'removeLabelFromThread' },
            { name: 'Add Label to Message', value: 'addLabelToMessage' },
            { name: 'Remove Label from Message', value: 'removeLabelFromMessage' },
            { name: 'Delete Message', value: 'deleteMessage' },
            { name: 'Get Many Messages', value: 'getManyMessages' },
            { name: 'Mark Message as Read', value: 'markAsRead' },
            { name: 'Mark Message as Unread', value: 'markAsUnread' },
            { name: 'Send Message and Wait for Response', value: 'sendAndWait' }
          ]
        },
        {
          name: 'accessToken',
          type: 'string',
          displayName: 'Access Token',
          description: 'Gmail OAuth access token (optional - OAuth will be used if not provided)',
          required: false,
          placeholder: 'ya29.a0...',
          credentialType: 'gmail_oauth_token'
        },
        {
          name: 'maxResults',
          type: 'number',
          displayName: 'Max Results',
          description: 'Maximum number of emails to retrieve',
          required: false,
          default: 10,
          min: 1,
          max: 100
        },
        {
          name: 'labelIds',
          type: 'array',
          displayName: 'Label IDs',
          description: 'Gmail label IDs to filter by',
          required: false
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'operation',
          type: 'string',
          displayName: 'Dynamic Operation',
          description: 'Gmail operation from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'to',
          type: 'string',
          displayName: 'Recipient Email',
          description: 'Email recipient from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'subject',
          type: 'string',
          displayName: 'Email Subject',
          description: 'Email subject from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'body',
          type: 'string',
          displayName: 'Email Body',
          description: 'Email body text from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'htmlBody',
          type: 'string',
          displayName: 'HTML Body',
          description: 'HTML email body from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'attachments',
          type: 'array',
          displayName: 'Attachments',
          description: 'Email attachments from previous node',
          required: false,
          dataType: 'array'
        },
        {
          name: 'query',
          type: 'string',
          displayName: 'Search Query',
          description: 'Gmail search query from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'messageId',
          type: 'string',
          displayName: 'Message ID',
          description: 'Gmail message ID from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'threadId',
          type: 'string',
          displayName: 'Thread ID',
          description: 'Gmail thread ID from previous node',
          required: false,
          dataType: 'text'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'messages',
          type: 'array',
          displayName: 'Email Messages',
          description: 'Array of email messages',
          dataType: 'array'
        },
        {
          name: 'message',
          type: 'object',
          displayName: 'Single Message',
          description: 'Single email message object',
          dataType: 'object'
        },
        {
          name: 'messageId',
          type: 'string',
          displayName: 'Message ID',
          description: 'ID of the sent or retrieved message',
          dataType: 'text'
        },
        {
          name: 'threadId',
          type: 'string',
          displayName: 'Thread ID',
          description: 'Gmail thread ID',
          dataType: 'text'
        },
        {
          name: 'success',
          type: 'boolean',
          displayName: 'Success',
          description: 'Whether the operation was successful',
          dataType: 'boolean'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string' },
          accessToken: { type: 'string' },
          maxResults: { type: 'number' },
          labelIds: { type: 'array' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string' },
          to: { type: 'string' },
          subject: { type: 'string' },
          body: { type: 'string' },
          htmlBody: { type: 'string' },
          attachments: { type: 'array' },
          query: { type: 'string' },
          messageId: { type: 'string' },
          threadId: { type: 'string' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          messages: { type: 'array' },
          message: { type: 'object' },
          messageId: { type: 'string' },
          threadId: { type: 'string' },
          success: { type: 'boolean' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const cfg = node.data?.config || {};
    const nodeData = node.data || {};
    const startTime = Date.now();

    try {
      // Get nodeOutputs from context for template resolution
      const nodeOutputs = (context as any).nodeOutputs || {};
      
      // Helper function to resolve template expressions like {{steps.nodeId.output.field}} or {{nodeId.field}}
      const resolveTemplate = (template: any, nodeOutputs: Record<string, any> = {}): any => {
        if (typeof template === 'string') {
          // Replace template variables in string
          return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expr) => {
            const trimmedExpr = expr.trim();
            
            // Support {{steps.nodeId.output.field}} format
            // Note: nodeOutputs[nodeId] already contains the output object directly (result.output)
            // So if path is "steps.nodeId.output.field", we should access nodeOutputs[nodeId].output.field
            // But if nodeOutputs[nodeId] IS the output, we should skip "output" and access directly
            if (trimmedExpr.startsWith('steps.')) {
              const pathAfterSteps = trimmedExpr.substring(6); // Remove 'steps.' prefix
              const parts = pathAfterSteps.split('.');
              
              // First part is the nodeId
              const nodeId = parts[0];
              let value = nodeOutputs[nodeId];
              
              // If value is undefined, return original match
              if (value === undefined || value === null) {
                return match;
              }
              
              // Process remaining parts (skip nodeId, start from index 1)
              // If second part is "output", skip it since nodeOutputs[nodeId] already IS the output
              let startIndex = 1;
              if (parts.length > 1 && parts[1] === 'output') {
                startIndex = 2; // Skip "output" part
              }
              
              // Track the object before accessing the last field (for fallback alternatives)
              let valueBeforeLastField = value;
              
              for (let i = startIndex; i < parts.length; i++) {
                const part = parts[i];
                
                // Save the value before accessing the last field
                if (i === parts.length - 1) {
                  valueBeforeLastField = value;
                }
                
                // Check for array access like messages[0] or [0]
                const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
                if (arrayMatch) {
                  const arrayName = arrayMatch[1];
                  const arrayIndex = parseInt(arrayMatch[2], 10);
                  value = value?.[arrayName]?.[arrayIndex];
                } else {
                  value = value?.[part];
                }
                
                if (value === undefined || value === null) break;
              }
              
              // If value is not found and we're looking for "result", try common alternatives
              if ((value === undefined || value === null) && parts.length > startIndex) {
                const lastPart = parts[parts.length - 1];
                if (lastPart === 'result' && valueBeforeLastField) {
                  // Try common alternatives for AI/LLM nodes: content, text, body, output
                  const alternatives = ['content', 'text', 'body', 'output'];
                  for (const alt of alternatives) {
                    if (valueBeforeLastField[alt] !== undefined && valueBeforeLastField[alt] !== null) {
                      value = valueBeforeLastField[alt];
                      break;
                    }
                  }
                }
              }
              
              return value !== undefined && value !== null ? String(value) : match;
            }
            
            // Support {{input.field}} - from immediate input
            if (trimmedExpr.startsWith('input.')) {
              const path = trimmedExpr.substring(6); // Remove 'input.' prefix
              const pathParts = path.split('.');
              let value = context.input;
              for (const part of pathParts) {
                // Handle array access
                const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
                if (arrayMatch) {
                  const arrayName = arrayMatch[1];
                  const arrayIndex = parseInt(arrayMatch[2], 10);
                  value = value?.[arrayName]?.[arrayIndex];
                } else {
                  value = value?.[part];
                }
                if (value === undefined || value === null) break;
              }
              return value !== undefined && value !== null ? String(value) : match;
            }
            
            // Support {{nodeId.field}} - from any previous node by ID
            const [nodeId, ...pathParts] = trimmedExpr.split('.');
            if (nodeOutputs[nodeId]) {
              let value = nodeOutputs[nodeId];
              let valueBeforeLastField = value;
              
              for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                
                // Save the value before accessing the last field
                if (i === pathParts.length - 1) {
                  valueBeforeLastField = value;
                }
                
                // Handle array access
                const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
                if (arrayMatch) {
                  const arrayName = arrayMatch[1];
                  const arrayIndex = parseInt(arrayMatch[2], 10);
                  value = value?.[arrayName]?.[arrayIndex];
                } else {
                  value = value?.[part];
                }
                if (value === undefined || value === null) break;
              }
              
              // If value is not found and we're looking for "result", try common alternatives
              if ((value === undefined || value === null) && pathParts.length > 0) {
                const lastPart = pathParts[pathParts.length - 1];
                if (lastPart === 'result' && valueBeforeLastField) {
                  // Try common alternatives for AI/LLM nodes: content, text, body, output
                  const alternatives = ['content', 'text', 'body', 'output'];
                  for (const alt of alternatives) {
                    if (valueBeforeLastField[alt] !== undefined && valueBeforeLastField[alt] !== null) {
                      value = valueBeforeLastField[alt];
                      break;
                    }
                  }
                }
              }
              
              return value !== undefined && value !== null ? String(value) : match;
            }
            
            // Try to find in input if it's a direct property
            if (context.input && context.input[trimmedExpr]) {
              const value = context.input[trimmedExpr];
              return value !== undefined && value !== null ? String(value) : match;
            }
            
            return match; // Return original if not found
          });
        } else if (Array.isArray(template)) {
          return template.map(item => resolveTemplate(item, nodeOutputs));
        } else if (typeof template === 'object' && template !== null) {
          const result: any = {};
          for (const [key, value] of Object.entries(template)) {
            result[key] = resolveTemplate(value, nodeOutputs);
          }
          return result;
        }
        return template;
      };
      
      const operation = cfg.operation || context.input?.operation || 'read';
      
      // Get access token (manual or OAuth)
      let accessToken = cfg.accessToken;
      
      if (!accessToken) {
        // Try to get OAuth token automatically
        try {
          const { oauthService } = await import('../../services/oauth.service');
          
          if (!oauthService) {
            throw new Error('OAuth service not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
          }
          
          // IMPORTANT: Use context.userId which is set by workflow engine from authenticated user
          // This MUST match the userId used when storing OAuth tokens during OAuth callback
          const userId = (context as any).userId;
          
          if (!userId || userId === 'default-user') {
            throw new Error(`User ID not found in workflow context. Ensure you are authenticated and running workflows through the authenticated API.`);
          }
          
          logger.info('Gmail node getting OAuth token', {
            nodeId: node.id,
            userId,
            userIdType: typeof userId,
            userIdLength: userId?.length,
            workflowId: context.workflowId,
            runId: context.runId
          });
          
          // Clean userId to ensure consistent format
          const cleanUserId = String(userId || '').trim();
          if (!cleanUserId || cleanUserId === 'default-user') {
            throw new Error(`Invalid userId: ${userId}. Ensure you are authenticated and running workflows through the authenticated API.`);
          }
          
          accessToken = await oauthService.getValidAccessToken(cleanUserId, 'google');
          
          logger.info('Gmail node got OAuth token successfully', {
            nodeId: node.id,
            userId: cleanUserId,
            tokenLength: accessToken?.length || 0,
            hasToken: !!accessToken
          });
        } catch (oauthError: any) {
          const errorMessage = oauthError?.message || oauthError?.toString() || String(oauthError);
          logger.error('Gmail node failed to get OAuth token', {
            nodeId: node.id,
            userId: (context as any).userId,
            error: errorMessage
          });
          throw new Error(`Gmail access token is required. Please provide accessToken in config or connect your Google account via OAuth. Error: ${errorMessage}`);
        }
      }

      logger.info('Gmail node execute', { nodeId: node.id, operation, runId: context.runId });

      // Resolve templates in config before passing to operation methods
      const resolvedConfig = resolveTemplate(cfg, nodeOutputs);
      
      // Also resolve templates in nodeData.communication fields (for send, reply, createDraft operations)
      const resolvedNodeData: any = { ...nodeData };
      if ((nodeData as any)?.communication) {
        resolvedNodeData.communication = resolveTemplate((nodeData as any).communication, nodeOutputs);
      }

      switch (operation) {
        case 'send':
          return await this.sendEmail(accessToken, resolvedConfig, context, startTime, resolvedNodeData);
        case 'list':
        case 'read':
          return await this.readEmails(accessToken, resolvedConfig, context, startTime);
        case 'search':
          return await this.searchEmails(accessToken, resolvedConfig, context, startTime);
        case 'get':
          return await this.getMessage(accessToken, resolvedConfig, context, startTime);
        case 'reply':
          return await this.replyToEmail(accessToken, resolvedConfig, context, startTime, resolvedNodeData);
        case 'createDraft':
          return await this.createDraft(accessToken, resolvedConfig, context, startTime, resolvedNodeData);
        case 'listDrafts':
          return await this.listDrafts(accessToken, resolvedConfig, context, startTime);
        case 'getDraft':
          return await this.getDraft(accessToken, resolvedConfig, context, startTime);
        case 'deleteDraft':
          return await this.deleteDraft(accessToken, resolvedConfig, context, startTime);
        case 'listLabels':
          return await this.listLabels(accessToken, resolvedConfig, context, startTime);
        case 'createLabel':
          return await this.createLabel(accessToken, resolvedConfig, context, startTime);
        case 'getLabel':
          return await this.getLabel(accessToken, resolvedConfig, context, startTime);
        case 'deleteLabel':
          return await this.deleteLabel(accessToken, resolvedConfig, context, startTime);
        case 'listThreads':
          return await this.listThreads(accessToken, resolvedConfig, context, startTime);
        case 'getThread':
          return await this.getThread(accessToken, resolvedConfig, context, startTime);
        case 'trashThread':
          return await this.trashThread(accessToken, resolvedConfig, context, startTime);
        case 'untrashThread':
          return await this.untrashThread(accessToken, resolvedConfig, context, startTime);
        case 'addLabelToThread':
          return await this.addLabelToThread(accessToken, resolvedConfig, context, startTime);
        case 'removeLabelFromThread':
          return await this.removeLabelFromThread(accessToken, resolvedConfig, context, startTime);
        case 'addLabelToMessage':
          return await this.addLabelToMessage(accessToken, resolvedConfig, context, startTime);
        case 'removeLabelFromMessage':
          return await this.removeLabelFromMessage(accessToken, resolvedConfig, context, startTime);
        case 'deleteMessage':
          return await this.deleteMessage(accessToken, resolvedConfig, context, startTime);
        case 'getManyMessages':
          return await this.getManyMessages(accessToken, resolvedConfig, context, startTime);
        case 'markAsRead':
          return await this.markAsRead(accessToken, resolvedConfig, context, startTime);
        case 'markAsUnread':
          return await this.markAsUnread(accessToken, resolvedConfig, context, startTime);
        case 'sendAndWait':
          return await this.sendAndWait(accessToken, resolvedConfig, context, startTime, resolvedNodeData);
        default:
          throw new Error(`Unknown Gmail operation: ${operation}`);
      }

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Gmail operation failed', error, {
        nodeId: node.id,
        operation: cfg.operation,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  private async sendEmail(accessToken: string, config: any, context: ExecutionContext, startTime: number, nodeData?: any): Promise<ExecutionResult> {
    // Support both config.* and communication.* field formats
    const communication = nodeData?.communication || {};
    
    const to = config.to || communication.toEmail || context.input?.to || context.input?.toEmail;
    const subject = config.subject || communication.subject || context.input?.subject;
    let body = config.body || communication.textContent || context.input?.body || context.input?.textContent;
    let htmlBody = config.htmlBody || communication.htmlContent || context.input?.htmlBody || context.input?.htmlContent;
    const cc = config.cc || communication.cc || context.input?.cc;
    const bcc = config.bcc || communication.bcc || context.input?.bcc;
    const from = config.from || communication.from || context.input?.from;
    const replyTo = config.replyTo || communication.replyTo || context.input?.replyTo;
    const attachments = config.attachments || communication.attachments || context.input?.attachments;

    // Clean unresolved template expressions from content fields (they might be part of AI-generated text)
    if (typeof body === 'string') {
      body = this.cleanUnresolvedTemplates(body);
    }
    if (typeof htmlBody === 'string') {
      htmlBody = this.cleanUnresolvedTemplates(htmlBody);
    }

    // Validate required fields
    if (!to || !subject || !body) {
      throw new Error('to, subject, and body are required for sending email');
    }

    // Validate template resolution (content fields get special handling)
    this.validateTemplateResolved(to, 'to');
    this.validateTemplateResolved(subject, 'subject');
    this.validateTemplateResolved(body, 'body', true); // true = isContentField

    // Validate email addresses
    this.validateEmails(to, 'to');
    if (cc) {
      this.validateEmails(cc, 'cc');
      this.validateTemplateResolved(cc, 'cc');
    }
    if (bcc) {
      this.validateEmails(bcc, 'bcc');
      this.validateTemplateResolved(bcc, 'bcc');
    }
    if (from) {
      this.validateEmail(from, 'from');
      this.validateTemplateResolved(from, 'from');
    }
    if (replyTo) {
      this.validateEmail(replyTo, 'replyTo');
      this.validateTemplateResolved(replyTo, 'replyTo');
    }

    // Create email message
    const message = this.createEmailMessage(to, subject, body, htmlBody, attachments, cc, bcc, from, replyTo);
    
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: message
      })
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'send', 'message'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        messageId: result.id,
        threadId: result.threadId,
        success: true
      },
      duration
    };
  }

  private async readEmails(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const maxResults = config.maxResults || 10;
    let labelIds = config.labelIds || ['INBOX'];
    
    // Handle labelIds as string (comma-separated) or array
    if (typeof labelIds === 'string') {
      labelIds = labelIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
    }
    if (!Array.isArray(labelIds) || labelIds.length === 0) {
      labelIds = ['INBOX'];
    }

    const params = new URLSearchParams({
      maxResults: maxResults.toString()
    });

    // Gmail API expects labelIds as array query parameters (multiple labelIds=INBOX&labelIds=UNREAD)
    if (labelIds.length > 0) {
      labelIds.forEach(id => params.append('labelIds', id));
    }
    
    const pageToken = config.pageToken || '';
    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'read', 'message'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        messages: result.messages || [],
        resultSizeEstimate: result.resultSizeEstimate,
        nextPageToken: result.nextPageToken
      },
      duration
    };
  }

  private async searchEmails(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const query = config.query || context.input?.query;
    const maxResults = config.maxResults || 10;
    const pageToken = config.pageToken || '';

    if (!query) {
      throw new Error('Query is required for email search');
    }

    // Validate template resolution
    this.validateTemplateResolved(query, 'query');

    const params = new URLSearchParams({
      q: query,
      maxResults: maxResults.toString()
    });
    
    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'search', 'message'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        messages: result.messages || [],
        query,
        resultSizeEstimate: result.resultSizeEstimate,
        nextPageToken: result.nextPageToken
      },
      duration
    };
  }

  // Helper to decode Gmail base64url strings safely
  private decodeBase64Url(data: string): string {
    if (!data) return '';
    // Gmail returns URL-safe base64 ( - and _ ). Convert to standard base64.
    const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(normalized, 'base64').toString('utf-8');
  }

  // Helper function to recursively extract text/HTML from nested parts
  private extractBodyFromParts(parts: any[]): { text?: string; html?: string } {
    const result: { text?: string; html?: string } = {};
    
    if (!Array.isArray(parts)) {
      logger.warn('extractBodyFromParts received non-array parts', { parts });
      return result;
    }
    
    for (const part of parts) {
      if (!part || typeof part !== 'object') continue;
      
      // If this part has nested parts, recurse
      if (part.parts && Array.isArray(part.parts) && part.parts.length > 0) {
        const nested = this.extractBodyFromParts(part.parts);
        if (nested.text && typeof nested.text === 'string' && !result.text) {
          result.text = nested.text;
        }
        if (nested.html && typeof nested.html === 'string' && !result.html) {
          result.html = nested.html;
        }
      }
      
      // Extract text/plain
      if (part.mimeType === 'text/plain' && part.body?.data && !result.text) {
        try {
          const decoded = this.decodeBase64Url(part.body.data);
          if (typeof decoded === 'string' && decoded.length > 0) {
            result.text = decoded;
          }
        } catch (e) {
          logger.warn('Failed to decode text/plain part', { 
            error: e instanceof Error ? e.message : String(e),
            mimeType: part.mimeType 
          });
        }
      }
      
      // Extract text/html
      if (part.mimeType === 'text/html' && part.body?.data && !result.html) {
        try {
          const decoded = this.decodeBase64Url(part.body.data);
          if (typeof decoded === 'string' && decoded.length > 0) {
            result.html = decoded;
          }
        } catch (e) {
          logger.warn('Failed to decode text/html part', { 
            error: e instanceof Error ? e.message : String(e),
            mimeType: part.mimeType 
          });
        }
      }
    }
    
    return result;
  }

  // Split a comma/semicolon separated list of addresses while respecting quotes/angle brackets
  private splitAddressList(value?: string): string[] {
    if (!value || typeof value !== 'string') return [];
    
    const segments: string[] = [];
    let current = '';
    let depth = 0;
    let inQuotes = false;
    
    for (const char of value) {
      if (char === '"') {
        inQuotes = !inQuotes;
      }
      
      if (!inQuotes) {
        if (char === '<') {
          depth++;
        } else if (char === '>' && depth > 0) {
          depth--;
        } else if ((char === ',' || char === ';') && depth === 0) {
          if (current.trim()) segments.push(current.trim());
          current = '';
          continue;
        }
      }
      
      current += char;
    }
    
    if (current.trim()) {
      segments.push(current.trim());
    }
    
    return segments;
  }
  
  private parseEmailAddress(value?: string): { email: string; name: string; display: string } | null {
    if (!value || typeof value !== 'string') return null;
    
    const trimmed = value.trim();
    if (!trimmed) return null;
    
    let email = '';
    let name = '';
    
    const angleStart = trimmed.lastIndexOf('<');
    const angleEnd = trimmed.lastIndexOf('>');
    
    if (angleStart !== -1 && angleEnd !== -1 && angleEnd > angleStart) {
      email = trimmed.substring(angleStart + 1, angleEnd).trim();
      name = trimmed.substring(0, angleStart).trim();
    } else {
      email = trimmed;
    }
    
    const unquote = (str: string) => {
      if (!str) return '';
      const quoted = str.trim();
      if (quoted.startsWith('"') && quoted.endsWith('"') && quoted.length >= 2) {
        return quoted.substring(1, quoted.length - 1).trim();
      }
      return quoted;
    };
    
    email = unquote(email).replace(/^mailto:/i, '');
    name = unquote(name);
    
    if (!email) return null;
    
    return {
      email,
      name,
      display: trimmed
    };
  }
  
  private parseAddressList(value?: string): Array<{ email: string; name: string; display: string }> {
    const segments = this.splitAddressList(value);
    const parsed = segments
      .map(segment => this.parseEmailAddress(segment))
      .filter((entry): entry is { email: string; name: string; display: string } => Boolean(entry));
    return parsed;
  }

  // Helper function to parse a Gmail message result into clean output format
  // This is used by getMessage, getManyMessages, getThread, getDraft, etc.
  private parseMessageResult(result: any, includeHtml: boolean = false): any {
    // Parse message to extract readable content
    // Ensure snippet is always a string, never an object
    let snippetValue = '';
    if (result.snippet) {
      if (typeof result.snippet === 'string') {
        snippetValue = result.snippet;
      } else if (typeof result.snippet === 'object') {
        // If snippet is an object, try to extract a meaningful string
        snippetValue = JSON.stringify(result.snippet);
        logger.warn('Gmail snippet is an object, converting to string', { snippet: result.snippet });
      } else {
        snippetValue = String(result.snippet);
      }
    }
    
    let parsedMessage: any = {
      id: result.id,
      threadId: result.threadId,
      labelIds: result.labelIds || [],
      snippet: snippetValue,
      sizeEstimate: result.sizeEstimate,
      internalDate: result.internalDate
    };

    // Extract headers from payload
    if (result.payload) {
      let headers: any[] = [];
      
      // Primary location: result.payload.headers
      if (result.payload.headers && Array.isArray(result.payload.headers)) {
        headers = result.payload.headers;
      }
      
      // Fallback: Check parts for headers
      if (headers.length === 0 && result.payload.parts) {
        for (const part of result.payload.parts) {
          if (part.headers && Array.isArray(part.headers) && part.headers.length > 0) {
            headers = part.headers;
            break;
          }
          if (part.parts) {
            for (const nestedPart of part.parts) {
              if (nestedPart.headers && Array.isArray(nestedPart.headers) && nestedPart.headers.length > 0) {
                headers = nestedPart.headers;
                break;
              }
            }
            if (headers.length > 0) break;
          }
        }
      }
      
      const getHeader = (name: string): string => {
        if (!headers || headers.length === 0) return '';
        const header = headers.find((h: any) => {
          if (!h || typeof h !== 'object') return false;
          const headerName = h.name || h.key || h.Name || h.Key;
          return headerName && headerName.toLowerCase() === name.toLowerCase();
        });
        const value = header?.value || header?.Value || '';
        // Ensure we return a string, never an object
        if (typeof value === 'string') {
          return value;
        }
        if (value === null || value === undefined) {
          return '';
        }
        // If it's an object, log warning and return empty string
        if (typeof value === 'object') {
          logger.warn(`Gmail header '${name}' value is an object, returning empty string`, { header, value });
          return '';
        }
        return String(value);
      };

      parsedMessage.subject = getHeader('subject');
      parsedMessage.from = getHeader('from');
      parsedMessage.to = getHeader('to');
      parsedMessage.cc = getHeader('cc');
      parsedMessage.bcc = getHeader('bcc');
      parsedMessage.date = getHeader('date');
      parsedMessage.replyTo = getHeader('reply-to');
      parsedMessage.messageId = getHeader('message-id');
      parsedMessage.inReplyTo = getHeader('in-reply-to');
      parsedMessage.references = getHeader('references');
      
      // Log if subject extraction seems unusual (for debugging)
      if (!parsedMessage.subject && headers.length > 0) {
        logger.debug('Gmail subject header not found, available headers:', { 
          headerNames: headers.map((h: any) => h.name || h.key || h.Name || h.Key).filter(Boolean)
        });
      }
    }
    
    // Normalize address headers so downstream nodes always get pure email lists
    const normalizeAddressField = (value?: string) => {
      const display = value || '';
      const list = this.parseAddressList(value);
      const emailsOnly = list.map(addr => addr.email).filter(Boolean);
      const joined = emailsOnly.join(', ');
      return {
        display,
        list,
        emails: joined,
        primaryEmail: emailsOnly[0] || '',
        primaryName: list[0]?.name || ''
      };
    };
    
    const fromField = normalizeAddressField(parsedMessage.from);
    parsedMessage.fromDisplay = fromField.display;
    parsedMessage.fromName = fromField.primaryName;
    parsedMessage.fromEmail = fromField.primaryEmail || parsedMessage.from || '';
    parsedMessage.fromList = fromField.list;
    parsedMessage.from = parsedMessage.fromEmail;
    
    const replyToField = normalizeAddressField(parsedMessage.replyTo);
    parsedMessage.replyToDisplay = replyToField.display;
    parsedMessage.replyToEmail = replyToField.primaryEmail || parsedMessage.replyTo || '';
    parsedMessage.replyToName = replyToField.primaryName;
    parsedMessage.replyToList = replyToField.list;
    parsedMessage.replyTo = parsedMessage.replyToEmail || parsedMessage.replyTo || '';
    
    const toField = normalizeAddressField(parsedMessage.to);
    parsedMessage.toDisplay = toField.display;
    parsedMessage.toEmails = toField.emails || parsedMessage.to || '';
    parsedMessage.toEmail = toField.primaryEmail || '';
    parsedMessage.toList = toField.list;
    parsedMessage.to = parsedMessage.toEmails;
    
    const ccField = normalizeAddressField(parsedMessage.cc);
    parsedMessage.ccDisplay = ccField.display;
    parsedMessage.ccEmails = ccField.emails || parsedMessage.cc || '';
    parsedMessage.ccList = ccField.list;
    parsedMessage.cc = parsedMessage.ccEmails;
    
    const bccField = normalizeAddressField(parsedMessage.bcc);
    parsedMessage.bccDisplay = bccField.display;
    parsedMessage.bccEmails = bccField.emails || parsedMessage.bcc || '';
    parsedMessage.bccList = bccField.list;
    parsedMessage.bcc = parsedMessage.bccEmails;

    // Extract body content
    if (result.payload) {
      // Simple body (not multipart)
      if (result.payload.body?.data) {
        try {
          const bodyData = this.decodeBase64Url(result.payload.body.data);
          // Ensure bodyData is a string
          if (typeof bodyData === 'string' && bodyData.length > 0) {
            if (result.payload.mimeType === 'text/html') {
              parsedMessage.html = bodyData;
              parsedMessage.body = bodyData;
            } else {
              parsedMessage.text = bodyData;
              parsedMessage.body = bodyData;
            }
          } else {
            logger.warn('Gmail body data decoded but is not a valid string', { 
              type: typeof bodyData, 
              length: bodyData?.length 
            });
          }
        } catch (e) {
          logger.error('Failed to decode Gmail body data', { error: e instanceof Error ? e.message : String(e) });
        }
      }

      // Multipart body
      if (result.payload.parts && result.payload.parts.length > 0) {
        try {
          const bodyParts = this.extractBodyFromParts(result.payload.parts);
          
          if (bodyParts.text && typeof bodyParts.text === 'string') {
            parsedMessage.text = bodyParts.text;
            parsedMessage.body = bodyParts.text;
          }
          
          if (bodyParts.html && typeof bodyParts.html === 'string') {
            parsedMessage.html = bodyParts.html;
            if (!parsedMessage.body) {
              parsedMessage.body = bodyParts.html;
            }
          }
        } catch (e) {
          logger.error('Failed to extract body from Gmail parts', { error: e instanceof Error ? e.message : String(e) });
        }
      }
    }

    // Ensure body and text are always strings, never objects
    const ensureString = (value: any, defaultValue: string = ''): string => {
      if (typeof value === 'string') {
        return value;
      }
      if (value === null || value === undefined) {
        return defaultValue;
      }
      // If it's an object, log warning and return empty string
      if (typeof value === 'object') {
        logger.warn('Body/text field is an object, converting to empty string', { value });
        return defaultValue;
      }
      return String(value);
    };

    const cleanBody = ensureString(parsedMessage.text || parsedMessage.body, '');
    const cleanText = ensureString(parsedMessage.text, '');
    
    // Check if from address is a no-reply address
    const isNoReplyAddress = (email: string): boolean => {
      if (!email) return false;
      const emailLower = email.toLowerCase();
      const noReplyPatterns = [
        'no-reply',
        'noreply',
        'no_reply',
        'donotreply',
        'do-not-reply',
        'do_not_reply',
        'mailer-daemon',
        'mailerdaemon',
        'postmaster',
        'automated'
      ];
      return noReplyPatterns.some(pattern => emailLower.includes(pattern));
    };
    
    const isFromNoReply = isNoReplyAddress(parsedMessage.fromEmail || parsedMessage.from || '');
    
    // Build clean output
    const output: any = {
      // Core identifiers
      id: parsedMessage.id,
      messageId: result.id,
      threadId: result.threadId,
      
      // Headers
      subject: parsedMessage.subject || '',
      from: parsedMessage.from || '',
      fromEmail: parsedMessage.fromEmail || parsedMessage.from || '',
      fromName: parsedMessage.fromName || '',
      fromDisplay: parsedMessage.fromDisplay || parsedMessage.fromEmail || '',
      to: parsedMessage.to || '',
      toEmail: parsedMessage.toEmail || '',
      toEmails: parsedMessage.toEmails || parsedMessage.to || '',
      toDisplay: parsedMessage.toDisplay || parsedMessage.toEmails || '',
      cc: parsedMessage.cc || '',
      ccEmails: parsedMessage.ccEmails || parsedMessage.cc || '',
      ccDisplay: parsedMessage.ccDisplay || parsedMessage.ccEmails || '',
      bcc: parsedMessage.bcc || '',
      bccEmails: parsedMessage.bccEmails || parsedMessage.bcc || '',
      bccDisplay: parsedMessage.bccDisplay || parsedMessage.bccEmails || '',
      date: parsedMessage.date || '',
      replyTo: parsedMessage.replyTo || '',
      replyToEmail: parsedMessage.replyToEmail || parsedMessage.replyTo || '',
      replyToDisplay: parsedMessage.replyToDisplay || parsedMessage.replyToEmail || '',
      
      // Message identifiers
      messageIdHeader: parsedMessage.messageId || '',
      inReplyTo: parsedMessage.inReplyTo || '',
      references: parsedMessage.references || '',
      
      // Content - ensure all are strings
      snippet: ensureString(parsedMessage.snippet, ''),
      text: cleanText,
      body: cleanBody,
      
      // Convenience aliases
      toList: parsedMessage.toList || [],
      ccList: parsedMessage.ccList || [],
      bccList: parsedMessage.bccList || [],
      fromList: parsedMessage.fromList || [],
      replyToList: parsedMessage.replyToList || [],
      textContent: cleanText,
      
      // Metadata
      labelIds: parsedMessage.labelIds || [],
      sizeEstimate: parsedMessage.sizeEstimate || 0,
      internalDate: parsedMessage.internalDate || '',
      
      // Flags
      isNoReply: isFromNoReply,
      
      success: true
    };

    // Include HTML only if requested
    if (includeHtml && parsedMessage.html) {
      output.html = parsedMessage.html.length > 2000 
        ? parsedMessage.html.substring(0, 2000) + '... (truncated)'
        : parsedMessage.html;
      output.htmlContent = output.html;
    }
    
    return output;
  }

  private async getMessage(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const messageId = config.messageId || context.input?.messageId;
    const format = config.format || 'full';

    if (!messageId) {
      throw new Error('messageId is required for getting email');
    }

    // Validate template resolution
    this.validateTemplateResolved(messageId, 'messageId');

    // Use 'full' format to get complete message with headers and body
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=${format}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'get message', 'message'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    // Use helper function to parse message into clean output format
    const output = this.parseMessageResult(result, config.includeHtml || false);

    return {
      success: true,
      output,
      duration
    };
  }

  private async replyToEmail(accessToken: string, config: any, context: ExecutionContext, startTime: number, nodeData?: any): Promise<ExecutionResult> {
    // Support both config.* and communication.* field formats
    const communication = nodeData?.communication || {};
    
    const threadId = config.threadId || context.input?.threadId;
    const replyToMessageId = config.replyToMessageId || context.input?.replyToMessageId; // This is Gmail message ID
    const subject = config.subject || communication.subject || context.input?.subject;
    let body = config.body || communication.textContent || context.input?.body || context.input?.textContent;
    let htmlBody = config.htmlBody || communication.htmlContent || context.input?.htmlBody || context.input?.htmlContent;
    const cc = config.cc || communication.cc || context.input?.cc;
    const bcc = config.bcc || communication.bcc || context.input?.bcc;
    const from = config.from || communication.from || context.input?.from;
    const replyTo = config.replyTo || communication.replyTo || context.input?.replyTo;
    const to = config.to || communication.toEmail || context.input?.to || context.input?.toEmail;
    const attachments = config.attachments || communication.attachments || context.input?.attachments;

    // Clean unresolved template expressions from content fields (they might be part of AI-generated text)
    if (typeof body === 'string') {
      body = this.cleanUnresolvedTemplates(body);
    }
    if (typeof htmlBody === 'string') {
      htmlBody = this.cleanUnresolvedTemplates(htmlBody);
    }

    if (!threadId || !subject || !body) {
      throw new Error('threadId, subject, and body are required for replying to email');
    }

    // Validate template resolution (content fields get special handling)
    this.validateTemplateResolved(threadId, 'threadId');
    this.validateTemplateResolved(subject, 'subject');
    this.validateTemplateResolved(body, 'body', true); // true = isContentField

    // Validate email addresses
    if (to) {
      this.validateEmails(to, 'to');
      this.validateTemplateResolved(to, 'to');
    }
    if (cc) {
      this.validateEmails(cc, 'cc');
      this.validateTemplateResolved(cc, 'cc');
    }
    if (bcc) {
      this.validateEmails(bcc, 'bcc');
      this.validateTemplateResolved(bcc, 'bcc');
    }
    if (from) {
      this.validateEmail(from, 'from');
      this.validateTemplateResolved(from, 'from');
    }
    if (replyTo) {
      this.validateEmail(replyTo, 'replyTo');
      this.validateTemplateResolved(replyTo, 'replyTo');
    }

    // Check if replying to a no-reply address (warn but allow)
    if (to) {
      const toLower = to.toLowerCase();
      const noReplyPatterns = [
        'no-reply',
        'noreply',
        'no_reply',
        'donotreply',
        'do-not-reply',
        'do_not_reply',
        'mailer-daemon',
        'mailerdaemon',
        'postmaster',
        'automated'
      ];
      
      const isNoReply = noReplyPatterns.some(pattern => toLower.includes(pattern));
      if (isNoReply) {
        logger.warn(`Attempting to reply to no-reply address: ${to}. The recipient may not receive or read this email.`);
        // Note: We don't throw an error - we just warn. The user may still want to send it.
      }
    }

    // Fetch the original message to get the Message-ID header value (not Gmail message ID)
    let messageIdHeader = ''; // Message-ID header value (e.g., <NM606EFECBA0B27C166adobein_mid_prod8@mail.adobe.com>)
    let referencesHeader = ''; // References header value for proper threading
    
    if (replyToMessageId) {
      try {
        // Fetch the original message to extract Message-ID header
        const originalMessageResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${replyToMessageId}?format=metadata&metadataHeaders=Message-ID&metadataHeaders=References`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (originalMessageResponse.ok) {
          const originalMessage = await this.safeJsonParse(originalMessageResponse);
          
          // Extract Message-ID header value
          if (originalMessage.payload?.headers) {
            const headers = originalMessage.payload.headers;
            const messageIdHeaderObj = headers.find((h: any) => h.name.toLowerCase() === 'message-id');
            const referencesHeaderObj = headers.find((h: any) => h.name.toLowerCase() === 'references');
            
            if (messageIdHeaderObj) {
              messageIdHeader = messageIdHeaderObj.value;
            }
            
            if (referencesHeaderObj) {
              referencesHeader = referencesHeaderObj.value;
            }
          }
        }
      } catch (error) {
        // If we can't fetch the original message, continue without In-Reply-To header
        // This is not critical - Gmail will still thread based on threadId
        logger.warn('Could not fetch original message for In-Reply-To header', { error, replyToMessageId });
      }
    }

    // Create reply message with Message-ID header value (not Gmail message ID)
    const message = this.createEmailMessage(to || '', subject, body, htmlBody, attachments, cc, bcc, from, replyTo, messageIdHeader, referencesHeader);
    
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: message,
        threadId
      })
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'reply', 'message'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        messageId: result.id,
        threadId: result.threadId,
        success: true
      },
      duration
    };
  }

  private async createDraft(accessToken: string, config: any, context: ExecutionContext, startTime: number, nodeData?: any): Promise<ExecutionResult> {
    // Support both config.* and communication.* field formats
    const communication = nodeData?.communication || {};
    
    const to = config.to || communication.toEmail || context.input?.to || context.input?.toEmail;
    const subject = config.subject || communication.subject || context.input?.subject;
    let body = config.body || communication.textContent || context.input?.body || context.input?.textContent;
    let htmlBody = config.htmlBody || communication.htmlContent || context.input?.htmlBody || context.input?.htmlContent;
    const cc = config.cc || communication.cc || context.input?.cc;
    const bcc = config.bcc || communication.bcc || context.input?.bcc;
    const from = config.from || communication.from || context.input?.from;
    const replyTo = config.replyTo || communication.replyTo || context.input?.replyTo;
    const attachments = config.attachments || communication.attachments || context.input?.attachments;

    // Clean unresolved template expressions from content fields (they might be part of AI-generated text)
    if (typeof body === 'string') {
      body = this.cleanUnresolvedTemplates(body);
    }
    if (typeof htmlBody === 'string') {
      htmlBody = this.cleanUnresolvedTemplates(htmlBody);
    }

    if (!to || !subject || !body) {
      throw new Error('to, subject, and body are required for creating draft');
    }

    // Validate template resolution (content fields get special handling)
    this.validateTemplateResolved(to, 'to');
    this.validateTemplateResolved(subject, 'subject');
    this.validateTemplateResolved(body, 'body', true); // true = isContentField

    // Validate email addresses
    this.validateEmails(to, 'to');
    if (cc) {
      this.validateEmails(cc, 'cc');
      this.validateTemplateResolved(cc, 'cc');
    }
    if (bcc) {
      this.validateEmails(bcc, 'bcc');
      this.validateTemplateResolved(bcc, 'bcc');
    }
    if (from) {
      this.validateEmail(from, 'from');
      this.validateTemplateResolved(from, 'from');
    }
    if (replyTo) {
      this.validateEmail(replyTo, 'replyTo');
      this.validateTemplateResolved(replyTo, 'replyTo');
    }

    // Create email message
    const message = this.createEmailMessage(to, subject, body, htmlBody, attachments, cc, bcc, from, replyTo);
    
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          raw: message
        }
      })
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'create draft', 'draft'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        draftId: result.id,
        messageId: result.message?.id,
        threadId: result.message?.threadId,
        success: true
      },
      duration
    };
  }

  private async listDrafts(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const maxResults = config.maxResults || 10;
    const pageToken = config.pageToken || '';
    
    let url = `https://gmail.googleapis.com/gmail/v1/users/me/drafts?maxResults=${maxResults}`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'list drafts', 'draft'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        drafts: result.drafts || [],
        nextPageToken: result.nextPageToken,
        resultSizeEstimate: result.resultSizeEstimate,
        success: true
      },
      duration
    };
  }

  private async getDraft(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const draftId = config.draftId || context.input?.draftId;
    
    if (!draftId) {
      throw new Error('draftId is required for getting draft');
    }

    // Validate template resolution
    this.validateTemplateResolved(draftId, 'draftId');
    
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'get draft', 'draft'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    // Parse the draft message into clean format
    let parsedMessage: any = null;
    if (result.message) {
      parsedMessage = this.parseMessageResult(result.message, config.includeHtml || false);
    }

    return {
      success: true,
      output: {
        draftId: result.id,
        message: parsedMessage, // Clean, parsed message (not raw API response)
        messageId: parsedMessage?.messageId || result.message?.id || '',
        threadId: parsedMessage?.threadId || result.message?.threadId || '',
        success: true
      },
      duration
    };
  }

  private async deleteDraft(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const draftId = config.draftId || context.input?.draftId;
    
    if (!draftId) {
      throw new Error('draftId is required for deleting draft');
    }

    // Validate template resolution
    this.validateTemplateResolved(draftId, 'draftId');
    
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'delete draft', 'draft'));
    }

    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        draftId,
        success: true
      },
      duration
    };
  }

  private async listLabels(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'list labels', 'label'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        labels: result.labels || [],
        success: true
      },
      duration
    };
  }

  private async createLabel(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const labelName = config.labelName || context.input?.labelName;
    const labelListVisibility = config.labelListVisibility || 'labelShow';
    const messageListVisibility = config.messageListVisibility || 'show';
    
    if (!labelName) {
      throw new Error('labelName is required for creating label');
    }
    
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: labelName,
        labelListVisibility: labelListVisibility,
        messageListVisibility: messageListVisibility
      })
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'create label', 'label'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        labelId: result.id,
        name: result.name,
        type: result.type || '',
        messageListVisibility: result.messageListVisibility || '',
        labelListVisibility: result.labelListVisibility || '',
        success: true
      },
      duration
    };
  }

  private async getLabel(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const labelId = config.labelId || context.input?.labelId;
    
    if (!labelId) {
      throw new Error('labelId is required for getting label');
    }

    // Validate template resolution
    this.validateTemplateResolved(labelId, 'labelId');
    
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/labels/${labelId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'get label', 'label'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        labelId: result.id,
        name: result.name,
        type: result.type || '',
        messageListVisibility: result.messageListVisibility || '',
        labelListVisibility: result.labelListVisibility || '',
        success: true
      },
      duration
    };
  }

  private async deleteLabel(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const labelId = config.labelId || context.input?.labelId;
    
    if (!labelId) {
      throw new Error('labelId is required for deleting label');
    }

    // Validate template resolution
    this.validateTemplateResolved(labelId, 'labelId');
    
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/labels/${labelId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'delete label', 'label'));
    }

    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        labelId,
        success: true
      },
      duration
    };
  }

  private async listThreads(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const maxResults = config.maxResults || 10;
    const pageToken = config.pageToken || '';
    const query = config.query || '';
    const labelIds = config.labelIds || [];
    
    let url = `https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=${maxResults}`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }
    if (query) {
      url += `&q=${encodeURIComponent(query)}`;
    }
    if (labelIds && labelIds.length > 0) {
      const labelIdsStr = Array.isArray(labelIds) ? labelIds.join(',') : labelIds;
      url += `&labelIds=${encodeURIComponent(labelIdsStr)}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'list threads', 'thread'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        threads: result.threads || [],
        nextPageToken: result.nextPageToken,
        resultSizeEstimate: result.resultSizeEstimate,
        success: true
      },
      duration
    };
  }

  private async getThread(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const threadId = config.threadId || context.input?.threadId;
    const format = config.format || 'full';
    
    if (!threadId) {
      throw new Error('threadId is required for getting thread');
    }

    // Validate template resolution
    this.validateTemplateResolved(threadId, 'threadId');
    
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=${format}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'get thread', 'thread'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    // Parse all messages in the thread into clean format
    const rawMessages = result.messages || [];
    const parsedMessages = rawMessages.map((msg: any) => this.parseMessageResult(msg, config.includeHtml || false));

    return {
      success: true,
      output: {
        threadId: result.id,
        historyId: result.historyId,
        messages: parsedMessages, // Clean, parsed messages (not raw API responses)
        messageCount: parsedMessages.length,
        success: true
      },
      duration
    };
  }

  private async trashThread(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const threadId = config.threadId || context.input?.threadId;
    
    if (!threadId) {
      throw new Error('threadId is required for trashing thread');
    }

    // Validate template resolution
    this.validateTemplateResolved(threadId, 'threadId');
    
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/trash`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'trash thread', 'thread'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        threadId: result.id || threadId, // Use result.id if available, otherwise use input
        success: true
      },
      duration
    };
  }

  private async untrashThread(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const threadId = config.threadId || context.input?.threadId;
    
    if (!threadId) {
      throw new Error('threadId is required for untrashing thread');
    }

    // Validate template resolution
    this.validateTemplateResolved(threadId, 'threadId');
    
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/untrash`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'untrash thread', 'thread'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        threadId: result.id || threadId, // Use result.id if available, otherwise use input
        success: true
      },
      duration
    };
  }

  private async addLabelToThread(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const threadId = config.threadId || context.input?.threadId;
    const labelIds = config.labelIds || context.input?.labelIds || [];
    
    if (!threadId) {
      throw new Error('threadId is required for adding label to thread');
    }
    if (!labelIds || (Array.isArray(labelIds) && labelIds.length === 0)) {
      throw new Error('labelIds is required for adding label to thread');
    }

    // Validate template resolution
    this.validateTemplateResolved(threadId, 'threadId');
    
    // Handle labelIds as string (comma-separated) or array
    let labelIdsArray = Array.isArray(labelIds) ? labelIds : [];
    if (typeof labelIds === 'string') {
      labelIdsArray = labelIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
    }
    
    if (labelIdsArray.length === 0) {
      throw new Error('At least one labelId is required');
    }
    
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/modify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        addLabelIds: labelIdsArray
      })
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'add label to thread', 'thread'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        threadId: result.id || threadId,
        labelIds: labelIdsArray,
        success: true
      },
      duration
    };
  }

  private async removeLabelFromThread(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const threadId = config.threadId || context.input?.threadId;
    const labelIds = config.labelIds || context.input?.labelIds || [];
    
    if (!threadId) {
      throw new Error('threadId is required for removing label from thread');
    }
    if (!labelIds || (Array.isArray(labelIds) && labelIds.length === 0)) {
      throw new Error('labelIds is required for removing label from thread');
    }

    // Validate template resolution
    this.validateTemplateResolved(threadId, 'threadId');
    
    // Handle labelIds as string (comma-separated) or array
    let labelIdsArray = Array.isArray(labelIds) ? labelIds : [];
    if (typeof labelIds === 'string') {
      labelIdsArray = labelIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
    }
    
    if (labelIdsArray.length === 0) {
      throw new Error('At least one labelId is required');
    }
    
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/modify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        removeLabelIds: labelIdsArray
      })
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'remove label from thread', 'thread'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        threadId: result.id || threadId,
        removedLabelIds: labelIdsArray,
        success: true
      },
      duration
    };
  }

  private async addLabelToMessage(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const messageId = config.messageId || context.input?.messageId;
    const labelIds = config.labelIds || context.input?.labelIds || [];
    
    if (!messageId) {
      throw new Error('messageId is required for adding label to message');
    }
    if (!labelIds || (Array.isArray(labelIds) && labelIds.length === 0)) {
      throw new Error('labelIds is required for adding label to message');
    }

    // Validate template resolution
    this.validateTemplateResolved(messageId, 'messageId');
    
    // Handle labelIds as string (comma-separated) or array
    let labelIdsArray = Array.isArray(labelIds) ? labelIds : [];
    if (typeof labelIds === 'string') {
      labelIdsArray = labelIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
    }
    
    if (labelIdsArray.length === 0) {
      throw new Error('At least one labelId is required');
    }
    
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        addLabelIds: labelIdsArray
      })
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'add label to message', 'message'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        messageId: result.id || messageId,
        labelIds: labelIdsArray,
        success: true
      },
      duration
    };
  }

  private async removeLabelFromMessage(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const messageId = config.messageId || context.input?.messageId;
    const labelIds = config.labelIds || context.input?.labelIds || [];
    
    if (!messageId) {
      throw new Error('messageId is required for removing label from message');
    }
    if (!labelIds || (Array.isArray(labelIds) && labelIds.length === 0)) {
      throw new Error('labelIds is required for removing label from message');
    }

    // Validate template resolution
    this.validateTemplateResolved(messageId, 'messageId');
    
    // Handle labelIds as string (comma-separated) or array
    let labelIdsArray = Array.isArray(labelIds) ? labelIds : [];
    if (typeof labelIds === 'string') {
      labelIdsArray = labelIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
    }
    
    if (labelIdsArray.length === 0) {
      throw new Error('At least one labelId is required');
    }
    
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        removeLabelIds: labelIdsArray
      })
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'remove label from message', 'message'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        messageId: result.id || messageId,
        removedLabelIds: labelIdsArray,
        success: true
      },
      duration
    };
  }

  private async deleteMessage(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const messageId = config.messageId || context.input?.messageId;
    
    if (!messageId) {
      throw new Error('messageId is required for deleting message');
    }

    // Validate template resolution
    this.validateTemplateResolved(messageId, 'messageId');
    
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'delete message', 'message'));
    }

    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        messageId,
        success: true
      },
      duration
    };
  }

  private async getManyMessages(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const messageIds = config.messageIds || context.input?.messageIds || [];
    const format = config.format || 'full';
    
    if (!messageIds || (Array.isArray(messageIds) && messageIds.length === 0)) {
      throw new Error('messageIds is required for getting many messages');
    }
    
    // Handle messageIds as string (comma-separated) or array
    let messageIdsArray = Array.isArray(messageIds) ? messageIds : [];
    if (typeof messageIds === 'string') {
      messageIdsArray = messageIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
    }
    
    if (messageIdsArray.length === 0) {
      throw new Error('At least one messageId is required');
    }
    
    // Fetch all messages in parallel
    const messagePromises = messageIdsArray.map(async (messageId: string) => {
      const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=${format}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await this.safeJsonParse(response);
        throw new Error(this.getErrorMessage(response, error, 'get message', 'message'));
      }

      return await this.safeJsonParse(response);
    });

    const rawMessages = await Promise.all(messagePromises);
    const duration = Date.now() - startTime;

    // Parse all messages into clean format (no raw data)
    const parsedMessages = rawMessages.map(msg => this.parseMessageResult(msg, config.includeHtml || false));

    return {
      success: true,
      output: {
        messages: parsedMessages, // Clean, parsed messages (not raw API responses)
        count: parsedMessages.length,
        success: true
      },
      duration
    };
  }

  private async markAsRead(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const messageId = config.messageId || context.input?.messageId;
    
    if (!messageId) {
      throw new Error('messageId is required for marking message as read');
    }

    // Validate template resolution
    this.validateTemplateResolved(messageId, 'messageId');
    
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        removeLabelIds: ['UNREAD']
      })
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'mark as read', 'message'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        messageId: result.id || messageId, // Use result.id if available, otherwise use input
        success: true
      },
      duration
    };
  }

  private async markAsUnread(accessToken: string, config: any, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const messageId = config.messageId || context.input?.messageId;
    
    if (!messageId) {
      throw new Error('messageId is required for marking message as unread');
    }

    // Validate template resolution
    this.validateTemplateResolved(messageId, 'messageId');
    
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        addLabelIds: ['UNREAD']
      })
    });

    if (!response.ok) {
      const error = await this.safeJsonParse(response);
      throw new Error(this.getErrorMessage(response, error, 'mark as unread', 'message'));
    }

    const result = await this.safeJsonParse(response);
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        messageId: result.id || messageId, // Use result.id if available, otherwise use input
        success: true
      },
      duration
    };
  }

  private async sendAndWait(accessToken: string, config: any, context: ExecutionContext, startTime: number, nodeData?: any): Promise<ExecutionResult> {
    // First send the email
    const sendResult = await this.sendEmail(accessToken, config, context, startTime, nodeData);
    
    if (!sendResult.success) {
      return sendResult;
    }

    // Wait for response (poll for replies)
    const threadId = sendResult.output?.threadId;
    const maxWaitTime = (config.maxWaitTime || 300) * 1000; // Convert seconds to milliseconds
    const pollInterval = (config.pollInterval || 5) * 1000; // Convert seconds to milliseconds
    const timeout = Date.now() + maxWaitTime;

    if (!threadId) {
      return {
        ...sendResult,
        output: {
          ...sendResult.output,
          replyReceived: false,
          message: 'No threadId returned, cannot wait for response'
        }
      };
    }

    // Get initial message count in the thread (before waiting for reply)
    let initialMessageCount = 1; // We just sent a message, so thread has at least 1 message
    try {
      const initialThreadResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=metadata`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (initialThreadResponse.ok) {
        const initialThread = await initialThreadResponse.json();
        initialMessageCount = (initialThread.messages || []).length;
      }
    } catch (error) {
      // If we can't get initial count, assume 1 (the message we just sent)
      logger.warn('Could not get initial thread message count', { error, threadId });
    }

    // Get our email address to identify our own messages
    let ourEmailAddress = '';
    try {
      const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        ourEmailAddress = profile.emailAddress || '';
      }
    } catch (error) {
      // Continue without email address - we'll use message count only
      logger.warn('Could not get user email address', { error });
    }

    // Poll for new messages in the thread
    while (Date.now() < timeout) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      try {
        const threadResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (threadResponse.ok) {
          const thread = await threadResponse.json();
          const messages = thread.messages || [];
          
          // Check if there are more messages than when we started (indicating a reply)
          if (messages.length > initialMessageCount) {
            // Get the latest message (should be the reply)
            const latestMessage = messages[messages.length - 1];
            
            // Try to verify it's not from us (if we have our email address)
            if (ourEmailAddress) {
              const fromHeader = latestMessage.payload?.headers?.find((h: any) => h.name.toLowerCase() === 'from');
              const fromValue = fromHeader?.value || '';
              
              // If the message is from us, continue waiting (not a reply yet)
              if (fromValue.includes(ourEmailAddress)) {
                continue;
              }
            }
            
            // This looks like a reply - parse it and return
            const parsedReply = this.parseMessageResult(latestMessage, config.includeHtml || false);
            
            return {
              success: true,
              output: {
                ...sendResult.output,
                replyReceived: true,
                replyMessage: parsedReply, // Clean, parsed message (not raw API response)
                replyMessageId: latestMessage.id,
                waitTime: Date.now() - startTime
              },
              duration: Date.now() - startTime
            };
          }
        }
      } catch (error) {
        // Continue polling on error
        logger.warn('Error polling for reply', { error, threadId });
      }
    }

    // Timeout - no reply received
    return {
      success: true,
      output: {
        ...sendResult.output,
        replyReceived: false,
        message: 'Timeout waiting for response',
        waitTime: maxWaitTime
      },
      duration: Date.now() - startTime
    };
  }

  private createEmailMessage(
    to: string, 
    subject: string, 
    body: string, 
    htmlBody?: string, 
    attachments?: any[], 
    cc?: string, 
    bcc?: string, 
    from?: string, 
    replyTo?: string,
    inReplyTo?: string,
    references?: string
  ): string {
    // Generate boundaries for multipart messages
    const mainBoundary = 'boundary_' + Math.random().toString(36).substr(2, 9);
    const altBoundary = 'boundary_' + Math.random().toString(36).substr(2, 9);
    
    let message = '';
    
    // From header
    if (from) {
      message += `From: ${from}\r\n`;
    }
    
    // To header
    if (to) {
      message += `To: ${to}\r\n`;
    }
    
    // CC header
    if (cc) {
      message += `Cc: ${cc}\r\n`;
    }
    
    // BCC header
    if (bcc) {
      message += `Bcc: ${bcc}\r\n`;
    }
    
    // Reply-To header
    if (replyTo) {
      message += `Reply-To: ${replyTo}\r\n`;
    }
    
    // In-Reply-To header (for threading) - must be Message-ID header value, not Gmail message ID
    if (inReplyTo) {
      message += `In-Reply-To: ${inReplyTo}\r\n`;
    }
    
    // References header (for threading) - contains Message-ID of original message and previous messages in thread
    if (references) {
      // Append the current In-Reply-To to References if it's not already there
      if (inReplyTo && !references.includes(inReplyTo)) {
        message += `References: ${references} ${inReplyTo}\r\n`;
      } else {
        message += `References: ${references}\r\n`;
      }
    } else if (inReplyTo) {
      // If no References header but we have In-Reply-To, use it as References too
      message += `References: ${inReplyTo}\r\n`;
    }
    
    // Date header (RFC 5322 requirement)
    message += `Date: ${new Date().toUTCString()}\r\n`;
    
    message += `Subject: ${subject}\r\n`;
    message += `MIME-Version: 1.0\r\n`;
    
    // Check if we have attachments
    const hasAttachments = attachments && Array.isArray(attachments) && attachments.length > 0;
    const hasHtml = !!htmlBody;
    
    if (hasAttachments) {
      // Multipart/mixed for attachments
      message += `Content-Type: multipart/mixed; boundary="${mainBoundary}"\r\n\r\n`;
      
      // Add message body as multipart/alternative if HTML, or plain text
      if (hasHtml) {
        message += `--${mainBoundary}\r\n`;
        message += `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n`;
        
        // Plain text part
        message += `--${altBoundary}\r\n`;
      message += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
      message += `${body}\r\n\r\n`;
        
        // HTML part
        message += `--${altBoundary}\r\n`;
      message += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
      message += `${htmlBody}\r\n\r\n`;
        
        message += `--${altBoundary}--\r\n\r\n`;
    } else {
        // Plain text only
        message += `--${mainBoundary}\r\n`;
        message += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
        message += `${body}\r\n\r\n`;
      }
      
      // Add attachments
      for (const attachment of attachments) {
        message += `--${mainBoundary}\r\n`;
        
        // Get attachment data
        let attachmentData: Buffer;
        let contentType = 'application/octet-stream';
        let filename = 'attachment';
        
        if (attachment.content) {
          // If content is already a Buffer
          if (Buffer.isBuffer(attachment.content)) {
            attachmentData = attachment.content;
          } 
          // If content is base64 string
          else if (typeof attachment.content === 'string') {
            attachmentData = Buffer.from(attachment.content, 'base64');
          }
          // If content is an object with data
          else if (attachment.content.data) {
            attachmentData = Buffer.from(attachment.content.data, 'base64');
          } else {
            throw new Error(`Invalid attachment content format for attachment: ${attachment.name || 'unknown'}`);
          }
        } else {
          throw new Error(`Attachment missing content: ${attachment.name || 'unknown'}`);
        }
        
        // Get content type
        if (attachment.type || attachment.contentType) {
          contentType = attachment.type || attachment.contentType;
        } else if (attachment.name) {
          // Try to infer from filename
          const ext = attachment.name.split('.').pop()?.toLowerCase();
          const mimeTypes: Record<string, string> = {
            'pdf': 'application/pdf',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'txt': 'text/plain',
            'html': 'text/html',
            'csv': 'text/csv',
            'json': 'application/json',
            'xml': 'application/xml',
            'zip': 'application/zip',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          };
          if (ext && mimeTypes[ext]) {
            contentType = mimeTypes[ext];
          }
        }
        
        // Get filename
        if (attachment.name || attachment.filename) {
          filename = attachment.name || attachment.filename;
        }
        
        // Encode filename for Content-Disposition (handle special characters)
        const encodedFilename = filename.replace(/[^\x20-\x7E]/g, (char) => {
          return `=?UTF-8?B?${Buffer.from(char).toString('base64')}?=`;
        });
        
        message += `Content-Type: ${contentType}; name="${encodedFilename}"\r\n`;
        message += `Content-Disposition: attachment; filename="${encodedFilename}"\r\n`;
        message += `Content-Transfer-Encoding: base64\r\n\r\n`;
        
        // Add base64-encoded attachment data (with line breaks every 76 characters for RFC compliance)
        const base64Data = attachmentData.toString('base64');
        const chunkSize = 76;
        for (let i = 0; i < base64Data.length; i += chunkSize) {
          message += base64Data.substring(i, i + chunkSize) + '\r\n';
        }
        
        message += '\r\n';
      }
      
      message += `--${mainBoundary}--\r\n`;
    } else if (hasHtml) {
      // No attachments, but has HTML - use multipart/alternative
      message += `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n`;
      message += `--${altBoundary}\r\n`;
      message += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
      message += `${body}\r\n\r\n`;
      message += `--${altBoundary}\r\n`;
      message += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
      message += `${htmlBody}\r\n\r\n`;
      message += `--${altBoundary}--\r\n`;
    } else {
      // Plain text only, no attachments
      message += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
      message += `${body}\r\n`;
    }

    // Encode message in base64url format
    return Buffer.from(message).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
export default GmailNode;
