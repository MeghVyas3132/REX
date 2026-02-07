import { Request, Response } from 'express';
import { nodeRegistry } from '../../core/registry/node-registry';
import { logger } from "../../utils/logger";

export class NodesController {
  constructor() {
    // nodeRegistry is already initialized as singleton
  }

  // GET /api/nodes - Get all available nodes
  async getAllNodes(req: Request, res: Response) {
    try {
      const nodes = nodeRegistry.getAllNodeDefinitions();
      
      res.json({
        success: true,
        data: nodes,
        count: nodes.length
      });
    } catch (error) {
      logger.error('Error fetching nodes:', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch nodes'
      });
    }
  }

  // GET /api/nodes/categories - Get nodes grouped by category
  async getNodesByCategory(req: Request, res: Response) {
    try {
      const nodes = nodeRegistry.getAllNodeDefinitions();
      const categorized = nodes.reduce((acc, node) => {
        const category = node.category || 'other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(node);
        return acc;
      }, {} as Record<string, any[]>);

      res.json({
        success: true,
        data: categorized
      });
    } catch (error) {
      logger.error('Error fetching nodes by category:', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch nodes by category'
      });
    }
  }

  // GET /api/nodes/:id - Get specific node definition
  async getNode(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Node ID is required'
        });
        return;
      }

      const node = nodeRegistry.getNodeDefinition(id);
      
      if (!node) {
        res.status(404).json({
          success: false,
          error: 'Node not found'
        });
        return;
      }

      res.json({
        success: true,
        data: node
      });
    } catch (error) {
      logger.error('Error fetching node:', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch node'
      });
    }
  }

  // POST /api/nodes/validate - Validate node configuration
  async validateNode(req: Request, res: Response): Promise<void> {
    try {
      const { nodeId, config } = req.body;
      
      if (!nodeId || !config) {
        res.status(400).json({
          success: false,
          error: 'nodeId and config are required'
        });
        return;
      }

      const node = nodeRegistry.getNodeDefinition(nodeId);
      if (!node) {
        res.status(404).json({
          success: false,
          error: 'Node not found'
        });
        return;
      }

      // Validate configuration against node schema
      const validation = nodeRegistry.validateNodeConfig(nodeId, config);
      
      res.json({
        success: true,
        data: {
          isValid: validation.valid,
          errors: validation.errors
        }
      });
    } catch (error) {
      logger.error('Error validating node:', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate node configuration'
      });
    }
  }

  // GET /api/nodes/search - Search nodes
  async searchNodes(req: Request, res: Response) {
    try {
      const { q, category, type } = req.query;
      let nodes = nodeRegistry.getAllNodeDefinitions();

      // Filter by search query
      if (q) {
        const query = (q as string).toLowerCase();
        nodes = nodes.filter(node => 
          node.name.toLowerCase().includes(query) ||
          node.description?.toLowerCase().includes(query) ||
          node.id.toLowerCase().includes(query)
        );
      }

      // Filter by category
      if (category) {
        nodes = nodes.filter(node => node.category === category);
      }

      // Filter by type
      if (type) {
        nodes = nodes.filter(node => node.type === type);
      }

      res.json({
        success: true,
        data: nodes,
        count: nodes.length
      });
    } catch (error) {
      logger.error('Error searching nodes:', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to search nodes'
      });
    }
  }

  // GET /api/nodes/categories - Get available categories
  async getCategories(req: Request, res: Response) {
    try {
      const nodes = nodeRegistry.getAllNodeDefinitions();
      const categories = nodeRegistry.getCategories();
      
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('Error fetching categories:', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch categories'
      });
    }
  }
}
