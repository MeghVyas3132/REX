import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
import { logger } from '../../lib/logger.js';

// Google Forms API integration
export class GoogleFormsNode {
  getNodeDefinition() {
    return {
      id: 'google-forms',
      type: 'action',
      name: 'Google Forms',
      description: 'Get form responses and metadata from Google Forms',
      category: 'productivity',
      version: '1.0.0',
      author: 'Workflow Studio',
      parameters: [
        {
          name: 'formId',
          type: 'string',
          displayName: 'Form ID',
          description: 'The Google Form ID',
          required: true,
          placeholder: 'Enter the Google Form ID'
        },
        {
          name: 'responseId',
          type: 'string',
          displayName: 'Response ID',
          description: 'Get a specific response by ID (optional)',
          required: false,
          placeholder: 'Enter a specific response ID'
        },
        {
          name: 'pageSize',
          type: 'number',
          displayName: 'Page Size',
          description: 'Max responses to retrieve (default: 100)',
          required: false,
          default: 100,
          min: 1,
          max: 1000
        },
        {
          name: 'accessToken',
          type: 'string',
          displayName: 'Access Token',
          description: 'Google OAuth access token (optional - OAuth will be used if not provided)',
          required: false,
          credentialType: 'google_forms_oauth_token'
        }
      ],
      inputs: [
        { name: 'formId', type: 'string', displayName: 'Form ID (override)', required: false },
        { name: 'responseId', type: 'string', displayName: 'Response ID (override)', required: false }
      ],
      outputs: [
        { name: 'responses', type: 'array', displayName: 'Form Responses' },
        { name: 'form', type: 'object', displayName: 'Form Metadata' },
        { name: 'totalResponses', type: 'number', displayName: 'Total Responses' }
      ]
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = node.data?.config || {};
    
    try {
      const formId = config.formId || context.input?.formId;
      if (!formId) {
        throw new Error('Form ID is required');
      }

      const responseId = config.responseId || context.input?.responseId;
      const pageSize = config.pageSize || 100;

      // Get access token
      let accessToken: string | undefined = config.accessToken;
      if (!accessToken) {
        try {
          const { oauthService } = await import('../../services/oauth.service');
          
          if (!oauthService) {
            throw new Error('OAuth service not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
          }
          
          const userId = (context as any).userId;
          
          if (!userId || userId === 'default-user') {
            throw new Error(`User ID not found in workflow context. Ensure you are authenticated and running workflows through the authenticated API.`);
          }
          
          const cleanUserId = String(userId || '').trim();
          if (!cleanUserId || cleanUserId === 'default-user') {
            throw new Error(`Invalid userId: ${userId}. Ensure you are authenticated and running workflows through the authenticated API.`);
          }
          
          logger.info('Google Forms node getting OAuth token', {
            nodeId: node.id,
            userId: cleanUserId,
            workflowId: context.workflowId,
            runId: context.runId
          });
          
          const tokenData = await oauthService.getToken(cleanUserId, 'google');
          if (!tokenData || !tokenData.access_token) {
            throw new Error('No OAuth token found. Please connect your Google account in the OAuth settings.');
          }
          
          accessToken = tokenData.access_token;
        } catch (oauthError: any) {
          logger.error('OAuth token retrieval failed for Google Forms', oauthError, {
            nodeId: node.id,
            userId: (context as any).userId
          });
          throw new Error(`Failed to get OAuth token: ${oauthError.message}`);
        }
      }

      // Google Forms API endpoint
      const baseUrl = 'https://forms.googleapis.com/v1';
      
      let result: any;

      if (responseId) {
        // Get specific response
        const responseUrl = `${baseUrl}/forms/${formId}/responses/${responseId}`;
        logger.info('Fetching specific Google Form response', {
          nodeId: node.id,
          formId,
          responseId
        });

        const response = await fetch(responseUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Google Forms API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const responseData = await response.json();
        result = {
          response: responseData,
          responses: [responseData],
          totalResponses: 1
        };
      } else {
        // Get form metadata first
        const formUrl = `${baseUrl}/forms/${formId}`;
        logger.info('Fetching Google Form metadata', {
          nodeId: node.id,
          formId
        });

        const formResponse = await fetch(formUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!formResponse.ok) {
          const errorText = await formResponse.text();
          throw new Error(`Google Forms API error: ${formResponse.status} ${formResponse.statusText} - ${errorText}`);
        }

        const formData = await formResponse.json();

        // Get form responses
        const responsesUrl = `${baseUrl}/forms/${formId}/responses`;
        logger.info('Fetching Google Form responses', {
          nodeId: node.id,
          formId,
          pageSize
        });

        const responsesResponse = await fetch(responsesUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!responsesResponse.ok) {
          const errorText = await responsesResponse.text();
          throw new Error(`Google Forms API error: ${responsesResponse.status} ${responsesResponse.statusText} - ${errorText}`);
        }

        const responsesData = await responsesResponse.json();
        const responses = (responsesData.responses || []).slice(0, pageSize);

        result = {
          form: formData,
          responses: responses,
          totalResponses: responses.length,
          nextPageToken: responsesData.nextPageToken
        };
      }

      logger.info('Google Forms node executed successfully', {
        nodeId: node.id,
        formId,
        responseCount: result.responses?.length || 0,
        duration: Date.now() - startTime
      });

      return {
        success: true,
        output: result,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      logger.error('Google Forms node execution failed', error, {
        nodeId: node.id,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message || 'Google Forms operation failed',
        duration: Date.now() - startTime
      };
    }
  }
}

export default GoogleFormsNode;

