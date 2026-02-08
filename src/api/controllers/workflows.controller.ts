import { Request, Response } from 'express';
import { WorkflowService } from '../../services/workflow.service';
import { WorkflowEngine } from '../../core/engine/workflow-engine';
import { Workflow } from '@rex/shared';
import { logger } from "../../utils/logger";
import { APIResponse, PaginatedResponse } from '@rex/shared';

import ExecutionManager from '../../services/execution-manager.service';

export class WorkflowController {
  private workflowService: WorkflowService;

  constructor() {
    this.workflowService = new WorkflowService();
  }

  async stopAllScheduledWorkflows(req: Request, res: Response): Promise<void> {
    try {
      const { cronScheduler } = await import('../../core/scheduler/cron-scheduler');
      await cronScheduler.stopAllScheduledWorkflows();
      
      const response: APIResponse = {
        success: true,
        message: 'All scheduled workflows have been stopped',
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error stopping scheduled workflows:', error);
      const response: APIResponse = {
        success: false,
        error: error?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  async stopScheduledWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { cronScheduler } = await import('../../core/scheduler/cron-scheduler');
      const stopped = await cronScheduler.stopScheduledWorkflow(id);
      
      if (stopped) {
        const response: APIResponse = {
          success: true,
          message: `Scheduled workflow ${id} has been stopped`,
          timestamp: new Date().toISOString()
        };
        res.json(response);
      } else {
        const response: APIResponse = {
          success: false,
          error: `No scheduled workflow found with ID: ${id}`,
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
      }
    } catch (error: any) {
      logger.error('Error stopping scheduled workflow:', error);
      const response: APIResponse = {
        success: false,
        error: error?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  async listScheduledWorkflows(req: Request, res: Response): Promise<void> {
    try {
      const { cronScheduler } = await import('../../core/scheduler/cron-scheduler');
      const workflowIds = cronScheduler.getScheduledWorkflowIds();
      
      const response: APIResponse = {
        success: true,
        data: {
          scheduledWorkflows: workflowIds,
          count: workflowIds.length
        },
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error listing scheduled workflows:', error);
      const response: APIResponse = {
        success: false,
        error: error?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  async createWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const payload = { ...req.body, userId: (req as any).user?.id };
      const workflow = await this.workflowService.createWorkflow(payload);
      const response: APIResponse = {
        success: true,
        data: workflow,
        timestamp: new Date().toISOString()
      };
      res.status(201).json(response);
    } catch (error: any) {
      logger.error('Error creating workflow:', error);
      const response: APIResponse = {
        success: false,
        error: error?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(400).json(response);
    }
  }

  async getWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const workflow = await this.workflowService.getWorkflow(id);
      
      if (!workflow) {
        const response: APIResponse = {
          success: false,
          error: 'Workflow not found',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }
      
      const response: APIResponse = {
        success: true,
        data: workflow,
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error getting workflow:', error.message || error);
      const response: APIResponse = {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  async updateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      // Preserve or set userId from authenticated user if available
      const updateData = { ...req.body };
      if ((req as any).user?.id) {
        // If user is authenticated, ensure workflow has their userId
        // This is important for OAuth tokens (like Gmail) to work correctly
        updateData.userId = (req as any).user.id;
      }
      const workflow = await this.workflowService.updateWorkflow(id, updateData);
      
      if (!workflow) {
        const response: APIResponse = {
          success: false,
          error: 'Workflow not found',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }
      
      const response: APIResponse = {
        success: true,
        data: workflow,
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      const workflowId = req.params.id;
      // Only log actual errors, not validation warnings
      if (error.message?.includes('not found') || error.code === 'P2025') {
        logger.warn('Workflow not found for update:', { workflowId, error: error.message });
        const response: APIResponse = {
          success: false,
          error: 'Workflow not found',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
      } else {
        // Suppress auto-save errors (validation errors during workflow editing)
        if (!error.message?.includes('must be') && !error.message?.includes('cannot be')) {
      logger.error('Error updating workflow:', error.message || error);
        }
      const response: APIResponse = {
        success: false,
          error: error.message || 'Update failed',
        timestamp: new Date().toISOString()
      };
      res.status(400).json(response);
      }
    }
  }

  async deleteWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.workflowService.deleteWorkflow(id);
      
      if (!deleted) {
        const response: APIResponse = {
          success: false,
          error: 'Workflow not found',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }
      
      const response: APIResponse = {
        success: true,
        data: { deleted: true },
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } catch (error: any) {
      logger.error('Error deleting workflow:', error.message || error);
      const response: APIResponse = {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  async listWorkflows(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 100, offset = 0 } = req.query;
      const authUserId = (req as any).user?.id;
      // Always scope to the authenticated user if present
      const workflows = await this.workflowService.listWorkflows(
        authUserId, 
        parseInt(limit as string), 
        parseInt(offset as string)
      );
      
      const response: PaginatedResponse<any> = {
        success: true,
        data: workflows,
        pagination: {
          page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
          limit: parseInt(limit as string),
          total: workflows.length,
          totalPages: Math.ceil(workflows.length / parseInt(limit as string))
        },
        timestamp: new Date().toISOString()
      };
      
      res.json(response);
    } catch (error: any) {
      logger.error('Error listing workflows:', error as Error);
      
      // Return empty list if it's a database connection error
      if (error.code === 'P1001' || error.code === 'P1017' || error.code === 'P1000' || error.message?.includes('connect')) {
        const response: PaginatedResponse<any> = {
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit: parseInt((req.query.limit as string) || '100'),
            total: 0,
            totalPages: 0
          },
          timestamp: new Date().toISOString()
        };
        res.json(response);
      } else {
        const response: APIResponse = {
          success: false,
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        };
        res.status(500).json(response);
      }
    }
  }

  async runWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { input = {}, runOptions = {}, options = {} } = req.body;
      
      // Support both 'options' (frontend) and 'runOptions' (backend) formats
      const executionOptions = runOptions || options;
      
      // Always try to get userId from authenticated user if available
      const authenticatedUserId = (req as any).user?.id;
      if (authenticatedUserId && !executionOptions.userId) {
        executionOptions.userId = authenticatedUserId;
      }
      
      const result = await this.workflowService.executeWorkflow(id, input, executionOptions);
      
      // Format response to match frontend expectations
      const response: APIResponse = {
        success: true,
        data: {
          output: {
            nodeResults: result.nodeResults || result,
            executionTime: result.executionTime,
            status: result.status
          }
        },
        timestamp: new Date().toISOString()
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Error running workflow:', error.message || error);
      const response: APIResponse = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  async listWorkflowRuns(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit = 100, offset = 0 } = req.query;
      
      const runs = await this.workflowService.listWorkflowRuns(
        id,
        undefined,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      
      const response: PaginatedResponse<any> = {
        success: true,
        data: runs,
        pagination: {
          page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
          limit: parseInt(limit as string),
          total: runs.length,
          totalPages: Math.ceil(runs.length / parseInt(limit as string))
        },
        timestamp: new Date().toISOString()
      };
      
      res.json(response);
    } catch (error: any) {
      logger.error('Error listing workflow runs:', error.message || error);
      const response: APIResponse = {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  async createTestWorkflow(req: Request, res: Response): Promise<void> {
    try {
      // Get workflow data from request body or use default test workflow
      const workflowData = req.body && Object.keys(req.body).length > 0 
        ? req.body 
        : {
            name: 'Test AI Agent Workflow',
            description: 'A test workflow with AI nodes for agent functionality',
            nodes: [
              {
                id: 'node-1',
                type: 'ai.openai',
                name: 'OpenAI Chat',
                position: { x: 100, y: 100 },
                data: {
                  config: {
                    model: 'gpt-4o-mini',
                    prompt: 'Hello, I am an AI assistant. How can I help you today?',
                    temperature: 0.7,
                    maxTokens: 1000
                  }
                }
              },
              {
                id: 'node-2',
                type: 'ai.claude',
                name: 'Claude Analysis',
                position: { x: 300, y: 100 },
                data: {
                  model: 'claude-3-haiku-20240307',
                  prompt: 'Analyze the following text and provide insights:',
                  temperature: 0.5,
                  maxTokens: 500
                }
              }
            ],
            edges: [
              {
                id: 'edge-1',
                source: 'node-1',
                target: 'node-2',
                type: 'default'
              }
            ],
            settings: {
              executionMode: 'sequential',
              timeout: 30000
            },
            isActive: true
          };

      // Use userId from request body or from authenticated user, or create a default test user
      let userId = workflowData.userId || (req as any).user?.id || 'test-user';
      
      // Try to create or get test user
      try {
        const { prisma } = await import('../../db/prisma');
        const existingUser = await prisma.user.findUnique({
          where: { id: userId }
        });
        
        if (!existingUser) {
          // Create test user if it doesn't exist
          await prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: {
              id: userId,
              email: 'test@example.com',
              name: 'Test User',
              password: 'test-password-hash'
            }
          });
        }
      } catch (userError) {
        // If user creation fails, try to proceed without it or use a different approach
        logger.warn('Could not create test user, proceeding anyway', { userId, error: (userError as Error).message });
      }

      const workflow = await this.workflowService.createWorkflow({
        ...workflowData,
        userId
      });
      
      const response: APIResponse = {
        success: true,
        data: workflow,
        message: 'Test workflow created successfully',
        timestamp: new Date().toISOString()
      };
      
      res.status(201).json(response);
    } catch (error: any) {
      logger.error('Error creating test workflow:', error.message || error);
      const response: APIResponse = {
        success: false,
        error: error.message || 'Failed to create test workflow',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // Test workflow execution endpoint (executes without persisting)
  async executeTestWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { nodes, edges, input } = req.body;
      
      if (!nodes || !Array.isArray(nodes)) {
        const response: APIResponse = {
          success: false,
          error: 'Nodes array is required',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Create temporary workflow object (not persisted)
      const tempWorkflow: Workflow = {
        id: `test_${Date.now()}`,
        name: 'Test Workflow',
        nodes: nodes || [],
        edges: edges || [],
        userId: (req as any).user?.id || 'test-user',
        isActive: false,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Execute directly without saving
      const workflowEngine = new WorkflowEngine();
      const result = await workflowEngine.executeWorkflow(tempWorkflow, input || {});
      
      const response: APIResponse = {
        success: true,
        data: {
          id: tempWorkflow.id,
          result
        },
        timestamp: new Date().toISOString()
      };
      
      res.json(response);
    } catch (error: any) {
      logger.error('Test workflow execution failed', error as Error);
      const response: APIResponse = {
        success: false,
        error: error.message || 'Test workflow execution failed',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // Direct workflow execution (for frontend compatibility)
  async runWorkflowDirect(req: Request, res: Response): Promise<void> {
    try {
      const { nodes, edges, initialInput = {}, runId } = req.body;
      
      if (!nodes || !edges) {
        const response: APIResponse = {
          success: false,
          error: 'Nodes and edges are required',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Get userId from authenticated user (required when using authenticateToken)
      if (!(req as any).user || !(req as any).user.id) {
        const response: APIResponse = {
          success: false,
          error: 'Authentication required. Please log in to run workflows.',
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      const userId = (req as any).user.id;
      
      // Log userId for debugging - this is the userId from authenticated request
      logger.info('🔵 Workflow Execution Start', {
        step: 'Workflow Execution',
        authenticatedUserId: userId,
        userIdType: typeof userId,
        userIdLength: userId?.length,
        email: (req as any).user.email,
        note: 'This userId will be passed to workflow engine and used for OAuth token retrieval'
      });

      // Create a temporary workflow for execution (do not require DB persistence)
      const tempWorkflow = {
        id: runId || `temp_${Date.now()}`,
        name: 'Temporary Workflow',
        description: 'Temporary workflow for direct execution',
        nodes,
        edges,
        settings: {},
        isActive: true,
        userId
      } as any;

      // Execute directly via engine so we can stream events using provided runId
      const { WorkflowEngine } = await import('../../core/engine/workflow-engine');
      const engine = new WorkflowEngine();
      
      // Save execution to database for history tracking
      const { prisma } = await import('../../db/prisma');
      let workflowRun;
      try {
        // Try to find if workflow exists in DB, otherwise create a temporary one
        let dbWorkflow = await prisma.workflow.findFirst({
          where: { userId, name: 'Temporary Workflow' }
        });
        
        if (!dbWorkflow) {
          // Create a temporary workflow record for history tracking
          dbWorkflow = await prisma.workflow.create({
            data: {
              name: 'Temporary Workflow',
              description: 'Temporary workflow for direct execution',
              nodes: nodes as any,
              edges: edges as any,
              settings: {},
              isActive: false,
              userId
            }
          });
        }
        
        // Create workflow run record
        workflowRun = await prisma.workflowRun.create({
          data: {
            id: runId || `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            workflowId: dbWorkflow.id,
            status: 'running',
            input: initialInput,
            runOptions: { runId, userId },
            startedAt: new Date(),
            userId
          }
        });
      } catch (dbError: any) {
        logger.warn('Failed to save workflow run to database (continuing execution)', {
          error: dbError.message,
          runId,
          userId
        });
      }
      
      const result = await engine.executeWorkflow(tempWorkflow, initialInput, { runId, userId });
      
      // Update workflow run with results if it was created
      if (workflowRun) {
        try {
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
        } catch (updateError: any) {
          logger.warn('Failed to update workflow run', {
            error: updateError.message,
            runId: workflowRun.id
          });
        }
      }
      
      const response: APIResponse = {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Error running workflow directly:', error.message || error);
      const response: APIResponse = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // SSE endpoint for real-time workflow updates
  async streamWorkflowRun(req: Request, res: Response): Promise<void> {
    try {
      const { runId } = req.query;
      
      if (!runId) {
        res.status(400).json({ error: 'runId is required' });
        return;
      }

      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Send connection confirmation
      res.write(`event: connected\n`);
      res.write(`data: ${JSON.stringify({ runId, status: 'connected' })}\n\n`);

      // Store the response object for this runId to send real-time events
      const { ExecutionMonitor } = await import('../../core/execution/execution-monitor');
      const executionMonitor = ExecutionMonitor.getInstance();
      
      // Create a custom event emitter for this specific runId
      const eventEmitter = {
        emit: (eventType: string, data: any) => {
          try {
            res.write(`event: ${eventType}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
          } catch (error) {
            logger.warn('Failed to send SSE event', { error: error as Error });
          }
        }
      };

      // Register the SSE emitter with ExecutionMonitor
      if (executionMonitor) {
        executionMonitor.registerSSEEmitter(runId as string, eventEmitter);
      }

      // Handle connection close
      req.on('close', () => {
        if (executionMonitor) {
          executionMonitor.unregisterSSEEmitter(runId as string);
        }
      });

      // Keep connection alive with periodic pings
      const keepAlive = setInterval(() => {
        try {
          res.write(`event: ping\n`);
          res.write(`data: ${JSON.stringify({ runId, timestamp: Date.now() })}\n\n`);
        } catch (error) {
          clearInterval(keepAlive);
        }
      }, 30000);

      // Clean up on close
      req.on('close', () => {
        clearInterval(keepAlive);
        if (executionMonitor) {
          executionMonitor.unregisterSSEEmitter(runId as string);
        }
      });

    } catch (error: any) {
      logger.error('Error streaming workflow run:', error.message || error);
      res.status(500).json({ error: error.message });
    }
  }

  // Node execution endpoint (deprecated - use /api/workflows/nodes/:nodeType/execute instead)
  // This is kept for backward compatibility but delegates to node registry directly
  async executeNode(req: Request, res: Response): Promise<void> {
    try {
      const { nodeType } = req.params;
      const { config, input = {}, options, credentials } = req.body;
      
      if (!nodeType) {
        const response: APIResponse = {
          success: false,
          error: 'Node type is required',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Use node registry directly for better performance
      const { nodeRegistry } = await import('../../nodes/node-registry');
      
      // Get node executor
      const executor = nodeRegistry.getNodeExecutor(nodeType);
      if (!executor) {
        const response: APIResponse = {
          success: false,
          error: `Node type '${nodeType}' not found`,
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }

      // Validate configuration
      const validation = nodeRegistry.validateNodeConfig(nodeType, config || {});
      if (!validation.valid) {
        const response: APIResponse = {
          success: false,
          error: `Invalid node configuration: ${validation.errors.join(', ')}`,
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Create workflow node with ALL data fields including options and credentials
      const node: any = {
        id: `temp_${Date.now()}`,
        type: 'action',
        position: { x: 0, y: 0 },
        data: {
          config: config || {},
          subtype: nodeType,
          options: options || {}, // Include options (for schedule nodes, retry settings, etc.)
          credentials: credentials || {}, // Include credentials
          // Preserve any other fields from request
          ...(req.body.data || {})
        }
      };

      // Create execution context
      const context = {
        runId: `run_${Date.now()}`,
        workflowId: 'temp',
        nodeId: node.id,
        input: input || {},
        output: {},
        variables: {},
        credentials: {},
        userId: (req as any).user?.id
      } as any;

      // Execute node directly via node registry (direct execution - preferred)
      const result = await nodeRegistry.executeNode(nodeType, node, context);
      
      const response: APIResponse = {
        success: true,
        data: {
          nodeType,
          result,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Error executing node:', error.message || error);
      const response: APIResponse = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // Node testing endpoint (deprecated - use /api/workflows/nodes/:nodeType/test instead)
  // This is kept for backward compatibility but uses node registry
  async testNode(req: Request, res: Response): Promise<void> {
    try {
      const { nodeType } = req.params;
      const { config } = req.body;
      
      if (!nodeType) {
        const response: APIResponse = {
          success: false,
          error: 'Node type is required',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Use node registry directly
      const { nodeRegistry } = await import('../../nodes/node-registry');
      
      // Get node definition
      const definition = nodeRegistry.getNodeDefinition(nodeType);
      if (!definition) {
        const response: APIResponse = {
          success: false,
          error: `Node type '${nodeType}' not found`,
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }

      // Validate configuration
      const validation = nodeRegistry.validateNodeConfig(nodeType, config || {});
      const capabilities = nodeRegistry.getNodeCapabilities(nodeType);

      const testResult = {
        nodeType,
        status: validation.valid ? 'success' : 'error',
        message: validation.valid 
          ? `${nodeType} node configuration is valid` 
          : `Configuration validation failed: ${validation.errors.join(', ')}`,
        config: config || {},
        definition,
        capabilities,
        configValid: validation.valid,
        validationErrors: validation.errors,
        timestamp: new Date().toISOString()
      };
      
      const response: APIResponse = {
        success: true,
        data: testResult,
        timestamp: new Date().toISOString()
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Error testing node:', error.message || error);
      const response: APIResponse = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // Get node schema endpoint (deprecated - use /api/workflows/nodes/:nodeType/schema instead)
  // This is kept for backward compatibility but uses node registry
  async getNodeSchema(req: Request, res: Response): Promise<void> {
    try {
      const { nodeType } = req.params;
      
      if (!nodeType) {
        const response: APIResponse = {
          success: false,
          error: 'Node type is required',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      // Use node registry directly
      const { nodeRegistry } = await import('../../nodes/node-registry');
      
      const definition = nodeRegistry.getNodeDefinition(nodeType);
      if (!definition) {
        const response: APIResponse = {
          success: false,
          error: `Node type '${nodeType}' not found`,
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
        return;
      }

      const schema = nodeRegistry.getNodeSchema(nodeType);
      const capabilities = nodeRegistry.getNodeCapabilities(nodeType);
      
      const response: APIResponse = {
        success: true,
        data: {
          nodeType,
          definition,
          schema,
          capabilities
        },
        timestamp: new Date().toISOString()
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error('Error getting node schema:', error.message || error);
      const response: APIResponse = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // Stop/cancel a running workflow execution
  async stopWorkflowExecution(req: Request, res: Response): Promise<void> {
    try {
      const { runId } = req.params;
      
      if (!runId) {
        const response: APIResponse = {
          success: false,
          error: 'runId is required',
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const executionManager = ExecutionManager.getInstance();
      const cancelled = executionManager.cancelExecution(runId);

      if (cancelled) {
        const response: APIResponse = {
          success: true,
          data: {
            runId,
            message: 'Workflow execution cancelled successfully'
          },
          timestamp: new Date().toISOString()
        };
        res.json(response);
      } else {
        const response: APIResponse = {
          success: false,
          error: 'Execution not found or already completed',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(response);
      }
    } catch (error: any) {
      logger.error('Failed to stop workflow execution', error as Error);
      const response: APIResponse = {
        success: false,
        error: error.message || 'Failed to stop workflow execution',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  // Note: Helper methods removed - now using nodeRegistry directly
  // getNodeCapabilities and getNodeSchemaByType are no longer needed
  // as they're replaced by nodeRegistry.getNodeCapabilities() and nodeRegistry.getNodeSchema()
}
