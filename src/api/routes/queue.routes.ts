import express from 'express';
import { queueService } from '../../core/queue/queue';
const logger = require('../../utils/logger');

const router = express.Router();

/**
 * POST /api/queue/create-user
 * Create a user in database
 */
router.post('/create-user', async (req, res) => {
  try {
    const { email, name = 'Default User' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const { db } = require('../../db/database');
    const user = await db.createUser(email, 'default-password-hash');
    
    res.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        message: 'User created successfully'
      }
    });
  } catch (error: any) {
    logger.error('Failed to create user', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      message: error.message
    });
  }
});

/**
 * POST /api/queue/create-workflow
 * Create and save a workflow to database
 */
router.post('/create-workflow', async (req, res) => {
  try {
    const { workflow, userId = 'default-user' } = req.body;

    if (!workflow || !workflow.nodes) {
      return res.status(400).json({
        success: false,
        error: 'Valid workflow with nodes is required'
      });
    }

    const { db } = require('../../db/database');
    const savedWorkflow = await db.createWorkflow(
      userId,
      workflow.name || 'Unnamed Workflow',
      workflow.description || '',
      workflow.nodes || [],
      workflow.edges || []
    );

    logger.info('Workflow created and saved', {
      workflowId: savedWorkflow.id,
      name: savedWorkflow.name,
      nodeCount: workflow.nodes?.length || 0,
      userId
    });

    res.json({
      success: true,
      data: {
        workflowId: savedWorkflow.id,
        workflow: savedWorkflow,
        message: 'Workflow created and saved successfully'
      }
    });
  } catch (error: any) {
    logger.error('Failed to create workflow', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create workflow',
      message: error.message
    });
  }
});

/**
 * GET /api/queue/workflows
 * Get all saved workflows
 */
router.get('/workflows', async (req, res) => {
  try {
    const { db } = require('../../db/database');
    const workflows = await db.getAllWorkflows();
    
    res.json({
      success: true,
      data: {
        workflows,
        count: workflows.length
      }
    });
  } catch (error: any) {
    logger.error('Failed to get workflows', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get workflows',
      message: error.message
    });
  }
});

/**
 * GET /api/queue/stats
 * Get queue statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await queueService.getQueueStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Failed to get queue stats', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get queue statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/queue/workflow
 * Add workflow job to queue
 */
router.post('/workflow', async (req, res) => {
  try {
    const { workflowId, executionId, input, userId, priority = 1, delay = 0, workflow } = req.body;

    if (!workflowId && !workflow) {
      return res.status(400).json({
        success: false,
        error: 'Either workflowId or workflow data is required'
      });
    }

    // If only workflow data provided, use it directly
    let finalWorkflowId = workflowId;
    if (workflow && !workflowId) {
      finalWorkflowId = workflow.id || `temp_${Date.now()}`;
    }

    // If workflowId provided, fetch workflow from database
    let workflowData = workflow;
    if (workflowId && !workflow) {
      const { db } = require('../../db/database');
      workflowData = await db.getWorkflowById(workflowId);
      if (!workflowData) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
      }
    }

    // If workflow data is provided but not saved, save it to database first
    if (workflow && !workflowId) {
      try {
        const { db } = require('../../db/database');
        const savedWorkflow = await db.createWorkflow(
          'default-user', // Default user ID for now
          workflow.name || 'Unnamed Workflow',
          workflow.description || '',
          workflow.nodes || [],
          workflow.edges || []
        );
        
        finalWorkflowId = savedWorkflow.id;
        workflowData = savedWorkflow;
        
        logger.info('Workflow saved to database', {
          workflowId: finalWorkflowId,
          name: workflow.name,
          nodeCount: workflow.nodes?.length || 0
        });
      } catch (error: any) {
        logger.error('Failed to save workflow to database', error);
        // Continue with execution even if save fails
      }
    }

    const job = await queueService.addJob('workflow', {
      type: 'workflow_execution',
      workflowId: finalWorkflowId,
      executionId,
      input,
      userId,
      priority,
      delay,
      workflowData: workflowData // Pass the complete workflow data
    });

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: 'queued',
        queue: 'workflow'
      },
      message: 'Workflow job added to queue'
    });
  } catch (error: any) {
    logger.error('Failed to add workflow job', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add workflow job',
      message: error.message
    });
  }
});

/**
 * POST /api/queue/agent
 * Add agent job to queue
 */
router.post('/agent', async (req, res) => {
  try {
    const { type, input, priority = 2, delay = 0 } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Job type is required'
      });
    }

    const job = await queueService.addJob('agent', {
      type,
      input,
      priority,
      delay
    });

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: 'queued',
        queue: 'agent'
      },
      message: 'Agent job added to queue'
    });
  } catch (error: any) {
    logger.error('Failed to add agent job', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add agent job',
      message: error.message
    });
  }
});

/**
 * POST /api/queue/webhook
 * Add webhook job to queue
 */
router.post('/webhook', async (req, res) => {
  try {
    const { type, input, priority = 3, delay = 0 } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Job type is required'
      });
    }

    const job = await queueService.addJob('webhook', {
      type,
      input,
      priority,
      delay
    });

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: 'queued',
        queue: 'webhook'
      },
      message: 'Webhook job added to queue'
    });
  } catch (error: any) {
    logger.error('Failed to add webhook job', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add webhook job',
      message: error.message
    });
  }
});

/**
 * POST /api/queue/email
 * Add email job to queue
 */
router.post('/email', async (req, res) => {
  try {
    const { type, input, priority = 5, delay = 0 } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Job type is required'
      });
    }

    const job = await queueService.addJob('email', {
      type,
      input,
      priority,
      delay
    });

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: 'queued',
        queue: 'email'
      },
      message: 'Email job added to queue'
    });
  } catch (error: any) {
    logger.error('Failed to add email job', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add email job',
      message: error.message
    });
  }
});

/**
 * POST /api/queue/notification
 * Add notification job to queue
 */
router.post('/notification', async (req, res) => {
  try {
    const { type, input, priority = 6, delay = 0 } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Job type is required'
      });
    }

    const job = await queueService.addJob('notification', {
      type,
      input,
      priority,
      delay
    });

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: 'queued',
        queue: 'notification'
      },
      message: 'Notification job added to queue'
    });
  } catch (error: any) {
    logger.error('Failed to add notification job', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add notification job',
      message: error.message
    });
  }
});

/**
 * POST /api/queue/:queueName/pause
 * Pause a queue
 */
router.post('/:queueName/pause', async (req, res) => {
  try {
    const { queueName } = req.params;
    await queueService.pauseQueue(queueName);
    
    res.json({
      success: true,
      message: `Queue ${queueName} paused`
    });
  } catch (error: any) {
    logger.error(`Failed to pause queue ${req.params.queueName}`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause queue',
      message: error.message
    });
  }
});

/**
 * POST /api/queue/:queueName/resume
 * Resume a queue
 */
router.post('/:queueName/resume', async (req, res) => {
  try {
    const { queueName } = req.params;
    await queueService.resumeQueue(queueName);
    
    res.json({
      success: true,
      message: `Queue ${queueName} resumed`
    });
  } catch (error: any) {
    logger.error(`Failed to resume queue ${req.params.queueName}`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume queue',
      message: error.message
    });
  }
});

export default router;
