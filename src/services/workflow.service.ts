import { prisma } from '../db/prisma';
import { Workflow, WorkflowRun, WorkflowNode, WorkflowEdge } from '@rex/shared';
import { logger } from '../utils/logger';
import { WorkflowEngine } from '../core/engine/workflow-engine';
import { NotFoundError, ValidationError } from '../utils/error-handler';
import { cronScheduler } from '../core/scheduler/cron-scheduler';
import crypto from 'crypto';

export class WorkflowService {
  private workflowEngine: WorkflowEngine;

  constructor() {
    this.workflowEngine = new WorkflowEngine();
  }

  async createWorkflow(workflowData: Partial<Workflow>): Promise<Workflow> {
    try {
      // Validate workflow data before creating
      this.validateWorkflow(workflowData);

      // Use default userId if not provided (for unauthenticated users)
      const userId = workflowData.userId || 'default-user';

      // Always generate a proper UUID (Prisma schema requires UUID format)
      const workflowId = crypto.randomUUID();

      const workflow = await prisma.workflow.create({
        data: {
          id: workflowId,
          name: workflowData.name!,
          description: workflowData.description || '',
          nodes: (workflowData.nodes as any) || [],
          edges: (workflowData.edges as any) || [],
          settings: (workflowData.settings as any) || {},
          isActive: workflowData.isActive || false,
          userId: userId
        }
      });

      logger.info('Workflow created', {
        workflowId: workflow.id,
        name: workflow.name,
        nodeCount: (workflow as any).nodes?.length || 0,
        userId: workflow.userId
      });

      // Register schedule triggers if workflow has Schedule Trigger nodes
      // This will auto-activate the workflow if it has a Schedule Trigger
      const workflowForScheduling = (workflow as unknown) as Workflow;
      const updatedWorkflow = await this.registerScheduleTriggers(workflowForScheduling);

      return updatedWorkflow;
    } catch (error: any) {
      logger.error('Error creating workflow:', error.message || error);
      throw error;
    }
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    try {
      const workflow = await prisma.workflow.findUnique({
        where: { id }
      });

      return (workflow as unknown) as Workflow;
    } catch (error: any) {
      logger.error('Error getting workflow:', error.message || error);
      throw error;
    }
  }

  async updateWorkflow(id: string, updateData: Partial<Workflow>): Promise<Workflow> {
    try {
      // Only validate fields that are being updated (lenient for partial updates)
      if (updateData.name !== undefined && (!updateData.name || updateData.name.trim().length === 0)) {
        throw new Error('Workflow name cannot be empty');
      }

      // Validate nodes only if they're being updated
      if (updateData.nodes !== undefined) {
        if (!Array.isArray(updateData.nodes)) {
          throw new Error('Nodes must be an array');
        }
      }

      // Validate edges only if they're being updated
      if (updateData.edges !== undefined) {
        if (!Array.isArray(updateData.edges)) {
          throw new Error('Edges must be an array');
        }
      }

      // Build update data object - only include fields that are actually being updated
      const updatePayload: any = {};
      if (updateData.name !== undefined) updatePayload.name = updateData.name;
      if (updateData.description !== undefined) updatePayload.description = updateData.description;
      if (updateData.nodes !== undefined) updatePayload.nodes = updateData.nodes as any;
      if (updateData.edges !== undefined) updatePayload.edges = updateData.edges as any;
      if (updateData.settings !== undefined) updatePayload.settings = updateData.settings as any;
      if (updateData.isActive !== undefined) updatePayload.isActive = updateData.isActive;
      // IMPORTANT: Update userId if provided - this ensures workflows have the correct user for OAuth tokens
      if (updateData.userId !== undefined && updateData.userId !== 'default-user') {
        updatePayload.userId = updateData.userId;
      }
      updatePayload.updatedAt = new Date();

      const workflow = await prisma.workflow.update({
        where: { id },
        data: updatePayload
      });

      logger.info('Workflow updated', { 
        workflowId: id,
        nodeCount: (workflow as any).nodes?.length || 0,
        fieldsUpdated: Object.keys(updatePayload).length
      });

      // Register schedule triggers if workflow has Schedule Trigger nodes
      // This will auto-activate the workflow if it has a Schedule Trigger
      // This will also unschedule if workflow has no schedule triggers
      const workflowForScheduling = (workflow as unknown) as Workflow;
      const updatedWorkflow = await this.registerScheduleTriggers(workflowForScheduling);

      // If workflow was auto-activated, fetch the updated version
      if (updatedWorkflow.isActive && !workflowForScheduling.isActive) {
        const refreshed = await prisma.workflow.findUnique({
          where: { id }
        });
        return (refreshed as unknown) as Workflow;
      }

      return updatedWorkflow;
    } catch (error: any) {
      // Only log if it's not a validation error (suppress auto-save validation errors)
      if (error.code !== 'P2002' && !error.message?.includes('must be') && !error.message?.includes('cannot be')) {
        logger.warn('Workflow update warning', { message: error.message || String(error) });
      }
      throw error;
    }
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    try {
      // Unschedule workflow before deleting
      try {
        await cronScheduler.unscheduleWorkflow(id);
        logger.info('Workflow unscheduled before deletion', { workflowId: id });
      } catch (error) {
        // Ignore errors if workflow wasn't scheduled
      }

      await prisma.workflow.delete({
        where: { id }
      });

      logger.info('Workflow deleted', { workflowId: id });
      return true;
    } catch (error: any) {
      logger.error('Error deleting workflow:', error.message || error);
      throw error;
    }
  }

