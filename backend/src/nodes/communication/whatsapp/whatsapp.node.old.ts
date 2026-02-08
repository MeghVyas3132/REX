import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../../utils/types';
const logger = require("../../../utils/logger");

export class WhatsAppNode {
  getNodeDefinition() {
    return {
      id: 'whatsapp',
      type: 'action',
      name: 'WhatsApp',
      description: 'Send WhatsApp messages via Meta Business API',
      category: 'communication',
      version: '1.0.0',
      author: 'Workflow Studio',
      parameters: [
        {
          name: 'accessToken',
          type: 'string',
          displayName: 'Access Token',
          description: 'WhatsApp Business API access token',
          required: true,
          placeholder: 'EAA...',
          credentialType: 'whatsapp_token'
        },
        {
          name: 'phoneNumberId',
          type: 'string',
          displayName: 'Phone Number ID',
          description: 'WhatsApp Business phone number ID',
          required: true,
          placeholder: '123456789012345'
        },
        {
          name: 'businessAccountId',
          type: 'string',
          displayName: 'Business Account ID',
          description: 'WhatsApp Business account ID',
          required: true,
          placeholder: '123456789012345'
        },
        {
          name: 'to',
          type: 'string',
          displayName: 'Recipient',
          description: 'Recipient phone number (with country code)',
          required: true,
          placeholder: '1234567890'
        },
        {
          name: 'message',
          type: 'string',
          displayName: 'Message',
          description: 'Message text to send',
          required: true,
          placeholder: 'Hello, world!'
        },
        {
          name: 'messageType',
          type: 'options',
          displayName: 'Message Type',
          description: 'Type of message to send',
          required: false,
          default: 'text',
          options: [
            { name: 'Text', value: 'text' },
            { name: 'Template', value: 'template' },
            { name: 'Media', value: 'media' },
            { name: 'Interactive', value: 'interactive' }
          ]
        },
        {
          name: 'templateName',
          type: 'string',
          displayName: 'Template Name',
          description: 'WhatsApp template name (for template messages)',
          required: false,
          placeholder: 'hello_world'
        },
        {
          name: 'mediaType',
          type: 'string',
          displayName: 'Media Type',
          description: 'Media type (image, video, document)',
          required: false,
          placeholder: 'image'
        },
        {
          name: 'mediaUrl',
          type: 'string',
          displayName: 'Media URL',
          description: 'URL of media file',
          required: false,
          placeholder: 'https://...'
        }
      ],
      inputs: [
        {
          name: 'accessToken',
          type: 'string',
          displayName: 'Dynamic Access Token',
          description: 'Access token from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'phoneNumberId',
          type: 'string',
          displayName: 'Dynamic Phone Number ID',
          description: 'Phone number ID from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'businessAccountId',
          type: 'string',
          displayName: 'Dynamic Business Account ID',
          description: 'Business account ID from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'to',
          type: 'string',
          displayName: 'Dynamic Recipient',
          description: 'Recipient from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'message',
          type: 'string',
          displayName: 'Dynamic Message',
          description: 'Message from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'mediaData',
          type: 'object',
          displayName: 'Media Data',
          description: 'Media data from previous node',
          required: false,
          dataType: 'object'
        }
      ],
      outputs: [
        {
          name: 'messageId',
          type: 'string',
          displayName: 'Message ID',
          description: 'WhatsApp message ID',
          dataType: 'text'
        },
        {
          name: 'status',
          type: 'string',
          displayName: 'Status',
          description: 'Message status',
          dataType: 'text'
        },
        {
          name: 'recipient',
          type: 'string',
          displayName: 'Recipient',
          description: 'Recipient phone number',
          dataType: 'text'
        },
        {
          name: 'messageType',
          type: 'string',
          displayName: 'Message Type',
          description: 'Type of message sent',
          dataType: 'text'
        },
        {
          name: 'timestamp',
          type: 'string',
          displayName: 'Timestamp',
          description: 'When message was sent',
          dataType: 'text'
        }
      ]
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = node.data?.config || {};
    
    try {
    if (!config.accessToken && !context.input?.accessToken) {
      throw new Error('Required parameter "accessToken" is missing');
    }
    if (!config.phoneNumberId && !context.input?.phoneNumberId) {
      throw new Error('Required parameter "phoneNumberId" is missing');
    }
    if (!config.businessAccountId && !context.input?.businessAccountId) {
      throw new Error('Required parameter "businessAccountId" is missing');
    }
    if (!config.to && !context.input?.to) {
      throw new Error('Required parameter "to" is missing');
    }
    if (!config.message && !context.input?.message) {
      throw new Error('Required parameter "message" is missing');
    }


      const { 
        accessToken, 
        phoneNumberId, 
        businessAccountId, 
        to, 
        message, 
        messageType,
        templateName,
        templateParams,
        mediaType,
        mediaUrl,
        mediaCaption
      } = config;
      
      const inputMessage = context.input?.message || message;
      const inputTo = context.input?.to || to;
      const inputMediaData = context.input?.mediaData;

      if (!accessToken || !phoneNumberId || !businessAccountId) {
        throw new Error('WhatsApp credentials are required');
      }

      if (!inputTo) {
        throw new Error('Recipient phone number is required');
      }

      let result: any = {};

      switch (messageType) {
        case 'text':
          result = await this.sendTextMessage(accessToken, phoneNumberId, inputTo, inputMessage);
          break;
        case 'template':
          result = await this.sendTemplateMessage(accessToken, phoneNumberId, inputTo, templateName, templateParams);
          break;
        case 'media':
          result = await this.sendMediaMessage(accessToken, phoneNumberId, inputTo, mediaType, mediaUrl, mediaCaption);
          break;
        case 'interactive':
          result = await this.sendInteractiveMessage(accessToken, phoneNumberId, inputTo, inputMessage);
          break;
        default:
          result = await this.sendTextMessage(accessToken, phoneNumberId, inputTo, inputMessage);
      }

      const duration = Date.now() - startTime;
      
      logger.info('WhatsApp node executed successfully', {
        messageType,
        to: inputTo,
        duration
      });

      return {
        success: true,
        output: {
          messageId: result.messages?.[0]?.id,
          status: result.messages?.[0]?.message_status,
          recipient: inputTo,
          messageType,
          timestamp: new Date().toISOString(),
          duration
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('WhatsApp node execution failed', {
        error: error.message,
        messageType: config.messageType,
        duration
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  private async sendTextMessage(token: string, phoneNumberId: string, to: string, text: string) {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: text
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async sendTemplateMessage(token: string, phoneNumberId: string, to: string, templateName: string, templateParams?: string) {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    
    let parameters: any[] = [];
    if (templateParams) {
      try {
        parameters = JSON.parse(templateParams);
      } catch (e) {
        logger.warn('Invalid template parameters JSON', { templateParams });
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'en'
          },
          components: parameters.length > 0 ? [{
            type: 'body',
            parameters: parameters.map(param => ({ type: 'text', text: param }))
          }] : []
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async sendMediaMessage(token: string, phoneNumberId: string, to: string, mediaType: string, mediaUrl: string, caption?: string) {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    
    const mediaPayload: any = {
      messaging_product: 'whatsapp',
      to: to,
      type: mediaType,
      [mediaType]: {
        link: mediaUrl
      }
    };

    if (caption && (mediaType === 'image' || mediaType === 'video' || mediaType === 'document')) {
      mediaPayload[mediaType].caption = caption;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mediaPayload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async sendInteractiveMessage(token: string, phoneNumberId: string, to: string, text: string) {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: text
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: 'yes',
                  title: 'Yes'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: 'no',
                  title: 'No'
                }
              }
            ]
          }
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp API error: ${response.status} ${error}`);
    }

    return await response.json();
  }}


export default WhatsAppNode;