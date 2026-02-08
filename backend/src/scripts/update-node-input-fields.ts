/**
 * Script to update all existing nodes to have proper input fields like n8n/Flowise
 */

import * as fs from 'fs';
import * as path from 'path';

interface NodeField {
  name: string;
  type: string;
  displayName?: string;
  description?: string;
  required?: boolean;
  default?: any;
  placeholder?: string;
  options?: Array<{name: string, value: string}>;
  min?: number;
  max?: number;
  step?: number;
  dataType?: string;
  credentialType?: string;
}

interface NodeDefinition {
  id: string;
  name: string;
  type: string;
  category: string;
  version: string;
  description: string;
  parameters?: NodeField[];
  inputs?: NodeField[];
  outputs?: NodeField[];
  configSchema?: any;
  inputSchema?: any;
  outputSchema?: any;
}

class NodeUpdater {
  private nodesDir = path.join(__dirname, '../nodes');
  
  async updateAllNodes() {
    const logger = require('../utils/logger');
    logger.info('Scanning for nodes to update...');
    
    const nodeFiles = this.findNodeFiles();
    logger.info(`Found ${nodeFiles.length} node files`);
    
    for (const filePath of nodeFiles) {
      try {
        await this.updateNodeFile(filePath);
        logger.info(`Updated: ${path.relative(this.nodesDir, filePath)}`);
      } catch (error) {
        logger.error(`Failed to update ${filePath}`, error as Error);
      }
    }
    
    logger.info('Node update completed!');
  }
  
