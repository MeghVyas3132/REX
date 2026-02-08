import express from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken, rateLimit } from '../middlewares/auth.middleware';

const router = express.Router();
const authController = new AuthController();

// Apply rate limiting to auth routes (increased for development)
router.use(rateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 minutes (was 10)

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  await authController.register(req, res);
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  await authController.login(req, res);
});

/**
 * GET /api/auth/profile
 * Get current user profile (requires authentication)
 */
router.get('/profile', authenticateToken, async (req, res) => {
  await authController.getProfile(req, res);
});

/**
 * PUT /api/auth/profile
 * Update user profile (requires authentication)
 */
router.put('/profile', authenticateToken, async (req, res) => {
  await authController.updateProfile(req, res);
});

/**
 * POST /api/auth/change-password
 * Change user password (requires authentication)
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  await authController.changePassword(req, res);
});

/**
 * POST /api/auth/logout
 * Logout user (requires authentication)
 */
router.post('/logout', authenticateToken, async (req, res) => {
  await authController.logout(req, res);
});

/**
 * GET /api/auth/verify
 * Verify token and get user info
 */
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user,
        valid: true
      },
      message: 'Token is valid',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: 'Token verification failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token using refresh token
 */
router.post('/refresh', async (req, res) => {
  await authController.refreshToken(req, res);
});

export default router;