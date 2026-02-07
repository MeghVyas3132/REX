/**
 * ENHANCED WORKFLOW EXAMPLE - Like n8n/Flowise
 * 
 * This example shows how nodes work with proper input fields:
 * 1. Node Configuration Fields (API keys, settings)
 * 2. Data Flow Between Nodes (passing data from one to another)
 */

import { WorkflowNode, WorkflowEdge } from '../utils/types';

// Example workflow: "Process Customer Data with AI"
export const enhancedWorkflowExample = {
  name: "Process Customer Data with AI",
  description: "Fetch customer data, process it, and generate AI insights",
  
  // Workflow nodes with proper input field configuration
  nodes: [
    {
      id: 'http-1',
      type: 'http-request',
      name: 'Fetch Customer Data',
      position: { x: 100, y: 100 },
      data: {
        // NODE CONFIGURATION FIELDS (what user fills when setting up the node)
        config: {
          url: 'https://api.example.com/customers',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          authType: 'bearer',
          bearerToken: 'your-api-token-here',
          timeout: 30
        }
      }
    },
    // Removed: data-processor-enhanced node example
    {
      id: 'data-processor-1',
      type: 'filter', // Using filter node instead
      name: 'Filter Active Customers',
      position: { x: 400, y: 100 },
      data: {
        // NODE CONFIGURATION FIELDS
        config: {
          operation: 'filter',
          filterCondition: 'item.status === "active" && item.age >= 18'
        }
      }
    },
    {
      id: 'ai-1',
      type: 'openai-enhanced',
      name: 'Generate Customer Insights',
      position: { x: 700, y: 100 },
      data: {
        // NODE CONFIGURATION FIELDS
        config: {
          apiKey: 'sk-your-openai-key-here',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 1000
        }
      }
    },
    {
      id: 'http-2',
      type: 'http-request',
      name: 'Send Insights to CRM',
      position: { x: 1000, y: 100 },
      data: {
        // NODE CONFIGURATION FIELDS
        config: {
          url: 'https://crm.example.com/api/insights',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          authType: 'apikey',
          apiKey: 'your-crm-api-key'
        }
      }
    }
  ],

  // Workflow edges showing data flow between nodes
  edges: [
    {
      id: 'edge-1',
      source: 'http-1',
      target: 'data-processor-1',
      type: 'default',
      // DATA FLOW MAPPING (how data flows from one node to another)
      data: {
        mappings: {
          'data': '{{ $json.data }}'  // Pass the 'data' field from HTTP response to data processor
        }
      }
    },
    {
      id: 'edge-2',
      source: 'data-processor-1',
      target: 'ai-1',
      type: 'default',
      // DATA FLOW MAPPING
      data: {
        mappings: {
          'messages': '[{"role": "user", "content": "Analyze these customers: {{ $json.processedData }}"}]'
        }
      }
    },
    {
      id: 'edge-3',
      source: 'ai-1',
      target: 'http-2',
      type: 'default',
      // DATA FLOW MAPPING
      data: {
        mappings: {
          'body': '{"insights": "{{ $json.response }}", "customerCount": {{ $json.count }}}'
        }
      }
    }
  ],

  // Workflow settings
  settings: {
    executionMode: 'sequential',
    timeout: 300000,
    retries: 3
  }
};

/**
 * HOW THIS WORKS LIKE n8n/Flowise:
 * 
 * 1. NODE CONFIGURATION FIELDS:
 *    - Each node has "parameters" array with input fields
 *    - User fills these when setting up the node (API keys, URLs, etc.)
 *    - These are stored in node.data.config
 * 
 * 2. DATA FLOW BETWEEN NODES:
 *    - Each node has "inputs" array for data from previous nodes
 *    - Each node has "outputs" array for data to next nodes
 *    - Edges define how data flows using mappings
 * 
 * 3. EXAMPLE DATA FLOW:
 *    HTTP Request → Data Processor → AI → HTTP Request
 *    ↓              ↓                ↓        ↓
 *    [customers] → [filtered] → [insights] → [send to CRM]
 * 
 * 4. FRONTEND INTEGRATION:
 *    - Frontend shows input fields for each node
 *    - User can drag/drop nodes and connect them
 *    - Data automatically flows between connected nodes
 *    - User can map which fields go where
 */

export const nodeInputFieldExamples = {
  // Example of how frontend would show input fields for OpenAI node
  openaiNode: {
    nodeId: 'ai-1',
    nodeType: 'openai-enhanced',
    
    // Configuration fields (shown when user clicks on node)
    configurationFields: [
      {
        name: 'apiKey',
        type: 'password',
        label: 'OpenAI API Key',
        placeholder: 'sk-...',
        required: true,
        helpText: 'Get your API key from OpenAI dashboard'
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
      },
      {
        name: 'temperature',
        type: 'slider',
        label: 'Temperature',
        min: 0,
        max: 2,
        step: 0.1,
        default: 0.7
      }
    ],
    
    // Input fields (shown when connecting from previous node)
    inputFields: [
      {
        name: 'messages',
        type: 'array',
        label: 'Messages',
        description: 'Chat messages from previous node',
        required: true
      },
      {
        name: 'systemPrompt',
        type: 'text',
        label: 'System Prompt',
        description: 'System instruction from previous node'
      }
    ],
    
    // Output fields (shown when connecting to next node)
    outputFields: [
      {
        name: 'response',
        type: 'text',
        label: 'AI Response',
        description: 'Generated response text'
      },
      {
        name: 'usage',
        type: 'object',
        label: 'Token Usage',
        description: 'Token usage information'
      }
    ]
  }
};

export default enhancedWorkflowExample;
