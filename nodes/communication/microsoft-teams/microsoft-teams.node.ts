import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
import { logger } from '../../lib/logger.js';
const axios = require('axios');

export class MicrosoftTeamsNode {
  getNodeDefinition() {
    return {
  id: 'microsoft-teams',
  type: 'action',
  name: 'Microsoft Teams',
  description: 'Send messages and manage Microsoft Teams channels',
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
      name: 'accessToken',
      type: 'string',
      displayName: 'Access Token',
      description: 'accessToken configuration',
      required: false,
      placeholder: 'Enter accessToken...'
    },
    {
      name: 'tenantId',
      type: 'string',
      displayName: 'Tenant Id',
      description: 'tenantId configuration',
      required: false,
      placeholder: 'Enter tenantId...'
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
      name: 'teamId',
      type: 'string',
      displayName: 'Team Id',
      description: 'teamId configuration',
      required: false,
      placeholder: 'Enter teamId...'
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
      name: 'chatId',
      type: 'string',
      displayName: 'Chat Id',
      description: 'chatId configuration',
      required: false,
      placeholder: 'Enter chatId...'
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
      name: 'contentType',
      type: 'string',
      displayName: 'Content Type',
      description: 'contentType configuration',
      required: false,
      placeholder: 'Enter contentType...'
    },
    {
      name: 'recipients',
      type: 'string',
      displayName: 'Recipients',
      description: 'recipients configuration',
      required: false,
      placeholder: 'Enter recipients...'
    },
    {
      name: 'channelName',
      type: 'string',
      displayName: 'Channel Name',
      description: 'channelName configuration',
      required: false,
      placeholder: 'Enter channelName...'
    },
    {
      name: 'channelDescription',
      type: 'string',
      displayName: 'Channel Description',
      description: 'channelDescription configuration',
      required: false,
      placeholder: 'Enter channelDescription...'
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
      name: 'teamId',
      type: 'any',
      displayName: 'Team Id',
      description: 'teamId from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'channelId',
      type: 'any',
      displayName: 'Channel Id',
      description: 'channelId from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'chatId',
      type: 'any',
      displayName: 'Chat Id',
      description: 'chatId from previous node',
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
    },
    {
      name: 'recipients',
      type: 'any',
      displayName: 'Recipients',
      description: 'recipients from previous node',
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
      const authType = config.authType || 'accessToken';
      let accessToken = config.accessToken;
      const tenantId = config.tenantId;
      const clientId = config.clientId;
      const clientSecret = config.clientSecret;
      const operation = config.operation;
      const teamId = config.teamId || context.input?.teamId;
      const channelId = config.channelId || context.input?.channelId;
      const chatId = config.chatId || context.input?.chatId;
      const message = config.message || context.input?.message;
      const contentType = config.contentType || 'text';
      const recipients = config.recipients || context.input?.recipients || [];
      const channelName = config.channelName;
      const channelDescription = config.channelDescription;

      // Get access token based on auth type
      if (authType === 'oauth') {
        // Try to get OAuth token automatically
        try {
          const { oauthService } = await import('../../services/oauth.service');
          
          // IMPORTANT: Use context.userId which is set by workflow engine from authenticated user
          const userId = (context as any).userId;
          
          if (!userId || userId === 'default-user') {
            throw new Error('User ID not found in workflow context. Please authenticate first and connect your Microsoft Teams account via OAuth.');
          }
          
          logger.info('Microsoft Teams node getting OAuth token', {
            nodeId: node.id,
            userId,
            workflowId: context.workflowId,
            runId: context.runId
          });
          
          // Clean userId to ensure consistent format
          const cleanUserId = String(userId || '').trim();
          if (!cleanUserId || cleanUserId === 'default-user') {
            throw new Error(`Invalid userId: ${userId}. Please authenticate first and connect your Microsoft Teams account via OAuth.`);
          }
          
          // Try to get Microsoft OAuth token
          // Note: This requires Microsoft OAuth to be configured in the OAuth service
          try {
            accessToken = await oauthService.getValidAccessToken(cleanUserId, 'microsoft');
          } catch (microsoftError: any) {
            // Fallback to 'microsoft-teams' provider name
            try {
              accessToken = await oauthService.getValidAccessToken(cleanUserId, 'microsoft-teams');
            } catch (teamsError: any) {
              throw new Error(`Microsoft Teams OAuth token not found. Please connect your Microsoft Teams account first. Error: ${microsoftError.message || teamsError.message}`);
            }
          }
          
          if (!accessToken) {
            throw new Error('Microsoft Teams OAuth token not found. Please connect your Microsoft Teams account via OAuth first.');
          }
          
          logger.info('Microsoft Teams node got OAuth token successfully', {
            nodeId: node.id,
            userId: cleanUserId,
            hasToken: !!accessToken
          });
        } catch (oauthError: any) {
          const errorMessage = oauthError?.message || oauthError?.toString();
          logger.error('Microsoft Teams OAuth error', oauthError, {
            nodeId: node.id,
            userId: (context as any).userId,
            errorMessage
          });
          throw new Error(`Microsoft Teams OAuth failed: ${errorMessage}. Please ensure you have connected your Microsoft Teams account via OAuth.`);
        }
      } else if (authType === 'clientCredentials') {
        if (!tenantId || !clientId || !clientSecret) {
          throw new Error('Tenant ID, Client ID, and Client Secret are required for client credentials authentication');
        }
        accessToken = await this.getAccessTokenWithClientCredentials(tenantId, clientId, clientSecret);
      } else {
        if (!accessToken) {
          throw new Error('Microsoft Teams access token is required');
        }
      }

      if (!operation) {
        throw new Error('Operation is required');
      }

      logger.info('Microsoft Teams node executed', {
        nodeId: node.id,
        operation,
        teamId,
        channelId,
        chatId,
        runId: context.runId
      });

      let result: any;

      switch (operation) {
        case 'sendMessage':
          if (!teamId || !channelId) {
            throw new Error('Team ID and Channel ID are required for sendMessage');
          }
          result = await this.sendChannelMessage(accessToken, teamId, channelId, message, contentType);
          break;
        case 'sendChatMessage':
          if (!chatId) {
            throw new Error('Chat ID is required for sendChatMessage');
          }
          result = await this.sendChatMessage(accessToken, chatId, message, contentType);
          break;
        case 'createChannel':
          if (!teamId || !channelName) {
            throw new Error('Team ID and Channel Name are required for createChannel');
          }
          result = await this.createChannel(accessToken, teamId, channelName, channelDescription);
          break;
        case 'listChannels':
          if (!teamId) {
            throw new Error('Team ID is required for listChannels');
          }
          result = await this.listChannels(accessToken, teamId);
          break;
        case 'getChannelInfo':
          if (!teamId || !channelId) {
            throw new Error('Team ID and Channel ID are required for getChannelInfo');
          }
          result = await this.getChannelInfo(accessToken, teamId, channelId);
          break;
        case 'getChat':
          if (!chatId) {
            throw new Error('Chat ID is required for getChat');
          }
          result = await this.getChat(accessToken, chatId);
          break;
        case 'listChats':
          result = await this.listChats(accessToken);
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
      
      logger.error('Microsoft Teams node failed', error, {
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

  private async getAccessTokenWithClientCredentials(
    tenantId: string,
    clientId: string,
    clientSecret: string
  ): Promise<string> {
    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    
    const response = await axios.post(
      url,
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data.access_token;
  }

  private async sendChannelMessage(
    accessToken: string,
    teamId: string,
    channelId: string,
    message: string,
    contentType: string
  ): Promise<any> {
    const url = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages`;
    
    const response = await axios.post(
      url,
      {
        body: {
          contentType,
          content: message
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
      channelId,
      teamId,
      message: response.data
    };
  }

  private async sendChatMessage(
    accessToken: string,
    chatId: string,
    message: string,
    contentType: string
  ): Promise<any> {
    const url = `https://graph.microsoft.com/v1.0/chats/${chatId}/messages`;
    
    const response = await axios.post(
      url,
      {
        body: {
          contentType,
          content: message
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
      chatId,
      message: response.data
    };
  }

  private async createChannel(
    accessToken: string,
    teamId: string,
    channelName: string,
    description?: string
  ): Promise<any> {
    const url = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels`;
    
    const response = await axios.post(
      url,
      {
        displayName: channelName,
        description: description || '',
        membershipType: 'standard'
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      channelId: response.data.id,
      teamId,
      channel: response.data
    };
  }

  private async listChannels(accessToken: string, teamId: string): Promise<any> {
    const url = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      channels: response.data.value || []
    };
  }

  private async getChannelInfo(accessToken: string, teamId: string, channelId: string): Promise<any> {
    const url = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      channel: response.data
    };
  }

  private async getChat(accessToken: string, chatId: string): Promise<any> {
    const url = `https://graph.microsoft.com/v1.0/chats/${chatId}`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      chat: response.data
    };
  }

  private async listChats(accessToken: string): Promise<any> {
    const url = 'https://graph.microsoft.com/v1.0/me/chats';
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      chats: response.data.value || []
    };
  }}


export default MicrosoftTeamsNode;
