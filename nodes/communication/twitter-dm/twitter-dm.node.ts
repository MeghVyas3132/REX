import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;
import axios from 'axios';

export class TwitterDMNode {
  getNodeDefinition() {
    return {
      id: 'twitter-dm',
      type: 'action',
      name: 'Twitter DM',
      description: 'Send direct messages and interact with Twitter API',
      category: 'communication',
      version: '1.0.0',
      author: 'Workflow Studio',
      
      parameters: [
        {
          name: 'apiKey',
          type: 'string',
          displayName: 'API Key',
          description: 'Twitter API Key',
          required: true,
          placeholder: 'Your Twitter API key',
          credentialType: 'twitter_api_key'
        },
        {
          name: 'apiSecret',
          type: 'string',
          displayName: 'API Secret',
          description: 'Twitter API Secret',
          required: true,
          placeholder: 'Your Twitter API secret',
          credentialType: 'twitter_api_secret'
        },
        {
          name: 'accessToken',
          type: 'string',
          displayName: 'Access Token',
          description: 'Twitter Access Token',
          required: true,
          placeholder: 'Your Twitter access token',
          credentialType: 'twitter_access_token'
        },
        {
          name: 'accessTokenSecret',
          type: 'string',
          displayName: 'Access Token Secret',
          description: 'Twitter Access Token Secret',
          required: true,
          placeholder: 'Your Twitter access token secret',
          credentialType: 'twitter_access_token_secret'
        },
        {
          name: 'operation',
          type: 'options',
          displayName: 'Operation',
          description: 'Twitter DM operation to perform',
          required: true,
          default: 'sendDirectMessage',
          options: [
            { name: 'Send Direct Message', value: 'sendDirectMessage' },
            { name: 'Get Direct Message', value: 'getDirectMessage' },
            { name: 'List Direct Messages', value: 'listDirectMessages' },
            { name: 'Get User Info', value: 'getUserInfo' },
            { name: 'Search Users', value: 'searchUsers' }
          ]
        },
        {
          name: 'userId',
          type: 'string',
          displayName: 'User ID',
          description: 'Twitter user ID to send message to',
          required: false,
          placeholder: '123456789'
        },
        {
          name: 'username',
          type: 'string',
          displayName: 'Username',
          description: 'Twitter username (without @)',
          required: false,
          placeholder: 'username'
        },
        {
          name: 'message',
          type: 'string',
          displayName: 'Message',
          description: 'Direct message text',
          required: false,
          placeholder: 'Hello from workflow!'
        },
        {
          name: 'messageId',
          type: 'string',
          displayName: 'Message ID',
          description: 'Direct message ID',
          required: false,
          placeholder: 'message_id'
        },
        {
          name: 'query',
          type: 'string',
          displayName: 'Search Query',
          description: 'Search query for users',
          required: false,
          placeholder: 'search term'
        }
      ],

      inputs: [
        {
          name: 'userId',
          type: 'string',
          description: 'User ID from previous node',
          required: false
        },
        {
          name: 'username',
          type: 'string',
          description: 'Username from previous node',
          required: false
        },
        {
          name: 'message',
          type: 'string',
          description: 'Message text from previous node',
          required: false
        }
      ],

      outputs: [
        {
          name: 'messageId',
          type: 'string',
          description: 'Sent direct message ID'
        },
        {
          name: 'message',
          type: 'object',
          description: 'Direct message details'
        },
        {
          name: 'userInfo',
          type: 'object',
          description: 'User information'
        }
      ],

      configSchema: {
        type: 'object',
        properties: {
          apiKey: { type: 'string' },
          apiSecret: { type: 'string' },
          accessToken: { type: 'string' },
          accessTokenSecret: { type: 'string' },
          operation: { type: 'string' },
          userId: { type: 'string' },
          username: { type: 'string' },
          message: { type: 'string' },
          messageId: { type: 'string' },
          query: { type: 'string' }
        },
        required: ['apiKey', 'apiSecret', 'accessToken', 'accessTokenSecret', 'operation']
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    
    // Validation for required parameters
    if (!config.apiKey && !context.input?.apiKey) {
      throw new Error('Required parameter "apiKey" is missing');
    }
    if (!config.apiSecret && !context.input?.apiSecret) {
      throw new Error('Required parameter "apiSecret" is missing');
    }
    if (!config.accessToken && !context.input?.accessToken) {
      throw new Error('Required parameter "accessToken" is missing');
    }
    if (!config.accessTokenSecret && !context.input?.accessTokenSecret) {
      throw new Error('Required parameter "accessTokenSecret" is missing');
    }
    if (!config.operation && !context.input?.operation) {
      throw new Error('Required parameter "operation" is missing');
    }

    const startTime = Date.now();
    
    try {
      const apiKey = config.apiKey;
      const apiSecret = config.apiSecret;
      const accessToken = config.accessToken;
      const accessTokenSecret = config.accessTokenSecret;
      const operation = config.operation;
      const userId = config.userId || context.input?.userId;
      const username = config.username || context.input?.username;
      const message = config.message || context.input?.message;
      const messageId = config.messageId;
      const query = config.query;

      if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
        throw new Error('Twitter API credentials are required');
      }

      if (!operation) {
        throw new Error('Operation is required');
      }

      logger.info('Twitter DM node executed', {
        nodeId: node.id,
        operation,
        userId,
        username,
        runId: context.runId
      });

      let result: any;

      switch (operation) {
        case 'sendDirectMessage':
          if (!userId && !username) {
            throw new Error('User ID or username is required for sendDirectMessage');
          }
          if (!message) {
            throw new Error('Message is required for sendDirectMessage');
          }
          const targetUserId = userId || await this.getUserIdByUsername(apiKey, apiSecret, accessToken, accessTokenSecret, username!);
          result = await this.sendDirectMessage(apiKey, apiSecret, accessToken, accessTokenSecret, targetUserId, message);
          break;
        case 'getDirectMessage':
          if (!messageId) {
            throw new Error('Message ID is required for getDirectMessage');
          }
          result = await this.getDirectMessage(apiKey, apiSecret, accessToken, accessTokenSecret, messageId);
          break;
        case 'listDirectMessages':
          result = await this.listDirectMessages(apiKey, apiSecret, accessToken, accessTokenSecret);
          break;
        case 'getUserInfo':
          if (!userId && !username) {
            throw new Error('User ID or username is required for getUserInfo');
          }
          const targetUser = userId || await this.getUserIdByUsername(apiKey, apiSecret, accessToken, accessTokenSecret, username!);
          result = await this.getUserInfo(apiKey, apiSecret, accessToken, accessTokenSecret, targetUser);
          break;
        case 'searchUsers':
          if (!query) {
            throw new Error('Search query is required for searchUsers');
          }
          result = await this.searchUsers(apiKey, apiSecret, accessToken, accessTokenSecret, query);
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
      
      logger.error('Twitter DM node failed', error, {
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

  private async getUserIdByUsername(
    apiKey: string,
    apiSecret: string,
    accessToken: string,
    accessTokenSecret: string,
    username: string
  ): Promise<string> {
    // For Twitter API v2, get user by username
    const response = await axios.get(
      `https://api.twitter.com/2/users/by/username/${username}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    return response.data.data.id;
  }

  private async sendDirectMessage(
    apiKey: string,
    apiSecret: string,
    accessToken: string,
    accessTokenSecret: string,
    userId: string,
    message: string
  ): Promise<any> {
    const url = `https://api.twitter.com/1.1/direct_messages/events/new.json`;
    
    const response = await axios.post(
      url,
      {
        event: {
          type: 'message_create',
          message_create: {
            target: {
              recipient_id: userId
            },
            message_data: {
              text: message
            }
          }
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
      messageId: response.data.event.id || Date.now().toString(),
      message: response.data.event
    };
  }

  private async getDirectMessage(
    apiKey: string,
    apiSecret: string,
    accessToken: string,
    accessTokenSecret: string,
    messageId: string
  ): Promise<any> {
    const url = `https://api.twitter.com/1.1/direct_messages/events/show.json?id=${messageId}`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      message: response.data.event
    };
  }

  private async listDirectMessages(
    apiKey: string,
    apiSecret: string,
    accessToken: string,
    accessTokenSecret: string
  ): Promise<any> {
    const url = 'https://api.twitter.com/1.1/direct_messages/events/list.json';
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      messages: response.data.events || []
    };
  }

  private async getUserInfo(
    apiKey: string,
    apiSecret: string,
    accessToken: string,
    accessTokenSecret: string,
    userId: string
  ): Promise<any> {
    const url = `https://api.twitter.com/2/users/${userId}?user.fields=id,name,username,description,profile_image_url`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      userInfo: response.data.data
    };
  }

  private async searchUsers(
    apiKey: string,
    apiSecret: string,
    accessToken: string,
    accessTokenSecret: string,
    query: string
  ): Promise<any> {
    const url = `https://api.twitter.com/1.1/users/search.json?q=${encodeURIComponent(query)}&count=20`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      users: response.data || []
    };
  }

}
export default TwitterDMNode;

