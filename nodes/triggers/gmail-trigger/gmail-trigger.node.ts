import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
import { DateTime } from 'luxon';
import { simpleParser } from 'mailparser';
import { logger } from '../../lib/logger.js';

interface GmailTriggerFilters {
  includeSpamTrash?: boolean;
  includeDrafts?: boolean;
  labelIds?: string | string[];
  q?: string;
  readStatus?: 'read' | 'unread' | 'both';
  sender?: string;
  receivedAfter?: number;
}

interface GmailTriggerOptions {
  dataPropertyAttachmentsPrefixName?: string;
  downloadAttachments?: boolean;
}

interface GmailWorkflowStaticData {
  lastTimeChecked?: number;
  possibleDuplicates?: string[];
}

interface Message {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  date?: string;
  headers?: Record<string, string>;
  internalDate?: string;
  sizeEstimate?: number;
  raw?: string;
  payload?: any;
}

interface MessageListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export class GmailTriggerNode {
  getNodeDefinition() {
    return {
      id: 'gmail-trigger',
      type: 'trigger',
      name: 'Gmail Trigger',
      description: 'Fetches emails from Gmail and starts the workflow on specified polling intervals',
      category: 'trigger',
      version: '1.0.0',
      author: 'Workflow Studio',
      polling: true, // Mark as polling trigger node
      parameters: [
        {
          name: 'authentication',
          type: 'options',
          displayName: 'Authentication',
          description: 'Authentication method',
          required: false,
          default: 'oAuth2',
          options: [
            { value: 'oAuth2', label: 'OAuth2 (recommended)' },
            { value: 'serviceAccount', label: 'Service Account' }
          ]
        },
        {
          name: 'event',
          type: 'options',
          displayName: 'Event',
          description: 'Event to trigger on',
          required: false,
          default: 'messageReceived',
          options: [
            { value: 'messageReceived', label: 'Message Received' }
          ]
        },
        {
          name: 'pollTimes',
          type: 'fixedCollection',
          displayName: 'Poll Times',
          description: 'Time at which polling should occur',
          required: false,
          default: { item: [{ mode: 'everyMinute' }] },
          multipleValues: true,
          properties: [
            {
              name: 'item',
              displayName: 'Item',
              type: 'collection',
              properties: [
                {
                  name: 'mode',
                  type: 'options',
                  displayName: 'Mode',
                  description: 'How often to trigger',
                  required: true,
                  default: 'everyMinute',
                  options: [
                    { value: 'everyMinute', label: 'Every Minute' },
                    { value: 'everyHour', label: 'Every Hour' },
                    { value: 'everyDay', label: 'Every Day' },
                    { value: 'everyWeek', label: 'Every Week' },
                    { value: 'everyMonth', label: 'Every Month' },
                    { value: 'everyX', label: 'Every X' },
                    { value: 'custom', label: 'Custom' }
                  ]
                },
                {
                  name: 'hour',
                  type: 'number',
                  displayName: 'Hour',
                  description: 'The hour of the day to trigger (24h format)',
                  required: false,
                  default: 14,
                  min: 0,
                  max: 23
                },
                {
                  name: 'minute',
                  type: 'number',
                  displayName: 'Minute',
                  description: 'The minute of the day to trigger',
                  required: false,
                  default: 0,
                  min: 0,
                  max: 59
                },
                {
                  name: 'dayOfMonth',
                  type: 'number',
                  displayName: 'Day of Month',
                  description: 'The day of the month to trigger',
                  required: false,
                  default: 1,
                  min: 1,
                  max: 31
                },
                {
                  name: 'weekday',
                  type: 'options',
                  displayName: 'Weekday',
                  description: 'The weekday to trigger',
                  required: false,
                  default: '1',
                  options: [
                    { value: '0', label: 'Sunday' },
                    { value: '1', label: 'Monday' },
                    { value: '2', label: 'Tuesday' },
                    { value: '3', label: 'Wednesday' },
                    { value: '4', label: 'Thursday' },
                    { value: '5', label: 'Friday' },
                    { value: '6', label: 'Saturday' }
                  ]
                },
                {
                  name: 'cronExpression',
                  type: 'string',
                  displayName: 'Cron Expression',
                  description: 'Custom cron expression (e.g., * * * * * *)',
                  required: false,
                  default: '* * * * * *',
                  placeholder: '* * * * * *'
                },
                {
                  name: 'value',
                  type: 'number',
                  displayName: 'Value',
                  description: 'All how many X minutes/hours it should trigger',
                  required: false,
                  default: 2,
                  min: 0,
                  max: 1000
                },
                {
                  name: 'unit',
                  type: 'options',
                  displayName: 'Unit',
                  description: 'If it should trigger all X minutes or hours',
                  required: false,
                  default: 'hours',
                  options: [
                    { value: 'minutes', label: 'Minutes' },
                    { value: 'hours', label: 'Hours' }
                  ]
                }
              ]
            }
          ]
        },
        {
          name: 'simple',
          type: 'boolean',
          displayName: 'Simplify',
          description: 'Whether to return a simplified version of the response instead of the raw data',
          required: false,
          default: true
        },
        {
          name: 'filters',
          type: 'collection',
          displayName: 'Filters',
          description: 'Filter options for emails',
          required: false,
          default: {},
          properties: [
            {
              name: 'includeSpamTrash',
              type: 'boolean',
              displayName: 'Include Spam and Trash',
              description: 'Whether to include messages from SPAM and TRASH in the results',
              default: false
            },
            {
              name: 'includeDrafts',
              type: 'boolean',
              displayName: 'Include Drafts',
              description: 'Whether to include email drafts in the results',
              default: false
            },
            {
              name: 'labelIds',
              type: 'string',
              displayName: 'Label Names or IDs',
              description: 'Comma-separated label IDs to filter by',
              placeholder: 'INBOX,UNREAD'
            },
            {
              name: 'q',
              type: 'string',
              displayName: 'Search',
              description: 'Gmail search query (same format as Gmail search box)',
              placeholder: 'has:attachment'
            },
            {
              name: 'readStatus',
              type: 'options',
              displayName: 'Read Status',
              description: 'Filter emails by read status',
              options: [
                { value: 'both', label: 'Unread and read emails' },
                { value: 'unread', label: 'Unread emails only' },
                { value: 'read', label: 'Read emails only' }
              ],
              default: 'unread'
            },
            {
              name: 'sender',
              type: 'string',
              displayName: 'Sender',
              description: 'Sender name or email to filter by',
              placeholder: 'sender@example.com'
            }
          ]
        },
        {
          name: 'options',
          type: 'collection',
          displayName: 'Options',
          description: 'Additional options',
          required: false,
          default: {},
          properties: [
            {
              name: 'dataPropertyAttachmentsPrefixName',
              type: 'string',
              displayName: 'Attachment Prefix',
              description: 'Prefix for attachment binary property names',
              default: 'attachment_'
            },
            {
              name: 'downloadAttachments',
              type: 'boolean',
              displayName: 'Download Attachments',
              description: "Whether the email's attachments will be downloaded",
              default: false
            }
          ]
        }
      ],
      inputs: [],
      outputs: [
        {
          name: 'data',
          type: 'object',
          displayName: 'Email Data',
          description: 'Email message data',
          dataType: 'object'
        }
      ]
    };
  }

