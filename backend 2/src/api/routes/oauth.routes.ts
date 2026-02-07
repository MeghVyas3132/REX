import { Router } from 'express';
import { OAuthController } from '../controllers/oauth.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateBody, validateQuery } from '../middlewares/validation.middleware';
import { z } from 'zod';

const router = Router();
const oauthController = new OAuthController();

// Google OAuth routes
router.get('/google', authenticateToken, async (req, res) => {
  await oauthController.initiateGoogleAuth(req, res);
});

router.get('/google/callback', async (req, res) => {
  await oauthController.handleGoogleCallback(req, res);
});

router.post('/google/refresh', authenticateToken, async (req, res) => {
  await oauthController.refreshGoogleTokens(req, res);
});

// Microsoft OAuth routes
router.get('/microsoft', authenticateToken, async (req, res) => {
  await oauthController.initiateMicrosoftAuth(req, res);
});

router.get('/microsoft/callback', async (req, res) => {
  await oauthController.handleMicrosoftCallback(req, res);
});

// Generic OAuth routes
router.get('/token', authenticateToken, async (req, res) => {
  await oauthController.getAccessToken(req, res);
});

router.get('/status', authenticateToken, async (req, res) => {
  await oauthController.getConnectionStatus(req, res);
});

router.post('/revoke', authenticateToken, validateBody(z.object({
  provider: z.string().optional()
})), async (req, res) => {
  await oauthController.revokeConnection(req, res);
});

router.get('/connections', authenticateToken, async (req, res) => {
  await oauthController.listConnections(req, res);
});

export default router;
