#!/usr/bin/env node

/**
 * Script to add missing class definitions and getNodeDefinition() methods
 * to nodes that are missing them (CRITICAL issues)
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, 'backend 2', 'src', 'nodes');

// Node definitions based on file patterns
const nodeTemplates = {
  'microsoft-teams': {
    className: 'MicrosoftTeamsNode',
    category: 'communication',
    name: 'Microsoft Teams',
    description: 'Send messages and manage Microsoft Teams channels',
    requiredParams: ['authType', 'operation']
  },
  'zoom': {
    className: 'ZoomNode',
    category: 'communication',
    name: 'Zoom',
    description: 'Create meetings and manage Zoom sessions',
    requiredParams: ['authType', 'operation']
  },
  'audit-log': {
    className: 'AuditLogNode',
    category: 'core',
    name: 'Audit Log',
    description: 'Log audit events to external API',
    requiredParams: ['apiUrl']
  },
  'fetch-email-data': {
    className: 'FetchEmailDataNode',
    category: 'core',
    name: 'Fetch Email Data',
    description: 'Fetch email data from external source',
    requiredParams: []
  },
  'http-request': {
    className: 'HttpRequestNode',
    category: 'core',
    name: 'HTTP Request',
    description: 'Make HTTP requests to external APIs',
    requiredParams: ['method']
  },
  'http-request-enhanced': {
    className: 'HttpRequestEnhancedNode',
    category: 'core',
    name: 'HTTP Request Enhanced',
    description: 'Enhanced HTTP request with advanced features',
    requiredParams: ['method']
  },
  'database': {
    className: 'DatabaseNode',
    category: 'data',
    name: 'Database',
    description: 'Execute database operations',
    requiredParams: ['connectionString', 'operation']
  },
  'mysql': {
    className: 'MySQLNode',
    category: 'data',
    name: 'MySQL',
    description: 'Execute MySQL database queries',
    requiredParams: ['host', 'database', 'username', 'password', 'operation']
  },
  'postgresql': {
    className: 'PostgreSQLNode',
    category: 'data',
    name: 'PostgreSQL',
    description: 'Execute PostgreSQL database queries',
    requiredParams: ['host', 'database', 'username', 'password', 'operation']
  },
  'mongodb-real': {
    className: 'MongoDBRealNode',
    category: 'data',
    name: 'MongoDB (Real)',
    description: 'Execute MongoDB operations with real driver',
    requiredParams: ['connectionString', 'operation']
  },
  'postgresql-real': {
    className: 'PostgreSQLRealNode',
    category: 'data',
    name: 'PostgreSQL (Real)',
    description: 'Execute PostgreSQL operations with real driver',
    requiredParams: ['host', 'database', 'username', 'password', 'operation']
  },
  'aws-lambda-real': {
    className: 'AWSLambdaRealNode',
    category: 'cloud',
    name: 'AWS Lambda (Real)',
    description: 'Invoke AWS Lambda functions',
    requiredParams: ['accessKeyId', 'secretAccessKey', 'region', 'functionName']
  },
  'aws-s3-real': {
    className: 'AWSS3RealNode',
    category: 'cloud',
    name: 'AWS S3 (Real)',
    description: 'Manage AWS S3 buckets and objects',
    requiredParams: ['accessKeyId', 'secretAccessKey', 'region', 'bucketName']
  },
  'azure-blob-real': {
    className: 'AzureBlobRealNode',
    category: 'cloud',
    name: 'Azure Blob (Real)',
    description: 'Manage Azure Blob Storage',
    requiredParams: ['connectionString', 'containerName']
  },
  'google-cloud-storage-real': {
    className: 'GoogleCloudStorageRealNode',
    category: 'cloud',
    name: 'Google Cloud Storage (Real)',
    description: 'Manage Google Cloud Storage buckets',
    requiredParams: ['credentials', 'bucketName']
  },
  'email': {
    className: 'EmailNode',
    category: 'integrations',
    name: 'Email',
    description: 'Send emails via SMTP',
    requiredParams: ['to', 'subject', 'message']
  },
  'openai': {
    className: 'OpenAINode',
    category: 'llm',
    name: 'OpenAI',
    description: 'Make OpenAI API calls',
    requiredParams: ['model']
  },
  'anthropic': {
    className: 'AnthropicNode',
    category: 'llm',
    name: 'Anthropic',
    description: 'Make Anthropic Claude API calls',
    requiredParams: ['model']
  },
  'claude': {
    className: 'ClaudeNode',
    category: 'llm',
    name: 'Claude',
    description: 'Make Claude API calls',
    requiredParams: ['model']
  },
  'claude-real': {
    className: 'ClaudeRealNode',
    category: 'llm',
    name: 'Claude (Real)',
    description: 'Make Claude API calls with real SDK',
    requiredParams: ['apiKey', 'model']
  },
  'gemini': {
    className: 'GeminiNode',
    category: 'llm',
    name: 'Gemini',
    description: 'Make Google Gemini API calls',
    requiredParams: ['apiKey', 'model']
  },
  'gemini-real': {
    className: 'GeminiRealNode',
    category: 'llm',
    name: 'Gemini (Real)',
    description: 'Make Google Gemini API calls with real SDK',
    requiredParams: ['apiKey', 'model']
  },
  'condition': {
    className: 'ConditionNode',
    category: 'logic',
    name: 'Condition',
    description: 'Evaluate conditional logic',
    requiredParams: ['condition']
  },
  'logger': {
    className: 'LoggerNode',
    category: 'utility',
    name: 'Logger',
    description: 'Log messages to console or file',
    requiredParams: ['message']
  },
  'signature-validation': {
    className: 'SignatureValidationNode',
    category: 'core',
    name: 'Signature Validation',
    description: 'Validate cryptographic signatures',
    requiredParams: ['signature', 'data', 'publicKey']
  },
  'webhook-trigger': {
    className: 'WebhookTriggerNode',
    category: 'core',
    name: 'Webhook Trigger',
    description: 'Trigger workflow from webhook',
    requiredParams: []
  }
};

// Extract required parameters from execute method
function extractRequiredParams(content) {
  const requiredParams = [];
  const validationPatterns = [
    /Required parameter "([^"]+)" is missing/gi,
    /if\s*\(\s*!config\.(\w+)\s*&&\s*!context\.input\?\.\1\s*\)/g,
    /if\s*\(\s*!config\.(\w+)\s*\)/g
  ];
  
  validationPatterns.forEach(pattern => {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const paramName = match[1];
      if (paramName && !requiredParams.includes(paramName)) {
        requiredParams.push(paramName);
      }
    }
  });
  
  return requiredParams;
}

// Generate node definition
function generateNodeDefinition(nodeInfo, content) {
  const requiredParams = extractRequiredParams(content);
  const allRequiredParams = [...new Set([...nodeInfo.requiredParams, ...requiredParams])];
  
  // Extract config properties used
  const configPattern = /config\.(\w+)/g;
  const matches = [...content.matchAll(configPattern)];
  const usedParams = new Set();
  matches.forEach(match => usedParams.add(match[1]));
  
  // Extract context.input properties
  const inputPattern = /context\.input\?\.(\w+)/g;
  const inputMatches = [...content.matchAll(inputPattern)];
  const usedInputs = new Set();
  inputMatches.forEach(match => usedInputs.add(match[1]));
  
  const parameters = [];
  const inputs = [];
  const outputs = [
    {
      name: 'output',
      type: 'any',
      displayName: 'Output',
      description: 'Output from the node',
      dataType: 'any'
    },
    {
      name: 'success',
      type: 'boolean',
      displayName: 'Success',
      description: 'Whether the operation succeeded',
      dataType: 'boolean'
    }
  ];
  
  // Add parameters
  usedParams.forEach(param => {
    if (!['data', 'config', 'input'].includes(param)) {
      parameters.push({
        name: param,
        type: 'string',
        displayName: param.charAt(0).toUpperCase() + param.slice(1).replace(/([A-Z])/g, ' $1'),
        description: `${param} configuration`,
        required: allRequiredParams.includes(param),
        placeholder: `Enter ${param}...`
      });
    }
  });
  
  // Add inputs
  usedInputs.forEach(input => {
    if (!['data', 'config', 'input'].includes(input)) {
      inputs.push({
        name: input,
        type: 'any',
        displayName: input.charAt(0).toUpperCase() + input.slice(1).replace(/([A-Z])/g, ' $1'),
        description: `${input} from previous node`,
        required: false,
        dataType: 'any'
      });
    }
  });
  
  return {
    id: nodeInfo.id || nodeInfo.className.toLowerCase().replace('node', ''),
    type: 'action',
    name: nodeInfo.name,
    description: nodeInfo.description,
    category: nodeInfo.category,
    version: '1.0.0',
    author: 'Workflow Studio',
    parameters,
    inputs,
    outputs
  };
}

// Process a single file
function processFile(filePath, nodeInfo) {
  const relativePath = path.relative(BACKEND_DIR, filePath);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${relativePath}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already has class definition
  if (content.includes(`class ${nodeInfo.className}`) && content.includes('getNodeDefinition()')) {
    console.log(`✓ Already has definition: ${relativePath}`);
    return false;
  }
  
  // Check if file starts with execute method (missing class wrapper)
  if (content.trim().startsWith('async execute')) {
    // Extract the execute method and any private methods
    const executeMatch = content.match(/async execute[\s\S]*/);
    if (!executeMatch) {
      console.log(`⚠️  Could not find execute method: ${relativePath}`);
      return false;
    }
    
    const executeMethod = executeMatch[0];
    
    // Generate node definition
    const definition = generateNodeDefinition(nodeInfo, content);
    
    // Build the new file content
    const newContent = `import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class ${nodeInfo.className} {
  getNodeDefinition() {
    return ${JSON.stringify(definition, null, 2).replace(/"([^"]+)":/g, '$1:').replace(/"/g, "'")};
  }

  ${executeMethod}
}

export default ${nodeInfo.className};
`;
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✓ Fixed: ${relativePath}`);
    return true;
  }
  
  return false;
}

// Main
console.log('🔧 Adding missing class definitions and getNodeDefinition() methods...\n');

let fixedCount = 0;

Object.entries(nodeTemplates).forEach(([nodeId, nodeInfo]) => {
  // Find the file
  const categoryDirs = {
    'communication': 'communication',
    'core': 'core',
    'data': 'data',
    'cloud': 'cloud',
    'integrations': 'integrations',
    'llm': 'llm',
    'logic': 'logic',
    'utility': 'utility'
  };
  
  const category = nodeInfo.category;
  const categoryDir = categoryDirs[category] || category;
  const fileName = `${nodeId}.node.ts`;
  const filePath = path.join(BACKEND_DIR, categoryDir, fileName);
  
  nodeInfo.id = nodeId;
  
  if (processFile(filePath, nodeInfo)) {
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} out of ${Object.keys(nodeTemplates).length} files`);

