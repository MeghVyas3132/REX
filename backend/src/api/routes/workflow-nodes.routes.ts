import { Router } from 'express';
import { nodeRegistry } from '../../core/registry/node-registry';
import { nodeRegistryHelper } from '../../core/registry/node-registry-helper';
import { loadOptionsHandler } from '../../core/methods/load-options-handler';
import { N8nExecutionAdapter } from '../../core/engine/n8n-execution-adapter';
import { optionalAuth } from '../middlewares/auth.middleware';
import { logger } from '../../utils/logger';

const router = Router();

// Use optional auth - consistent with workflow execution endpoints
// User will be available if authenticated, but not required for testing

// POST /api/workflows/nodes/:nodeType/execute - Execute a single node (direct node registry execution)
router.post('/:nodeType/execute', optionalAuth, async (req, res) => {
  try {
    const { nodeType } = req.params;
    const { config, input, options, credentials } = req.body;

    // For schedule nodes, config can be empty if options are provided
    if (!config && nodeType !== 'schedule') {
      return res.status(400).json({
        success: false,
        error: 'Node configuration is required'
      });
    }
    
    // Ensure config is an object (can be empty for schedule nodes)
    const nodeConfig = config || {};

    // Get node executor
    const executor = nodeRegistry.getNodeExecutor(nodeType);
    if (!executor) {
      logger.error('Node executor not found', new Error(`Node type '${nodeType}' not found`), {
        nodeType,
        availableNodes: Array.from(nodeRegistry.getAllNodes().map(n => n.id))
      });
      return res.status(404).json({
        success: false,
        error: `Node type '${nodeType}' not found`
      });
    }
    
    logger.info('Node executor found', {
      nodeType,
      executorType: typeof executor,
      executorName: executor?.name || 'unknown'
    });

    // Validate configuration (pass options for schedule nodes)
    // Skip validation for schedule nodes - they handle validation internally
    if (nodeType !== 'schedule') {
      const validation = nodeRegistry.validateNodeConfig(nodeType, nodeConfig, options);
      if (!validation.valid) {
        logger.warn('Node validation failed', {
          nodeType,
          errors: validation.errors,
          config: JSON.stringify(nodeConfig).substring(0, 200),
          options: JSON.stringify(options || {}).substring(0, 200)
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid node configuration',
          details: validation.errors
        });
      }
    } else {
      logger.info('Skipping validation for schedule node - will validate during execution', {
        nodeType,
        hasConfig: !!nodeConfig && Object.keys(nodeConfig).length > 0,
        hasOptions: !!options && Object.keys(options).length > 0
      });
    }

    // Create workflow node with ALL data fields including options and credentials
    const node: any = {
      id: `temp_${Date.now()}`,
      type: 'action',
      position: { x: 0, y: 0 },
      data: {
        config: nodeConfig, // Use nodeConfig (ensures it's always an object)
        subtype: nodeType,
        options: options || {}, // Include options (for schedule nodes, retry settings, etc.)
        credentials: credentials || {}, // Include credentials
        // Preserve any other fields from request
        ...(req.body.data || {})
      }
    };

    // Create execution context
    const context = {
      runId: `run_${Date.now()}`,
      workflowId: 'temp',
      nodeId: node.id,
      input: input || {},
      output: {},
      variables: {},
      credentials: {},
      userId: (req as any).user?.id
    } as any;

    // Execute node directly via node registry (preferred method)
    logger.info('Executing node', {
      nodeType,
      nodeId: node.id,
      hasConfig: !!node.data?.config,
      hasOptions: !!node.data?.options,
      configKeys: Object.keys(node.data?.config || {}),
      optionsKeys: Object.keys(node.data?.options || {}),
      inputKeys: Object.keys(context.input || {})
    });
    
    const result = await nodeRegistry.executeNode(nodeType, node, context);

    logger.info('Single node execution completed', {
      nodeType,
      success: result.success,
      duration: result.duration,
      hasOutput: !!result.output,
      outputKeys: result.output ? Object.keys(result.output) : [],
      hasError: !!result.error,
      error: result.error,
      userId: (req as any).user?.id
    });

    // If node execution failed, return error details
    if (result && result.success === false) {
      const errorMessage = result.error || 
                          result.output?.error ||
                          result.details?.error ||
                          'Node execution failed';
      
      logger.warn('Node execution returned failure', {
        nodeType,
        error: errorMessage,
        resultKeys: Object.keys(result),
        hasOutput: !!result.output,
        hasDetails: !!result.details
      });
      
      return res.status(500).json({
        success: false,
        error: errorMessage,
        nodeType,
        details: result.details || result.output?.details || {},
        output: result.output
      });
    }

    res.json({
      success: true,
      data: {
        nodeType,
        result,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('Single node execution failed', error as Error, {
      nodeType: req.params.nodeType,
      userId: (req as any).user?.id,
      errorMessage: error.message,
      errorStack: error.stack,
      config: JSON.stringify(req.body.config || {}).substring(0, 200),
      options: JSON.stringify(req.body.options || {}).substring(0, 200)
    });

    // Return detailed error information
    const errorResponse: any = {
      success: false,
      error: error.message || 'Node execution failed',
      nodeType: req.params.nodeType
    };
    
    // Include validation errors if present
    if (error.message?.includes('validation') || error.message?.includes('Invalid')) {
      errorResponse.details = {
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      };
    } else if (process.env.NODE_ENV === 'development') {
      errorResponse.details = {
        message: error.message,
        stack: error.stack
      };
    }
    
    res.status(500).json(errorResponse);
  }
});

// POST /api/workflows/nodes/:nodeType/test - Test a single node configuration
router.post('/:nodeType/test', optionalAuth, async (req, res) => {
  try {
    const { nodeType } = req.params;
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Node configuration is required'
      });
    }

    // Get node definition (supports both old and new structures)
    const definition = nodeRegistryHelper.getNodeDefinition(nodeType);
    if (!definition) {
      return res.status(404).json({
        success: false,
        error: `Node type '${nodeType}' not found`
      });
    }

    // Validate configuration
    const validation = nodeRegistry.validateNodeConfig(nodeType, config);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid node configuration',
        details: validation.errors
      });
    }

    // Get node capabilities
    const capabilities = nodeRegistry.getNodeCapabilities(nodeType);

    logger.info('Single node test completed', {
      nodeType,
      userId: (req as any).user?.id
    });

    res.json({
      success: true,
      data: {
        nodeType,
        definition,
        capabilities,
        configValid: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('Single node test failed', error as Error, {
      nodeType: req.params.nodeType,
      userId: (req as any).user?.id
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Node test failed'
    });
  }
});