  async listWorkflows(userId?: string, limit: number = 100, offset: number = 0): Promise<Workflow[]> {
    try {
      const where: any = {};
      if (userId) {
        where.userId = userId;
      }

      const workflows = await prisma.workflow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      return (workflows as unknown) as Workflow[];
    } catch (error: any) {
      logger.error('Error listing workflows', undefined, {
        message: error.message,
        errorCode: error.code,
        errorName: error.name,
        stack: error.stack,
        userId,
        limit,
        offset
      });
      // If Prisma connection error, return empty array instead of crashing
      if (error.code === 'P1001' || error.code === 'P1017' || error.code === 'P1000' || error.message?.includes('connect')) {
        logger.warn('Prisma connection error - returning empty workflows list');
        return [];
      }
      throw error;
    }
  }

  async executeWorkflow(workflowId: string, input: any = {}, runOptions: any = {}): Promise<any> {
    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new NotFoundError('Workflow not found');
      }

      // Get userId from runOptions, workflow, or input
      const userId = runOptions?.userId || workflow.userId || input.userId || null;

      // Create workflow run record with userId
      const workflowRun = await prisma.workflowRun.create({
        data: {
          id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          workflowId,
          status: 'running',
          input,
          runOptions,
          startedAt: new Date(),
          userId: userId || undefined
        }
      });

