import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require('../../utils/logger');
import axios from 'axios';

export class SegmentNode {
  getNodeDefinition() {
    return {
      id: 'segment',
      type: 'action',
      name: 'Segment',
      description: 'Track events and users with Segment using the Segment API',
      category: 'analytics',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'operation',
          type: 'options',
          displayName: 'Operation',
          description: 'Segment operation to perform',
          required: true,
          default: 'track',
          options: [
            { name: 'Track Event', value: 'track' },
            { name: 'Identify User', value: 'identify' },
            { name: 'Page View', value: 'page' },
            { name: 'Screen View', value: 'screen' },
            { name: 'Group User', value: 'group' },
            { name: 'Alias User', value: 'alias' }
          ]
        },
        {
          name: 'writeKey',
          type: 'string',
          displayName: 'Write Key',
          description: 'Segment write key (for HTTP API)',
          required: false,
          placeholder: 'Your Segment write key',
          credentialType: 'segment_write_key'
        },
        {
          name: 'workspaceId',
          type: 'string',
          displayName: 'Workspace ID',
          description: 'Segment workspace ID (for Management API)',
          required: false,
          placeholder: 'Your workspace ID'
        },
        {
          name: 'apiToken',
          type: 'string',
          displayName: 'API Token',
          description: 'Segment API token (for Management API)',
          required: false,
          placeholder: 'Your Segment API token',
          credentialType: 'segment_api_token'
        },
        {
          name: 'userId',
          type: 'string',
          displayName: 'User ID',
          description: 'User identifier',
          required: false,
          placeholder: 'user123'
        },
        {
          name: 'anonymousId',
          type: 'string',
          displayName: 'Anonymous ID',
          description: 'Anonymous user identifier (if no userId)',
          required: false,
          placeholder: 'anon123'
        },
        {
          name: 'event',
          type: 'string',
          displayName: 'Event Name',
          description: 'Event name (for track operation)',
          required: false,
          placeholder: 'Button Clicked'
        },
        {
          name: 'properties',
          type: 'string',
          displayName: 'Properties (JSON)',
          description: 'Event properties as JSON object',
          required: false,
          placeholder: '{"buttonName": "Sign Up", "location": "header"}'
        },
        {
          name: 'traits',
          type: 'string',
          displayName: 'Traits (JSON)',
          description: 'User traits as JSON object (for identify operation)',
          required: false,
          placeholder: '{"email": "user@example.com", "name": "John Doe"}'
        },
        {
          name: 'context',
          type: 'string',
          displayName: 'Context (JSON)',
          description: 'Additional context as JSON object',
          required: false,
          placeholder: '{"ip": "192.168.1.1", "userAgent": "Mozilla/5.0..."}'
        },
        {
          name: 'timestamp',
          type: 'string',
          displayName: 'Timestamp',
          description: 'Event timestamp (ISO 8601), defaults to now',
          required: false,
          placeholder: '2024-01-01T12:00:00Z'
        },
        {
          name: 'name',
          type: 'string',
          displayName: 'Page/Screen Name',
          description: 'Page or screen name (for page/screen operations)',
          required: false,
          placeholder: 'Home Page'
        },
        {
          name: 'category',
          type: 'string',
          displayName: 'Category',
          description: 'Page category (for page operation)',
          required: false,
          placeholder: 'E-commerce'
        },
        {
          name: 'groupId',
          type: 'string',
          displayName: 'Group ID',
          description: 'Group identifier (for group operation)',
          required: false,
          placeholder: 'group123'
        },
        {
          name: 'groupTraits',
          type: 'string',
          displayName: 'Group Traits (JSON)',
          description: 'Group traits as JSON object',
          required: false,
          placeholder: '{"name": "Acme Corp", "plan": "enterprise"}'
        },
        {
          name: 'previousId',
          type: 'string',
          displayName: 'Previous ID',
          description: 'Previous user ID (for alias operation)',
          required: false,
          placeholder: 'oldUserId123'
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'operation',
          type: 'string',
          displayName: 'Dynamic Operation',
          description: 'Operation from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'userId',
          type: 'string',
          displayName: 'Dynamic User ID',
          description: 'User ID from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'anonymousId',
          type: 'string',
          displayName: 'Dynamic Anonymous ID',
          description: 'Anonymous ID from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'event',
          type: 'string',
          displayName: 'Dynamic Event',
          description: 'Event name from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'properties',
          type: 'object',
          displayName: 'Dynamic Properties',
          description: 'Properties from previous node (overrides configured)',
          required: false,
          dataType: 'object'
        },
        {
          name: 'traits',
          type: 'object',
          displayName: 'Dynamic Traits',
          description: 'Traits from previous node (overrides configured)',
          required: false,
          dataType: 'object'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'success',
          type: 'boolean',
          displayName: 'Success',
          description: 'Whether the operation was successful',
          dataType: 'boolean'
        },
        {
          name: 'messageId',
          type: 'string',
          displayName: 'Message ID',
          description: 'Segment message ID',
          dataType: 'text'
        },
        {
          name: 'timestamp',
          type: 'string',
          displayName: 'Timestamp',
          description: 'Event timestamp',
          dataType: 'text'
        },
        {
          name: 'event',
          type: 'object',
          displayName: 'Event Data',
          description: 'Sent event data',
          dataType: 'object'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string' },
          writeKey: { type: 'string' },
          userId: { type: 'string' },
          anonymousId: { type: 'string' },
          event: { type: 'string' },
          properties: { type: 'string' },
          traits: { type: 'string' },
          context: { type: 'string' },
          timestamp: { type: 'string' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string' },
          userId: { type: 'string' },
          anonymousId: { type: 'string' },
          event: { type: 'string' },
          properties: { type: 'object' },
          traits: { type: 'object' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          messageId: { type: 'string' },
          timestamp: { type: 'string' },
          event: { type: 'object' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    
    // Validation for required parameters
    if (!config.operation && !context.input?.operation) {
      throw new Error('Required parameter "operation" is missing');
    }

    const startTime = Date.now();
    
    try {
      const operation = context.input?.operation || config.operation || 'track';
      const writeKey = config.writeKey;
      
      if (!writeKey) {
        throw new Error('Segment write key is required');
      }

      // Get dynamic inputs
      const userId = context.input?.userId || config.userId;
      const anonymousId = context.input?.anonymousId || config.anonymousId;
      const event = context.input?.event || config.event;
      const properties = context.input?.properties || config.properties;
      const traits = context.input?.traits || config.traits;
      const contextData = config.context;
      const timestamp = config.timestamp || new Date().toISOString();
      const name = config.name;
      const category = config.category;
      const groupId = config.groupId;
      const groupTraits = config.groupTraits;
      const previousId = config.previousId;

      if (!userId && !anonymousId) {
        throw new Error('Either userId or anonymousId is required');
      }

      logger.info('Segment operation executed', {
        nodeId: node.id,
        operation,
        userId: userId || anonymousId,
        runId: context.runId
      });

      // Parse JSON strings if needed
      let propertiesObj: any = {};
      if (properties) {
        if (typeof properties === 'string') {
          try {
            propertiesObj = JSON.parse(properties);
          } catch {
            propertiesObj = {};
          }
        } else {
          propertiesObj = properties;
        }
      }

      let traitsObj: any = {};
      if (traits) {
        if (typeof traits === 'string') {
          try {
            traitsObj = JSON.parse(traits);
          } catch {
            traitsObj = {};
          }
        } else {
          traitsObj = traits;
        }
      }

      let contextObj: any = {};
      if (contextData) {
        if (typeof contextData === 'string') {
          try {
            contextObj = JSON.parse(contextData);
          } catch {
            contextObj = {};
          }
        } else {
          contextObj = contextData;
        }
      }

      let groupTraitsObj: any = {};
      if (groupTraits) {
        if (typeof groupTraits === 'string') {
          try {
            groupTraitsObj = JSON.parse(groupTraits);
          } catch {
            groupTraitsObj = {};
          }
        } else {
          groupTraitsObj = groupTraits;
        }
      }

      const basePayload: any = {
        userId: userId || undefined,
        anonymousId: anonymousId || undefined,
        timestamp,
        context: contextObj
      };

      let payload: any = { ...basePayload };

      switch (operation) {
        case 'track':
          if (!event) {
            throw new Error('Event name is required for track operation');
          }
          payload = {
            ...basePayload,
            event,
            properties: propertiesObj
          };
          break;

        case 'identify':
          payload = {
            ...basePayload,
            traits: traitsObj
          };
          break;

        case 'page':
          payload = {
            ...basePayload,
            name: name || 'Page',
            category: category || undefined,
            properties: propertiesObj
          };
          break;

        case 'screen':
          payload = {
            ...basePayload,
            name: name || 'Screen',
            properties: propertiesObj
          };
          break;

        case 'group':
          if (!groupId) {
            throw new Error('Group ID is required for group operation');
          }
          payload = {
            ...basePayload,
            groupId,
            traits: groupTraitsObj
          };
          break;

        case 'alias':
          if (!previousId) {
            throw new Error('Previous ID is required for alias operation');
          }
          payload = {
            userId,
            previousId
          };
          break;

        default:
          throw new Error(`Unsupported Segment operation: ${operation}`);
      }

      // Send to Segment API
      const response = await axios.post(
        'https://api.segment.io/v1/' + operation,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(writeKey + ':').toString('base64')}`
          },
          auth: {
            username: writeKey,
            password: ''
          }
        }
      );

      return {
        success: true,
        output: {
          success: true,
          messageId: response.data.messageId || payload.messageId || `msg_${Date.now()}`,
          timestamp,
          event: payload
        },
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Segment operation failed', error, {
        nodeId: node.id,
        operation: config.operation,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }

}}

export default SegmentNode;