// GET /api/workflows/nodes/:nodeType/schema - Get node schema
router.get('/:nodeType/schema', optionalAuth, async (req, res) => {
  try {
    const { nodeType } = req.params;

    const definition = nodeRegistryHelper.getNodeDefinition(nodeType);
    if (!definition) {
      return res.status(404).json({
        success: false,
        error: `Node type '${nodeType}' not found`
      });
    }

    const schema = nodeRegistryHelper.getNodeSchema(nodeType);
    const capabilities = nodeRegistry.getNodeCapabilities(nodeType);
    const isN8nCompatible = nodeRegistryHelper.isN8nCompatible(nodeType);
    const n8nDescription = isN8nCompatible ? nodeRegistryHelper.getN8nNodeDescription(nodeType) : undefined;

    res.json({
      success: true,
      data: {
        nodeType,
        definition,
        schema,
        capabilities,
        isN8nCompatible,
        n8nDescription,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('Failed to get node schema', error as Error, {
      nodeType: req.params.nodeType,
      userId: (req as any).user?.id
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get node schema'
    });
  }
});

// GET /api/workflows/nodes - Get all available node types
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, type, n8nOnly } = req.query;
    
    let nodes = nodeRegistryHelper.getAllNodeDefinitions();

    // Filter by category
    if (category) {
      nodes = nodes.filter(node => {
        const nodeCategory = 'category' in node ? node.category : node.group?.[0];
        return nodeCategory === category;
      });
    }

    // Filter by type
    if (type) {
      nodes = nodes.filter(node => {
        const nodeType = 'type' in node ? node.type : mapGroupToNodeType(node.group?.[0] || 'transform');
        return nodeType === type;
      });
    }

    // Filter n8n-compatible nodes only
    if (n8nOnly === 'true') {
      nodes = nodes.filter(node => {
        const nodeId = 'id' in node ? node.id : node.name;
        return nodeRegistryHelper.isN8nCompatible(nodeId);
      });
    }

    // Add capabilities and metadata to each node
    const nodesWithCapabilities = nodes.map(node => {
      const nodeId = 'id' in node ? node.id : node.name;
      const isN8nCompatible = nodeRegistryHelper.isN8nCompatible(nodeId);
      
      return {
        ...node,
        id: nodeId,
        capabilities: nodeRegistry.getNodeCapabilities(nodeId),
        isN8nCompatible,
        n8nDescription: isN8nCompatible ? nodeRegistryHelper.getN8nNodeDescription(nodeId) : undefined,
      };
    });

    res.json({
      success: true,
      data: nodesWithCapabilities,
      count: nodesWithCapabilities.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to get nodes', error as Error, {
      userId: (req as any).user?.id
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get nodes'
    });
  }
});