  private findNodeFiles(): string[] {
    const files: string[] = [];
    
    const scanDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.node.ts')) {
          files.push(fullPath);
        }
      }
    };
    
    scanDir(this.nodesDir);
    return files;
  }
  
  private async updateNodeFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has enhanced format
    if (content.includes('parameters:') && content.includes('displayName:')) {
      return;
    }
    
    // Extract node definition
    const nodeDef = this.extractNodeDefinition(content);
    if (!nodeDef) {
      return;
    }
    
    // Generate enhanced input fields
    const enhancedFields = this.generateEnhancedFields(nodeDef);
    
    // Update the file
    const updatedContent = this.updateNodeContent(content, nodeDef, enhancedFields);
    fs.writeFileSync(filePath, updatedContent, 'utf8');
  }
  
  private extractNodeDefinition(content: string): NodeDefinition | null {
    // Extract basic node info from getNodeDefinition method
    const idMatch = content.match(/id:\s*['"`]([^'"`]+)['"`]/);
    const nameMatch = content.match(/name:\s*['"`]([^'"`]+)['"`]/);
    const typeMatch = content.match(/type:\s*['"`]([^'"`]+)['"`]/);
    const categoryMatch = content.match(/category:\s*['"`]([^'"`]+)['"`]/);
    
    if (!idMatch || !nameMatch || !typeMatch) {
      return null;
    }
    
    return {
      id: idMatch[1]!,
      name: nameMatch[1]!,
      type: typeMatch[1]!,
      category: categoryMatch?.[1] || 'utility',
      version: '1.0.0',
      description: 'Enhanced node with proper input fields'
    };
  }
  
  private generateEnhancedFields(nodeDef: NodeDefinition): {
    parameters: NodeField[];
    inputs: NodeField[];
    outputs: NodeField[];
  } {
    const parameters: NodeField[] = [];
    const inputs: NodeField[] = [];
    const outputs: NodeField[] = [];
    
    // Generate parameters based on node type
    switch (nodeDef.category) {
      case 'ai':
      case 'llm':
        parameters.push(
          {
            name: 'apiKey',
            type: 'string',
            displayName: 'API Key',
            description: 'API key for the service',
            required: true,
            placeholder: 'sk-...',
            credentialType: 'api_key'
          },
          {
            name: 'model',
            type: 'options',
            displayName: 'Model',
            description: 'Model to use',
            required: true,
            default: 'gpt-3.5-turbo',
            options: [
              { name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
              { name: 'GPT-4', value: 'gpt-4' }
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
        );
        inputs.push(
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
        );
        outputs.push(
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
        );
        break;
        
      case 'core':
        if (nodeDef.id.includes('http')) {
          parameters.push(
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
            },
            {
              name: 'timeout',
              type: 'number',
              displayName: 'Timeout (seconds)',
              description: 'Request timeout in seconds',
              required: false,
              default: 30,
              min: 1,
              max: 300
            }
          );
          inputs.push(
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
          );
          outputs.push(
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
          );
        }
        break;
        
      case 'data':
        parameters.push(
          {
            name: 'format',
            type: 'options',
            displayName: 'Data Format',
            description: 'Input data format',
            required: true,
            default: 'json',
            options: [
              { name: 'JSON', value: 'json' },
              { name: 'CSV', value: 'csv' },
              { name: 'XML', value: 'xml' }
            ]
          }
        );
        inputs.push(
          {
            name: 'data',
            type: 'object',
            displayName: 'Input Data',
            description: 'Data from previous node',
            required: true,
            dataType: 'object'
          }
        );
        outputs.push(
          {
            name: 'processedData',
            type: 'object',
            displayName: 'Processed Data',
            description: 'Processed data output',
            dataType: 'object'
          }
        );
        break;
        
      default:
        // Generic parameters for other node types
        parameters.push(
          {
            name: 'enabled',
            type: 'boolean',
            displayName: 'Enabled',
            description: 'Whether this node is enabled',
            required: false,
            default: true
          }
        );
        inputs.push(
          {
            name: 'input',
            type: 'object',
            displayName: 'Input Data',
            description: 'Data from previous node',
            required: false,
            dataType: 'object'
          }
        );
        outputs.push(
          {
            name: 'output',
            type: 'object',
            displayName: 'Output Data',
            description: 'Data for next node',
            dataType: 'object'
          }
        );
    }
    
    return { parameters, inputs, outputs };
  }
  
  private updateNodeContent(content: string, nodeDef: NodeDefinition, enhancedFields: any): string {
    // Find the getNodeDefinition method and replace it
    const methodRegex = /getNodeDefinition\(\)\s*\{[\s\S]*?\n\s*\}/;
    
    const newMethod = `getNodeDefinition() {
    return {
      id: '${nodeDef.id}',
      type: '${nodeDef.type}',
      name: '${nodeDef.name}',
      description: '${nodeDef.description} - Enhanced with proper input fields like n8n/Flowise',
      category: '${nodeDef.category}',
      version: '${nodeDef.version}',
      author: 'Workflow Studio',
      
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: ${JSON.stringify(enhancedFields.parameters, null, 6)},
      
      // Data Flow Input Fields (what comes from previous nodes)
      inputs: ${JSON.stringify(enhancedFields.inputs, null, 6)},
      
      // Output Fields (what this node produces for next nodes)
      outputs: ${JSON.stringify(enhancedFields.outputs, null, 6)},
      
      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: ${this.generateConfigSchema(enhancedFields.parameters)}
      },
      inputSchema: {
        type: 'object',
        properties: ${this.generateInputSchema(enhancedFields.inputs)}
      },
      outputSchema: {
        type: 'object',
        properties: ${this.generateOutputSchema(enhancedFields.outputs)}
      }
    };
  }`;
    
    return content.replace(methodRegex, newMethod);
  }
  
  private generateConfigSchema(parameters: NodeField[]): string {
    const properties: any = {};
    parameters.forEach(param => {
      properties[param.name] = { type: param.type };
    });
    return JSON.stringify(properties, null, 8);
  }
  
  private generateInputSchema(inputs: NodeField[]): string {
    const properties: any = {};
    inputs.forEach(input => {
      properties[input.name] = { type: input.type };
    });
    return JSON.stringify(properties, null, 8);
  }
  
  private generateOutputSchema(outputs: NodeField[]): string {
    const properties: any = {};
    outputs.forEach(output => {
      properties[output.name] = { type: output.type };
    });
    return JSON.stringify(properties, null, 8);
  }
}

// Run the updater
const updater = new NodeUpdater();
updater.updateAllNodes().catch((error) => {
  const logger = require('../utils/logger');
  logger.error('Failed to update nodes', error as Error);
  process.exit(1);
});
