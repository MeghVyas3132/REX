import { Request, Response } from 'express';
import { orchestrationService } from '../../services/orchestration.service';
import { agentOrchestrator } from '../../core/orchestration/agent-orchestrator';
import { workflowManager } from '../../core/orchestration/workflow-manager';
import { coordinationService } from '../../core/orchestration/coordination-service';
const logger = require("../../utils/logger");

export class OrchestrationController {
  // Orchestration Management
  public async orchestrateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflow, input, options } = req.body;
      
      if (!workflow || !input) {
        res.status(400).json({
          success: false,
          error: 'Workflow and input are required'
        });
        return;
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
  }

  public async orchestrateMultiAgentTask(req: Request, res: Response): Promise<void> {
    try {
      const { taskData, agents, options } = req.body;
      
      if (!taskData || !agents || !Array.isArray(agents)) {
        res.status(400).json({
          success: false,
          error: 'Task data and agents array are required'
        });
        return;
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
  }

  // Agent Management
  public async registerAgent(req: Request, res: Response): Promise<void> {
    try {
      const { id, name, type, capabilities, maxWorkload, preferences } = req.body;
      
      if (!id || !name || !capabilities) {
        res.status(400).json({
          success: false,
          error: 'Agent id, name, and capabilities are required'
        });
        return;
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
  }

  public async getAgents(req: Request, res: Response): Promise<void> {
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
  }

  public async getAgentPerformance(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const performance = agentOrchestrator.getAgentPerformance(id as string);
      
      if (!performance) {
        res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
        return;
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
  }

  public async updateAgentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, currentTask } = req.body;
      
      if (!status) {
        res.status(400).json({
          success: false,
          error: 'Status is required'
        });
        return;
      }

      agentOrchestrator.updateAgentStatus(id as string, status, currentTask);
      coordinationService.updateAgentStatus(id as string, status, currentTask);
      
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
  }

  public async unregisterAgent(req: Request, res: Response): Promise<void> {
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
  }

  // Task Management
  public async submitTask(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, type, priority, requirements, dependencies, estimatedDuration, deadline, metadata } = req.body;
      
      if (!name || !description || !type) {
        res.status(400).json({
          success: false,
          error: 'Task name, description, and type are required'
        });
        return;
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
  }

  public async getTasks(req: Request, res: Response): Promise<void> {
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
  }

  public async assignTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { agentId } = req.body;
      
      if (!agentId) {
        res.status(400).json({
          success: false,
          error: 'Agent ID is required'
        });
        return;
      }

      const success = agentOrchestrator.assignTask(id, agentId);
      
      if (!success) {
        res.status(400).json({
          success: false,
          error: 'Failed to assign task to agent'
        });
        return;
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
  }

  public async completeTask(req: Request, res: Response): Promise<void> {
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
  }

  public async failTask(req: Request, res: Response): Promise<void> {
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
  }

  // Workflow Management
  public async registerWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflow } = req.body;
      
      if (!workflow || !workflow.id || !workflow.nodes) {
        res.status(400).json({
          success: false,
          error: 'Valid workflow object is required'
        });
        return;
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
  }

  public async getWorkflows(req: Request, res: Response): Promise<void> {
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
  }

  public async executeWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { input, options } = req.body;
      
      if (!input) {
        res.status(400).json({
          success: false,
          error: 'Input is required'
        });
        return;
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
  }

  public async scheduleWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { input, scheduleTime, options } = req.body;
      
      if (!input || !scheduleTime) {
        res.status(400).json({
          success: false,
          error: 'Input and schedule time are required'
        });
        return;
      }

      const scheduleDate = new Date(scheduleTime);
      if (isNaN(scheduleDate.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid schedule time format'
        });
        return;
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
  }

  // Coordination
  public async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { type, from, to, payload, priority, ttl } = req.body;
      
      if (!type || !from || !to || !Array.isArray(to)) {
        res.status(400).json({
          success: false,
          error: 'Message type, from, and to array are required'
        });
        return;
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
  }

  public async broadcastMessage(req: Request, res: Response): Promise<void> {
    try {
      const { type, from, payload, priority, ttl, targetAgents } = req.body;
      
      if (!type || !from) {
        res.status(400).json({
          success: false,
          error: 'Message type and from are required'
        });
        return;
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
  }

  // System Status
  public async getSystemStatus(req: Request, res: Response): Promise<void> {
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
  }

  public async getHistory(req: Request, res: Response): Promise<void> {
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
  }

  // Configuration
  public async getConfig(req: Request, res: Response): Promise<void> {
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
  }

  public async updateConfig(req: Request, res: Response): Promise<void> {
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
  }
}

export const orchestrationController = new OrchestrationController();