  private async getAccessToken(context: ExecutionContext): Promise<string> {
    const cfg = (context as any).node?.data?.config || {};
    let accessToken = cfg.accessToken;

    if (!accessToken) {
      try {
        const { oauthService } = await import('../../services/oauth.service');
        
        if (!oauthService) {
          throw new Error('OAuth service not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
        }
        
        const userId = (context as any).userId;
        
        if (!userId || userId === 'default-user') {
          throw new Error(`User ID not found in workflow context. Ensure you are authenticated and running workflows through the authenticated API.`);
        }
        
        const cleanUserId = String(userId || '').trim();
        if (!cleanUserId || cleanUserId === 'default-user') {
          throw new Error(`Invalid userId: ${userId}. Ensure you are authenticated and running workflows through the authenticated API.`);
        }
        
        accessToken = await oauthService.getValidAccessToken(cleanUserId, 'google');
        
        logger.info('Gmail trigger got OAuth token successfully', {
          userId: cleanUserId,
          workflowId: context.workflowId
        });
      } catch (error: any) {
        logger.error('Gmail trigger OAuth token retrieval failed', error);
        throw new Error(`Failed to get OAuth token: ${error.message}`);
      }
    }

    return accessToken;
  }

  private prepareQuery(filters: GmailTriggerFilters): Record<string, any> {
    const qs: Record<string, any> = {};

    if (filters.labelIds) {
      const labelIds = typeof filters.labelIds === 'string' 
        ? filters.labelIds.split(',').map(id => id.trim()).filter(id => id.length > 0)
        : filters.labelIds;
      if (labelIds.length > 0) {
        qs.labelIds = labelIds;
      }
    }

    let query = filters.q || '';

    if (filters.sender) {
      query = query ? `${query} from:${filters.sender}` : `from:${filters.sender}`;
    }

    if (filters.readStatus && filters.readStatus !== 'both') {
      query = query ? `${query} is:${filters.readStatus}` : `is:${filters.readStatus}`;
    }

    if (filters.receivedAfter) {
      const timestamp = filters.receivedAfter;
      query = query ? `${query} after:${timestamp}` : `after:${timestamp}`;
    }

    if (query) {
      qs.q = query;
    }

    if (filters.includeSpamTrash) {
      qs.includeSpamTrash = filters.includeSpamTrash;
    }

    return qs;
  }

  private prepareTimestamp(dateValue: string | number | Date): number {
    if (typeof dateValue === 'number') {
      // If it's already a timestamp in seconds, return it
      if (dateValue.toString().length <= 10) {
        return Math.floor(dateValue);
      }
      // If it's in milliseconds, convert to seconds
      return Math.floor(dateValue / 1000);
    }

    if (dateValue instanceof Date) {
      return Math.floor(dateValue.getTime() / 1000);
    }

    try {
      const dt = DateTime.fromISO(dateValue as string);
      return Math.floor(dt.toSeconds());
    } catch {
      // Try parsing as timestamp
      const parsed = parseInt(dateValue as string, 10);
      if (!isNaN(parsed)) {
        if (parsed.toString().length <= 10) {
          return parsed;
        }
        return Math.floor(parsed / 1000);
      }
    }

    throw new Error(`Invalid date value: ${dateValue}`);
  }

  private async parseRawEmail(
    messageData: Message,
    dataPropertyNameDownload: string,
    downloadAttachments: boolean
  ): Promise<any> {
    if (!messageData.raw) {
      return { json: messageData };
    }

    const messageEncoded = Buffer.from(messageData.raw, 'base64').toString('utf8');
    const responseData = await simpleParser(messageEncoded);

    const headers: Record<string, string> = {};
    if (responseData.headerLines) {
      for (const header of responseData.headerLines) {
        headers[header.key] = header.line;
      }
    }

    const binaryData: Record<string, any> = {};
    if (downloadAttachments && responseData.attachments) {
      for (let i = 0; i < responseData.attachments.length; i++) {
        const attachment = responseData.attachments[i];
        binaryData[`${dataPropertyNameDownload}${i}`] = {
          data: attachment.content,
          mimeType: attachment.contentType,
          fileName: attachment.filename
        };
      }
    }

    const mailBaseData: any = {
      id: messageData.id,
      threadId: messageData.threadId,
      labelIds: messageData.labelIds,
      sizeEstimate: messageData.sizeEstimate
    };

    const json = {
      ...mailBaseData,
      ...responseData,
      headers,
      date: responseData.date ? responseData.date.toISOString() : responseData.date,
      attachments: responseData.attachments?.map((att: any) => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size
      }))
    };

