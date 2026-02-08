import express from 'express';
import { AuditLogsController } from '../controllers/audit-logs.controller';
import { authenticateToken, optionalAuth } from '../middlewares/auth.middleware';
import { asyncHandler } from '../../utils/error-handler';

const router = express.Router();
const auditLogsController = new AuditLogsController();

/**
 * POST /api/audit-logs
 * Create new audit log entry (public endpoint for workflow nodes)
 * Can also be used standalone by authenticated users
 */
router.post(
  '/',
  optionalAuth,
  asyncHandler(auditLogsController.createAuditLog.bind(auditLogsController))
);

/**
 * GET /api/audit-logs
 * List audit logs with pagination and filters (requires auth)
 */
router.get(
  '/',
  authenticateToken,
  asyncHandler(auditLogsController.listAuditLogs.bind(auditLogsController))
);

/**
 * GET /api/audit-logs/:id
 * Get audit log by ID (requires auth)
 */
router.get(
  '/:id',
  authenticateToken,
  asyncHandler(auditLogsController.getAuditLog.bind(auditLogsController))
);

/**
 * DELETE /api/audit-logs/:id
 * Delete audit log (requires auth)
 */
router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(auditLogsController.deleteAuditLog.bind(auditLogsController))
);

export default router;