// Helper function to map group to node type
function mapGroupToNodeType(group: string): string {
  const groupMap: Record<string, string> = {
    'trigger': 'trigger',
    'transform': 'action',
    'input': 'action',
    'output': 'action',
    'organization': 'action',
    'schedule': 'trigger',
  };
  return groupMap[group] || 'action';
}

// POST /api/workflows/nodes/:nodeType/loadOptions/:methodName - Load options dynamically
router.post('/:nodeType/loadOptions/:methodName', optionalAuth, async (req, res) => {
  try {
    const { nodeType, methodName } = req.params;
    const { nodeId, config, credentials } = req.body;

    if (!nodeId) {
      return res.status(400).json({
        success: false,
        error: 'Node ID is required'
      });
    }

    // Create a mock node for loadOptions context
    const mockNode: any = {
      id: nodeId,
      type: nodeType,
      data: {
        config: config || {},
        credentials: credentials || {}
      }
    };

    // Create loadOptions context
    const loadOptionsContext = N8nExecutionAdapter.createLoadOptionsFunctions(mockNode, config || {});

    // Load options
    const options = await loadOptionsHandler.loadOptions(nodeType, methodName, loadOptionsContext);

    logger.info('Load options completed', {
      nodeType,
      methodName,
      optionsCount: options.length,
      userId: (req as any).user?.id
    });

    res.json({
      success: true,
      data: options,
      count: options.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Load options failed', error as Error, {
      nodeType: req.params.nodeType,
      methodName: req.params.methodName,
      userId: (req as any).user?.id
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to load options'
    });
  }
});

// GET /api/workflows/nodes/test/all - Test all registered nodes (health check)
router.get('/test/all', optionalAuth, async (req, res) => {
  try {
    const allNodes = nodeRegistry.getAllNodeDefinitions();
    const testResults = [];
    
    for (const node of allNodes) {
      try {
        // Just verify the node executor exists
        const executor = nodeRegistry.getNodeExecutor(node.id);
        testResults.push({
          nodeId: node.id,
          nodeType: node.type,
          category: node.category,
          status: executor ? 'available' : 'missing_executor',
          hasExecutor: !!executor
        });
      } catch (error: any) {
        testResults.push({
          nodeId: node.id,
          nodeType: node.type,
          category: node.category,
          status: 'error',
          error: error.message
        });
      }
    }

    const available = testResults.filter(r => r.status === 'available').length;
    const errors = testResults.filter(r => r.status === 'error').length;
    const missing = testResults.filter(r => r.status === 'missing_executor').length;

    res.json({
      success: true,
      data: {
        total: allNodes.length,
        available,
        errors,
        missing,
        results: testResults
      },
      summary: {
        totalNodes: allNodes.length,
        availableNodes: available,
        errorNodes: errors,
        missingExecutors: missing,
        health: errors === 0 && missing === 0 ? 'healthy' : 'degraded'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to test all nodes', error as Error, {
      userId: (req as any).user?.id
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test all nodes'
    });
  }
});

export default router;
