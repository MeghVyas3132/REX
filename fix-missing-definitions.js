#!/usr/bin/env node

/**
 * Script to add missing class definitions and getNodeDefinition() methods
 * to nodes that are missing them (CRITICAL issues)
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, 'backend 2', 'src', 'nodes');

// List of nodes that need class definitions
const nodesToFix = [
  { file: 'ai/document-processor.node.ts', className: 'DocumentProcessorNode', id: 'document-processor', name: 'Document Processor', category: 'ai' },
  { file: 'ai/openai-enhanced.node.ts', className: 'OpenAIEnhancedNode', id: 'openai-enhanced', name: 'OpenAI Enhanced', category: 'ai' },
  { file: 'cloud/aws-lambda-real.node.ts', className: 'AWSLambdaRealNode', id: 'aws-lambda-real', name: 'AWS Lambda (Real)', category: 'cloud' },
  { file: 'cloud/aws-s3-real.node.ts', className: 'AWSS3RealNode', id: 'aws-s3-real', name: 'AWS S3 (Real)', category: 'cloud' },
  { file: 'cloud/azure-blob-real.node.ts', className: 'AzureBlobRealNode', id: 'azure-blob-real', name: 'Azure Blob (Real)', category: 'cloud' },
  { file: 'cloud/google-cloud-storage-real.node.ts', className: 'GoogleCloudStorageRealNode', id: 'google-cloud-storage-real', name: 'Google Cloud Storage (Real)', category: 'cloud' },
  { file: 'communication/microsoft-teams.node.ts', className: 'MicrosoftTeamsNode', id: 'microsoft-teams', name: 'Microsoft Teams', category: 'communication' },
  { file: 'communication/whatsapp.node.ts', className: 'WhatsAppNode', id: 'whatsapp', name: 'WhatsApp', category: 'communication' },
  { file: 'communication/zoom.node.ts', className: 'ZoomNode', id: 'zoom', name: 'Zoom', category: 'communication' },
  { file: 'core/audit-log.node.ts', className: 'AuditLogNode', id: 'audit-log', name: 'Audit Log', category: 'core' },
];

// Extract required parameters from execute method
function extractRequiredParams(content) {
  const requiredParams = [];
  
  // Look for validation patterns
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

// Generate getNodeDefinition based on execute method
function generateNodeDefinition(nodeInfo, content) {
  const requiredParams = extractRequiredParams(content);
  
  // Basic definition structure
  const definition = {
    id: nodeInfo.id,
    type: 'action',
    name: nodeInfo.name,
    description: `${nodeInfo.name} node for workflow automation`,
    category: nodeInfo.category,
    version: '1.0.0',
    author: 'Workflow Studio',
    parameters: [],
    inputs: [],
    outputs: []
  };
  
  // Add parameters based on what's used in execute
  const configAccessPattern = /config\.(\w+)/g;
  const matches = [...content.matchAll(configAccessPattern)];
  const usedParams = new Set();
  matches.forEach(match => usedParams.add(match[1]));
  
  // Add common parameters
  usedParams.forEach(param => {
    if (!['data', 'config', 'input'].includes(param)) {
      definition.parameters.push({
        name: param,
        type: 'string',
        displayName: param.charAt(0).toUpperCase() + param.slice(1).replace(/([A-Z])/g, ' $1'),
        description: `${param} configuration`,
        required: requiredParams.includes(param),
        placeholder: `Enter ${param}...`
      });
    }
  });
  
  // Add inputs
  const inputAccessPattern = /context\.input\?\.(\w+)/g;
  const inputMatches = [...content.matchAll(inputAccessPattern)];
  const usedInputs = new Set();
  inputMatches.forEach(match => usedInputs.add(match[1]));
  
  usedInputs.forEach(input => {
    if (!['data', 'config', 'input'].includes(input)) {
      definition.inputs.push({
        name: input,
        type: 'any',
        displayName: input.charAt(0).toUpperCase() + input.slice(1).replace(/([A-Z])/g, ' $1'),
        description: `${input} from previous node`,
        required: false,
        dataType: 'any'
      });
    }
  });
  
  // Add basic outputs
  definition.outputs.push({
    name: 'output',
    type: 'any',
    displayName: 'Output',
    description: 'Output from the node',
    dataType: 'any'
  });
  
  return definition;
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
    // Extract the execute method
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
${nodeInfo.category === 'ai' && nodeInfo.id.includes('document') ? "const fs = require('fs');\nconst path = require('path');\n" : ''}
export class ${nodeInfo.className} {
  getNodeDefinition() {
    return ${JSON.stringify(definition, null, 6).replace(/"([^"]+)":/g, '$1:').replace(/"/g, "'")};
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

nodesToFix.forEach(nodeInfo => {
  const filePath = path.join(BACKEND_DIR, nodeInfo.file);
  if (processFile(filePath, nodeInfo)) {
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} out of ${nodesToFix.length} files`);

