/**
 * WhatsApp Node
 * Comprehensive WhatsApp Business API node with full n8n-like functionality
 */

import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
import { 
  RESOURCES, 
  OPERATIONS, 
  MESSAGE_TYPES, 
  MEDIA_TYPES,
  MEDIA_PATH_OPTIONS,
  ERROR_MESSAGES 
} from './constants';
import { 
  WhatsAppCredentials, 
  WhatsAppNodeConfig,
  MessageType,
  MediaType,
  Operation,
  Resource
} from './types';
import { whatsappApiRequest, getPhoneNumbers, getTemplates } from './utils/GenericFunctions';
import { 
  buildTextMessagePayload,
  buildTemplateMessagePayload,
  buildMediaMessagePayload,
  buildLocationMessagePayload,
  buildContactMessagePayload,
  processTemplateComponents,
  processTemplateInfo,
  processErrorResponse,
  cleanPhoneNumber
} from './utils/MessageFunctions';
import { 
  uploadMediaFromItem, 
  downloadMedia, 
  deleteMedia 
} from './utils/MediaFunctions';
import { cleanPhoneNumberForWhatsApp } from './utils/PhoneUtils';
import { getAllMessageFields } from './descriptions/MessageFields';
import { getAllMediaFields } from './descriptions/MediaFields';

// Inline logger (no external dependency)
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta ? JSON.stringify(meta) : ''),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta ? JSON.stringify(meta) : ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta ? JSON.stringify(meta) : ''),
  debug: (msg: string, meta?: any) => console.debug(`[DEBUG] ${msg}`, meta ? JSON.stringify(meta) : ''),
};

