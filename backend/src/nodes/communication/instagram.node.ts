import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require('../../utils/logger');
import axios from 'axios';

export class InstagramNode {
  getNodeDefinition() {
    return {
      id: 'instagram',
      type: 'action',
      name: 'Instagram',
      description: 'Post media, send direct messages, and interact with Instagram API',
      category: 'communication',
      version: '1.0.0',
      author: 'Workflow Studio',
      
      parameters: [
        {
          name: 'accessToken',
          type: 'string',
          displayName: 'Access Token',
          description: 'Instagram Graph API access token',
          required: true,
          placeholder: 'Your Instagram access token',
          credentialType: 'instagram_access_token'
        },
        {
          name: 'operation',
          type: 'options',
          displayName: 'Operation',
          description: 'Instagram operation to perform',
          required: true,
          default: 'sendDirectMessage',
          options: [
            { name: 'Send Direct Message', value: 'sendDirectMessage' },
            { name: 'Create Media Object', value: 'createMediaObject' },
            { name: 'Publish Media', value: 'publishMedia' },
            { name: 'Get User Profile', value: 'getUserProfile' },
            { name: 'Get Media', value: 'getMedia' },
            { name: 'List Media', value: 'listMedia' },
            { name: 'Get Comments', value: 'getComments' },
            { name: 'Add Comment', value: 'addComment' }
          ]
        },
        {
          name: 'userId',
          type: 'string',
          displayName: 'User ID',
          description: 'Instagram user ID',
          required: false,
          placeholder: 'user_id'
        },
        {
          name: 'recipientId',
          type: 'string',
          displayName: 'Recipient ID',
          description: 'Instagram recipient user ID for direct messages',
          required: false,
          placeholder: 'recipient_user_id'
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
          name: 'imageUrl',
          type: 'string',
          displayName: 'Image URL',
          description: 'Image URL for media post',
          required: false,
          placeholder: 'https://example.com/image.jpg'
        },
        {
          name: 'caption',
          type: 'string',
          displayName: 'Caption',
          description: 'Caption for media post',
          required: false,
          placeholder: 'My post caption'
        },
        {
          name: 'mediaType',
          type: 'options',
          displayName: 'Media Type',
          description: 'Type of media',
          required: false,
          default: 'IMAGE',
          options: [
            { name: 'Image', value: 'IMAGE' },
            { name: 'Video', value: 'VIDEO' },
            { name: 'Carousel', value: 'CAROUSEL_ALBUM' }
          ]
        },
        {
          name: 'mediaId',
          type: 'string',
          displayName: 'Media ID',
          description: 'Instagram media ID',
          required: false,
          placeholder: 'media_id'
        },
        {
          name: 'commentText',
          type: 'string',
          displayName: 'Comment Text',
          description: 'Comment text to add',
          required: false,
          placeholder: 'Great post!'
        }
      ],

      inputs: [
        {
          name: 'recipientId',
          type: 'string',
          description: 'Recipient ID from previous node',
          required: false
        },
        {
          name: 'message',
          type: 'string',
          description: 'Message text from previous node',
          required: false
        },
        {
          name: 'imageUrl',
          type: 'string',
          description: 'Image URL from previous node',
          required: false
        },
        {
          name: 'caption',
          type: 'string',
          description: 'Caption from previous node',
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
          name: 'mediaId',
          type: 'string',
          description: 'Created media object ID'
        },
        {
          name: 'postId',
          type: 'string',
          description: 'Published post ID'
        },
        {
          name: 'commentId',
          type: 'string',
          description: 'Added comment ID'
        },
        {
          name: 'userProfile',
          type: 'object',
          description: 'User profile information'
        }
      ],

      configSchema: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          operation: { type: 'string' },
          userId: { type: 'string' },
          recipientId: { type: 'string' },
          message: { type: 'string' },
          imageUrl: { type: 'string' },
          caption: { type: 'string' },
          mediaType: { type: 'string' },
          mediaId: { type: 'string' },
          commentText: { type: 'string' }
        },
        required: ['accessToken', 'operation']
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    
    // Validation for required parameters
    if (!config.accessToken && !context.input?.accessToken) {
      throw new Error('Required parameter "accessToken" is missing');
    }
    if (!config.operation && !context.input?.operation) {
      throw new Error('Required parameter "operation" is missing');
    }

    const startTime = Date.now();
    
    try {
      const accessToken = config.accessToken;
      const operation = config.operation;
      const userId = config.userId || context.input?.userId || 'me';
      const recipientId = config.recipientId || context.input?.recipientId;
      const message = config.message || context.input?.message;
      const imageUrl = config.imageUrl || context.input?.imageUrl;
      const caption = config.caption || context.input?.caption;
      const mediaType = config.mediaType || 'IMAGE';
      const mediaId = config.mediaId || context.input?.mediaId;
      const commentText = config.commentText;

      if (!accessToken) {
        throw new Error('Instagram access token is required');
      }

      if (!operation) {
        throw new Error('Operation is required');
      }

      logger.info('Instagram node executed', {
        nodeId: node.id,
        operation,
        userId,
        recipientId,
        runId: context.runId
      });

      let result: any;

      switch (operation) {
        case 'sendDirectMessage':
          if (!recipientId || !message) {
            throw new Error('Recipient ID and message are required for sendDirectMessage');
          }
          result = await this.sendDirectMessage(accessToken, recipientId, message);
          break;
        case 'createMediaObject':
          if (!imageUrl || !caption) {
            throw new Error('Image URL and caption are required for createMediaObject');
          }
          result = await this.createMediaObject(accessToken, userId, imageUrl, caption, mediaType);
          break;
        case 'publishMedia':
          if (!mediaId) {
            throw new Error('Media ID is required for publishMedia');
          }
          result = await this.publishMedia(accessToken, userId, mediaId);
          break;
        case 'getUserProfile':
          result = await this.getUserProfile(accessToken, userId);
          break;
        case 'getMedia':
          if (!mediaId) {
            throw new Error('Media ID is required for getMedia');
          }
          result = await this.getMedia(accessToken, mediaId);
          break;
        case 'listMedia':
          result = await this.listMedia(accessToken, userId);
          break;
        case 'getComments':
          if (!mediaId) {
            throw new Error('Media ID is required for getComments');
          }
          result = await this.getComments(accessToken, mediaId);
          break;
        case 'addComment':
          if (!mediaId || !commentText) {
            throw new Error('Media ID and comment text are required for addComment');
          }
          result = await this.addComment(accessToken, mediaId, commentText);
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
      
      logger.error('Instagram node failed', error, {
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

  private async sendDirectMessage(accessToken: string, recipientId: string, message: string): Promise<any> {
    const url = `https://graph.instagram.com/v18.0/me/messages`;
    
    const response = await axios.post(
      url,
      {
        recipient: { id: recipientId },
        message: { text: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      messageId: response.data.message_id || Date.now().toString(),
      success: true
    };
  }

  private async createMediaObject(
    accessToken: string,
    userId: string,
    imageUrl: string,
    caption: string,
    mediaType: string
  ): Promise<any> {
    const url = `https://graph.instagram.com/v18.0/${userId}/media`;
    
    const response = await axios.post(
      url,
      {
        image_url: imageUrl,
        caption,
        media_type: mediaType
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      mediaId: response.data.id,
      media: response.data
    };
  }

  private async publishMedia(accessToken: string, userId: string, mediaId: string): Promise<any> {
    const url = `https://graph.instagram.com/v18.0/${userId}/media_publish`;
    
    const response = await axios.post(
      url,
      {
        creation_id: mediaId
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      postId: response.data.id,
      post: response.data
    };
  }

  private async getUserProfile(accessToken: string, userId: string): Promise<any> {
    const url = `https://graph.instagram.com/v18.0/${userId}?fields=id,username,account_type,media_count`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      userProfile: response.data
    };
  }

  private async getMedia(accessToken: string, mediaId: string): Promise<any> {
    const url = `https://graph.instagram.com/v18.0/${mediaId}?fields=id,caption,media_type,media_url,permalink,timestamp`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      media: response.data
    };
  }

  private async listMedia(accessToken: string, userId: string): Promise<any> {
    const url = `https://graph.instagram.com/v18.0/${userId}/media?fields=id,caption,media_type,media_url,permalink,timestamp`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      media: response.data.data || []
    };
  }

  private async getComments(accessToken: string, mediaId: string): Promise<any> {
    const url = `https://graph.instagram.com/v18.0/${mediaId}/comments`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      comments: response.data.data || []
    };
  }

  private async addComment(accessToken: string, mediaId: string, commentText: string): Promise<any> {
    const url = `https://graph.instagram.com/v18.0/${mediaId}/comments`;
    
    const response = await axios.post(
      url,
      {
        message: commentText
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      commentId: response.data.id || Date.now().toString(),
      success: true
    };
  }

}
export default InstagramNode;

