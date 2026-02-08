import express from 'express';
import { ExecutionController } from '../controllers/executions.controller';
import { optionalAuth, authenticateToken } from '../middlewares/auth.middleware';
import { asyncHandler } from '../../utils/error-handler';
import { validateQuery, commonSchemas } from '../../utils/validators';

const router = express.Router();
const executionController = new ExecutionController();

// Execution management routes
// Use authenticateToken to ensure users only see their own executions
router.get('/', authenticateToken, validateQuery(commonSchemas.pagination), asyncHandler(executionController.listExecutions.bind(executionController)));

// User statistics endpoint (requires authentication)
// IMPORTANT: This must be defined BEFORE /:id route to avoid route conflicts
router.get('/stats/user', authenticateToken, asyncHandler(executionController.getUserStats.bind(executionController)));

// Execution events (for SSE) - also before /:id to avoid conflicts
router.get('/:id/events', optionalAuth, asyncHandler(executionController.getExecutionEvents.bind(executionController)));

// Individual execution routes (must be last to avoid matching other routes)
router.get('/:id', optionalAuth, asyncHandler(executionController.getExecution.bind(executionController)));
router.post('/:id/retry', optionalAuth, asyncHandler(executionController.retryExecution.bind(executionController)));
router.delete('/:id', optionalAuth, asyncHandler(executionController.cancelExecution.bind(executionController)));

export default router;