      try {
        // Execute workflow using the engine
        const result = await this.workflowEngine.executeWorkflow(workflow, input, runOptions);

        // Update workflow run with results
        await prisma.workflowRun.update({
          where: { id: workflowRun.id },
          data: {
            status: result.success ? 'completed' : 'failed',
            output: (result.output as any),
            error: result.error,
            nodeResults: (result.output?.nodeResults as any) || {},
            executionOrder: (result.output?.executionOrder as any) || [],
            nodeOutputs: (result.output?.nodeOutputs as any) || {},
            completedAt: new Date(),
            duration: result.duration
          }
        });

        logger.info('Workflow execution completed', {
          workflowId,
          runId: workflowRun.id,
          success: result.success
        });

        return {
          runId: workflowRun.id,
          ...result
        };

      } catch (executionError: any) {
        // Update workflow run with error
        await prisma.workflowRun.update({
          where: { id: workflowRun.id },
          data: {
            status: 'failed',
            error: executionError.message,
            completedAt: new Date()
          }
        });

        throw executionError;
      }

    } catch (error: any) {
      logger.error('Error executing workflow:', error.message || error);
      throw error;
    }
  }

  async listWorkflowRuns(
    workflowId: string,
    userId?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<WorkflowRun[]> {
    try {
      const where: any = { workflowId };
      if (userId) {
        where.userId = userId;
      }

      const runs = await prisma.workflowRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      return (runs as unknown) as WorkflowRun[];
    } catch (error: any) {
      logger.error('Error listing workflow runs:', error.message || error);
      throw error;
    }
  }

  async getWorkflowRun(runId: string): Promise<WorkflowRun | null> {
    try {
      const run = await prisma.workflowRun.findUnique({
        where: { id: runId }
      });

      return (run as unknown) as WorkflowRun;
    } catch (error: any) {
      logger.error('Error getting workflow run:', error.message || error);
      throw error;
    }
  }

  async updateWorkflowRun(runId: string, updateData: Partial<WorkflowRun>): Promise<WorkflowRun> {
    try {
      const run = await prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: updateData.status,
          output: (updateData.output as any),
          error: updateData.error,
          nodeResults: (updateData.nodeResults as any),
          executionOrder: (updateData.executionOrder as any),
          nodeOutputs: (updateData.nodeOutputs as any),
          completedAt: updateData.completedAt,
          duration: updateData.duration
        }
      });

      return (run as unknown) as WorkflowRun;
    } catch (error: any) {
      logger.error('Error updating workflow run:', error.message || error);
      throw error;
    }
  }

  /**
   * Helper method to convert interval-based scheduling to cron expression
   * This matches the logic in ScheduleNode
   */
  private intervalToCron(interval: number, unit: 'seconds' | 'minutes' | 'hours' | 'days'): string {
    const randomSecond = Math.floor(Math.random() * 60);
    
    switch (unit) {
      case 'seconds':
        // For seconds, use 6-field cron: second minute hour day month weekday
        return `*/${interval} * * * * *`;
      case 'minutes':
        return `${randomSecond} */${interval} * * * *`;
      case 'hours':
        const randomMinute = Math.floor(Math.random() * 60);
        return `${randomSecond} ${randomMinute} */${interval} * * *`;
      case 'days':
        const randomMinuteDay = Math.floor(Math.random() * 60);
        const randomHour = Math.floor(Math.random() * 24);
        return `${randomSecond} ${randomMinuteDay} ${randomHour} */${interval} * *`;
      default:
        throw new Error(`Unsupported interval unit: ${unit}`);
    }
  }

  /**
   * Detect Schedule Trigger nodes and register them with CronScheduler
   * Returns the updated workflow (may be auto-activated)
   * 
   * NOTE: Automatic scheduling is DISABLED by default.
   * Workflows with Schedule Trigger nodes will NOT automatically run.
   * To enable, set ENABLE_AUTO_SCHEDULE_LOAD=true in environment variables.
   */
  private async registerScheduleTriggers(workflow: Workflow): Promise<Workflow> {
    // Check if auto-scheduling is enabled
    const autoScheduleEnabled = process.env.ENABLE_AUTO_SCHEDULE_LOAD === 'true';
    
    if (!autoScheduleEnabled) {
      logger.info('⏸️  Automatic schedule registration is DISABLED. Schedule Trigger nodes will not be registered automatically.', {
        workflowId: workflow.id,
        workflowName: workflow.name,
        message: 'To enable automatic scheduling, set ENABLE_AUTO_SCHEDULE_LOAD=true in environment variables.'
      });
      // Unschedule if previously scheduled
      try {
        await cronScheduler.unscheduleWorkflow(workflow.id);
      } catch (error) {
        // Ignore errors if workflow wasn't scheduled
      }
      return workflow;
    }
    
    logger.info('🔍 Checking for Schedule Trigger nodes in workflow', {
      workflowId: workflow.id,
      workflowName: workflow.name,
      nodeCount: workflow.nodes?.length || 0,
      isActive: workflow.isActive
    });

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      logger.warn('Workflow has no nodes array', { workflowId: workflow.id });
      return workflow;
    }

    // Find all Schedule Trigger nodes
    // Check multiple possible node type formats
    const scheduleNodes = workflow.nodes.filter((node: any) => {
      const nodeType = node.type || node.data?.type || node.nodeType || '';
      const nodeSubtype = node.data?.subtype || node.subtype || '';
      const nodeId = node.id || node.nodeId || '';
      const nodeLabel = node.data?.label || node.label || '';
      
      // Check if it's a schedule trigger node by type, subtype, or label
      return nodeType === 'schedule' || 
             nodeType === 'trigger.schedule' || 
             nodeType === 'triggers/schedule' ||
             nodeType === 'Schedule Trigger' ||
             nodeSubtype === 'schedule' ||
             (nodeType === 'trigger' && nodeSubtype === 'schedule') ||
             (nodeId.includes('schedule') && (nodeType === 'trigger' || nodeType === 'schedule')) ||
             nodeLabel.toLowerCase().includes('schedule');
    });
    
    logger.info('Schedule Trigger node detection', {
      workflowId: workflow.id,
      totalNodes: workflow.nodes?.length || 0,
      scheduleNodesFound: scheduleNodes.length,
      allNodeTypes: workflow.nodes?.map((n: any) => ({
        id: n.id,
        type: n.type || n.data?.type,
        subtype: n.data?.subtype,
        label: n.data?.label || n.label
      })) || []
    });

    if (scheduleNodes.length === 0) {
      // No schedule triggers - unschedule if previously scheduled
      try {
        await cronScheduler.unscheduleWorkflow(workflow.id);
        logger.info('Workflow unscheduled (no schedule triggers found)', { workflowId: workflow.id });
      } catch (error) {
        // Ignore errors if workflow wasn't scheduled
      }
      return workflow;
    }

    // Use the first schedule trigger node (workflows typically have one)
    const scheduleNode: any = scheduleNodes[0];
    
    // Get config and options separately (frontend stores schedule config in options)
    const config = scheduleNode.data?.config || (scheduleNode as any).config || {};
    const options = scheduleNode.data?.options || (scheduleNode as any).options || {};
    
    logger.info('Schedule Trigger node configuration', {
      workflowId: workflow.id,
      nodeId: scheduleNode.id,
      nodeType: (scheduleNode as any).type || scheduleNode.data?.type,
      configKeys: Object.keys(config),
      optionsKeys: Object.keys(options),
      config: config,
      options: options
    });
    
    // Get configuration values - check options first (frontend stores here), then config (fallback)
    // This matches how ScheduleNode.execute() reads the values
    const triggerIntervalRaw = options.triggerInterval ?? config.triggerInterval;
    const triggerInterval = triggerIntervalRaw ? Number(triggerIntervalRaw) : null;
    const triggerIntervalUnit = options.triggerIntervalUnit ?? config.triggerIntervalUnit;
    const timezone = options.timezone ?? config.timezone ?? 'UTC';
    const cron = config.cron || options.cron;

    let finalCron: string | null = null;

    // Determine cron expression
    if (cron) {
      finalCron = String(cron).trim();
    } else if (triggerInterval && triggerIntervalUnit) {
      if (isNaN(triggerInterval) || triggerInterval < 1) {
        logger.warn('Invalid trigger interval in Schedule Trigger node', {
          workflowId: workflow.id,
          nodeId: scheduleNode.id,
          triggerInterval
        });
        return workflow;
      }

      const validUnits = ['seconds', 'minutes', 'hours', 'days'];
      if (!validUnits.includes(triggerIntervalUnit)) {
        logger.warn('Invalid interval unit in Schedule Trigger node', {
          workflowId: workflow.id,
          nodeId: scheduleNode.id,
          triggerIntervalUnit
        });
        return workflow;
      }

      // Convert interval to cron expression
      finalCron = this.intervalToCron(triggerInterval, triggerIntervalUnit as 'seconds' | 'minutes' | 'hours' | 'days');
    } else {
      logger.warn('Schedule Trigger node missing required configuration', {
        workflowId: workflow.id,
        nodeId: scheduleNode.id
      });
      return workflow;
    }

    // Register schedule if we have a valid cron expression
    // Auto-activate workflows with Schedule Trigger nodes so they run automatically
    if (finalCron) {
      try {
        // Auto-activate workflow if it has a Schedule Trigger node
        let updatedWorkflow = workflow;
        if (!workflow.isActive) {
          const updated = await prisma.workflow.update({
            where: { id: workflow.id },
            data: { isActive: true }
          });
          updatedWorkflow = (updated as unknown) as Workflow;
          logger.info('Workflow auto-activated (has Schedule Trigger node)', { workflowId: workflow.id });
        }

        // Register the schedule
        await cronScheduler.scheduleWorkflow(workflow.id, finalCron, timezone);
        logger.info('✅ Schedule trigger successfully registered for workflow', {
          workflowId: workflow.id,
          nodeId: scheduleNode.id,
          cron: finalCron,
          timezone,
          triggerInterval,
          triggerIntervalUnit,
          isActive: true,
          message: `Workflow will run automatically every ${triggerInterval} ${triggerIntervalUnit}`
        });

        return updatedWorkflow;
      } catch (error: any) {
        logger.error('Failed to register schedule trigger', error, {
          workflowId: workflow.id,
          nodeId: scheduleNode.id,
          cron: finalCron,
          timezone
        });
      }
    }

    return workflow;
  }

  validateWorkflow(workflow: Partial<Workflow>): void {
    const errors: string[] = [];

    if (!workflow.name || workflow.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!workflow.nodes || !Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
      errors.push('At least one node is required');
    }

    if (!workflow.edges || !Array.isArray(workflow.edges)) {
      errors.push('Edges must be an array');
    }

    if (errors.length > 0) {
      throw new ValidationError('Workflow validation failed', errors.map(error => ({
        field: 'workflow',
        message: error,
        errors: [],
        statusCode: 400,
        isOperational: true,
        name: 'ValidationError'
      })));
    }
  }
}
