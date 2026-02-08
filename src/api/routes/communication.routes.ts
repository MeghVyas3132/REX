import { Router } from 'express';
import { optionalAuth } from '../middlewares/auth.middleware';
import { nodeRegistry } from '@rex/nodes';
import { logger } from '../../utils/logger';

const router = Router();

// GET /api/communication - Get all communication nodes
router.get('/', optionalAuth, async (req, res) => {
  try {
    const allNodes = nodeRegistry.getAllNodeDefinitions();
    const communicationNodes = allNodes.filter(node => node.category === 'communication');

    res.json({
      success: true,
      data: communicationNodes.map(node => ({
        id: node.id,
        name: node.name,
        description: node.description,
        category: node.category,
        configSchema: node.configSchema
      })),
      count: communicationNodes.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch communication nodes'
    });
  }
});

// POST /api/communication/:nodeType/execute - Execute a communication node
router.post('/:nodeType/execute', optionalAuth, async (req, res) => {
  try {
    const { nodeType } = req.params;
    const { config, input } = req.body;

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Node configuration is required'
      });
    }

    // Get node executor
    const executor = nodeRegistry.getNodeExecutor(nodeType);
    if (!executor) {
      return res.status(404).json({
        success: false,
        error: `Communication node type '${nodeType}' not found`
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

    // Create workflow node
    const node: any = {
      id: `temp_${Date.now()}`,
      type: 'action',
      position: { x: 0, y: 0 },
      data: {
        config,
        subtype: nodeType
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

    // Execute node
    const result = await nodeRegistry.executeNode(nodeType, node, context);

    logger.info('Communication node executed', {
      nodeType,
      success: result.success,
      runId: context.runId
    });

    res.json({
      success: result.success,
      data: result.output,
      error: result.error,
      duration: result.duration
    });
  } catch (error: any) {
    logger.error('Communication node execution failed', error, {
      nodeType: req.params.nodeType
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute communication node'
    });
  }
});

// POST /api/communication/:nodeType/test - Test a communication node configuration
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

    // Get node definition
    const nodeDef = nodeRegistry.getNodeDefinition(nodeType);
    if (!nodeDef) {
      return res.status(404).json({
        success: false,
        error: `Communication node type '${nodeType}' not found`
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

    res.json({
      success: true,
      message: `Configuration for ${nodeType} is valid`,
      nodeType,
      config
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test communication node configuration'
    });
  }
});

// Specific endpoints for each communication node

// Microsoft Teams
router.post('/microsoft-teams/test', optionalAuth, async (req, res) => {
  try {
    const { config } = req.body;
    
    const authType = config?.authType || 'accessToken';
    if (authType === 'accessToken' && !config?.accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token is required for access token authentication'
      });
    }
    if (authType === 'clientCredentials' && (!config?.tenantId || !config?.clientId || !config?.clientSecret)) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID, Client ID, and Client Secret are required for client credentials authentication'
      });
    }

    res.json({
      success: true,
      message: 'Microsoft Teams configuration is valid',
      nodeType: 'microsoft-teams'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test Microsoft Teams configuration'
    });
  }
});

// Zoom
router.post('/zoom/test', optionalAuth, async (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config?.clientId || !config?.clientSecret) {
      return res.status(400).json({
        success: false,
        error: 'Client ID/API Key and Client Secret/API Secret are required'
      });
    }

    const authType = config?.authType || 'oauth';
    if (authType === 'oauth' && !config?.accountId) {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required for OAuth authentication'
      });
    }

    res.json({
      success: true,
      message: 'Zoom configuration is valid',
      nodeType: 'zoom'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test Zoom configuration'
    });
  }
});

// WeChat
router.post('/wechat/test', optionalAuth, async (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config?.appId || !config?.appSecret) {
      return res.status(400).json({
        success: false,
        error: 'App ID and secret are required'
      });
    }

    res.json({
      success: true,
      message: 'WeChat configuration is valid',
      nodeType: 'wechat'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test WeChat configuration'
    });
  }
});

// Instagram
router.post('/instagram/test', optionalAuth, async (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config?.accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token is required'
      });
    }

    res.json({
      success: true,
      message: 'Instagram configuration is valid',
      nodeType: 'instagram'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test Instagram configuration'
    });
  }
});

// Twitter DM
router.post('/twitter-dm/test', optionalAuth, async (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config?.apiKey || !config?.apiSecret || !config?.accessToken || !config?.accessTokenSecret) {
      return res.status(400).json({
        success: false,
        error: 'API key, secret, access token, and access token secret are required'
      });
    }

    res.json({
      success: true,
      message: 'Twitter DM configuration is valid',
      nodeType: 'twitter-dm'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test Twitter DM configuration'
    });
  }
});

// LinkedIn Message
router.post('/linkedin-message/test', optionalAuth, async (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config?.accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token is required'
      });
    }

    res.json({
      success: true,
      message: 'LinkedIn Message configuration is valid',
      nodeType: 'linkedin-message'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test LinkedIn Message configuration'
    });
  }
});

export default router;

