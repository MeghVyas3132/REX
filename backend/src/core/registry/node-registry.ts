import { NodeDefinition, NodeType } from '../../utils/types';
const logger = require("../../utils/logger");
import * as fs from 'fs';
import * as path from 'path';
import NodeRegistryV2, { NodeRegistryEntryV2 } from './node-registry-v2';

export interface NodeRegistryEntry {
  id: string;
  type: NodeType;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  nodeClass: any;
  configSchema?: any;
  inputSchema?: any;
  outputSchema?: any;
  // Enhanced input fields like n8n/Flowise
  parameters?: any[];
  inputs?: any[];
  outputs?: any[];
}

export class NodeRegistry {
  private static instance: NodeRegistry;
  private nodes: Map<string, NodeRegistryEntry> = new Map();
  private aliases: Map<string, string> = new Map();
  private nodeDirectories: string[] = [];
  private nodeRegistryV2: NodeRegistryV2;

  private constructor() {
    this.initializeNodeDirectories();
    this.autoLoadNodes();
    this.setupAliases();
    // Initialize NodeRegistryV2 for n8n-compatible nodes
    this.nodeRegistryV2 = NodeRegistryV2.getInstance();
  }

  public static getInstance(): NodeRegistry {
    if (!NodeRegistry.instance) {
      NodeRegistry.instance = new NodeRegistry();
    }
    return NodeRegistry.instance;
  }

  private initializeNodeDirectories(): void {
    const basePath = path.join(__dirname, '../../nodes');
    this.nodeDirectories = [
      path.join(basePath, 'core'),
      path.join(basePath, 'llm'),
      path.join(basePath, 'ai'),
      path.join(basePath, 'integrations'),
      path.join(basePath, 'data'),
      path.join(basePath, 'logic'),
      path.join(basePath, 'triggers'),
      path.join(basePath, 'utility'),
      path.join(basePath, 'utilities'),
      path.join(basePath, 'agent'),
      path.join(basePath, 'cloud'),
      path.join(basePath, 'communication'),
      path.join(basePath, 'finance'),
      path.join(basePath, 'development'),
      path.join(basePath, 'sales'),
      path.join(basePath, 'marketing'),
      path.join(basePath, 'analytics'),
      path.join(basePath, 'productivity'),
      path.join(basePath, 'storage'),
      path.join(basePath, 'file-processing')
    ];
    
    // Register memory node
    this.registerMemoryNode();
  }

