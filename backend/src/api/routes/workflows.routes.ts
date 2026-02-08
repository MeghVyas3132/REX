import express from 'express';
import { WorkflowController } from '../controllers/workflows.controller';
import { authenticateToken, optionalAuth } from '../middlewares/auth.middleware';
import { asyncHandler } from '../../utils/error-handler';
import { workflowSchemas, validateBody, validateQuery, commonSchemas } from '../../utils/validators';
import { enforceIdempotency } from '../../utils/idempotency';

const router = express.Router();
const workflowController = new WorkflowController();

// Workflow CRUD routes (scoped to authenticated user when available)
router.get('/', authenticateToken, validateQuery(commonSchemas.pagination), asyncHandler(workflowController.listWorkflows.bind(workflowController)));
router.get('/:id', authenticateToken, asyncHandler(workflowController.getWorkflow.bind(workflowController)));
// Allow unauthenticated users to create/update workflows so editor can save configs before login
router.post('/', optionalAuth, validateBody(workflowSchemas.create), asyncHandler(workflowController.createWorkflow.bind(workflowController)));
router.put('/:id', optionalAuth, validateBody(workflowSchemas.update), asyncHandler(workflowController.updateWorkflow.bind(workflowController)));
router.delete('/:id', authenticateToken, asyncHandler(workflowController.deleteWorkflow.bind(workflowController)));

// Workflow execution routes
router.post('/:id/run', optionalAuth, validateBody(workflowSchemas.run), enforceIdempotency(), asyncHandler(workflowController.runWorkflow.bind(workflowController)));
router.get('/:id/runs', optionalAuth, asyncHandler(workflowController.listWorkflowRuns.bind(workflowController)));

// Schedule management routes
router.post('/schedules/stop-all', optionalAuth, asyncHandler(workflowController.stopAllScheduledWorkflows.bind(workflowController)));
router.post('/:id/schedule/stop', optionalAuth, asyncHandler(workflowController.stopScheduledWorkflow.bind(workflowController)));
router.get('/schedules', optionalAuth, asyncHandler(workflowController.listScheduledWorkflows.bind(workflowController)));

// Test workflow creation with nodes
router.post('/test', asyncHandler(workflowController.createTestWorkflow.bind(workflowController)));

// Test workflow execution endpoint (executes without persisting)
router.post('/test/execute', optionalAuth, asyncHandler(workflowController.executeTestWorkflow.bind(workflowController)));

// Direct workflow execution endpoint (for frontend compatibility)
// Use authenticateToken to ensure we always have userId when user is logged in
router.post('/run-workflow', authenticateToken, asyncHandler(workflowController.runWorkflowDirect.bind(workflowController)));

// SSE endpoint for real-time updates
router.get('/runs/stream', optionalAuth, asyncHandler(workflowController.streamWorkflowRun.bind(workflowController)));

// Stop/cancel running workflow execution
router.post('/runs/:runId/stop', optionalAuth, asyncHandler(workflowController.stopWorkflowExecution.bind(workflowController)));

// Note: Node execution endpoints are handled by /api/workflows/nodes routes
// (See workflow-nodes.routes.ts for better direct node registry execution)

export default router;