export class WhatsAppNode {
  getNodeDefinition() {
    // Combine all field definitions
    const allFields = [
      // Resource selection
      {
        name: 'resource',
        type: 'options',
        displayName: 'Resource',
        description: 'The resource to operate on',
        required: true,
        default: RESOURCES.MESSAGE,
        options: [
          { name: 'Message', value: RESOURCES.MESSAGE },
          { name: 'Media', value: RESOURCES.MEDIA },
        ],
      },
      // Message fields
      ...getAllMessageFields(),
      // Media fields
      ...getAllMediaFields(),
    ];

    return {
      id: 'whatsapp',
      type: 'action',
      name: 'WhatsApp',
      description: 'Send WhatsApp messages and manage media via Meta Business API',
      category: 'communication',
      version: '2.0.0',
      author: 'Workflow Studio',
      parameters: allFields,
      inputs: [
        {
          name: 'accessToken',
          type: 'string',
          displayName: 'Dynamic Access Token',
          description: 'Access token from previous node (optional override)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'phoneNumberId',
          type: 'string',
          displayName: 'Dynamic Phone Number ID',
          description: 'Phone number ID from previous node (optional override)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'businessAccountId',
          type: 'string',
          displayName: 'Dynamic Business Account ID',
          description: 'Business account ID from previous node (optional override)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'recipientPhoneNumber',
          type: 'string',
          displayName: 'Dynamic Recipient',
          description: 'Recipient phone number from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'textBody',
          type: 'string',
          displayName: 'Dynamic Message Text',
          description: 'Message text from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'mediaData',
          type: 'object',
          displayName: 'Media Data',
          description: 'Media binary data from previous node',
          required: false,
          dataType: 'object'
        },
        {
          name: 'template',
          type: 'string',
          displayName: 'Dynamic Template',
          description: 'Template name|language from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'components',
          type: 'object',
          displayName: 'Dynamic Components',
          description: 'Template components from previous node',
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
          name: 'mediaId',
          type: 'string',
          displayName: 'Media ID',
          description: 'Media ID (for upload operations)',
          dataType: 'text'
        },
        {
          name: 'mediaUrl',
          type: 'string',
          displayName: 'Media URL',
          description: 'Media download URL (for download operations)',
          dataType: 'text'
        },
        {
          name: 'timestamp',
          type: 'string',
          displayName: 'Timestamp',
          description: 'When operation was performed',
          dataType: 'text'
        },
        {
          name: 'duration',
          type: 'number',
          displayName: 'Duration',
          description: 'Execution duration in milliseconds',
          dataType: 'number'
        }
      ]
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config: WhatsAppNodeConfig = node.data?.config || {};
    
    try {
      // Get credentials (from config or input) - prioritize input
      const credentials = this.getCredentials(config, context);
      
      // Get resource and operation - prioritize input over config
      const resource: Resource = this.resolveValue(
        context.input?.resource,
        config.resource,
        RESOURCES.MESSAGE
      ) as Resource;
      
      const operation: Operation = this.resolveValue(
        context.input?.operation,
        config.operation,
      OPERATIONS.SEND
      ) as Operation;

      // Check if we have array data from previous nodes
      const inputData = this.getInputData(context);
      const isArrayInput = Array.isArray(inputData) && inputData.length > 0;

      let results: any[] = [];

      if (isArrayInput) {
        // Process each item from previous nodes
        for (let i = 0; i < inputData.length; i++) {
          const itemContext = {
            ...context,
            input: { ...context.input, ...inputData[i] }
          };
          
          let result: any;
          if (resource === RESOURCES.MESSAGE) {
            result = await this.handleMessageOperation(credentials, config, itemContext, operation);
          } else if (resource === RESOURCES.MEDIA) {
            result = await this.handleMediaOperation(credentials, config, itemContext, operation);
          } else {
            throw new Error(`Unknown resource: ${resource}`);
          }
          
          results.push(result);
        }
      } else {
        // Single item processing
        let result: any;
        if (resource === RESOURCES.MESSAGE) {
          result = await this.handleMessageOperation(credentials, config, context, operation);
        } else if (resource === RESOURCES.MEDIA) {
          result = await this.handleMediaOperation(credentials, config, context, operation);
        } else {
          throw new Error(`Unknown resource: ${resource}`);
        }
        results = [result];
      }

      const duration = Date.now() - startTime;
      
      logger.info('WhatsApp node executed successfully', {
        resource,
        operation,
        itemsProcessed: results.length,
        duration
      });

      // Return results preserving input data
      const output = results.length === 1 ? results[0] : results;
      
      return {
        success: true,
        output: {
          ...context.input,  // Preserve all input data
          ...(typeof output === 'object' && !Array.isArray(output) ? output : {}),
          results: output,
          timestamp: new Date().toISOString(),
          duration
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('WhatsApp node execution failed', {
        error: error.message,
        duration
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  /**
   * Resolve value prioritizing input over config over default
   */
  private resolveValue(inputValue: any, configValue: any, defaultValue: any): any {
    if (inputValue !== undefined && inputValue !== null && inputValue !== '') {
      return inputValue;
    }
    if (configValue !== undefined && configValue !== null && configValue !== '') {
      return configValue;
    }
    return defaultValue;
  }

  /**
   * Get input data from context (supports arrays from previous nodes)
   */
  private getInputData(context: ExecutionContext): any {
    // Check if input is an array (multiple items from previous node)
    if (Array.isArray(context.input)) {
      return context.input;
    }
    
    // Check if input has a data array
    if (context.input?.data && Array.isArray(context.input.data)) {
      return context.input.data;
    }
    
    // Check if input has items array
    if (context.input?.items && Array.isArray(context.input.items)) {
      return context.input.items;
    }
    
    // Return single item wrapped in array for consistent processing
    return context.input ? [context.input] : [];
  }

  /**
   * Get credentials from config or input (prioritize input)
   */
  private getCredentials(config: WhatsAppNodeConfig, context: ExecutionContext): WhatsAppCredentials {
    // Prioritize input over config
    const accessToken = this.resolveValue(
      context.input?.accessToken,
      config.accessToken,
      null
    );
    
    const phoneNumberId = this.resolveValue(
      context.input?.phoneNumberId,
      config.phoneNumberId,
      null
    );
    
    const businessAccountId = this.resolveValue(
      context.input?.businessAccountId,
      config.businessAccountId,
      null
    );

    if (!accessToken) {
      throw new Error(ERROR_MESSAGES.MISSING_ACCESS_TOKEN);
    }

    return {
      accessToken,
      businessAccountId: businessAccountId || undefined,
      phoneNumberId: phoneNumberId || undefined
    };
  }

  /**
   * Handle message operations
   */
  private async handleMessageOperation(
    credentials: WhatsAppCredentials,
    config: WhatsAppNodeConfig,
    context: ExecutionContext,
    operation: Operation
  ): Promise<any> {
    // Resolve phone number ID - prioritize input
    const phoneNumberId = this.resolveValue(
      context.input?.phoneNumberId,
      credentials.phoneNumberId,
      config.phoneNumberId
    );
    
    if (!phoneNumberId) {
      throw new Error(ERROR_MESSAGES.MISSING_PHONE_NUMBER_ID);
    }

    // Resolve recipient - prioritize input, check multiple possible field names
    const recipient = this.resolveValue(
      context.input?.recipientPhoneNumber || context.input?.recipient || context.input?.to || context.input?.phoneNumber,
      config.recipientPhoneNumber || config.recipient || config.to,
      null
    );
    
    if (!recipient) {
      throw new Error(ERROR_MESSAGES.MISSING_RECIPIENT);
    }

    if (operation === OPERATIONS.SEND_TEMPLATE) {
      return await this.sendTemplateMessage(credentials, phoneNumberId, recipient, config, context);
    } else if (operation === OPERATIONS.SEND) {
      return await this.sendMessage(credentials, phoneNumberId, recipient, config, context);
    } else {
      throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  /**
   * Handle media operations
   */
  private async handleMediaOperation(
    credentials: WhatsAppCredentials,
    config: WhatsAppNodeConfig,
    context: ExecutionContext,
    operation: Operation
  ): Promise<any> {
    if (operation === OPERATIONS.MEDIA_UPLOAD) {
      return await this.uploadMediaOperation(credentials, config, context);
    } else if (operation === OPERATIONS.MEDIA_DOWNLOAD) {
      return await this.downloadMediaOperation(credentials, config, context);
    } else if (operation === OPERATIONS.MEDIA_DELETE) {
      return await this.deleteMediaOperation(credentials, config, context);
    } else {
      throw new Error(`Unsupported media operation: ${operation}`);
    }
  }

  /**
   * Send message (text, media, location, contacts)
   */
  private async sendMessage(
    credentials: WhatsAppCredentials,
    phoneNumberId: string,
    recipient: string,
    config: WhatsAppNodeConfig,
    context: ExecutionContext
  ): Promise<any> {
    // Resolve message type - prioritize input
    const messageType: MessageType = this.resolveValue(
      context.input?.messageType,
      config.messageType,
      MESSAGE_TYPES.TEXT
    ) as MessageType;

    let payload: any;

    switch (messageType) {
      case MESSAGE_TYPES.TEXT:
        // Resolve text body - check multiple possible field names
        const textBody = this.resolveValue(
          context.input?.textBody || context.input?.message || context.input?.text || context.input?.content,
          config.textBody || config.message || config.text,
          ''
        );
        
        const previewUrl = this.resolveValue(
          context.input?.previewUrl,
          config.previewUrl,
          false
        );
        
        payload = buildTextMessagePayload(recipient, textBody, previewUrl);
        break;

      case MESSAGE_TYPES.IMAGE:
      case MESSAGE_TYPES.VIDEO:
      case MESSAGE_TYPES.AUDIO:
      case MESSAGE_TYPES.DOCUMENT:
      case MESSAGE_TYPES.STICKER:
        payload = await this.buildMediaPayload(
          credentials,
          phoneNumberId,
          recipient,
          messageType as MediaType,
          config,
          context
        );
        break;

      case MESSAGE_TYPES.LOCATION:
        // Resolve location data - prioritize input
        const longitude = this.resolveValue(
          context.input?.longitude,
          config.longitude,
          null
        );
        
        const latitude = this.resolveValue(
          context.input?.latitude,
          config.latitude,
          null
        );
        
        if (!longitude || !latitude) {
          throw new Error('Longitude and latitude are required for location messages');
        }
        
        const locationName = this.resolveValue(
          context.input?.locationName || context.input?.name,
          config.locationName,
          undefined
        );
        
        const locationAddress = this.resolveValue(
          context.input?.locationAddress || context.input?.address,
          config.locationAddress,
          undefined
        );
        
        payload = buildLocationMessagePayload(
          recipient,
          longitude,
          latitude,
          locationName,
          locationAddress
        );
        break;

      case MESSAGE_TYPES.CONTACTS:
        // Contact messages require building contact objects
        // For now, throw error - can be implemented later
        throw new Error('Contact messages not yet implemented');

      default:
        throw new Error(`Unsupported message type: ${messageType}`);
    }

    const response = await whatsappApiRequest(
      {
        method: 'POST',
        url: `/${phoneNumberId}/messages`,
        body: payload,
      },
      credentials
    );

    return {
      messageId: response.messages?.[0]?.id,
      status: response.messages?.[0]?.message_status || 'sent',
      recipient: cleanPhoneNumberForWhatsApp(recipient),
      messageType,
    };
  }

  /**
   * Build media payload (handles upload if needed)
   */
  private async buildMediaPayload(
    credentials: WhatsAppCredentials,
    phoneNumberId: string,
    recipient: string,
    mediaType: MediaType,
    config: WhatsAppNodeConfig,
    context: ExecutionContext
  ): Promise<any> {
    // Resolve media path - prioritize input
    const mediaPath = this.resolveValue(
      context.input?.mediaPath,
      config.mediaPath,
      MEDIA_PATH_OPTIONS.USE_LINK
    );

    if (mediaPath === MEDIA_PATH_OPTIONS.USE_MEDIA_ID) {
      // Use existing media ID - prioritize input
      const mediaId = this.resolveValue(
        context.input?.mediaId,
        config.mediaId,
        null
      );
      
      if (!mediaId) {
        throw new Error('Media ID is required when using media ID source');
      }
      
      const caption = this.resolveValue(
        context.input?.mediaCaption || context.input?.caption,
        config.mediaCaption,
        undefined
      );
      
      const filename = this.resolveValue(
        context.input?.mediaFilename || context.input?.filename,
        config.mediaFilename,
        undefined
      );
      
      return buildMediaMessagePayload(
        recipient,
        mediaType,
        mediaId,
        undefined,
        caption,
        filename
      );
    } else if (mediaPath === MEDIA_PATH_OPTIONS.USE_N8N_BINARY) {
      // Upload media first, then use ID - prioritize input
      const binaryData = this.resolveValue(
        context.input?.mediaData || context.input?.binaryData || context.input?.data,
        config.mediaData,
        null
      );
      
      if (!binaryData) {
        throw new Error('Binary data is required when using binary data source');
      }

      const filename = this.resolveValue(
        context.input?.mediaFilename || context.input?.filename,
        config.mediaFilename,
        undefined
      );

      const mediaId = await uploadMediaFromItem(
        credentials,
        phoneNumberId,
        binaryData as any,
        filename
      );

      const caption = this.resolveValue(
        context.input?.mediaCaption || context.input?.caption,
        config.mediaCaption,
        undefined
      );

      return buildMediaMessagePayload(
        recipient,
        mediaType,
        mediaId,
        undefined,
        caption,
        filename
      );
    } else {
      // Use media link - prioritize input
      const mediaLink = this.resolveValue(
        context.input?.mediaLink || context.input?.mediaUrl || context.input?.url,
        config.mediaLink || config.mediaUrl,
        null
      );
      
      if (!mediaLink) {
        throw new Error(ERROR_MESSAGES.MISSING_MEDIA_URL);
      }

      const caption = this.resolveValue(
        context.input?.mediaCaption || context.input?.caption,
        config.mediaCaption,
        undefined
      );
      
      const filename = this.resolveValue(
        context.input?.mediaFilename || context.input?.filename,
        config.mediaFilename,
        undefined
      );

      return buildMediaMessagePayload(
        recipient,
        mediaType,
        undefined,
        mediaLink,
        caption,
        filename
      );
    }
  }

  /**
   * Send template message
   */
  private async sendTemplateMessage(
    credentials: WhatsAppCredentials,
    phoneNumberId: string,
    recipient: string,
    config: WhatsAppNodeConfig,
    context: ExecutionContext
  ): Promise<any> {
    // Resolve template - prioritize input
    const template = this.resolveValue(
      context.input?.template || context.input?.templateName,
      config.template,
      null
    );
    
    if (!template) {
      throw new Error('Template name is required');
    }

    // Parse template name and language
    const [templateName, templateLanguage] = template.split('|');

    // Process components if provided - prioritize input
    let components: any[] = [];
    const componentsInput = this.resolveValue(
      context.input?.components || context.input?.templateComponents,
      config.components,
      null
    );
    
    if (componentsInput) {
      components = processTemplateComponents(componentsInput);
    }

    const payload = buildTemplateMessagePayload(
      recipient,
      templateName,
      templateLanguage || 'en',
      components
    );

    const response = await whatsappApiRequest(
      {
        method: 'POST',
        url: `/${phoneNumberId}/messages`,
        body: payload,
      },
      credentials
    );

    return {
      messageId: response.messages?.[0]?.id,
      status: response.messages?.[0]?.message_status || 'sent',
      recipient: cleanPhoneNumberForWhatsApp(recipient),
      messageType: 'template',
    };
  }

  /**
   * Upload media operation
   */
  private async uploadMediaOperation(
    credentials: WhatsAppCredentials,
    config: WhatsAppNodeConfig,
    context: ExecutionContext
  ): Promise<any> {
    // Resolve phone number ID - prioritize input
    const phoneNumberId = this.resolveValue(
      context.input?.phoneNumberId,
      credentials.phoneNumberId,
      config.phoneNumberId
    );
    
    if (!phoneNumberId) {
      throw new Error(ERROR_MESSAGES.MISSING_PHONE_NUMBER_ID);
    }

    // Resolve binary data - prioritize input, check multiple field names
    const binaryData = this.resolveValue(
      context.input?.mediaData || context.input?.binaryData || context.input?.data || context.input?.file,
      config.mediaData,
      null
    );
    
    if (!binaryData) {
      throw new Error('Binary data is required for media upload');
    }

    // Resolve filename - prioritize input
    const filename = this.resolveValue(
      context.input?.mediaFileName || context.input?.filename || context.input?.fileName,
      config.mediaFileName,
      undefined
    );

    const mediaId = await uploadMediaFromItem(
      credentials,
      phoneNumberId,
      binaryData as any,
      filename
    );

    return {
      mediaId,
      operation: 'upload',
    };
  }

  /**
   * Download media operation
   */
  private async downloadMediaOperation(
    credentials: WhatsAppCredentials,
    config: WhatsAppNodeConfig,
    context: ExecutionContext
  ): Promise<any> {
    // Resolve media ID - prioritize input
    const mediaId = this.resolveValue(
      context.input?.mediaGetId || context.input?.mediaId,
      config.mediaGetId || config.mediaId,
      null
    );
    
    if (!mediaId) {
      throw new Error(ERROR_MESSAGES.MISSING_MEDIA_ID);
    }

    const mediaInfo = await downloadMedia(credentials, mediaId);

    return {
      mediaId,
      mediaUrl: mediaInfo.url,
      mimeType: mediaInfo.mime_type,
      fileSize: mediaInfo.file_size,
      operation: 'download',
    };
  }

  /**
   * Delete media operation
   */
  private async deleteMediaOperation(
    credentials: WhatsAppCredentials,
    config: WhatsAppNodeConfig,
    context: ExecutionContext
  ): Promise<any> {
    // Resolve media ID - prioritize input
    const mediaId = this.resolveValue(
      context.input?.mediaDeleteId || context.input?.mediaId,
      config.mediaDeleteId || config.mediaId,
      null
    );
    
    if (!mediaId) {
      throw new Error(ERROR_MESSAGES.MISSING_MEDIA_ID);
    }

    await deleteMedia(credentials, mediaId);

    return {
      mediaId,
      operation: 'delete',
      success: true,
    };
  }
}

export default WhatsAppNode;