  private setupAliases(): void {
    // Add aliases for common node type patterns
    this.aliases.set('ai.openai', 'openai');
    this.aliases.set('ai.claude', 'claude');
    this.aliases.set('ai.anthropic', 'claude');
    this.aliases.set('llm.openai', 'openai');
    this.aliases.set('llm.claude', 'claude');
    
    // Frontend to Backend node mapping
    // Note: Aliases are only needed when frontend node name differs from backend node name
    // Direct matches (same name in frontend and backend) don't need aliases
    
    // Core/Development nodes - aliases only for mismatches
    // http-request, webhook-call, rest-api, graphql, soap, github match directly - no aliases needed
    
    // Communication nodes - aliases only for mismatches
    // removed email and email-integration aliases
    this.aliases.set('teams', 'microsoft-teams'); // Teams maps to microsoft-teams node
    // email, gmail, whatsapp, telegram, microsoft-teams, zoom, wechat, instagram, twitter-dm, linkedin-message match directly - no aliases needed
    // Removed unimplemented nodes: webex, skype, signal, viber, facebook-messenger, twilio
    // These should be implemented as proper nodes or removed from frontend
    
    // AI/LLM nodes - aliases only for mismatches
    this.aliases.set('anthropic', 'claude'); // Frontend anthropic maps to backend claude
    // openai, claude, gemini match directly - no aliases needed
    
    // Data nodes - aliases only for mismatches
    this.aliases.set('mongodb', 'mongodb-real'); // Frontend mongodb maps to backend mongodb-real
    // csv, json, database, mysql, postgresql, redis match directly - no aliases needed
    
    // Finance nodes - aliases only for mismatches
    // stripe matches directly - no alias needed
    // Removed unimplemented nodes: paypal, square, quickbooks, xero
    // These should be implemented as proper nodes or removed from frontend
    
    // Development nodes - aliases only for mismatches
    // github matches directly - no alias needed
    // Removed unimplemented nodes: gitlab, jira, bitbucket, jenkins
    // These should be implemented as proper nodes or removed from frontend
    
    // Sales nodes - aliases only for mismatches
    // salesforce, pipedrive, zoho-crm - check if these nodes exist, if not remove aliases
    
    // Marketing nodes - aliases only for mismatches
    this.aliases.set('twitter', 'twitter-dm'); // Twitter maps to twitter-dm node
    this.aliases.set('linkedin', 'linkedin-message'); // LinkedIn maps to linkedin-message node
    // Removed unimplemented nodes: shopify, mailchimp, constant-contact, wordpress, facebook
    // These should be implemented as proper nodes or removed from frontend
    
    // Analytics nodes - aliases only for mismatches
    // google-analytics, segment match directly - no aliases needed
    
    // Productivity nodes - aliases only for mismatches
    // google-sheets, excel match directly - no aliases needed
    // Removed unimplemented nodes: trello, airtable
    // These should be implemented as proper nodes or removed from frontend
    
    // Storage nodes - aliases only for mismatches
    // dropbox, onedrive, ftp, sftp, digitalocean-spaces, wasabi, backblaze-b2, mega, pcloud,
    // owncloud, seafile, webdav, local-storage - check if these nodes exist, if not remove aliases
    
    // Cloud nodes - aliases only for mismatches
    // aws-s3, aws-lambda, google-cloud-storage, google-drive, azure-blob, docker, kubernetes match directly - no aliases needed
    
    // Logic nodes - aliases only for mismatches
    this.aliases.set('conditional', 'condition'); // Frontend conditional maps to backend condition
    // condition, loop match directly - no aliases needed
    
    // Utility nodes - aliases only for mismatches
    // signature-validation, fetch-email-data, audit-log, logger, data-converter, data-transform, 
    // merge, filter, split, math, delay, code, date-time, xml-parser,
    // crypto, hash, url-parser match directly - no aliases needed
    // regex, base64, analytics - check if these nodes exist
    // JSON/CSV parser aliases - map to existing nodes
    this.aliases.set('json-parser', 'json'); // Use json node
    this.aliases.set('csv-parser', 'csv'); // Use csv node
    
    // Agent nodes - Backend uses agent-* prefix, frontend also uses agent-* prefix
    // Frontend agent-* nodes match backend directly - no aliases needed
    // Keep backward compatibility aliases for old names without agent- prefix
    this.aliases.set('context', 'agent-context'); // Backward compatibility alias
    this.aliases.set('decision', 'agent-decision'); // Backward compatibility alias
    this.aliases.set('goal', 'agent-goal'); // Backward compatibility alias
    this.aliases.set('reasoning', 'agent-reasoning'); // Backward compatibility alias
    this.aliases.set('state', 'agent-state'); // Backward compatibility alias
    
    // AI processing nodes - aliases only for mismatches
    // data-analyzer, document-processor, email-analyzer, image-generator, text-analyzer,
      // vector-search, huggingface, speech-to-text, text-to-speech,
    // openrouter match directly - no aliases needed
    // stability-ai, image-recognition, translation, palm - check if these nodes exist
    
    // File processing nodes - aliases only for mismatches
    // image-resize, error-trigger, file-upload, file-validation,
    // data-cleaning, data-transformation, quality-assurance, file-export match directly - no aliases needed
    // pdf-generator, zip, qr-code - check if these nodes exist
    
    // Cloud monitoring - aliases only for mismatches
    // cloudwatch, terraform match directly - no aliases needed
    
    try {
      logger.info('Node aliases configured', { aliasCount: this.aliases.size });
    } catch (e) {
      logger.info('Node aliases configured', { aliasCount: this.aliases.size });
    }
  }

