import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require('../../utils/logger');

export class DiscordNode {
  getNodeDefinition() {
    return {
      id: 'discord',
      type: 'action',
      name: 'Discord Integration',
      description: 'Send messages, create channels, and interact with Discord',
      category: 'integration',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'action',
          type: 'options',
          displayName: 'Discord Action',
          description: 'Discord operation to perform',
          required: true,
          default: 'send_message',
          options: [
            { name: 'Send Message', value: 'send_message' },
            { name: 'Create Channel', value: 'create_channel' },
            { name: 'Send Embed', value: 'send_embed' },
            { name: 'React to Message', value: 'react' },
            { name: 'Get User Info', value: 'get_user_info' }
          ]
        },
        {
          name: 'channelId',
          type: 'string',
          displayName: 'Channel ID',
          description: 'Discord channel ID',
          required: false,
          placeholder: '123456789012345678'
        },
        {
          name: 'emoji',
          type: 'string',
          displayName: 'Reaction Emoji',
          description: 'Emoji to react with',
          required: false,
          placeholder: '👍 or :thumbsup:'
        },
        {
          name: 'useOAuth',
          type: 'boolean',
          displayName: 'Use OAuth',
          description: 'Use OAuth for user-specific Discord access',
          required: false,
          default: false
        },
        {
          name: 'accessToken',
          type: 'string',
          displayName: 'Access Token',
          description: 'Discord OAuth access token (optional - OAuth will be used if not provided)',
          required: false,
          placeholder: 'your-discord-token',
          credentialType: 'discord_oauth_token'
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'action',
          type: 'string',
          displayName: 'Dynamic Action',
          description: 'Discord action from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'channelId',
          type: 'string',
          displayName: 'Dynamic Channel ID',
          description: 'Discord channel ID from previous node (overrides configured)',
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
          name: 'embed',
          type: 'object',
          displayName: 'Rich Embed',
          description: 'Discord embed object from previous node',
          required: false,
          dataType: 'object'
        },
        {
          name: 'emoji',
          type: 'string',
          displayName: 'Dynamic Emoji',
          description: 'Reaction emoji from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'userId',
          type: 'string',
          displayName: 'User ID',
          description: 'Discord user ID from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'messageId',
          type: 'string',
          displayName: 'Message ID',
          description: 'Discord message ID from previous node',
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
          name: 'messageId',
          type: 'string',
          displayName: 'Message ID',
          description: 'ID of the sent message',
          dataType: 'text'
        },
        {
          name: 'channelId',
          type: 'string',
          displayName: 'Channel ID',
          description: 'Channel that was used',
          dataType: 'text'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          channelId: { type: 'string' },
          emoji: { type: 'string' },
          useOAuth: { type: 'boolean' },
          accessToken: { type: 'string' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          channelId: { type: 'string' },
          message: { type: 'string' },
          embed: { type: 'object' },
          emoji: { type: 'string' },
          userId: { type: 'string' },
          messageId: { type: 'string' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          messageId: { type: 'string' },
          channelId: { type: 'string' }
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
      const channelId = config.channelId || context.input?.channelId;
      const message = config.message || context.input?.message;
      const embed = config.embed;
      const emoji = config.emoji;
      const useOAuth = config.useOAuth || false;

      if (!action) {
        throw new Error('Action is required for Discord integration');
      }

      logger.info('Discord integration executed', {
        nodeId: node.id,
        action,
        channelId,
        runId: context.runId
      });

      let result: any;

      switch (action) {
        case 'send_message':
          result = await this.sendMessage(channelId, message, embed, useOAuth, config, context);
          break;
        case 'create_channel':
          result = await this.createChannel(context.input?.name, context.input?.type, useOAuth, config, context);
          break;
        case 'send_embed':
          result = await this.sendEmbed(channelId, embed, useOAuth, config, context);
          break;
        case 'react':
          result = await this.reactToMessage(channelId, context.input?.messageId, emoji, useOAuth, config, context);
          break;
        case 'get_user_info':
          result = await this.getUserInfo(context.input?.userId, useOAuth, config, context);
          break;
        default:
          throw new Error(`Unsupported Discord action: ${action}`);
      }

      return {
        success: true,
        output: result,
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Discord integration failed', error, {
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

  private async sendMessage(channelId: string, message: string, embed?: any, useOAuth?: boolean, config?: any, context?: ExecutionContext): Promise<any> {
    const discordToken = await this.getDiscordToken(useOAuth, config, context);
    if (!discordToken) {
      throw new Error('Discord token is required. Please provide DISCORD_BOT_TOKEN or connect your Discord account via OAuth.');
    }

    const payload: any = {
      content: message
    };

    if (embed) {
      payload.embeds = [embed];
    }

    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${discordToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      messageId: data.id,
      channelId: data.channel_id
    };
  }

  private async createChannel(name: string, type: number = 0, useOAuth?: boolean, config?: any, context?: ExecutionContext): Promise<any> {
    const discordToken = await this.getDiscordToken(useOAuth, config, context);
    const guildId = process.env.DISCORD_GUILD_ID;
    
    if (!discordToken) {
      throw new Error('Discord token is required. Please provide DISCORD_BOT_TOKEN or connect your Discord account via OAuth.');
    }
    
    if (!guildId) {
      throw new Error('DISCORD_GUILD_ID environment variable is required');
    }

    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${discordToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        type
      })
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      channelId: data.id,
      name: data.name
    };
  }

  private async sendEmbed(channelId: string, embed: any, useOAuth?: boolean, config?: any, context?: ExecutionContext): Promise<any> {
    const discordToken = await this.getDiscordToken(useOAuth, config, context);
    if (!discordToken) {
      throw new Error('Discord token is required. Please provide DISCORD_BOT_TOKEN or connect your Discord account via OAuth.');
    }

    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${discordToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      messageId: data.id,
      channelId: data.channel_id
    };
  }

  private async reactToMessage(channelId: string, messageId: string, emoji: string, useOAuth?: boolean, config?: any, context?: ExecutionContext): Promise<any> {
    const discordToken = await this.getDiscordToken(useOAuth, config, context);
    if (!discordToken) {
      throw new Error('Discord token is required. Please provide DISCORD_BOT_TOKEN or connect your Discord account via OAuth.');
    }

    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${discordToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`);
    }

    return {
      success: true,
      message: 'Reaction added successfully'
    };
  }

  private async getUserInfo(userId: string, useOAuth?: boolean, config?: any, context?: ExecutionContext): Promise<any> {
    const discordToken = await this.getDiscordToken(useOAuth, config, context);
    if (!discordToken) {
      throw new Error('Discord token is required. Please provide DISCORD_BOT_TOKEN or connect your Discord account via OAuth.');
    }

    const response = await fetch(`https://discord.com/api/v10/users/${userId}`, {
      headers: {
        'Authorization': `Bot ${discordToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      user: data
    };
  }

  private async getDiscordToken(useOAuth?: boolean, config?: any, context?: ExecutionContext): Promise<string> {
    if (useOAuth) {
      let accessToken = config?.accessToken;
      
      if (!accessToken) {
        try {
          const { oauthService } = await import('../../services/oauth.service');
          const userId = context?.agentId || 'default-user';
          accessToken = await oauthService.getValidAccessToken(userId, 'discord');
        } catch (oauthError) {
          throw new Error('Discord OAuth access token is required. Please provide accessToken in config or connect your Discord account via OAuth.');
        }
      }
      
      return accessToken;
    } else {
      const discordToken = process.env.DISCORD_BOT_TOKEN;
      if (!discordToken) {
        throw new Error('DISCORD_BOT_TOKEN environment variable is required');
      }
      return discordToken;
    }

}}

export default DiscordNode;
