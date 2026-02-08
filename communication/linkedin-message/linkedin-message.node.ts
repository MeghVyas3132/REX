import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;
import axios from 'axios';

export class LinkedInMessageNode {
  getNodeDefinition() {
    return {
      id: 'linkedin-message',
      type: 'action',
      name: 'LinkedIn Message',
      description: 'Send messages and interact with LinkedIn Messaging API',
      category: 'communication',
      version: '1.0.0',
      author: 'Workflow Studio',
      
      parameters: [
        {
          name: 'accessToken',
          type: 'string',
          displayName: 'Access Token',
          description: 'LinkedIn API access token',
          required: true,
          placeholder: 'Your LinkedIn access token',
          credentialType: 'linkedin_access_token'
        },
        {
          name: 'operation',
          type: 'options',
          displayName: 'Operation',
          description: 'LinkedIn messaging operation to perform',
          required: true,
          default: 'sendMessage',
          options: [
            { name: 'Send Message', value: 'sendMessage' },
            { name: 'Get Conversation', value: 'getConversation' },
            { name: 'List Conversations', value: 'listConversations' },
            { name: 'Get Profile', value: 'getProfile' },
            { name: 'Search People', value: 'searchPeople' }
          ]
        },
        {
          name: 'conversationId',
          type: 'string',
          displayName: 'Conversation ID',
          description: 'LinkedIn conversation ID',
          required: false,
          placeholder: 'conversation_id'
        },
        {
          name: 'recipientUrn',
          type: 'string',
          displayName: 'Recipient URN',
          description: 'LinkedIn recipient URN (e.g., urn:li:person:abc123)',
          required: false,
          placeholder: 'urn:li:person:abc123'
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
          name: 'subject',
          type: 'string',
          displayName: 'Subject',
          description: 'Message subject (optional)',
          required: false,
          placeholder: 'Subject line'
        },
        {
          name: 'personId',
          type: 'string',
          displayName: 'Person ID',
          description: 'LinkedIn person ID',
          required: false,
          placeholder: 'person_id'
        },
        {
          name: 'searchQuery',
          type: 'string',
          displayName: 'Search Query',
          description: 'Search query for people',
          required: false,
          placeholder: 'search term'
        }
      ],

      inputs: [
        {
          name: 'conversationId',
          type: 'string',
          description: 'Conversation ID from previous node',
          required: false
        },
        {
          name: 'recipientUrn',
          type: 'string',
          description: 'Recipient URN from previous node',
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
          description: 'Sent message ID'
        },
        {
          name: 'conversation',
          type: 'object',
          description: 'Conversation details'
        },
        {
          name: 'profile',
          type: 'object',
          description: 'Profile information'
        }
      ],

      configSchema: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          operation: { type: 'string' },
          conversationId: { type: 'string' },
          recipientUrn: { type: 'string' },
          message: { type: 'string' },
          subject: { type: 'string' },
          personId: { type: 'string' },
          searchQuery: { type: 'string' }
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
      const conversationId = config.conversationId || context.input?.conversationId;
      const recipientUrn = config.recipientUrn || context.input?.recipientUrn;
      const message = config.message || context.input?.message;
      const subject = config.subject;
      const personId = config.personId || 'me';
      const searchQuery = config.searchQuery;

      if (!accessToken) {
        throw new Error('LinkedIn access token is required');
      }

      if (!operation) {
        throw new Error('Operation is required');
      }

      logger.info('LinkedIn Message node executed', {
        nodeId: node.id,
        operation,
        conversationId,
        recipientUrn,
        runId: context.runId
      });

      let result: any;

      switch (operation) {
        case 'sendMessage':
          if (!conversationId && !recipientUrn) {
            throw new Error('Conversation ID or recipient URN is required for sendMessage');
          }
          if (!message) {
            throw new Error('Message is required for sendMessage');
          }
          const targetConversationId = conversationId || await this.createConversation(accessToken, recipientUrn!);
          result = await this.sendMessage(accessToken, targetConversationId, message, subject);
          break;
        case 'getConversation':
          if (!conversationId) {
            throw new Error('Conversation ID is required for getConversation');
          }
          result = await this.getConversation(accessToken, conversationId);
          break;
        case 'listConversations':
          result = await this.listConversations(accessToken, personId);
          break;
        case 'getProfile':
          result = await this.getProfile(accessToken, personId);
          break;
        case 'searchPeople':
          if (!searchQuery) {
            throw new Error('Search query is required for searchPeople');
          }
          result = await this.searchPeople(accessToken, searchQuery);
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
      
      logger.error('LinkedIn Message node failed', error, {
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

  private async createConversation(accessToken: string, recipientUrn: string): Promise<string> {
    // Create a new conversation with the recipient
    const url = 'https://api.linkedin.com/v2/messaging/conversations';
    
    const response = await axios.post(
      url,
      {
        recipients: [recipientUrn]
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.id;
  }

  private async sendMessage(
    accessToken: string,
    conversationId: string,
    message: string,
    subject?: string
  ): Promise<any> {
    const url = `https://api.linkedin.com/v2/messaging/conversations/${conversationId}/events`;
    
    const payload: any = {
      eventCreate: {
        value: {
          'com.linkedin.common.Urn': `urn:li:event:${Date.now()}`
        }
      },
      message: {
        body: message
      }
    };

    if (subject) {
      payload.message.subject = subject;
    }

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      messageId: response.data.id || Date.now().toString(),
      success: true
    };
  }

  private async getConversation(accessToken: string, conversationId: string): Promise<any> {
    const url = `https://api.linkedin.com/v2/messaging/conversations/${conversationId}`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      conversation: response.data
    };
  }

  private async listConversations(accessToken: string, personId: string): Promise<any> {
    const url = `https://api.linkedin.com/v2/messaging/conversations?q=members&members=${personId}`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      conversations: response.data.elements || []
    };
  }

  private async getProfile(accessToken: string, personId: string): Promise<any> {
    const url = `https://api.linkedin.com/v2/people/${personId}?projection=(id,firstName,lastName,headline,profilePicture(displayImage~:playableStreams))`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      profile: response.data
    };
  }

  private async searchPeople(accessToken: string, query: string): Promise<any> {
    const url = `https://api.linkedin.com/v2/people-search?keywords=${encodeURIComponent(query)}`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      people: response.data.elements || []
    };
  }

}
export default LinkedInMessageNode;

