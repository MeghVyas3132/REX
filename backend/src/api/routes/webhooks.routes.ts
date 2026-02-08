import express from 'express';
import { WebhookController } from '../controllers/webhooks.controller';
import { authenticateToken, optionalAuth } from '../middlewares/auth.middleware';
import { asyncHandler } from '../../utils/error-handler';
import { validateQuery, commonSchemas } from '../../utils/validators';

const router = express.Router();
const webhookController = new WebhookController();

// Webhook CRUD routes
router.get('/', optionalAuth, validateQuery(commonSchemas.pagination), asyncHandler(webhookController.listWebhooks.bind(webhookController)));
router.get('/:id', optionalAuth, asyncHandler(webhookController.getWebhook.bind(webhookController)));
router.post('/', authenticateToken, asyncHandler(webhookController.createWebhook.bind(webhookController)));
router.put('/:id', authenticateToken, asyncHandler(webhookController.updateWebhook.bind(webhookController)));
router.delete('/:id', authenticateToken, asyncHandler(webhookController.deleteWebhook.bind(webhookController)));

// Webhook execution routes
router.post('/:id/test', optionalAuth, asyncHandler(webhookController.testWebhook.bind(webhookController)));
router.get('/:id/events', optionalAuth, asyncHandler(webhookController.getWebhookEvents.bind(webhookController)));

// Public webhook endpoint (no auth required)
router.post('/:id/trigger', asyncHandler(webhookController.triggerWebhook.bind(webhookController)));

export default router;
