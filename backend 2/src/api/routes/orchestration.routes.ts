import express from 'express';
import { orchestrationService } from '../../services/orchestration.service';
import { agentOrchestrator } from '../../core/orchestration/agent-orchestrator';
import { workflowManager } from '../../core/orchestration/workflow-manager';
import { coordinationService } from '../../core/orchestration/coordination-service';
const logger = require("../../utils/logger");

const router = express.Router();

// Orchestration Management
router.post('/workflow', async (req, res) => {
  try {
    const { workflow, input, options } = req.body;
    
    if (!workflow || !input) {
      return res.status(400).json({
        success: false,
        error: 'Workflow and input are required'
      });
    }

    const result = await orchestrationService.orchestrateWorkflow(workflow, input, options);
    
    res.json({
      success: true,
      result
    });
  } catch (error: any) {
    logger.error('Failed to orchestrate workflow', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/multi-agent-task', async (req, res) => {
  try {
    const { taskData, agents, options } = req.body;
    
    if (!taskData || !agents || !Array.isArray(agents)) {
      return res.status(400).json({
        success: false,
        error: 'Task data and agents array are required'
      });
    }

    const result = await orchestrationService.orchestrateMultiAgentTask(taskData, agents, options);
    
    res.json({
      success: true,
      result
    });
  } catch (error: any) {
    logger.error('Failed to orchestrate multi-agent task', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Agent Management
router.post('/agents', async (req, res) => {
  try {
    const { id, name, type, capabilities, maxWorkload, preferences } = req.body;
    
    if (!id || !name || !capabilities) {
      return res.status(400).json({
        success: false,
        error: 'Agent id, name, and capabilities are required'
      });
    }

    const agent = {
      id,
      name,
      type: type || 'secondary',
      capabilities,
      status: 'idle' as const,
      workload: 0,
      maxWorkload: maxWorkload || 5,
      preferences: preferences || {
        taskTypes: [],
        priority: 5,
        availability: []
      },
      metadata: {
        created: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        performance: {
          tasksCompleted: 0,
          successRate: 1.0,
          averageExecutionTime: 0
        }
      }
    };

    agentOrchestrator.registerAgent(agent);
    coordinationService.registerAgent(id, capabilities);
    
    res.json({
      success: true,
      message: 'Agent registered successfully',
      agent
    });
  } catch (error: any) {
    logger.error('Failed to register agent', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/agents', (req, res) => {
  try {
    const agents = agentOrchestrator.getAgents();
    
    res.json({
      success: true,
      agents
    });
  } catch (error: any) {
    logger.error('Failed to get agents', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/agents/:id', (req, res) => {
  try {
    const { id } = req.params;
    const performance = agentOrchestrator.getAgentPerformance(id);
    
    if (!performance) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }
    
    res.json({
      success: true,
      performance
    });
  } catch (error: any) {
    logger.error('Failed to get agent performance', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/agents/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, currentTask } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    agentOrchestrator.updateAgentStatus(id, status, currentTask);
    coordinationService.updateAgentStatus(id, status, currentTask);
    
    res.json({
      success: true,
      message: 'Agent status updated successfully'
    });
  } catch (error: any) {
    logger.error('Failed to update agent status', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/agents/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    agentOrchestrator.unregisterAgent(id);
    coordinationService.unregisterAgent(id);
    
    res.json({
      success: true,
      message: 'Agent unregistered successfully'
    });
  } catch (error: any) {
    logger.error('Failed to unregister agent', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Task Management
router.post('/tasks', (req, res) => {
  try {
    const { name, description, type, priority, requirements, dependencies, estimatedDuration, deadline, metadata } = req.body;
    
    if (!name || !description || !type) {
      return res.status(400).json({
        success: false,
        error: 'Task name, description, and type are required'
      });
    }

    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      type,
      priority: priority || 5,
      requirements: requirements || [],
      dependencies: dependencies || [],
      estimatedDuration: estimatedDuration || 60000, // 1 minute default
      status: 'pending' as const,
      deadline,
      metadata: metadata || {}
    };

    const taskId = agentOrchestrator.submitTask(task);
    
    res.json({
      success: true,
      message: 'Task submitted successfully',
      taskId,
      task
    });
  } catch (error: any) {
    logger.error('Failed to submit task', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/tasks', (req, res) => {
  try {
    const tasks = agentOrchestrator.getTasks();
    const activeTasks = agentOrchestrator.getActiveTasks();
    const taskQueue = agentOrchestrator.getTaskQueue();
    
    res.json({
      success: true,
      tasks,
      activeTasks,
      taskQueue
    });
  } catch (error: any) {
    logger.error('Failed to get tasks', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/tasks/:id/assign', (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;
    
    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'Agent ID is required'
      });
    }

    const success = agentOrchestrator.assignTask(id, agentId);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to assign task to agent'
      });
    }
    
    res.json({
      success: true,
      message: 'Task assigned successfully'
    });
  } catch (error: any) {
    logger.error('Failed to assign task', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/tasks/:id/complete', (req, res) => {
  try {
    const { id } = req.params;
    const { result } = req.body;
    
    agentOrchestrator.completeTask(id, result);
    
    res.json({
      success: true,
      message: 'Task completed successfully'
    });
  } catch (error: any) {
    logger.error('Failed to complete task', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/tasks/:id/fail', (req, res) => {
  try {
    const { id } = req.params;
    const { error: errorMessage } = req.body;
    
    agentOrchestrator.failTask(id, errorMessage);
    
    res.json({
      success: true,
      message: 'Task failed successfully'
    });
  } catch (error: any) {
    logger.error('Failed to fail task', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Workflow Management
router.post('/workflows', (req, res) => {
  try {
    const { workflow } = req.body;
    
    if (!workflow || !workflow.id || !workflow.nodes) {
      return res.status(400).json({
        success: false,
        error: 'Valid workflow object is required'
      });
    }

    workflowManager.registerWorkflow(workflow);
    
    res.json({
      success: true,
      message: 'Workflow registered successfully',
      workflowId: workflow.id
    });
  } catch (error: any) {
    logger.error('Failed to register workflow', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/workflows', (req, res) => {
  try {
    const workflows = workflowManager.getWorkflows();
    
    res.json({
      success: true,
      workflows
    });
  } catch (error: any) {
    logger.error('Failed to get workflows', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/workflows/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { input, options } = req.body;
    
    if (!input) {
      return res.status(400).json({
        success: false,
        error: 'Input is required'
      });
    }

    const result = await workflowManager.executeWorkflow(id, input, options);
    
    res.json({
      success: true,
      result
    });
  } catch (error: any) {
    logger.error('Failed to execute workflow', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/workflows/:id/schedule', (req, res) => {
  try {
    const { id } = req.params;
    const { input, scheduleTime, options } = req.body;
    
    if (!input || !scheduleTime) {
      return res.status(400).json({
        success: false,
        error: 'Input and schedule time are required'
      });
    }

    const scheduleDate = new Date(scheduleTime);
    if (isNaN(scheduleDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid schedule time format'
      });
    }

    const planId = workflowManager.scheduleWorkflow(id, input, scheduleDate, options);
    
    res.json({
      success: true,
      message: 'Workflow scheduled successfully',
      planId
    });
  } catch (error: any) {
    logger.error('Failed to schedule workflow', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Coordination
router.post('/coordination/message', (req, res) => {
  try {
    const { type, from, to, payload, priority, ttl } = req.body;
    
    if (!type || !from || !to || !Array.isArray(to)) {
      return res.status(400).json({
        success: false,
        error: 'Message type, from, and to array are required'
      });
    }

    const messageId = coordinationService.sendMessage({
      type,
      from,
      to,
      payload,
      priority: priority || 5,
      ttl: ttl || 300000
    });
    
    res.json({
      success: true,
      messageId
    });
  } catch (error: any) {
    logger.error('Failed to send coordination message', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/coordination/broadcast', (req, res) => {
  try {
    const { type, from, payload, priority, ttl, targetAgents } = req.body;
    
    if (!type || !from) {
      return res.status(400).json({
        success: false,
        error: 'Message type and from are required'
      });
    }

    const messageIds = coordinationService.broadcastMessage({
      type,
      from,
      payload,
      priority: priority || 5,
      ttl: ttl || 300000
    }, targetAgents);
    
    res.json({
      success: true,
      messageIds
    });
  } catch (error: any) {
    logger.error('Failed to broadcast coordination message', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// System Status
router.get('/status', (req, res) => {
  try {
    const orchestrationStatus = orchestrationService.getOrchestrationStatus();
    const agentStatus = agentOrchestrator.getSystemStatus();
    const workflowStatus = workflowManager.getSystemStatus();
    const coordinationStatus = coordinationService.getCoordinationStatus();
    
    res.json({
      success: true,
      orchestration: orchestrationStatus,
      agents: agentStatus,
      workflows: workflowStatus,
      coordination: coordinationStatus
    });
  } catch (error: any) {
    logger.error('Failed to get system status', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const history = orchestrationService.getOrchestrationHistory(limit);
    
    res.json({
      success: true,
      history
    });
  } catch (error: any) {
    logger.error('Failed to get orchestration history', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Configuration
router.get('/config', (req, res) => {
  try {
    const orchestrationConfig = orchestrationService.getConfig();
    const agentConfig = agentOrchestrator.getConfig();
    const workflowConfig = workflowManager.getConfig();
    const coordinationConfig = coordinationService.getConfig();
    
    res.json({
      success: true,
      orchestration: orchestrationConfig,
      agents: agentConfig,
      workflows: workflowConfig,
      coordination: coordinationConfig
    });
  } catch (error: any) {
    logger.error('Failed to get configuration', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/config', (req, res) => {
  try {
    const { orchestration, agents, workflows, coordination } = req.body;
    
    if (orchestration) {
      orchestrationService.updateConfig(orchestration);
    }
    if (agents) {
      agentOrchestrator.updateConfig(agents);
    }
    if (workflows) {
      workflowManager.updateConfig(workflows);
    }
    if (coordination) {
      coordinationService.updateConfig(coordination);
    }
    
    res.json({
      success: true,
      message: 'Configuration updated successfully'
    });
  } catch (error: any) {
    logger.error('Failed to update configuration', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
