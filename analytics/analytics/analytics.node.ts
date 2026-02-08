import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;

export class AnalyticsNode {
  getNodeDefinition() {
    return {
      id: 'analytics',
      type: 'action',
      name: 'Analytics',
      description: 'Track events and metrics for analytics',
      category: 'analytics',
      version: '1.0.0',
      author: 'Workflow Studio',
      parameters: [
        {
          name: 'eventName',
          type: 'string',
          displayName: 'Event Name',
          description: 'Name of the event to track',
          required: true,
          placeholder: 'user_signup'
        },
        {
          name: 'properties',
          type: 'object',
          displayName: 'Properties',
          description: 'Event properties/metadata (JSON object)',
          required: false,
          default: {}
        },
        {
          name: 'userId',
          type: 'string',
          displayName: 'User ID',
          description: 'User identifier',
          required: false,
          placeholder: 'user_123'
        },
        {
          name: 'anonymousId',
          type: 'string',
          displayName: 'Anonymous ID',
          description: 'Anonymous user identifier',
          required: false,
          placeholder: 'anon_456'
        },
        {
          name: 'timestamp',
          type: 'string',
          displayName: 'Timestamp',
          description: 'Event timestamp (ISO format)',
          required: false
        },
        {
          name: 'trackerType',
          type: 'options',
          displayName: 'Tracker Type',
          description: 'Where to send analytics data',
          required: false,
          default: 'internal',
          options: [
            { name: 'Internal Only', value: 'internal' },
            { name: 'Segment', value: 'segment' },
            { name: 'Google Analytics', value: 'google-analytics' },
            { name: 'Custom Webhook', value: 'webhook' }
          ]
        },
        {
          name: 'webhookUrl',
          type: 'string',
          displayName: 'Webhook URL',
          description: 'Custom webhook URL for sending events',
          required: false,
          placeholder: 'https://api.example.com/analytics'
        },
        {
          name: 'webhookHeaders',
          type: 'object',
          displayName: 'Webhook Headers',
          description: 'HTTP headers for webhook requests (JSON object)',
          required: false,
          default: {}
        }
      ],
      inputs: [
        {
          name: 'eventName',
          type: 'string',
          displayName: 'Event Name',
          description: 'Event name from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'properties',
          type: 'object',
          displayName: 'Properties',
          description: 'Event properties from previous node',
          required: false,
          dataType: 'object'
        },
        {
          name: 'userId',
          type: 'string',
          displayName: 'User ID',
          description: 'User ID from previous node',
          required: false,
          dataType: 'text'
        }
      ],
      configSchema: {
        type: 'object',
        properties: {
          eventName: { type: 'string' },
          properties: { type: 'object' },
          userId: { type: 'string' },
          anonymousId: { type: 'string' },
          timestamp: { type: 'string' },
          trackerType: { type: 'string', enum: ['internal', 'segment', 'google-analytics', 'webhook'] },
          webhookUrl: { type: 'string' },
          webhookHeaders: { type: 'object' }
        },
        required: ['eventName']
      },
      inputSchema: {
        type: 'object',
        properties: {
          eventName: { type: 'string' },
          properties: { type: 'object' },
          userId: { type: 'string' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    const startTime = Date.now();

    
    // Validation for required parameters
    if (!config.eventName && !context.input?.eventName) {
      throw new Error('Required parameter "eventName" is missing');
    }

    
    try {
      const eventName = config.eventName || context.input?.eventName;
      const properties = config.properties || context.input?.properties || {};
      const userId = config.userId || context.input?.userId;
      const anonymousId = config.anonymousId;
      const timestamp = config.timestamp || new Date().toISOString();
      const trackerType = config.trackerType || 'internal';
      const webhookUrl = config.webhookUrl;
      const webhookHeaders = config.webhookHeaders || {};

      if (!eventName) {
        throw new Error('Event name is required');
      }

      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      logger.info('Tracking analytics event', {
        nodeId: node.id,
        eventName,
        eventId,
        userId: userId || anonymousId,
        trackerType,
        runId: context.runId
      });

      const eventData = {
        event: eventName,
        properties: typeof properties === 'string' ? JSON.parse(properties) : properties,
        userId: userId || undefined,
        anonymousId: anonymousId || undefined,
        timestamp,
        eventId,
        context: {
          workflowId: context.workflowId,
          nodeId: node.id,
          runId: context.runId
        }
      };

      let result: any = {
        success: true,
        eventId,
        timestamp
      };

      // Send to different trackers based on type
      switch (trackerType) {
        case 'internal':
          // Store internally (could be saved to database)
          logger.info('Analytics event tracked internally', {
            eventId,
            eventName,
            properties: JSON.stringify(eventData.properties).substring(0, 200)
          });
          break;

        case 'segment':
          // Send to Segment (would require Segment write key)
          logger.info('Analytics event would be sent to Segment', { eventId, eventName });
          // TODO: Implement Segment integration
          break;

        case 'google-analytics':
          // Send to Google Analytics (would require GA tracking ID)
          logger.info('Analytics event would be sent to Google Analytics', { eventId, eventName });
          // TODO: Implement Google Analytics integration
          break;

        case 'webhook':
          if (!webhookUrl) {
            throw new Error('Webhook URL is required when tracker type is webhook');
          }

          try {
            const headers = {
              'Content-Type': 'application/json',
              ...(typeof webhookHeaders === 'string' ? JSON.parse(webhookHeaders) : webhookHeaders)
            };

            const response = await fetch(webhookUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify(eventData)
            });

            if (!response.ok) {
              throw new Error(`Webhook request failed: ${response.statusText}`);
            }

            const responseData = await response.json().catch(() => ({}));
            result.webhookResponse = responseData;
            result.webhookStatus = response.status;
          } catch (error: any) {
            logger.error('Webhook analytics tracking failed', error, {
              nodeId: node.id,
              eventId,
              webhookUrl
            });
            throw error;
          }
          break;

        default:
          throw new Error(`Unsupported tracker type: ${trackerType}`);
      }

      const duration = Date.now() - startTime;

      logger.externalService('Analytics', trackerType, duration, true, {
        nodeId: node.id,
        eventName,
        eventId,
        runId: context.runId
      });

      return {
        success: true,
        output: result,
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.externalService('Analytics', config.trackerType || 'unknown', duration, false, {
        nodeId: node.id,
        error: error.message,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }}


export default AnalyticsNode;