    return {
      json,
      binary: Object.keys(binaryData).length > 0 ? binaryData : undefined
    };
  }

  private async simplifyOutput(
    accessToken: string,
    data: Message[]
  ): Promise<any[]> {
    // Fetch labels
    const labelsResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    let labels: Array<{ id: string; name: string }> = [];
    if (labelsResponse.ok) {
      const labelsData = await labelsResponse.json();
      labels = (labelsData.labels || []).map((label: any) => ({
        id: label.id,
        name: label.name
      }));
    }

    return (data || []).map((item) => {
      const result: any = { ...item };

      if (item.labelIds) {
        result.labels = labels.filter((label) =>
          item.labelIds?.includes(label.id)
        );
        delete result.labelIds;
      }

      if (item.payload && item.payload.headers) {
        const headers = item.payload.headers;
        if (Array.isArray(headers)) {
          headers.forEach((header: any) => {
            result[header.name] = header.value;
          });
        }
        delete result.payload;
      }

      return result;
    });
  }

  private getEmailDateAsSeconds(email: Message, fallbackDate: number): number {
    let date: number | null = null;

    if (email.internalDate) {
      date = Math.floor(parseInt(email.internalDate) / 1000);
    } else if (email.date) {
      try {
        date = Math.floor(DateTime.fromJSDate(new Date(email.date)).toSeconds());
      } catch {
        // Ignore
      }
    } else if (email.headers?.date) {
      try {
        date = Math.floor(DateTime.fromJSDate(new Date(email.headers.date)).toSeconds());
      } catch {
        // Ignore
      }
    }

    if (!date || isNaN(date)) {
      return fallbackDate;
    }

    return date;
  }

  async poll(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult | null> {
    const startTime = Date.now();
    const cfg = node.data?.config || {};
    const filters: GmailTriggerFilters = cfg.filters || {};
    const options: GmailTriggerOptions = cfg.options || {};
    const simple = cfg.simple !== undefined ? cfg.simple : true;

    try {
      // Get access token
      const accessToken = await this.getAccessToken(context);

      // Get workflow static data for tracking last check time
      const workflowId = context.workflowId || 'default';
      const nodeName = node.name || node.id;
      const staticDataKey = `gmail-trigger-${workflowId}-${nodeName}`;
      
      // In a real implementation, you'd use a proper static data store
      // For now, we'll use a simple in-memory approach (should be replaced with database)
      const now = Math.floor(DateTime.now().toSeconds());
      let lastTimeChecked = (context as any).staticData?.[staticDataKey]?.lastTimeChecked || now;
      let possibleDuplicates = (context as any).staticData?.[staticDataKey]?.possibleDuplicates || [];

      // For manual execution, don't use time filtering
      const isManual = (context as any).isManual || false;
      const startDate = isManual ? undefined : lastTimeChecked;

      // Prepare query
      const allFilters: GmailTriggerFilters = { ...filters };
      if (startDate) {
        allFilters.receivedAfter = startDate;
      }

      const qs = this.prepareQuery(allFilters);
      
      if (isManual) {
        qs.maxResults = 1;
      }

      // Fetch messages
      const params = new URLSearchParams();
      Object.entries(qs).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.append(key, String(value));
        }
      });

      const messagesUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`;
      const messagesResponse = await fetch(messagesUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!messagesResponse.ok) {
        const error = await messagesResponse.json();
        throw new Error(`Gmail API error: ${error.error?.message || messagesResponse.statusText}`);
      }

      const messagesData: MessageListResponse = await messagesResponse.json();
      const messages = messagesData.messages || [];

      if (!messages.length) {
        return null;
      }

      // Fetch full message details
      const format = simple ? 'metadata' : 'raw';
      const metadataHeaders = simple ? ['From', 'To', 'Cc', 'Bcc', 'Subject'] : undefined;

      let responseData: any[] = [];
      const allFetchedMessages: Message[] = [];

      for (const message of messages) {
        let messageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=${format}`;
        if (metadataHeaders) {
          metadataHeaders.forEach(header => {
            messageUrl += `&metadataHeaders=${header}`;
          });
        }

        const fullMessageResponse = await fetch(messageUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!fullMessageResponse.ok) {
          logger.warn(`Failed to fetch message ${message.id}`, {
            status: fullMessageResponse.status,
            statusText: fullMessageResponse.statusText
          });
          continue;
        }

        const fullMessage: Message = await fullMessageResponse.json();
        allFetchedMessages.push(fullMessage);

        // Filter out drafts if not included
        const includeDrafts = filters.includeDrafts ?? false;
        if (!includeDrafts && fullMessage.labelIds?.includes('DRAFT')) {
          continue;
        }

        // Filter out sent emails that aren't in inbox (for version > 1.2)
        if (
          fullMessage.labelIds?.includes('SENT') &&
          !fullMessage.labelIds?.includes('INBOX')
        ) {
          continue;
        }

        if (!simple) {
          const dataPropertyNameDownload = options.dataPropertyAttachmentsPrefixName || 'attachment_';
          const downloadAttachments = options.downloadAttachments || false;
          const parsed = await this.parseRawEmail(fullMessage, dataPropertyNameDownload, downloadAttachments);
          responseData.push(parsed);
        } else {
          responseData.push({ json: fullMessage });
        }
      }

      if (simple && responseData.length > 0) {
        const simplified = await this.simplifyOutput(
          accessToken,
          responseData.map(item => item.json)
        );
        responseData = simplified.map(item => ({ json: item }));
      }

      // Handle duplicates and update last checked time
      const emailsWithInvalidDate = new Set<string>();
      const getEmailDate = (email: Message): number => {
        const date = this.getEmailDateAsSeconds(email, lastTimeChecked);
        if (date === lastTimeChecked && email.id) {
          emailsWithInvalidDate.add(email.id);
        }
        return date;
      };

      const lastEmailDate = allFetchedMessages.reduce((lastDate, message) => {
        const emailDate = getEmailDate(message);
        return emailDate > lastDate ? emailDate : lastDate;
      }, 0);

      const nextPollPossibleDuplicates = allFetchedMessages.reduce((duplicates: string[], message) => {
        const emailDate = getEmailDate(message);
        return emailDate <= lastEmailDate ? duplicates.concat(message.id) : duplicates;
      }, Array.from(emailsWithInvalidDate));

      // Filter out known duplicates
      const possibleDuplicatesSet = new Set(possibleDuplicates);
      if (possibleDuplicatesSet.size > 0) {
        responseData = responseData.filter(({ json }) => {
          if (!json || typeof json.id !== 'string') return false;
          return !possibleDuplicatesSet.has(json.id);
        });
      }

      // Update static data (in real implementation, save to database)
      if (!isManual) {
        (context as any).staticData = (context as any).staticData || {};
        (context as any).staticData[staticDataKey] = {
          lastTimeChecked: lastEmailDate || lastTimeChecked,
          possibleDuplicates: nextPollPossibleDuplicates
        };
      }

      if (responseData.length === 0) {
        return null;
      }

      // Return result
      const output = responseData.length === 1 ? responseData[0].json : responseData.map(item => item.json);

      return {
        success: true,
        output: output,
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      logger.error('Gmail trigger poll failed', error, {
        nodeId: node.id,
        workflowId: context.workflowId
      });

      // For manual execution, throw error
      const isManual = (context as any).isManual || false;
      if (isManual) {
        throw error;
      }

      // For automatic polling, return null to continue polling
      return null;
    }
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    // For trigger nodes, execute is called for manual testing
    // In production, poll() is called by the workflow engine
    const result = await this.poll(node, { ...context, isManual: true } as any);
    
    if (!result) {
      return {
        success: true,
        output: { message: 'No new emails found' },
        duration: 0
      };
    }

    return result;
  }
}

export default GmailTriggerNode;

