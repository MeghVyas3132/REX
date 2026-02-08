import express from 'express';
import { AuditLogsController } from '../controllers/audit-logs.controller';
import { authenticateToken, optionalAuth } from '../middlewares/auth.middleware';
import { asyncHandler } from '../../utils/error-handler';

const router = express.Router();
const auditLogsController = new AuditLogsController();

/**
 * POST /api/email-logs
 * Create email-specific audit log entry
 * Used by email automation workflow (public endpoint for workflow nodes)
 * Can also be used standalone by authenticated users
 */
router.post(
  '/',
  optionalAuth,
  asyncHandler(auditLogsController.createEmailLog.bind(auditLogsController))
);

/**
 * GET /api/email-logs
 * List email logs with pagination and filters (requires auth)
 */
router.get(
  '/',
  authenticateToken,
  asyncHandler(auditLogsController.listAuditLogs.bind(auditLogsController))
);

/**
 * GET /api/email-logs/:id
 * Get email log by ID (requires auth)
 */
router.get(
  '/:id',
  authenticateToken,
  asyncHandler(auditLogsController.getAuditLog.bind(auditLogsController))
);

export default router;

