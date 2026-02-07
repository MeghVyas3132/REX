import { Router } from 'express';
const logger = require('../../utils/logger');

const router = Router();

// GET /api/enhanced-nodes - Get all enhanced nodes with proper input fields
router.get('/', async (req, res) => {
  try {
    const enhancedNodes = [
      {
        id: 'openai-enhanced',
        name: 'OpenAI Chat',
        description: 'Chat with OpenAI GPT models - like n8n/Flowise input fields',
        category: 'ai',
        type: 'action',
        version: '1.0.0',
        
        // Node Configuration Fields (what user fills when setting up the node)
        parameters: [
          {
            name: 'apiKey',
            type: 'string',
            displayName: 'API Key',
            description: 'Your OpenAI API key',
            required: true,
            placeholder: 'sk-...',
            credentialType: 'openai_api_key'
          },
          {
            name: 'model',
            type: 'options',
            displayName: 'Model',
            description: 'OpenAI model to use',
            required: true,
            default: 'gpt-3.5-turbo',
            options: [
              { name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
              { name: 'GPT-4', value: 'gpt-4' },
              { name: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
              { name: 'GPT-4o', value: 'gpt-4o' }
            ]
          },
          {
            name: 'temperature',
            type: 'number',
            displayName: 'Temperature',
            description: 'Controls randomness (0-2)',
            required: false,
            default: 0.7,
            min: 0,
            max: 2,
            step: 0.1
          }
        ],

        // Data Flow Input Fields (what comes from previous nodes)
        inputs: [
          {
            name: 'messages',
            type: 'array',
            displayName: 'Messages',
            description: 'Chat messages from previous node',
            required: true,
            dataType: 'messages'
          },
          {
            name: 'systemPrompt',
            type: 'string',
            displayName: 'System Prompt',
            description: 'System instruction from previous node',
            required: false,
            dataType: 'text'
          }
        ],

        // Output Fields (what this node produces for next nodes)
        outputs: [
          {
            name: 'response',
            type: 'string',
            displayName: 'AI Response',
            description: 'Generated response text',
            dataType: 'text'
          },
          {
            name: 'usage',
            type: 'object',
            displayName: 'Token Usage',
            description: 'Token usage information',
            dataType: 'object'
          }
        ]
      },
      {
        id: 'http-request',
        name: 'HTTP Request',
        description: 'Make HTTP requests with advanced options (auth, query params, body handling)',
        category: 'core',
        type: 'action',
        version: '1.0.0',
        
        parameters: [
          {
            name: 'method',
            type: 'options',
            displayName: 'Method',
            description: 'HTTP method to use',
            required: true,
            default: 'GET',
            options: [
              { name: 'GET', value: 'GET' },
              { name: 'POST', value: 'POST' },
              { name: 'PUT', value: 'PUT' },
              { name: 'DELETE', value: 'DELETE' },
              { name: 'PATCH', value: 'PATCH' },
              { name: 'HEAD', value: 'HEAD' },
              { name: 'OPTIONS', value: 'OPTIONS' }
            ]
          },
          {
            name: 'url',
            type: 'string',
            displayName: 'URL',
            description: 'The URL to make the request to',
            required: true,
            placeholder: 'https://api.example.com/endpoint'
          },
          {
            name: 'headers',
            type: 'string',
            displayName: 'Headers (JSON)',
            description: 'Additional headers as JSON object or array',
            required: false,
            placeholder: '{"Authorization":"Bearer ..."}'
          },
          {
            name: 'queryParams',
            type: 'string',
            displayName: 'Query Parameters (JSON)',
            description: 'Query parameters as JSON object',
            required: false,
            placeholder: '{"search":"value"}'
          },
          {
            name: 'bodyType',
            type: 'options',
            displayName: 'Body Type',
            description: 'Format of request body',
            required: false,
            default: 'json',
            options: [
              { name: 'JSON', value: 'json' },
              { name: 'Raw Text', value: 'raw' },
              { name: 'Form URL Encoded', value: 'form' }
            ]
          },
          {
            name: 'body',
            type: 'string',
            displayName: 'Body (JSON)',
            description: 'Request body; JSON string or raw text depending on body type',
            required: false,
            placeholder: '{"key":"value"}'
          },
          {
            name: 'authType',
            type: 'options',
            displayName: 'Authentication',
            description: 'Authentication method',
            required: false,
            default: 'none',
            options: [
              { name: 'None', value: 'none' },
              { name: 'Basic Auth', value: 'basic' },
              { name: 'Bearer Token', value: 'bearer' },
              { name: 'API Key', value: 'apikey' }
            ]
          },
          {
            name: 'username',
            type: 'string',
            displayName: 'Username',
            description: 'Basic auth username',
            required: false,
            placeholder: 'username'
          },
          {
            name: 'password',
            type: 'string',
            displayName: 'Password',
            description: 'Basic auth password',
            required: false,
            placeholder: 'password'
          },
          {
            name: 'bearerToken',
            type: 'string',
            displayName: 'Bearer Token',
            description: 'Bearer token for Authorization header',
            required: false,
            placeholder: 'sk-...'
          },
          {
            name: 'apiKeyHeader',
            type: 'string',
            displayName: 'API Key Header',
            description: 'Header name for API Key',
            required: false,
            placeholder: 'X-API-Key'
          },
          {
            name: 'apiKey',
            type: 'string',
            displayName: 'API Key',
            description: 'API key value',
            required: false,
            placeholder: 'Key value'
          },
          {
            name: 'timeout',
            type: 'string',
            displayName: 'Timeout (seconds)',
            description: 'Request timeout in seconds',
            required: false,
            placeholder: '30'
          },
          {
            name: 'followRedirects',
            type: 'boolean',
            displayName: 'Follow Redirects',
            description: 'Whether to follow redirects',
            required: false,
            dataType: 'boolean'
          }
        ],

        inputs: [
          {
            name: 'method',
            type: 'any',
            displayName: 'Dynamic Method',
            description: 'HTTP method from previous node',
            required: false,
            dataType: 'any'
          },
          {
            name: 'url',
            type: 'string',
            displayName: 'Dynamic URL',
            description: 'URL from previous node (overrides configured URL)',
            required: false,
            dataType: 'text'
          },
          {
            name: 'headers',
            type: 'object',
            displayName: 'Dynamic Headers',
            description: 'Headers from previous node (merged with configured headers)',
            required: false,
            dataType: 'object'
          },
          {
            name: 'queryParams',
            type: 'object',
            displayName: 'Dynamic Query Params',
            description: 'Query parameters from previous node',
            required: false,
            dataType: 'object'
          },
          {
            name: 'body',
            type: 'object',
            displayName: 'Request Body',
            description: 'Request body data from previous node',
            required: false,
            dataType: 'object'
          }
        ],

        outputs: [
          {
            name: 'data',
            type: 'object',
            displayName: 'Response Data',
            description: 'Parsed response data',
            dataType: 'object'
          },
          {
            name: 'status',
            type: 'number',
            displayName: 'Status Code',
            description: 'HTTP status code',
            dataType: 'number'
          },
          {
            name: 'headers',
            type: 'object',
            displayName: 'Response Headers',
            description: 'Response headers',
            dataType: 'object'
          },
          {
            name: 'raw',
            type: 'string',
            displayName: 'Raw Response',
            description: 'Raw response text',
            dataType: 'text'
          }
        ]
      },
    ];

    res.json({
      success: true,
      data: enhancedNodes,
      count: enhancedNodes.length,
      message: 'Enhanced nodes with proper input fields retrieved successfully'
    });
  } catch (error: any) {
    logger.error('Failed to fetch enhanced nodes', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch enhanced nodes'
    });
  }
});

// GET /api/enhanced-nodes/:id - Get specific enhanced node
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock node definitions - in real implementation, load from actual node files
    const nodeDefinitions: { [key: string]: any } = {
      'openai-enhanced': {
        id: 'openai-enhanced',
        name: 'OpenAI Chat',
        description: 'Chat with OpenAI GPT models - like n8n/Flowise input fields',
        category: 'ai',
        type: 'action',
        version: '1.0.0',
        
        parameters: [
          {
            name: 'apiKey',
            type: 'string',
            displayName: 'API Key',
            description: 'Your OpenAI API key',
            required: true,
            placeholder: 'sk-...',
            credentialType: 'openai_api_key'
          },
          {
            name: 'model',
            type: 'options',
            displayName: 'Model',
            description: 'OpenAI model to use',
            required: true,
            default: 'gpt-3.5-turbo',
            options: [
              { name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
              { name: 'GPT-4', value: 'gpt-4' }
            ]
          }
        ],

        inputs: [
          {
            name: 'messages',
            type: 'array',
            displayName: 'Messages',
            description: 'Chat messages from previous node',
            required: true,
            dataType: 'messages'
          }
        ],

        outputs: [
          {
            name: 'response',
            type: 'string',
            displayName: 'AI Response',
            description: 'Generated response text',
            dataType: 'text'
          }
        ]
      }
    };

    const nodeDefinition = nodeDefinitions[id];
    
    if (!nodeDefinition) {
      return res.status(404).json({
        success: false,
        error: 'Enhanced node not found'
      });
    }

    res.json({
      success: true,
      data: nodeDefinition,
      message: 'Enhanced node definition retrieved successfully'
    });
  } catch (error: any) {
    logger.error('Failed to get enhanced node definition', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get enhanced node definition'
    });
  }
});

// POST /api/enhanced-nodes/validate - Validate enhanced node configuration
router.post('/validate', async (req, res) => {
  try {
    const { nodeId, config, inputs } = req.body;
    
    if (!nodeId) {
      return res.status(400).json({
        success: false,
        error: 'Node ID is required'
      });
    }

    // Mock validation - in real implementation, validate against actual node schemas
    const isValid = true;
    const errors: string[] = [];

    // Validate configuration
    if (nodeId === 'openai-enhanced') {
      if (!config.apiKey) {
        errors.push('API Key is required');
      }
      if (!config.model) {
        errors.push('Model is required');
      }
    }

    // Validate inputs
    if (inputs) {
      if (nodeId === 'openai-enhanced' && !inputs.messages) {
        errors.push('Messages input is required');
      }
    }

    res.json({
      success: isValid,
      data: {
        valid: isValid,
        errors: errors
      },
      message: isValid ? 'Configuration is valid' : 'Configuration has errors'
    });
  } catch (error: any) {
    logger.error('Failed to validate enhanced node configuration', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate enhanced node configuration'
    });
  }
});

export default router;
