/**
 * DATA FLOW EXAMPLE - How nodes connect and pass data like n8n/Flowise
 * 
 * This shows the complete data flow system with proper input fields
 */

export const dataFlowExample = {
  name: "Customer Data Processing with AI",
  description: "Shows how data flows between nodes with proper input fields",
  
  // Example workflow showing data flow
  workflow: {
    nodes: [
      {
        id: 'http-1',
        type: 'http-request',
        name: 'Fetch Customer Data',
        position: { x: 100, y: 100 },
        data: {
          // NODE CONFIGURATION (user fills these)
          config: {
            url: 'https://api.example.com/customers',
            method: 'GET',
            headers: { 'Authorization': 'Bearer token123' },
            timeout: 30
          }
        }
      },
      {
        id: 'data-transform-1',
        type: 'data-transform',
        name: 'Filter Active Customers',
        position: { x: 400, y: 100 },
        data: {
          // NODE CONFIGURATION (user fills these)
          config: {
            mode: 'javascript',
            expression: 'data.filter(item => item.status === "active")',
            outputFormat: 'json'
          }
        }
      },
      {
        id: 'ai-1',
        type: 'openai',
        name: 'Generate Customer Insights',
        position: { x: 700, y: 100 },
        data: {
          // NODE CONFIGURATION (user fills these)
          config: {
            apiKey: 'sk-your-openai-key',
            model: 'gpt-4',
            temperature: 0.7,
            maxTokens: 1000
          }
        }
      }
    ],

    // EDGES show how data flows between nodes
    edges: [
      {
        id: 'edge-1',
        source: 'http-1',
        target: 'data-transform-1',
        type: 'default',
        // DATA FLOW MAPPING - how data flows from http-1 to data-transform-1
        data: {
          mappings: {
            'data': '{{http-1.data}}'  // Pass the 'data' field from HTTP response
          }
        }
      },
      {
        id: 'edge-2',
        source: 'data-transform-1',
        target: 'ai-1',
        type: 'default',
        // DATA FLOW MAPPING - how data flows from data-transform-1 to ai-1
        data: {
          mappings: {
            'messages': '[{"role": "user", "content": "Analyze these customers: {{data-transform-1.result}}"}]'
          }
        }
      }
    ]
  },

  // DETAILED DATA FLOW EXPLANATION
  dataFlowExplanation: {
    step1: {
      node: 'http-1',
      action: 'Fetches customer data from API',
      output: {
        data: [
          { id: 1, name: 'John Doe', status: 'active', email: 'john@example.com' },
          { id: 2, name: 'Jane Smith', status: 'inactive', email: 'jane@example.com' },
          { id: 3, name: 'Bob Wilson', status: 'active', email: 'bob@example.com' }
        ],
        status: 200,
        headers: { 'content-type': 'application/json' }
      }
    },
    step2: {
      node: 'data-transform-1',
      action: 'Filters only active customers',
      input: {
        data: [
          { id: 1, name: 'John Doe', status: 'active', email: 'john@example.com' },
          { id: 2, name: 'Jane Smith', status: 'inactive', email: 'jane@example.com' },
          { id: 3, name: 'Bob Wilson', status: 'active', email: 'bob@example.com' }
        ]
      },
      output: {
        result: [
          { id: 1, name: 'John Doe', status: 'active', email: 'john@example.com' },
          { id: 3, name: 'Bob Wilson', status: 'active', email: 'bob@example.com' }
        ],
        format: 'json',
        success: true
      }
    },
    step3: {
      node: 'ai-1',
      action: 'Generates AI insights about customers',
      input: {
        messages: [
          {
            role: 'user',
            content: 'Analyze these customers: [{"id":1,"name":"John Doe","status":"active","email":"john@example.com"},{"id":3,"name":"Bob Wilson","status":"active","email":"bob@example.com"}]'
          }
        ]
      },
      output: {
        content: 'Based on the customer data, I can see 2 active customers: John Doe and Bob Wilson. Both are engaged users with valid email addresses.',
        usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 },
        model: 'gpt-4'
      }
    }
  }
};

/**
 * INPUT FIELD STRUCTURE FOR EACH NODE TYPE
 */

export const nodeInputFieldStructures = {
  // HTTP Request Node
  httpRequest: {
    // Configuration Fields (user fills when setting up node)
    parameters: [
      {
        name: 'url',
        type: 'string',
        displayName: 'URL',
        description: 'The URL to make the request to',
        required: true,
        placeholder: 'https://api.example.com/endpoint'
      },
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
          { name: 'DELETE', value: 'DELETE' }
        ]
      }
    ],

    // Input Fields (receive data from previous nodes)
    inputs: [
      {
        name: 'url',
        type: 'string',
        displayName: 'Dynamic URL',
        description: 'URL from previous node (overrides configured URL)',
        required: false,
        dataType: 'text'
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

    // Output Fields (send data to next nodes)
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
      }
    ]
  },

  // Data Transform Node
  dataTransform: {
    parameters: [
      {
        name: 'mode',
        type: 'options',
        displayName: 'Transformation Mode',
        description: 'How to transform the data',
        required: true,
        default: 'javascript',
        options: [
          { name: 'JavaScript', value: 'javascript' },
          { name: 'Template', value: 'template' }
        ]
      },
      {
        name: 'expression',
        type: 'string',
        displayName: 'Expression',
        description: 'JavaScript expression to apply',
        required: true,
        placeholder: 'data.filter(item => item.status === "active")'
      }
    ],

    inputs: [
      {
        name: 'data',
        type: 'object',
        displayName: 'Input Data',
        description: 'Data from previous node to transform',
        required: true,
        dataType: 'object'
      }
    ],

    outputs: [
      {
        name: 'result',
        type: 'object',
        displayName: 'Transformed Data',
        description: 'The transformed data',
        dataType: 'object'
      }
    ]
  },

  // OpenAI Node
  openai: {
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
      },
      {
        name: 'prompt',
        type: 'string',
        displayName: 'Prompt',
        description: 'Text prompt from previous node',
        required: false,
        dataType: 'text'
      }
    ],

    outputs: [
      {
        name: 'content',
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
  }
};

/**
 * HOW FRONTEND WOULD USE THESE INPUT FIELDS
 */

export const frontendUsageExample = {
  // When user drags a node onto canvas
  onNodeAdded: {
    nodeType: 'openai',
    showConfigurationFields: [
      {
        name: 'apiKey',
        type: 'password',
        label: 'OpenAI API Key',
        placeholder: 'sk-...',
        required: true
      },
      {
        name: 'model',
        type: 'select',
        label: 'Model',
        options: [
          { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
          { label: 'GPT-4', value: 'gpt-4' }
        ],
        required: true
      }
    ]
  },

  // When user connects two nodes
  onNodeConnected: {
    sourceNode: 'http-request',
    targetNode: 'data-transform',
    showDataMapping: [
      {
        sourceField: 'data',
        targetField: 'data',
        description: 'Pass HTTP response data to transform node'
      }
    ]
  },

  // When user runs workflow
  onWorkflowExecution: {
    step1: {
      node: 'http-request',
      input: { url: 'https://api.example.com/customers' },
      output: { data: [{ id: 1, name: 'John' }] }
    },
    step2: {
      node: 'data-transform',
      input: { data: [{ id: 1, name: 'John' }] },
      output: { result: [{ id: 1, name: 'John' }] }
    },
    step3: {
      node: 'openai',
      input: { messages: [{ role: 'user', content: 'Analyze: [{"id":1,"name":"John"}]' }] },
      output: { content: 'Analysis result...' }
    }
  }
};

export default dataFlowExample;
