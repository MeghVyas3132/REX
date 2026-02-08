import { WorkflowNode, ExecutionContext, ExecutionResult, NodeType } from '../../utils/types';
const logger = require("../../utils/logger");
import { nodeRegistry } from '../registry/node-registry';
import NodeRegistryV2 from '../registry/node-registry-v2';
import { N8nExecutionAdapter } from './n8n-execution-adapter';
import { INodeExecutionData } from '../../types/n8n-types';
import { nodeVersionMigration } from '../versioning/node-version-migration';

export class NodeRunner {
  private nodeHandlers: Map<string, any> = new Map();
  private nodeRegistryV2: NodeRegistryV2;

  constructor() {
    // Node registry handles all node discovery and instantiation
    this.nodeRegistryV2 = NodeRegistryV2.getInstance();
  }

      async executeNode(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
        const startTime = Date.now();
        
        try {
          // First, check if this is an n8n-compatible node
          const n8nNodeEntry = this.nodeRegistryV2.getNode(node.type);
          
          if (n8nNodeEntry && n8nNodeEntry.isN8nCompatible && n8nNodeEntry.n8nNode) {
            // Migrate node data if needed
            const nodeDescription = n8nNodeEntry.n8nDescription;
            const currentVersion = (node.data?.version || node.data?.config?.version || 1) as number;
            const targetVersion = Array.isArray(nodeDescription.version) 
              ? nodeDescription.version[nodeDescription.version.length - 1]
              : (nodeDescription.version as number);
            
            if (currentVersion !== targetVersion && typeof targetVersion === 'number') {
              try {
                const migratedData = await nodeVersionMigration.migrateNode(
                  node.type,
                  currentVersion,
                  targetVersion,
                  node.data || {}
                );
                node.data = { ...node.data, ...migratedData, version: targetVersion };
                logger.info(`Migrated ${node.type} from v${currentVersion} to v${targetVersion}`);
              } catch (error: any) {
                logger.warn(`Migration failed for ${node.type}: ${error.message}`);
                // Continue with original data
              }
            }
            
            // Execute n8n-compatible node
            return await this.executeN8nNode(node, context, n8nNodeEntry.n8nNode, startTime);
          }
      
      // Fall back to old structure
      const handler = this.getNodeHandler(node);
      
      // Normalize node shape: many frontends store config under data.config
      // Ensure handlers that expect node.config receive it
      const normalizedNode: WorkflowNode = {
        ...node,
        config: this.normalizeNodeConfig(node),
      } as WorkflowNode;

      // Execute node with timeout
      const timeout = node.data?.options?.timeoutMs || 30000;
      const result = await this.executeWithTimeout(
        () => handler.execute(normalizedNode, context),
        timeout
      );
      
      const duration = Date.now() - startTime;
      
      // Check if result is already an ExecutionResult (has success property)
      if (result && typeof result === 'object' && 'success' in result) {
        // Result is already an ExecutionResult, return it as-is
        const executionResult = result as ExecutionResult;
        return {
          ...executionResult,
          duration: executionResult.duration || duration,
          metadata: {
            nodeType: node.type,
            subtype: node.data?.subtype,
            duration: executionResult.duration || duration
          }
        };
      }
      
      // Legacy format - wrap in ExecutionResult
      return {
        success: true,
        output: (result as any)?.output || result,
        duration,
        metadata: {
          nodeType: node.type,
          subtype: node.data?.subtype,
          duration
        }
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorObj = error as Error;
      const errorMessage = errorObj?.message || String(error) || 'Unknown error';
      
      logger.error('Node execution failed', errorObj, {
        nodeId: node.id,
        nodeType: node.type,
        subtype: node.data?.subtype,
        runId: context.runId,
        duration,
        errorMessage,
        errorStack: errorObj?.stack,
        nodeData: JSON.stringify(node.data || {}).substring(0, 500) // Limit size
      });
      
      return {
        success: false,
        error: errorMessage,
        duration,
        metadata: {
          nodeType: node.type,
          subtype: node.data?.subtype,
          duration
        }
      };
    }
  }

  /**
   * Executes an n8n-compatible node
   */
  private async executeN8nNode(
    node: WorkflowNode,
    context: ExecutionContext,
    n8nNode: any,
    startTime: number
  ): Promise<ExecutionResult> {
    try {
      // Prepare input data from context
      let inputData: INodeExecutionData[] = [];
      
      // Get input from previous nodes or context
      if (context.input) {
        if (Array.isArray(context.input)) {
          inputData = context.input.map(item => ({ json: item }));
        } else {
          inputData = [{ json: context.input }];
        }
      }

      // Execute using n8n execution adapter
      const result = await N8nExecutionAdapter.executeN8nNode(
        node,
        context,
        n8nNode,
        inputData
      );

      const duration = Date.now() - startTime;
      
      return {
        ...result,
        duration,
        metadata: {
          nodeType: node.type,
          subtype: node.data?.subtype,
          duration,
          n8nCompatible: true
        }
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('n8n node execution failed', error, {
        nodeId: node.id,
        nodeType: node.type,
        runId: context.runId,
        duration
      });
      
      return {
        success: false,
        error: error.message || 'Unknown error',
        duration,
        metadata: {
          nodeType: node.type,
          subtype: node.data?.subtype,
          duration,
          n8nCompatible: true
        }
      };
    }
  }

  private getNodeHandler(node: WorkflowNode): any {
    // Try multiple lookup strategies to make nodes work even if subtype is missing/wrong
    const candidates = [
      node.data?.subtype,           // Primary: use subtype if available
      node.type,                     // Fallback 1: use node.type
      node.data?.subtype?.replace('-trigger', '').replace('-action', ''), // Fallback 2: remove common suffixes
      node.type?.replace('-trigger', '').replace('-action', ''),          // Fallback 3: same for node.type
    ].filter((c): c is string => !!c && typeof c === 'string');
    
    // Remove duplicates
    const uniqueCandidates = [...new Set(candidates)];
    
    // Debug logging for schedule nodes
    if (node.data?.subtype === 'schedule' || node.type === 'trigger') {
      logger.info('Schedule node lookup', {
        nodeId: node.id,
        nodeType: node.type,
        subtype: node.data?.subtype,
        candidates: uniqueCandidates,
        nodeData: JSON.stringify(node.data || {}).substring(0, 200)
      });
    }
    
    let lastError: Error | null = null;
    
    // Try each candidate in order
    for (const candidate of uniqueCandidates) {
      try {
        const nodeInstance = nodeRegistry.createNodeInstance(candidate);
        
        if (nodeInstance) {
          if (candidate !== candidates[0]) {
            // Log when we had to use a fallback
            logger.info('Node lookup used fallback', {
              nodeId: node.id,
              originalSubtype: node.data?.subtype,
              originalType: node.type,
              resolvedTo: candidate,
              triedCandidates: uniqueCandidates
            });
          }
          return nodeInstance;
        }
      } catch (error) {
        lastError = error as Error;
        logger.debug(`Node lookup failed for candidate: ${candidate}`, {
          error: (error as Error).message,
          nodeId: node.id
        });
        // Continue to next candidate
      }
    }
    
    // All strategies failed - throw detailed error
    const errorMsg = `Node not found in registry. Tried: ${uniqueCandidates.join(', ')}. ` +
                     `Original node: id=${node.id}, type=${node.type}, subtype=${node.data?.subtype || 'none'}. ` +
                     `Last error: ${lastError?.message || 'No specific error'}`;
    
    logger.error('Node lookup failed after all fallbacks', {
      nodeId: node.id,
      nodeType: node.type,
      subtype: node.data?.subtype,
      triedCandidates: uniqueCandidates,
      lastError: lastError?.message,
      nodeData: JSON.stringify(node.data || {}).substring(0, 500)
    });
    
    throw new Error(errorMsg);
  }

  // Removed mock node handler to enforce real API execution

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Node execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  // Register custom node handler
  registerNodeHandler(nodeType: string, handler: any): void {
    this.nodeHandlers.set(nodeType, handler);
    logger.info('Node handler registered', { nodeType });
  }

  // Get available node types
  getAvailableNodeTypes(): string[] {
    return Array.from(this.nodeHandlers.keys());
  }

  /**
   * Normalize frontend-specific nested configs into the flat config objects
   * expected by backend nodes.
   */
  private normalizeNodeConfig(node: any): any {
    const directConfig = node?.config ?? node?.data?.config ?? {};
    const nodeType = node?.data?.subtype || node?.type;

    // No special handling if already flat
    if (!directConfig || typeof directConfig !== 'object') return directConfig;

    // Google Drive mapping: flatten common frontend shapes to backend expectations
    if (nodeType === 'google-drive') {
      const cfg = { ...directConfig };
      const fileOps = cfg.fileOperations || {};
      const options = cfg.options || {};

      return {
        // Primary operation
        operation: cfg.operation || fileOps.operation || options.operation || 'list',
        // File/folder identifiers and content
        folderId: cfg.folderId ?? options.folderId,
        fileName: cfg.fileName ?? fileOps.fileName ?? options.fileName,
        fileContent: cfg.fileContent ?? fileOps.fileContent ?? options.fileContent,
        fileUrl: cfg.fileUrl ?? options.fileUrl,
        fileId: cfg.fileId ?? options.fileId,
        folderName: cfg.folderName ?? options.folderName,
        mimeType: cfg.mimeType ?? options.mimeType ?? fileOps.mimeType,
        query: cfg.query ?? options.query,
        shareEmail: cfg.shareEmail ?? options.shareEmail,
        permission: cfg.permission ?? options.permission,
        sharedDrive: cfg.sharedDrive ?? options.sharedDrive,
        // Token and credentials are now directly in config
        accessToken: cfg.accessToken,
        refreshToken: cfg.refreshToken,
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
      };
    }

    // Default: return direct config
    return directConfig;
  }
}
