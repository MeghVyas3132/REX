import express from 'express';
import { EmailDataController } from '../controllers/email-data.controller';
import { authenticateToken, optionalAuth } from '../middlewares/auth.middleware';
import { asyncHandler } from '../../utils/error-handler';

const router = express.Router();
const emailDataController = new EmailDataController();

/**
 * GET /api/email-data?eventId={eventId}
 * Get email data by eventId (public endpoint, but auth recommended)
 * Used by workflow nodes to fetch email data
 */
router.get(
  '/',
  optionalAuth,
  asyncHandler(emailDataController.getEmailData.bind(emailDataController))
);

/**
 * POST /api/email-data
 * Create new email data entry (requires auth)
 */
router.post(
  '/',
  authenticateToken,
  asyncHandler(emailDataController.createEmailData.bind(emailDataController))
);

/**
 * GET /api/email-data/list
 * List email data entries with pagination (requires auth)
 */
router.get(
  '/list',
  authenticateToken,
  asyncHandler(emailDataController.listEmailData.bind(emailDataController))
);

/**
 * PUT /api/email-data/:id
 * Update email data entry (requires auth)
 */
router.put(
  '/:id',
  authenticateToken,
  asyncHandler(emailDataController.updateEmailData.bind(emailDataController))
);

/**
 * DELETE /api/email-data/:id
 * Delete email data entry (requires auth)
 */
router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(emailDataController.deleteEmailData.bind(emailDataController))
);

export default router;

