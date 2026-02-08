import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class SlackNode {
  getNodeDefinition() {
    return {
      id: 'slack',
      type: 'action',
      name: 'Slack',
      description: 'Send Slack messages, upload files, and manage channels',
      category: 'communication',
      version: '1.0.0',
      author: 'Workflow Studio',
      
      parameters: [
        {
          name: 'botToken',
          type: 'string',
          displayName: 'Bot Token',
          description: 'Slack Bot Token (xoxb-...)',
          required: true,
          placeholder: 'xoxb-...',
          credentialType: 'slack_bot_token'
        },
        {
          name: 'operation',
          type: 'options',
          displayName: 'Operation',
          description: 'Slack operation to perform',
          required: true,
          default: 'postMessage',
          options: [
            { name: 'Post Message', value: 'postMessage' },
            { name: 'Upload File', value: 'uploadFile' },
            { name: 'Create Channel', value: 'createChannel' },
            { name: 'Invite to Channel', value: 'inviteToChannel' },
            { name: 'Get Channel Info', value: 'getChannelInfo' },
            { name: 'List Channels', value: 'listChannels' }
          ]
        },
        {
          name: 'channel',
          type: 'string',
          displayName: 'Channel',
          description: 'Channel name or ID (e.g., #general or C1234567890)',
          required: true,
          placeholder: '#general'
        },
        {
          name: 'message',
          type: 'string',
          displayName: 'Message',
          description: 'Message text to send',
          required: false,
          placeholder: 'Hello from workflow!'
        },
        {
          name: 'username',
          type: 'string',
          displayName: 'Username',
          description: 'Custom username for the message',
          required: false,
          placeholder: 'Workflow Bot'
        },
        {
          name: 'iconEmoji',
          type: 'string',
          displayName: 'Icon Emoji',
          description: 'Custom emoji for the message',
          required: false,
          placeholder: ':robot_face:'
        },
        {
          name: 'attachments',
          type: 'string',
          displayName: 'Attachments (JSON)',
          description: 'Rich message attachments in JSON format',
          required: false,
          placeholder: '[{"color":"good","title":"Success","text":"Operation completed"}]'
        }
      ],

      inputs: [
        {
          name: 'message',
          type: 'string',
          description: 'Message text from previous node',
          required: false
        },
        {
          name: 'channel',
          type: 'string',
          description: 'Channel from previous node',
          required: false
        },
        {
          name: 'fileData',
          type: 'object',
          description: 'File data for upload operations',
          required: false
        }
      ],

      outputs: [
        {
          name: 'message',
          type: 'object',
          description: 'Sent message details'
        },
        {
          name: 'channel',
          type: 'object',
          description: 'Channel information'
        },
        {
          name: 'file',
          type: 'object',
          description: 'Uploaded file details'
        }
      ]
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = node.data?.config || {};
    
    // Validation for required parameters
    if (!config.botToken && !context.input?.botToken) {
      throw new Error('Required parameter "botToken" is missing');
    }
    if (!config.operation && !context.input?.operation) {
      throw new Error('Required parameter "operation" is missing');
    }
    

    
    try {
      const { botToken, operation, channel, message, username, iconEmoji, attachments } = config;
      const inputMessage = context.input?.message || message;
      const inputChannel = context.input?.channel || channel;

      if (!botToken) {
        throw new Error('Slack Bot Token is required');
      }

      let result: any = {};

      switch (operation) {
        case 'postMessage':
          result = await this.postMessage(botToken, inputChannel, inputMessage, username, iconEmoji, attachments);
          break;
        case 'uploadFile':
          result = await this.uploadFile(botToken, inputChannel, context.input?.fileData);
          break;
        case 'createChannel':
          result = await this.createChannel(botToken, inputChannel);
          break;
        case 'inviteToChannel':
          result = await this.inviteToChannel(botToken, inputChannel, context.input?.users);
          break;
        case 'getChannelInfo':
          result = await this.getChannelInfo(botToken, inputChannel);
          break;
        case 'listChannels':
          result = await this.listChannels(botToken);
          break;
        default:
          throw new Error(`Unsupported Slack operation: ${operation}`);
      }

      const duration = Date.now() - startTime;
      
      logger.info('Slack node executed successfully', {
        operation,
        channel: inputChannel,
        duration
      });

      return {
        success: true,
        output: {
          ...context.input,  // Preserve input data
          message: result.message || inputMessage,
          channel: result.channel || inputChannel,
          file: result.file,
          operation,
          timestamp: new Date().toISOString(),
          duration
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Slack node execution failed', {
        error: error.message,
        operation: config.operation,
        duration
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  private async postMessage(token: string, channel: string, text: string, username?: string, iconEmoji?: string, attachments?: string) {
    const url = 'https://slack.com/api/chat.postMessage';
    
    const payload: any = {
      channel,
      text,
      as_user: false
    };

    if (username) payload.username = username;
    if (iconEmoji) payload.icon_emoji = iconEmoji;
    if (attachments) {
      try {
        payload.attachments = JSON.parse(attachments);
      } catch (e) {
        logger.warn('Invalid attachments JSON, ignoring', { attachments });
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    return {
      message: result.message,
      channel: result.channel
    };
  }

  private async uploadFile(token: string, channel: string, fileData?: any) {
    const url = 'https://slack.com/api/files.upload';
    
    if (!fileData) {
      throw new Error('File data is required for upload operation');
    }

    const formData = new FormData();
    formData.append('token', token);
    formData.append('channels', channel);
    formData.append('file', fileData.content, fileData.filename);
    if (fileData.title) formData.append('title', fileData.title);
    if (fileData.initialComment) formData.append('initial_comment', fileData.initialComment);

    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    return {
      file: result.file,
      channel: result.channel
    };
  }

  private async createChannel(token: string, channelName: string) {
    const url = 'https://slack.com/api/conversations.create';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: channelName.replace('#', ''),
        is_private: false
      })
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    return {
      channel: result.channel
    };
  }

  private async inviteToChannel(token: string, channel: string, users?: string[]) {
    const url = 'https://slack.com/api/conversations.invite';
    
    if (!users || users.length === 0) {
      throw new Error('Users list is required for invite operation');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel,
        users: users.join(',')
      })
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    return {
      channel: result.channel
    };
  }

  private async getChannelInfo(token: string, channel: string) {
    const url = 'https://slack.com/api/conversations.info';
    
    const response = await fetch(`${url}?channel=${encodeURIComponent(channel)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    return {
      channel: result.channel
    };
  }

  private async listChannels(token: string) {
    const url = 'https://slack.com/api/conversations.list';
    
    const response = await fetch(`${url}?types=public_channel,private_channel`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    return {
      channels: result.channels
    };
  }}


export default SlackNode;
