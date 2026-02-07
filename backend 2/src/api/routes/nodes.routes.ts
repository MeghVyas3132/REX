import { Router } from 'express';
import { NodesController } from '../controllers/nodes.controller';

const router = Router();
const nodesController = new NodesController();

// GET /api/nodes - Get all available nodes
router.get('/', (req, res) => nodesController.getAllNodes(req, res));

// GET /api/nodes/categories - Get nodes grouped by category
router.get('/categories', (req, res) => nodesController.getNodesByCategory(req, res));

// GET /api/nodes/search - Search nodes
router.get('/search', (req, res) => nodesController.searchNodes(req, res));

// GET /api/nodes/categories-list - Get available categories
router.get('/categories-list', (req, res) => nodesController.getCategories(req, res));

// GET /api/nodes/:id - Get specific node definition
router.get('/:id', (req, res) => nodesController.getNode(req, res));

// POST /api/nodes/validate - Validate node configuration
router.post('/validate', (req, res) => nodesController.validateNode(req, res));

export default router;
