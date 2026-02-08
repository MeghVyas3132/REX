import { Router } from 'express';
import { AnalyticsService } from '../../services/analytics.service';
import { authenticateToken } from '../middlewares/auth.middleware';
import { prisma } from '../../db/prisma';

const router = Router();
const analyticsService = new AnalyticsService(prisma);

// Public analytics endpoint
router.get('/overview', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        totalWorkflows: 0,
        totalExecutions: 0,
        successRate: 0,
        averageExecutionTime: 0,
        recentActivity: []
      },
      message: 'Analytics overview (public access)'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get analytics overview' });
  }
});

// Apply auth middleware to all other routes
router.use(authenticateToken);

// GET /api/analytics/dashboard - Get dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    const stats = await analyticsService.getDashboardStats(userId);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats',
    });
  }
});

// GET /api/analytics/workflows - Get workflow analytics
router.get('/workflows', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { workflowId } = req.query;
    
    const analytics = await analyticsService.getWorkflowAnalytics(
      userId, 
      workflowId as string
    );
    
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch workflow analytics',
    });
  }
});

// GET /api/analytics/:type/:entityId - Get analytics for specific entity
router.get('/:type/:entityId', async (req, res) => {
  try {
    const { type, entityId } = req.params;
    const userId = (req as any).user.id;
    
    const analytics = await analyticsService.getEntityAnalytics(entityId, type, userId);
    
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch entity analytics',
    });
  }
});

// POST /api/analytics/track - Track a custom metric
router.post('/track', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { type, entityId, metric, value, metadata } = req.body;
    
    if (!type || !entityId || !metric || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'type, entityId, metric, and value are required',
      });
    }
    
    const analytics = await analyticsService.trackMetric({
      type,
      entityId,
      metric,
      value,
      metadata,
      userId,
    });
    
    return res.status(201).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to track metric',
    });
  }
});

export default router;
