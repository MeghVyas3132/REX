import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;

export class TelegramNode {
  getNodeDefinition() {
    return {
      id: 'telegram',
      type: 'action',
      name: 'Telegram',
      description: 'Send Telegram messages, photos, and manage bots',
      category: 'communication',
      version: '1.0.0',
      author: 'Workflow Studio',
      parameters: [
        {
          name: 'botToken',
          type: 'string',
          displayName: 'Bot Token',
          description: 'Telegram Bot Token from @BotFather',
          required: true,
          placeholder: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
          credentialType: 'telegram_bot_token'
        },
        {
          name: 'operation',
          type: 'options',
          displayName: 'Operation',
          description: 'Telegram operation to perform',
          required: true,
          default: 'sendMessage',
          options: [
            { name: 'Send Message', value: 'sendMessage' },
            { name: 'Send Photo', value: 'sendPhoto' },
            { name: 'Send Document', value: 'sendDocument' },
            { name: 'Send Audio', value: 'sendAudio' },
            { name: 'Send Video', value: 'sendVideo' },
            { name: 'Send Location', value: 'sendLocation' },
            { name: 'Send Contact', value: 'sendContact' },
            { name: 'Edit Message', value: 'editMessage' },
            { name: 'Delete Message', value: 'deleteMessage' },
            { name: 'Get Chat Info', value: 'getChat' },
            { name: 'Get Updates', value: 'getUpdates' }
          ]
        },
        {
          name: 'chatId',
          type: 'string',
          displayName: 'Chat ID',
          description: 'Telegram Chat ID (user ID, group ID, or channel username)',
          required: true,
          placeholder: '@username or -1001234567890'
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
          name: 'parseMode',
          type: 'options',
          displayName: 'Parse Mode',
          description: 'Message parsing mode',
          required: false,
          default: 'HTML',
          options: [
            { name: 'HTML', value: 'HTML' },
            { name: 'Markdown', value: 'Markdown' },
            { name: 'MarkdownV2', value: 'MarkdownV2' },
            { name: 'None', value: 'None' }
          ]
        },
        {
          name: 'disableWebPagePreview',
          type: 'boolean',
          displayName: 'Disable Web Page Preview',
          description: 'Disable link previews in the message',
          required: false,
          default: false
        },
        {
          name: 'disableNotification',
          type: 'boolean',
          displayName: 'Disable Notification',
          description: 'Send message silently',
          required: false,
          default: false
        },
        {
          name: 'replyToMessageId',
          type: 'string',
          displayName: 'Reply To Message ID',
          description: 'ID of the message to reply to',
          required: false,
          placeholder: '12345'
        },
        {
          name: 'photoUrl',
          type: 'string',
          displayName: 'Photo URL',
          description: 'URL of photo to send',
          required: false,
          placeholder: 'https://example.com/photo.jpg'
        },
        {
          name: 'photoCaption',
          type: 'string',
          displayName: 'Photo Caption',
          description: 'Caption for the photo',
          required: false,
          placeholder: 'Check out this photo!'
        },
        {
          name: 'documentUrl',
          type: 'string',
          displayName: 'Document URL',
          description: 'URL of document to send',
          required: false,
          placeholder: 'https://example.com/document.pdf'
        },
        {
          name: 'documentCaption',
          type: 'string',
          displayName: 'Document Caption',
          description: 'Caption for the document',
          required: false,
          placeholder: 'Here is the document'
        },
        {
          name: 'latitude',
          type: 'string',
          displayName: 'Latitude',
          description: 'Latitude for location message',
          required: false,
          placeholder: '40.7128'
        },
        {
          name: 'longitude',
          type: 'string',
          displayName: 'Longitude',
          description: 'Longitude for location message',
          required: false,
          placeholder: '-74.0060'
        },
        {
          name: 'phoneNumber',
          type: 'string',
          displayName: 'Phone Number',
          description: 'Phone number for contact message',
          required: false,
          placeholder: '+1234567890'
        },
        {
          name: 'firstName',
          type: 'string',
          displayName: 'First Name',
          description: 'First name for contact message',
          required: false,
          placeholder: 'John'
        },
        {
          name: 'lastName',
          type: 'string',
          displayName: 'Last Name',
          description: 'Last name for contact message',
          required: false,
          placeholder: 'Doe'
        }
      ],
      inputs: [
        { name: 'message', type: 'string', description: 'Message text from previous node', required: false },
        { name: 'chatId', type: 'string', description: 'Chat ID from previous node', required: false },
        { name: 'mediaData', type: 'object', description: 'Media data from previous node', required: false }
      ],
      outputs: [
        { name: 'messageId', type: 'string', description: 'Telegram message ID' },
        { name: 'chat', type: 'object', description: 'Chat information' },
        { name: 'from', type: 'object', description: 'Sender information' }
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

      const { 
        botToken, 
        operation, 
        chatId, 
        message, 
        parseMode,
        disableWebPagePreview,
        disableNotification,
        replyToMessageId,
        photoUrl,
        photoCaption,
        documentUrl,
        documentCaption,
        latitude,
        longitude,
        phoneNumber,
        firstName,
        lastName
      } = config;
      
      const inputMessage = context.input?.message || message;
      const inputChatId = context.input?.chatId || chatId;
      const inputMediaData = context.input?.mediaData;

      if (!botToken) {
        throw new Error('Telegram Bot Token is required');
      }

      if (!inputChatId) {
        throw new Error('Chat ID is required');
      }

      let result: any = {};

      switch (operation) {
        case 'sendMessage':
          result = await this.sendMessage(botToken, inputChatId, inputMessage, parseMode, disableWebPagePreview, disableNotification, replyToMessageId);
          break;
        case 'sendPhoto':
          result = await this.sendPhoto(botToken, inputChatId, photoUrl, photoCaption, disableNotification, replyToMessageId);
          break;
        case 'sendDocument':
          result = await this.sendDocument(botToken, inputChatId, documentUrl, documentCaption, disableNotification, replyToMessageId);
          break;
        case 'sendAudio':
          result = await this.sendAudio(botToken, inputChatId, inputMediaData?.audioUrl, inputMediaData?.caption, disableNotification, replyToMessageId);
          break;
        case 'sendVideo':
          result = await this.sendVideo(botToken, inputChatId, inputMediaData?.videoUrl, inputMediaData?.caption, disableNotification, replyToMessageId);
          break;
        case 'sendLocation':
          result = await this.sendLocation(botToken, inputChatId, latitude, longitude, disableNotification, replyToMessageId);
          break;
        case 'sendContact':
          result = await this.sendContact(botToken, inputChatId, phoneNumber, firstName, lastName, disableNotification, replyToMessageId);
          break;
        case 'editMessage':
          result = await this.editMessage(botToken, inputChatId, replyToMessageId, inputMessage, parseMode);
          break;
        case 'deleteMessage':
          result = await this.deleteMessage(botToken, inputChatId, replyToMessageId);
          break;
        case 'getChat':
          result = await this.getChat(botToken, inputChatId);
          break;
        case 'getUpdates':
          result = await this.getUpdates(botToken);
          break;
        default:
          throw new Error(`Unsupported Telegram operation: ${operation}`);
      }

      const duration = Date.now() - startTime;
      
      logger.info('Telegram node executed successfully', {
        operation,
        chatId: inputChatId,
        duration
      });

      return {
        success: true,
        output: {
          ...context.input,  // Preserve input data
          messageId: result.message_id || result.result?.message_id,
          chat: result.chat || result.result?.chat,
          from: result.from || result.result?.from,
          operation,
          timestamp: new Date().toISOString(),
          duration
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Telegram node execution failed', {
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

  private async sendMessage(token: string, chatId: string, text: string, parseMode?: string, disableWebPagePreview?: boolean, disableNotification?: boolean, replyToMessageId?: string) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    
    const payload: any = {
      chat_id: chatId,
      text: text
    };

    if (parseMode && parseMode !== 'None') payload.parse_mode = parseMode;
    if (disableWebPagePreview) payload.disable_web_page_preview = true;
    if (disableNotification) payload.disable_notification = true;
    if (replyToMessageId) payload.reply_to_message_id = parseInt(replyToMessageId);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async sendPhoto(token: string, chatId: string, photoUrl: string, caption?: string, disableNotification?: boolean, replyToMessageId?: string) {
    const url = `https://api.telegram.org/bot${token}/sendPhoto`;
    
    const payload: any = {
      chat_id: chatId,
      photo: photoUrl
    };

    if (caption) payload.caption = caption;
    if (disableNotification) payload.disable_notification = true;
    if (replyToMessageId) payload.reply_to_message_id = parseInt(replyToMessageId);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async sendDocument(token: string, chatId: string, documentUrl: string, caption?: string, disableNotification?: boolean, replyToMessageId?: string) {
    const url = `https://api.telegram.org/bot${token}/sendDocument`;
    
    const payload: any = {
      chat_id: chatId,
      document: documentUrl
    };

    if (caption) payload.caption = caption;
    if (disableNotification) payload.disable_notification = true;
    if (replyToMessageId) payload.reply_to_message_id = parseInt(replyToMessageId);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async sendAudio(token: string, chatId: string, audioUrl: string, caption?: string, disableNotification?: boolean, replyToMessageId?: string) {
    const url = `https://api.telegram.org/bot${token}/sendAudio`;
    
    const payload: any = {
      chat_id: chatId,
      audio: audioUrl
    };

    if (caption) payload.caption = caption;
    if (disableNotification) payload.disable_notification = true;
    if (replyToMessageId) payload.reply_to_message_id = parseInt(replyToMessageId);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async sendVideo(token: string, chatId: string, videoUrl: string, caption?: string, disableNotification?: boolean, replyToMessageId?: string) {
    const url = `https://api.telegram.org/bot${token}/sendVideo`;
    
    const payload: any = {
      chat_id: chatId,
      video: videoUrl
    };

    if (caption) payload.caption = caption;
    if (disableNotification) payload.disable_notification = true;
    if (replyToMessageId) payload.reply_to_message_id = parseInt(replyToMessageId);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async sendLocation(token: string, chatId: string, latitude: string, longitude: string, disableNotification?: boolean, replyToMessageId?: string) {
    const url = `https://api.telegram.org/bot${token}/sendLocation`;
    
    const payload: any = {
      chat_id: chatId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };

    if (disableNotification) payload.disable_notification = true;
    if (replyToMessageId) payload.reply_to_message_id = parseInt(replyToMessageId);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async sendContact(token: string, chatId: string, phoneNumber: string, firstName: string, lastName?: string, disableNotification?: boolean, replyToMessageId?: string) {
    const url = `https://api.telegram.org/bot${token}/sendContact`;
    
    const payload: any = {
      chat_id: chatId,
      phone_number: phoneNumber,
      first_name: firstName
    };

    if (lastName) payload.last_name = lastName;
    if (disableNotification) payload.disable_notification = true;
    if (replyToMessageId) payload.reply_to_message_id = parseInt(replyToMessageId);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async editMessage(token: string, chatId: string, messageId: string, text: string, parseMode?: string) {
    const url = `https://api.telegram.org/bot${token}/editMessageText`;
    
    const payload: any = {
      chat_id: chatId,
      message_id: parseInt(messageId),
      text: text
    };

    if (parseMode && parseMode !== 'None') payload.parse_mode = parseMode;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async deleteMessage(token: string, chatId: string, messageId: string) {
    const url = `https://api.telegram.org/bot${token}/deleteMessage`;
    
    const payload = {
      chat_id: chatId,
      message_id: parseInt(messageId)
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async getChat(token: string, chatId: string) {
    const url = `https://api.telegram.org/bot${token}/getChat`;
    
    const payload = {
      chat_id: chatId
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async getUpdates(token: string) {
    const url = `https://api.telegram.org/bot${token}/getUpdates`;
    
    const response = await fetch(url, {
      method: 'GET'
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${response.status} ${error}`);
    }

    return await response.json();
  }}


export default TelegramNode;