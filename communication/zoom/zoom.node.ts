import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;
const axios = require('axios');

export class ZoomNode {
  getNodeDefinition() {
    return {
  id: 'zoom',
  type: 'action',
  name: 'Zoom',
  description: 'Create meetings and manage Zoom sessions',
  category: 'communication',
  version: '1.0.0',
  author: 'Workflow Studio',
  parameters: [
    {
      name: 'authType',
      type: 'string',
      displayName: 'Auth Type',
      description: 'authType configuration',
      required: true,
      placeholder: 'Enter authType...'
    },
    {
      name: 'accountId',
      type: 'string',
      displayName: 'Account Id',
      description: 'accountId configuration',
      required: false,
      placeholder: 'Enter accountId...'
    },
    {
      name: 'clientId',
      type: 'string',
      displayName: 'Client Id',
      description: 'clientId configuration',
      required: false,
      placeholder: 'Enter clientId...'
    },
    {
      name: 'clientSecret',
      type: 'string',
      displayName: 'Client Secret',
      description: 'clientSecret configuration',
      required: false,
      placeholder: 'Enter clientSecret...'
    },
    {
      name: 'operation',
      type: 'string',
      displayName: 'Operation',
      description: 'operation configuration',
      required: true,
      placeholder: 'Enter operation...'
    },
    {
      name: 'userId',
      type: 'string',
      displayName: 'User Id',
      description: 'userId configuration',
      required: false,
      placeholder: 'Enter userId...'
    },
    {
      name: 'meetingId',
      type: 'string',
      displayName: 'Meeting Id',
      description: 'meetingId configuration',
      required: false,
      placeholder: 'Enter meetingId...'
    },
    {
      name: 'topic',
      type: 'string',
      displayName: 'Topic',
      description: 'topic configuration',
      required: false,
      placeholder: 'Enter topic...'
    },
    {
      name: 'startTime',
      type: 'string',
      displayName: 'Start Time',
      description: 'startTime configuration',
      required: false,
      placeholder: 'Enter startTime...'
    },
    {
      name: 'duration',
      type: 'string',
      displayName: 'Duration',
      description: 'duration configuration',
      required: false,
      placeholder: 'Enter duration...'
    },
    {
      name: 'type',
      type: 'string',
      displayName: 'Type',
      description: 'type configuration',
      required: false,
      placeholder: 'Enter type...'
    },
    {
      name: 'password',
      type: 'string',
      displayName: 'Password',
      description: 'password configuration',
      required: false,
      placeholder: 'Enter password...'
    },
    {
      name: 'channelId',
      type: 'string',
      displayName: 'Channel Id',
      description: 'channelId configuration',
      required: false,
      placeholder: 'Enter channelId...'
    },
    {
      name: 'message',
      type: 'string',
      displayName: 'Message',
      description: 'message configuration',
      required: false,
      placeholder: 'Enter message...'
    },
    {
      name: 'toChannel',
      type: 'string',
      displayName: 'To Channel',
      description: 'toChannel configuration',
      required: false,
      placeholder: 'Enter toChannel...'
    },
    {
      name: 'toContact',
      type: 'string',
      displayName: 'To Contact',
      description: 'toContact configuration',
      required: false,
      placeholder: 'Enter toContact...'
    }
  ],
  inputs: [
    {
      name: 'authType',
      type: 'any',
      displayName: 'Auth Type',
      description: 'authType from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'userId',
      type: 'any',
      displayName: 'User Id',
      description: 'userId from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'meetingId',
      type: 'any',
      displayName: 'Meeting Id',
      description: 'meetingId from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'topic',
      type: 'any',
      displayName: 'Topic',
      description: 'topic from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'startTime',
      type: 'any',
      displayName: 'Start Time',
      description: 'startTime from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'message',
      type: 'any',
      displayName: 'Message',
      description: 'message from previous node',
      required: false,
      dataType: 'any'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'any',
      displayName: 'Output',
      description: 'Output from the node',
      dataType: 'any'
    },
    {
      name: 'success',
      type: 'boolean',
      displayName: 'Success',
      description: 'Whether the operation succeeded',
      dataType: 'boolean'
    }
  ]
};
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    if (!config.authType && !context.input?.authType) {
      throw new Error('Required parameter "authType" is missing');
    }

    const startTime = Date.now();
    
    try {
      const authType = config.authType || 'oauth';
      const accountId = config.accountId || process.env.ZOOM_ACCOUNT_ID;
      const apiKey = config.clientId;
      const apiSecret = config.clientSecret;
      const operation = config.operation;
      const userId = config.userId || context.input?.userId || 'me';
      const meetingId = config.meetingId || context.input?.meetingId;
      const topic = config.topic || context.input?.topic;
      const meetingStartTime = config.startTime || context.input?.startTime;
      const duration = config.duration || 60;
      const type = config.type || 'scheduled';
      const password = config.password;
      const channelId = config.channelId;
      const message = config.message || context.input?.message;
      const toChannel = config.toChannel;
      const toContact = config.toContact;

      if (!apiKey || !apiSecret) {
        throw new Error('Zoom Client ID/API Key and Client Secret/API Secret are required');
      }

      if (authType === 'oauth' && !accountId) {
        throw new Error('Zoom Account ID is required for OAuth authentication');
      }

      if (!operation) {
        throw new Error('Operation is required');
      }

      logger.info('Zoom node executed', {
        nodeId: node.id,
        operation,
        userId,
        meetingId,
        runId: context.runId
      });

      let result: any;

      // Get access token based on auth type
      const accessToken = authType === 'oauth' 
        ? await this.getAccessToken(apiKey, apiSecret, accountId)
        : apiKey; // For JWT, apiKey is the JWT token itself

      switch (operation) {
        case 'createMeeting':
          if (!topic) {
            throw new Error('Topic is required for createMeeting');
          }
          result = await this.createMeeting(accessToken, userId, topic, meetingStartTime, duration, type, password);
          break;
        case 'listMeetings':
          result = await this.listMeetings(accessToken, userId);
          break;
        case 'getMeeting':
          if (!meetingId) {
            throw new Error('Meeting ID is required for getMeeting');
          }
          result = await this.getMeeting(accessToken, meetingId);
          break;
        case 'updateMeeting':
          if (!meetingId) {
            throw new Error('Meeting ID is required for updateMeeting');
          }
          result = await this.updateMeeting(accessToken, meetingId, { topic, startTime: meetingStartTime, duration, password });
          break;
        case 'deleteMeeting':
          if (!meetingId) {
            throw new Error('Meeting ID is required for deleteMeeting');
          }
          result = await this.deleteMeeting(accessToken, meetingId);
          break;
        case 'sendChatMessage':
          if (!message) {
            throw new Error('Message is required for sendChatMessage');
          }
          result = await this.sendChatMessage(accessToken, message, toChannel, toContact);
          break;
        case 'listChatChannels':
          result = await this.listChatChannels(accessToken);
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      return {
        success: true,
        output: result,
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Zoom node failed', error, {
        nodeId: node.id,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  private async getAccessToken(apiKey: string, apiSecret: string, accountId?: string): Promise<string> {
    if (!accountId) {
      accountId = process.env.ZOOM_ACCOUNT_ID || '';
    }
    
    const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    
    const response = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: accountId || ''
      }),
      {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data.access_token;
  }

  private async createMeeting(
    accessToken: string,
    userId: string,
    topic: string,
    startTime?: string,
    duration: number = 60,
    type: string = 'scheduled',
    password?: string
  ): Promise<any> {
    const url = `https://api.zoom.us/v2/users/${userId}/meetings`;
    
    const meetingData: any = {
      topic,
      type,
      duration,
      timezone: 'UTC'
    };

    if (startTime) {
      meetingData.start_time = startTime;
    }

    if (password) {
      meetingData.password = password;
    }

    const response = await axios.post(url, meetingData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      meetingId: response.data.id,
      joinUrl: response.data.join_url,
      startUrl: response.data.start_url,
      meeting: response.data
    };
  }

  private async listMeetings(accessToken: string, userId: string): Promise<any> {
    const url = `https://api.zoom.us/v2/users/${userId}/meetings`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      meetings: response.data.meetings || []
    };
  }

  private async getMeeting(accessToken: string, meetingId: string): Promise<any> {
    const url = `https://api.zoom.us/v2/meetings/${meetingId}`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      meeting: response.data
    };
  }

  private async updateMeeting(
    accessToken: string,
    meetingId: string,
    updates: any
  ): Promise<any> {
    const url = `https://api.zoom.us/v2/meetings/${meetingId}`;
    
    const response = await axios.patch(url, updates, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      success: true,
      meeting: response.data
    };
  }

  private async deleteMeeting(accessToken: string, meetingId: string): Promise<any> {
    const url = `https://api.zoom.us/v2/meetings/${meetingId}`;
    
    await axios.delete(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      success: true,
      message: 'Meeting deleted successfully'
    };
  }

  private async sendChatMessage(
    accessToken: string,
    message: string,
    toChannel?: string,
    toContact?: string
  ): Promise<any> {
    if (toChannel) {
      // Send to channel
      const url = `https://api.zoom.us/v2/chat/channels/${toChannel}/messages`;
      const response = await axios.post(
        url,
        {
          message: {
            message,
            to_channel: toChannel
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        messageId: response.data.id,
        message: response.data
      };
    } else if (toContact) {
      // Send to contact
      const url = 'https://api.zoom.us/v2/chat/users/me/messages';
      const response = await axios.post(
        url,
        {
          message: {
            message,
            to_contact: toContact
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        messageId: response.data.id,
        message: response.data
      };
    } else {
      throw new Error('Either toChannel or toContact is required for sendChatMessage');
    }
  }

  private async listChatChannels(accessToken: string): Promise<any> {
    const url = 'https://api.zoom.us/v2/chat/users/me/channels';
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      channels: response.data.channels || []
    };
  }}


export default ZoomNode;
