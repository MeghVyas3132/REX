import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require('../../utils/logger');

export class SlackNode {
  getNodeDefinition() {
    return {
      id: 'slack',
      type: 'action',
      name: 'Slack Integration',
      description: 'Send messages, create channels, and interact with Slack',
      category: 'integration',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'action',
          type: 'options',
          displayName: 'Slack Action',
          description: 'Slack operation to perform',
          required: true,
          default: 'send_message',
          options: [
            { name: 'Send Message', value: 'send_message' },
            { name: 'Create Channel', value: 'create_channel' },
            { name: 'Invite User', value: 'invite_user' },
            { name: 'Upload File', value: 'upload_file' },
            { name: 'Get User Info', value: 'get_user_info' }
          ]
        },
        {
          name: 'channel',
          type: 'string',
          displayName: 'Channel',
          description: 'Slack channel name or ID',
          required: false,
          placeholder: '#general or C1234567890'
        },
        {
          name: 'username',
          type: 'string',
          displayName: 'Bot Username',
          description: 'Username for the bot',
          required: false,
          placeholder: 'WorkflowBot'
        },
        {
          name: 'icon_emoji',
          type: 'string',
          displayName: 'Bot Icon Emoji',
          description: 'Emoji for the bot icon',
          required: false,
          placeholder: ':robot_face:'
        },
        {
          name: 'useOAuth',
          type: 'boolean',
          displayName: 'Use OAuth',
          description: 'Use OAuth for user-specific Slack access',
          required: false,
          default: false
        },
        {
          name: 'accessToken',
          type: 'string',
          displayName: 'Access Token',
          description: 'Slack OAuth access token (optional - OAuth will be used if not provided)',
          required: false,
          placeholder: 'xoxb-...',
          credentialType: 'slack_oauth_token'
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'action',
          type: 'string',
          displayName: 'Dynamic Action',
          description: 'Slack action from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'channel',
          type: 'string',
          displayName: 'Dynamic Channel',
          description: 'Slack channel from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'message',
          type: 'string',
          displayName: 'Message Text',
          description: 'Message text from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'username',
          type: 'string',
          displayName: 'Dynamic Username',
          description: 'Bot username from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'attachments',
          type: 'array',
          displayName: 'Message Attachments',
          description: 'Message attachments from previous node',
          required: false,
          dataType: 'array'
        },
        {
          name: 'file',
          type: 'string',
          displayName: 'File Path',
          description: 'File path for upload from previous node',
          required: false,
          dataType: 'file'
        },
        {
          name: 'userId',
          type: 'string',
          displayName: 'User ID',
          description: 'Slack user ID from previous node',
          required: false,
          dataType: 'text'
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
          name: 'message',
          type: 'string',
          displayName: 'Response Message',
          description: 'Response message from Slack',
          dataType: 'text'
        },
        {
          name: 'timestamp',
          type: 'string',
          displayName: 'Message Timestamp',
          description: 'Timestamp of the message',
          dataType: 'text'
        },
        {
          name: 'channel',
          type: 'string',
          displayName: 'Channel Used',
          description: 'Channel that was used',
          dataType: 'text'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          channel: { type: 'string' },
          username: { type: 'string' },
          icon_emoji: { type: 'string' },
          useOAuth: { type: 'boolean' },
          accessToken: { type: 'string' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          channel: { type: 'string' },
          message: { type: 'string' },
          username: { type: 'string' },
          attachments: { type: 'array' },
          file: { type: 'string' },
          userId: { type: 'string' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          timestamp: { type: 'string' },
          channel: { type: 'string' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    
    // Validation for required parameters
    if (!config.action && !context.input?.action) {
      throw new Error('Required parameter "action" is missing');
    }

    const startTime = Date.now();
    
    try {
      const action = config.action;
      const channel = config.channel || context.input?.channel;
      const message = config.message || context.input?.message;
      const username = config.username || context.input?.username;
      const iconEmoji = config.icon_emoji;
      const attachments = config.attachments;
      const useOAuth = config.useOAuth || false;

      if (!action) {
        throw new Error('Action is required for Slack integration');
      }

      logger.info('Slack integration executed', {
        nodeId: node.id,
        action,
        channel,
        runId: context.runId
      });

      let result: any;

      switch (action) {
        case 'send_message':
          result = await this.sendMessage(channel, message, username, iconEmoji, attachments, useOAuth, config, context);
          break;
        case 'create_channel':
          result = await this.createChannel(channel, useOAuth, config, context);
          break;
        case 'invite_user':
          result = await this.inviteUser(channel, context.input?.user, useOAuth, config, context);
          break;
        case 'upload_file':
          result = await this.uploadFile(channel, context.input?.file, message, useOAuth, config, context);
          break;
        case 'get_user_info':
          result = await this.getUserInfo(context.input?.user, useOAuth, config, context);
          break;
        default:
          throw new Error(`Unsupported Slack action: ${action}`);
      }

      return {
        success: true,
        output: result,
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Slack integration failed', error, {
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

  private async sendMessage(channel: string, message: string, username?: string, iconEmoji?: string, attachments?: any[], useOAuth?: boolean, config?: any, context?: ExecutionContext): Promise<any> {
    const slackToken = await this.getSlackToken(useOAuth, config, context);
    if (!slackToken) {
      throw new Error('Slack token is required. Please provide SLACK_BOT_TOKEN or connect your Slack account via OAuth.');
    }

    const payload: any = {
      channel,
      text: message
    };

    if (username) payload.username = username;
    if (iconEmoji) payload.icon_emoji = iconEmoji;
    if (attachments) payload.attachments = attachments;

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return {
      success: true,
      message: 'Message sent successfully',
      timestamp: data.ts,
      channel: data.channel
    };
  }

  private async createChannel(name: string, useOAuth?: boolean, config?: any, context?: ExecutionContext): Promise<any> {
    const slackToken = await this.getSlackToken(useOAuth, config, context);
    if (!slackToken) {
      throw new Error('Slack token is required. Please provide SLACK_BOT_TOKEN or connect your Slack account via OAuth.');
    }

    const response = await fetch('https://slack.com/api/conversations.create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name.replace('#', '')
      })
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return {
      success: true,
      message: 'Channel created successfully',
      channel: data.channel.id,
      name: data.channel.name
    };
  }

  private async inviteUser(channel: string, user: string, useOAuth?: boolean, config?: any, context?: ExecutionContext): Promise<any> {
    const slackToken = await this.getSlackToken(useOAuth, config, context);
    if (!slackToken) {
      throw new Error('Slack token is required. Please provide SLACK_BOT_TOKEN or connect your Slack account via OAuth.');
    }

    const response = await fetch('https://slack.com/api/conversations.invite', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel,
        users: user
      })
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return {
      success: true,
      message: 'User invited successfully',
      channel: data.channel.id
    };
  }

  private async uploadFile(channel: string, filePath: string, message?: string, useOAuth?: boolean, config?: any, context?: ExecutionContext): Promise<any> {
    const slackToken = await this.getSlackToken(useOAuth, config, context);
    if (!slackToken) {
      throw new Error('Slack token is required. Please provide SLACK_BOT_TOKEN or connect your Slack account via OAuth.');
    }

    // This is a simplified implementation
    // In production, you'd handle file uploads properly
    return {
      success: true,
      message: 'File upload not implemented yet',
      channel
    };
  }

  private async getUserInfo(user: string, useOAuth?: boolean, config?: any, context?: ExecutionContext): Promise<any> {
    const slackToken = await this.getSlackToken(useOAuth, config, context);
    if (!slackToken) {
      throw new Error('Slack token is required. Please provide SLACK_BOT_TOKEN or connect your Slack account via OAuth.');
    }

    const response = await fetch(`https://slack.com/api/users.info?user=${user}`, {
      headers: {
        'Authorization': `Bearer ${slackToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return {
      success: true,
      user: data.user
    };
  }

  private async getSlackToken(useOAuth?: boolean, config?: any, context?: ExecutionContext): Promise<string> {
    if (useOAuth) {
      let accessToken = config?.accessToken;
      
      if (!accessToken) {
        try {
          const { oauthService } = await import('../../services/oauth.service');
          const userId = context?.agentId || 'default-user';
          accessToken = await oauthService.getValidAccessToken(userId, 'slack');
        } catch (oauthError) {
          throw new Error('Slack OAuth access token is required. Please provide accessToken in config or connect your Slack account via OAuth.');
        }
      }
      
      return accessToken;
    } else {
      const slackToken = process.env.SLACK_BOT_TOKEN;
      if (!slackToken) {
        throw new Error('SLACK_BOT_TOKEN environment variable is required');
      }
      return slackToken;
    }

}}

export default SlackNode;