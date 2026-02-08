import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;

export class DiscordNode {
  getNodeDefinition() {
    return {
      id: 'discord',
      type: 'action',
      name: 'Discord',
      description: 'Send Discord messages, embeds, and manage channels',
      category: 'communication',
      version: '1.0.0',
      author: 'Workflow Studio',
      
      parameters: [
        {
          name: 'botToken',
          type: 'string',
          displayName: 'Bot Token',
          description: 'Discord Bot Token',
          required: true,
          placeholder: 'Bot Token',
          credentialType: 'discord_bot_token'
        },
        {
          name: 'operation',
          type: 'options',
          displayName: 'Operation',
          description: 'Discord operation to perform',
          required: true,
          default: 'sendMessage',
          options: [
            { name: 'Send Message', value: 'sendMessage' },
            { name: 'Send Embed', value: 'sendEmbed' },
            { name: 'Edit Message', value: 'editMessage' },
            { name: 'Delete Message', value: 'deleteMessage' },
            { name: 'Create Channel', value: 'createChannel' },
            { name: 'Get Channel Info', value: 'getChannelInfo' }
          ]
        },
        {
          name: 'guildId',
          type: 'string',
          displayName: 'Server ID',
          description: 'Discord Server (Guild) ID',
          required: true,
          placeholder: 'Enter Discord server ID'
        },
        {
          name: 'channelId',
          type: 'string',
          displayName: 'Channel ID',
          description: 'Discord Channel ID',
          required: true,
          placeholder: 'Enter Discord channel ID'
        },
        {
          name: 'message',
          type: 'string',
          displayName: 'Message Content',
          description: 'Message text to send',
          required: false,
          placeholder: 'Enter message content...'
        },
        {
          name: 'attachments',
          type: 'array',
          displayName: 'Attachments',
          description: 'File attachments to send with the message',
          required: false,
          placeholder: 'Select or upload file'
        },
        {
          name: 'embedTitle',
          type: 'string',
          displayName: 'Embed Title',
          description: 'Title for rich embed message',
          required: false,
          placeholder: 'Workflow Notification'
        },
        {
          name: 'embedDescription',
          type: 'string',
          displayName: 'Embed Description',
          description: 'Description for rich embed message',
          required: false,
          placeholder: 'This is a workflow notification'
        },
        {
          name: 'embedColor',
          type: 'string',
          displayName: 'Embed Color',
          description: 'Hex color for embed (e.g., #00ff00)',
          required: false,
          placeholder: '#00ff00'
        },
        {
          name: 'tts',
          type: 'boolean',
          displayName: 'Text-to-Speech',
          description: 'Enable text-to-speech for the message',
          required: false,
          default: false
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
          name: 'channelId',
          type: 'string',
          description: 'Channel ID from previous node',
          required: false
        },
        {
          name: 'embed',
          type: 'object',
          description: 'Rich embed data from previous node',
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

      const { botToken, operation, guildId, channelId, message, attachments, embedTitle, embedDescription, embedColor, tts } = config;
      const inputMessage = context.input?.message || message;
      const inputChannelId = context.input?.channelId || channelId;
      const inputGuildId = context.input?.guildId || guildId;
      const inputAttachments = context.input?.attachments || attachments;
      const inputEmbed = context.input?.embed;

      if (!botToken) {
        throw new Error('Discord Bot Token is required');
      }
      
      if (!inputGuildId && operation !== 'getChannelInfo') {
        throw new Error('Discord Server ID is required');
      }

      let result: any = {};

      switch (operation) {
        case 'sendMessage':
          result = await this.sendMessage(botToken, inputChannelId, inputMessage, inputAttachments, tts);
          break;
        case 'sendEmbed':
          result = await this.sendEmbed(botToken, inputChannelId, inputEmbed || {
            title: embedTitle,
            description: embedDescription,
            color: embedColor
          });
          break;
        case 'editMessage':
          result = await this.editMessage(botToken, inputChannelId, context.input?.messageId, inputMessage);
          break;
        case 'deleteMessage':
          result = await this.deleteMessage(botToken, inputChannelId, context.input?.messageId);
          break;
        case 'createChannel':
          result = await this.createChannel(botToken, inputGuildId, inputMessage);
          break;
        case 'getChannelInfo':
          result = await this.getChannelInfo(botToken, inputChannelId);
          break;
        default:
          throw new Error(`Unsupported Discord operation: ${operation}`);
      }

      const duration = Date.now() - startTime;
      
      logger.info('Discord node executed successfully', {
        operation,
        channelId: inputChannelId,
        duration
      });

      return {
        success: true,
        output: {
          ...context.input,  // Preserve input data
          message: result.message || inputMessage,
          channel: result.channel || inputChannelId,
          operation,
          timestamp: new Date().toISOString(),
          duration
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Discord node execution failed', {
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

  private async sendMessage(token: string, channelId: string, content: string, attachments: any[] = [], tts: boolean = false) {
    const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
    
    // Prepare attachments if provided
    let attachmentsData = [];
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      attachmentsData = attachments.map((att, index) => ({
        id: index,
        filename: att.filename || att.name || `attachment-${index}`,
        description: att.description || ''
      }));
    }
    
    const payload: any = {
      content: content || undefined,
      tts
    };
    
    if (attachmentsData.length > 0) {
      payload.attachments = attachmentsData;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    return {
      message: result,
      channel: { id: channelId }
    };
  }

  private async sendEmbed(token: string, channelId: string, embed: any) {
    const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    return {
      message: result,
      channel: { id: channelId }
    };
  }

  private async editMessage(token: string, channelId: string, messageId: string, content: string) {
    const url = `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    return {
      message: result,
      channel: { id: channelId }
    };
  }

  private async deleteMessage(token: string, channelId: string, messageId: string) {
    const url = `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bot ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord API error: ${response.status} ${error}`);
    }

    return {
      success: true,
      channel: { id: channelId }
    };
  }

  private async createChannel(token: string, guildId: string, channelName: string) {
    const url = `https://discord.com/api/v10/guilds/${guildId}/channels`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: channelName,
        type: 0 // Text channel
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    return {
      channel: result
    };
  }

  private async getChannelInfo(token: string, channelId: string) {
    const url = `https://discord.com/api/v10/channels/${channelId}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bot ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    return {
      channel: result
    };
  }}


export default DiscordNode;