  private autoLoadNodes(): void {
    try {
      logger.info('Starting node auto-discovery...');
    } catch (e) {
      logger.info('Starting node auto-discovery...');
    }
    
    for (const directory of this.nodeDirectories) {
      this.loadNodesFromDirectory(directory);
    }
    
    try {
      logger.info('Node auto-discovery completed', { nodeCount: this.nodes.size });
    } catch (e) {
      logger.info('Node auto-discovery completed', { nodeCount: this.nodes.size });
    }
  }

  private loadNodesFromDirectory(directory: string): void {
    try {
      if (!fs.existsSync(directory)) {
        try {
          logger.debug(`Node directory does not exist: ${directory}`);
        } catch (e) {
          logger.debug('Node directory does not exist', { directory });
        }
        return;
      }

      // Recursively find all .node.ts and .node.js files
      const nodeFiles = this.findNodeFiles(directory);

      for (const filePath of nodeFiles) {
        this.loadNodeFromFile(filePath);
      }
    } catch (error: any) {
      try {
        logger.error(`Error loading nodes from directory ${directory}:`, error);
      } catch (e) {
        logger.error('Error loading nodes from directory', error as Error, { directory });
      }
    }
  }

  private findNodeFiles(directory: string): string[] {
    const nodeFiles: string[] = [];
    
    const scanDirectory = (dir: string): void => {
      if (!fs.existsSync(dir)) {
        return;
      }

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          scanDirectory(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.node.ts') || entry.name.endsWith('.node.js'))) {
          nodeFiles.push(fullPath);
        }
      }
    };

    scanDirectory(directory);
    return nodeFiles;
  }

  private loadNodeFromFile(filePath: string): void {
    try {
      // Clear require cache to ensure fresh imports
      if (require.cache[require.resolve(filePath)]) {
        delete require.cache[require.resolve(filePath)];
      }
      
      const nodeModule = require(filePath);
      
      // Try to find the node class: default export, named export matching filename, or first class export
      let nodeClass = nodeModule.default;
      
      // If no default, try to find a class export matching the filename pattern
      if (!nodeClass || typeof nodeClass !== 'function') {
        const fileName = path.basename(filePath, path.extname(filePath));
        const className = fileName.split('.')[0]
          .split('-')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join('') + 'Node';
        
        // Try className (e.g., WhatsAppNode)
        if (nodeModule[className] && typeof nodeModule[className] === 'function') {
          nodeClass = nodeModule[className];
        }
        // Try any export ending with 'Node'
        else {
          const nodeExports = Object.keys(nodeModule).filter(key => 
            key.endsWith('Node') && typeof nodeModule[key] === 'function'
          );
          if (nodeExports.length > 0) {
            nodeClass = nodeModule[nodeExports[0]];
          }
        }
      }
      
      // Last resort: use the module itself if it's a function
      if (!nodeClass || typeof nodeClass !== 'function') {
        if (typeof nodeModule === 'function') {
          nodeClass = nodeModule;
        } else {
          try {
            logger.warn(`Invalid node class in file: ${filePath}. Available exports: ${Object.keys(nodeModule).join(', ')}`);
          } catch (e) {
            logger.warn('Invalid node class in file', { filePath });
          }
          return;
        }
      }

      // Create instance to get metadata
      const nodeInstance = new nodeClass();
      
      if (!nodeInstance.getNodeDefinition) {
        try {
          logger.warn(`Node in ${filePath} does not implement getNodeDefinition method`);
        } catch (e) {
          logger.warn('Node does not implement getNodeDefinition method', { filePath });
        }
        return;
      }

      const definition = nodeInstance.getNodeDefinition();
      
      if (!definition.id || !definition.type) {
        try {
          logger.warn(`Node in ${filePath} has invalid definition:`, definition);
        } catch (e) {
          logger.warn('Node has invalid definition', { filePath, definition });
        }
        return;
      }

      const registryEntry: NodeRegistryEntry = {
        id: definition.id,
        type: definition.type,
        name: definition.name,
        description: definition.description,
        category: definition.category || 'general',
        version: definition.version || '1.0.0',
        author: definition.author || 'unknown',
        nodeClass,
        configSchema: definition.configSchema,
        inputSchema: definition.inputSchema,
        outputSchema: definition.outputSchema,
        // Enhanced input fields like n8n/Flowise
        parameters: definition.parameters,
        inputs: definition.inputs,
        outputs: definition.outputs
      };

      this.nodes.set(definition.id, registryEntry);
      
      try {
        logger.info(`✅ Loaded node: ${definition.id} (${definition.type})`, {
          category: definition.category,
          version: definition.version
        });
      } catch (e) {
        logger.debug('Loaded node', { nodeId: definition.id, nodeType: definition.type });
      }

    } catch (error: any) {
      try {
        logger.warn(`⚠️  Skipped node file ${filePath}: ${error.message}`);
      } catch (e) {
        logger.warn('Skipped node file', { filePath, error: error.message });
      }
    }
  }

  public registerNode(nodeClass: any, definition: Partial<NodeDefinition>): void {
    try {
      const nodeInstance = new nodeClass();
      const fullDefinition = nodeInstance.getNodeDefinition();
      
      const registryEntry: NodeRegistryEntry = {
        id: fullDefinition.id,
        type: fullDefinition.type,
        name: fullDefinition.name,
        description: fullDefinition.description,
        category: fullDefinition.category || 'general',
        version: fullDefinition.version || '1.0.0',
        author: fullDefinition.author || 'unknown',
        nodeClass,
        configSchema: fullDefinition.configSchema,
        inputSchema: fullDefinition.inputSchema,
        outputSchema: fullDefinition.outputSchema
      };

      this.nodes.set(fullDefinition.id, registryEntry);
      
      logger.info(`Manually registered node: ${fullDefinition.id}`);
    } catch (error: any) {
      logger.error('Error registering node:', error);
    }
  }

  public getNode(nodeId: string): NodeRegistryEntry | undefined {
    // Check for aliases first
    const actualNodeId = this.aliases.get(nodeId) || nodeId;
    
    // First check old structure
    const oldNode = this.nodes.get(actualNodeId);
    if (oldNode) {
      return oldNode;
    }
    
    // Then check n8n-compatible nodes
    const n8nNode = this.nodeRegistryV2.getNode(actualNodeId);
    if (n8nNode) {
      // Convert n8n node to old structure for compatibility
      return {
        id: n8nNode.id,
        type: n8nNode.type,
        name: n8nNode.name,
        description: n8nNode.description,
        category: n8nNode.category,
        version: n8nNode.version,
        author: n8nNode.author,
        nodeClass: n8nNode.nodeClass,
        configSchema: n8nNode.configSchema,
        inputSchema: n8nNode.inputSchema,
        outputSchema: n8nNode.outputSchema,
        parameters: n8nNode.parameters,
        inputs: n8nNode.inputs,
        outputs: n8nNode.outputs,
      };
    }
    
    return undefined;
  }

  public getAllNodes(): NodeRegistryEntry[] {
    return Array.from(this.nodes.values());
  }

  public getNodesByType(type: NodeType): NodeRegistryEntry[] {
    return Array.from(this.nodes.values()).filter(node => node.type === type);
  }

  public getNodesByCategory(category: string): NodeRegistryEntry[] {
    return Array.from(this.nodes.values()).filter(node => node.category === category);
  }

  // Methods needed by the API controllers
  public getAllNodeDefinitions(): NodeDefinition[] {
    const oldNodes = Array.from(this.nodes.values()).map(node => ({
      id: node.id,
      type: node.type,
      name: node.name,
      description: node.description,
      category: node.category,
      version: node.version,
      author: node.author,
      configSchema: node.configSchema,
      inputSchema: node.inputSchema,
      outputSchema: node.outputSchema,
      inputs: node.inputs,
      outputs: node.outputs
    }));
    
    // Add n8n-compatible nodes
    const n8nNodes = this.nodeRegistryV2.getAllNodes()
      .filter(node => !this.nodes.has(node.id)) // Don't duplicate
      .map(node => ({
        id: node.id,
        type: node.type,
        name: node.name,
        description: node.description,
        category: node.category,
        version: node.version,
        author: node.author,
        configSchema: node.configSchema,
        inputSchema: node.inputSchema,
        outputSchema: node.outputSchema,
        inputs: node.inputs,
        outputs: node.outputs
      }));
    
    return [...oldNodes, ...n8nNodes];
  }

  public getNodeDefinition(nodeId: string): NodeDefinition | undefined {
    const nodeEntry = this.getNode(nodeId);
    if (!nodeEntry) {
      return undefined;
    }
    
    return {
      id: nodeEntry.id,
      type: nodeEntry.type,
      name: nodeEntry.name,
      description: nodeEntry.description,
      category: nodeEntry.category,
      version: nodeEntry.version,
      author: nodeEntry.author,
      inputs: nodeEntry.inputs,
      outputs: nodeEntry.outputs
    };
  }

  public getCategories(): string[] {
    const categories = new Set(Array.from(this.nodes.values()).map(node => node.category));
    return Array.from(categories).sort();
  }

  // Additional methods needed by workflow-nodes routes
  public getNodeExecutor(nodeId: string): any {
    const nodeEntry = this.getNode(nodeId);
    if (!nodeEntry) {
      return undefined;
    }
    return nodeEntry.nodeClass;
  }

  public async executeNode(nodeId: string, node: any, context: any): Promise<any> {
    const nodeEntry = this.getNode(nodeId);
    if (!nodeEntry) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    
    try {
      const nodeInstance = new nodeEntry.nodeClass();
      
      if (!nodeInstance.execute) {
        throw new Error(`Node class ${nodeId} does not have an execute method`);
      }
      
      return await nodeInstance.execute(node, context);
    } catch (error: any) {
      logger.error('Error executing node', error as Error, {
        nodeId,
        nodeType: node?.type,
        nodeSubtype: node?.data?.subtype,
        errorMessage: error?.message,
        errorStack: error?.stack,
        nodeClassType: typeof nodeEntry.nodeClass,
        nodeClassName: nodeEntry.nodeClass?.name
      });
      throw error;
    }
  }

  public getNodeCapabilities(nodeId: string): any {
    const nodeEntry = this.getNode(nodeId);
    if (!nodeEntry) {
      return { actions: true };
    }

    const capabilities: Record<string, any> = {
      'webhook': { triggers: true, http: true },
      'schedule': { triggers: true, cron: true },
      'http-request': { actions: true, http: true },
      'slack': { actions: true, messaging: true },
      'discord': { actions: true, messaging: true },
      'whatsapp': { actions: true, messaging: true },
      'telegram': { actions: true, messaging: true },
      'send-email': { actions: true, messaging: true },
      'openai': { actions: true, ai: true },
      'claude': { actions: true, ai: true },
      'huggingface': { actions: true, ai: true },
      'database': { actions: true, data: true },
      'mysql': { actions: true, data: true },
      'postgresql': { actions: true, data: true },
      'csv': { actions: true, data: true },
      'stripe': { actions: true, finance: true },
      'github': { actions: true, development: true },
      'aws-s3': { actions: true, cloud: true },
      'google-drive': { actions: true, cloud: true },
      'filter': { actions: true, utility: true },
      'math': { actions: true, utility: true }
    };
    
    return capabilities[nodeId] || { actions: true };
  }

  public createNodeInstance(nodeId: string): any {
    // Check for aliases first
    const actualNodeId = this.aliases.get(nodeId) || nodeId;
    
    // Debug logging for manual trigger
    if (nodeId === 'manual') {
      try {
        logger.info('Manual trigger alias lookup', {
          originalNodeId: nodeId,
          resolvedNodeId: actualNodeId,
          aliasExists: this.aliases.has(nodeId),
          availableAliases: Array.from(this.aliases.keys()).filter(k => k.includes('manual') || k.includes('webhook')),
          nodesAvailable: Array.from(this.nodes.keys()).filter(k => k.includes('webhook'))
        });
      } catch (e) {
        logger.debug('Manual trigger lookup', { original: nodeId, resolved: actualNodeId });
      }
    }
    
    // First check old structure
    const oldNodeEntry = this.nodes.get(actualNodeId);
    if (oldNodeEntry) {
      return new oldNodeEntry.nodeClass();
    }
    
    // Then check n8n-compatible nodes
    const n8nNodeEntry = this.nodeRegistryV2.getNode(actualNodeId);
    if (n8nNodeEntry && n8nNodeEntry.nodeClass) {
      return new n8nNodeEntry.nodeClass();
    }
    
    throw new Error(`Node not found: ${nodeId} (resolved to: ${actualNodeId})`);
  }

  public reloadNodes(): void {
    logger.info('Reloading node registry...');
    this.nodes.clear();
    this.autoLoadNodes();
  }

  public getNodeSchema(nodeId: string): any {
    const nodeEntry = this.getNode(nodeId);
    if (!nodeEntry) {
      return null;
    }

    return {
      id: nodeEntry.id,
      type: nodeEntry.type,
      name: nodeEntry.name,
      description: nodeEntry.description,
      category: nodeEntry.category,
      version: nodeEntry.version,
      author: nodeEntry.author,
      configSchema: nodeEntry.configSchema,
      inputSchema: nodeEntry.inputSchema,
      outputSchema: nodeEntry.outputSchema
    };
  }

  public validateNodeConfig(nodeId: string, config: any, options?: any): { valid: boolean; errors: string[] } {
    const nodeEntry = this.getNode(nodeId);
    if (!nodeEntry) {
      return { valid: false, errors: [`Node not found: ${nodeId}`] };
    }

    if (!nodeEntry.configSchema) {
      return { valid: true, errors: [] };
    }

    // Basic validation - in production, use a proper JSON schema validator
    const errors: string[] = [];
    const schema = nodeEntry.configSchema;

    // For schedule nodes, check both config and options since fields can be in either
    const mergedConfig = (nodeId === 'schedule' && options) 
      ? { ...config, ...options } 
      : config;

    // Check required fields from schema.required array
    if (schema.required && Array.isArray(schema.required) && schema.required.length > 0) {
      for (const requiredField of schema.required) {
        if (mergedConfig[requiredField] === undefined || mergedConfig[requiredField] === null) {
          errors.push(`Required field '${requiredField}' is missing`);
        }
      }
    }

    for (const [key, field] of Object.entries(schema.properties || {})) {
      const fieldDef = field as any;
      const value = mergedConfig[key];

      if (value === undefined || value === null) {
        continue; // Skip validation for undefined/null values (required check already done above)
      }

      // Handle type validation properly (arrays and objects need special handling)
      if (fieldDef.type) {
        let isValidType = false;
        if (fieldDef.type === 'array') {
          isValidType = Array.isArray(value);
        } else if (fieldDef.type === 'object') {
          isValidType = typeof value === 'object' && value !== null && !Array.isArray(value);
        } else {
          isValidType = typeof value === fieldDef.type;
        }

        if (!isValidType) {
        errors.push(`Field '${key}' must be of type ${fieldDef.type}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private registerMemoryNode(): void {
    try {
      const memoryNodePath = path.join(__dirname, '../memory/memory-node');
      const { MemoryNode } = require(memoryNodePath);
      const memoryNode = new MemoryNode();
      const definition = memoryNode.getNodeDefinition();
      
      this.nodes.set(definition.id, {
        id: definition.id,
        type: definition.type as NodeType,
        name: definition.name,
        description: definition.description,
        category: definition.category,
        version: definition.version,
        author: definition.author,
        nodeClass: MemoryNode,
        configSchema: definition.configSchema,
        inputSchema: definition.inputSchema,
        outputSchema: definition.outputSchema
      });
      
      try {
        logger.info('✅ Loaded node: memory (action)', {
          category: definition.category,
          service: 'workflow-studio',
          timestamp: new Date().toISOString(),
          version: definition.version
        });
      } catch (e) {
        logger.debug('Loaded node: memory (action)');
      }
    } catch (error) {
      try {
        logger.error('Failed to register memory node', error);
      } catch (e) {
        logger.error('Failed to register memory node', error as Error);
      }
      logger.error('Memory node registration error', error as Error);
    }
  }

}

export const nodeRegistry = NodeRegistry.getInstance();
