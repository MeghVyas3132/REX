import { Workflow, WorkflowNode, WorkflowEdge, WorkflowRun, NodeResult, ExecutionContext, ExecutionResult } from '@rex/shared';
const logger = require("../../utils/logger");
import { NodeRunner } from './node-runner';
import { WorkflowExecutionError } from '../../utils/error-handler';
import { nodeRegistry } from '../registry/node-registry';
import { memoryStorage } from '../memory/memory-storage';
import { ExecutionMonitor } from '../execution/execution-monitor';
import { agentOrchestrator, Agent, Task } from '../orchestration/agent-orchestrator';
import ExecutionManager from '../../services/execution-manager.service';

export class WorkflowEngine {
  private nodeRunner: NodeRunner;

  constructor() {
    this.nodeRunner = new NodeRunner();
  }

  async executeWorkflow(
    workflow: Workflow,
    input: Record<string, any> = {},
    runOptions: Record<string, any> = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    // Respect externally provided runId (from frontend SSE subscription) if present
    const runId = (runOptions && typeof runOptions.runId === 'string' && runOptions.runId.trim())
      ? runOptions.runId
      : `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    logger.info('Starting workflow execution', { workflowId: workflow.id, runId, nodeCount: workflow.nodes.length });

    // Emit workflow started event
    try {
      const executionMonitor = ExecutionMonitor.getInstance();
      if (executionMonitor) {
        executionMonitor.emitWorkflowStarted(runId, workflow.id, { input, nodeCount: workflow.nodes.length });
      }
    } catch (error) {
      logger.warn('Failed to emit workflow started event', { error: error as Error });
    }

    // Register execution for cancellation tracking (declare outside try so it's accessible in catch)
    const executionManager = ExecutionManager.getInstance();
    const abortController = new AbortController();
    
    try {
      // Validate workflow
      this.validateWorkflow(workflow);

      // Get execution order
      const executionOrder = this.getExecutionOrder(workflow.nodes, workflow.edges);
      logger.debug('Workflow execution order', { runId, executionOrder });

      // Register agent nodes with orchestrator before execution
      this.registerAgentNodes(workflow.nodes, runId);

      // Get userId from runOptions, workflow, or input
      // IMPORTANT: Use workflow.userId if available, as it represents the user who created the workflow
      // Only fall back to 'default-user' if absolutely no userId is available
      // This ensures scheduled workflows use the correct user's OAuth tokens
      // Note: workflow.user_id might exist in database but TypeScript type only has userId
      const workflowUserId = (workflow as any).userId || (workflow as any).user_id;
      const userId = runOptions?.userId || workflowUserId || input.userId || 'default-user';
      
      // Log warning if using default-user for workflows that require authentication (like Gmail)
      if (userId === 'default-user') {
        const hasGmailNodes = workflow.nodes?.some((n: any) => 
          n.data?.subtype === 'gmail' || n.type === 'gmail' || n.subtype === 'gmail'
        );
        if (hasGmailNodes) {
          logger.warn(`Workflow ${workflow.id} contains Gmail nodes but userId is 'default-user'. Gmail OAuth will fail. Workflow should be created with a valid userId.`);
        }
      }
      
      // Log userId selection for debugging
      try {
        logger.info('🔵 Workflow Engine - Setting userId', {
          step: 'Workflow Engine Execution',
          userId,
          userIdType: typeof userId,
          userIdLength: userId?.length,
          fromRunOptions: runOptions?.userId,
          fromWorkflow: workflow.userId,
          fromInput: input.userId,
          finalUserId: userId,
          note: 'This userId will be passed to all nodes in context.userId'
        });
      } catch (e) {
        // Fallback if logger fails
        logger.debug('Workflow Engine userId', { userId });
      }

      // Initialize execution context with memory support
      const context: ExecutionContext = {
        runId,
        workflowId: workflow.id,
        nodeId: '',
        input: { ...input, userId },
        output: {},
        variables: { ...input, userId },
        credentials: {},
        sessionId: input.sessionId || 'default-session',
        agentId: input.agentId || 'default-agent',
        userId
      } as any;

      // Register execution for cancellation tracking
      executionManager.registerExecution(runId, workflow.id, abortController);

      // Execute nodes in order
      const nodeResults: Record<string, NodeResult> = {};
      const nodeOutputs: Record<string, any> = {};

      for (const nodeId of executionOrder) {
          // Check if execution was cancelled
          if (executionManager.isCancelled(runId) || abortController.signal.aborted) {
            logger.info('Workflow execution cancelled', { runId, workflowId: workflow.id, nodeId });
            throw new Error('Workflow execution cancelled by user');
          }
          
          const node = workflow.nodes.find(n => n.id === nodeId);
          if (!node) {
            try {
              logger.warn('Node not found in execution order', { runId, nodeId });
            } catch (e) {
              logger.warn('Node not found', { nodeId });
            }
            continue;
          }

          const nodeStartTime = Date.now();
          
          try {
            try {
              logger.info(`Executing node: ${nodeId} (${node.type})`, { runId });
            } catch (e) {
              logger.debug('Executing node', { nodeId, nodeType: node.type });
            }
          
          // Emit node started event
          try {
            const executionMonitor = ExecutionMonitor.getInstance();
            if (executionMonitor) {
              executionMonitor.emitNodeStarted(runId, workflow.id, nodeId, { nodeType: node.type });
            }
          } catch (error) {
            logger.warn('Failed to emit node started event', { error: error as Error });
          }

          // Prepare node execution context
          // For trigger nodes (nodes with no incoming edges), use the initial workflow input
          // For other nodes, prepare input from previous node outputs
          const isTriggerNode = !workflow.edges.some(edge => edge.target === nodeId);
          const nodeInput = isTriggerNode 
            ? (context.input || {})  // Use initial workflow input for trigger nodes
            : this.prepareNodeInput(node, nodeOutputs, workflow.edges);
          
          // Log input preparation for debugging
          try {
            logger.info('Node input prepared', {
              nodeId,
              nodeType: node.type,
              isTriggerNode,
              inputKeys: Object.keys(nodeInput),
              hasNodeOutputs: Object.keys(nodeOutputs).length,
              nodeOutputsKeys: Object.keys(nodeOutputs),
              edgesCount: workflow.edges.length,
              incomingEdges: workflow.edges.filter(e => e.target === nodeId).map(e => ({ source: e.source, target: e.target }))
            });
          } catch (e) {
            logger.debug('Input for node', {
              nodeId,
              isTriggerNode,
              inputKeys: Object.keys(nodeInput),
              nodeOutputs: Object.keys(nodeOutputs),
              incomingEdges: workflow.edges.filter(e => e.target === nodeId).length
            });
          }
          
          const nodeContext: ExecutionContext = {
            ...context,
            nodeId,
            input: nodeInput,
            output: {},
            variables: { ...context.variables },
            // Add nodeOutputs to context so nodes can access data from any previous node
            nodeOutputs: { ...nodeOutputs }
          } as any;

          // Check if execution was cancelled before executing node
          if (executionManager.isCancelled(runId) || abortController.signal.aborted) {
            logger.info('Workflow execution cancelled before node execution', { runId, workflowId: workflow.id, nodeId });
            throw new Error('Workflow execution cancelled by user');
          }

          // Check if this is an agent node and route through orchestrator
          const isAgentNode = this.isAgentNode(node);
          let result: ExecutionResult;

          if (isAgentNode) {
            // Execute agent node through orchestrator
            result = await this.executeAgentNodeWithOrchestration(node, nodeContext, runId);
          } else {
            // Execute regular node normally
            result = await this.executeNodeWithRetry(node, nodeContext);
          }
          
          // Check again after node execution
          if (executionManager.isCancelled(runId) || abortController.signal.aborted) {
            logger.info('Workflow execution cancelled after node execution', { runId, workflowId: workflow.id, nodeId });
            throw new Error('Workflow execution cancelled by user');
          }
          
          // Ensure result has output
          if (!result || !result.output) {
            try {
              logger.warn(`Node execution returned no output: ${nodeId}`, { runId, nodeType: node.type, result });
            } catch (e) {
              logger.warn('Node execution returned no output', { nodeId, runId, nodeType: node.type, result });
            }
          }
          
          const nodeDuration = Date.now() - nodeStartTime;
          
          // Check if the node execution result indicates failure
          // Some nodes return { success: false, error: ... } instead of throwing
          if (result && result.success === false) {
            // Treat as error even though no exception was thrown
            // Extract error message from multiple possible locations
            const errorMessage = result.error || 
                                result.output?.error || 
                                result.details?.error ||
                                result.output?.details?.error ||
                                (typeof result.output === 'string' ? result.output : null) ||
                                'Node execution failed';
            
            // Log detailed error information
            try {
              logger.error(`Node execution failed: ${nodeId}`, new Error(errorMessage), { 
                runId, 
                duration: nodeDuration,
                nodeType: node.type,
                subtype: node.data?.subtype,
                resultKeys: Object.keys(result || {}),
                hasOutput: !!result.output,
                hasDetails: !!result.details,
                fullResult: JSON.stringify(result).substring(0, 500)
              });
            } catch (e) {
              logger.error('Node execution failed', new Error(errorMessage), { nodeId, runId });
            }

            // Emit node failed event
            try {
              const executionMonitor = ExecutionMonitor.getInstance();
              if (executionMonitor) {
                executionMonitor.emitNodeFailed(runId, workflow.id, nodeId, errorMessage, { 
                  duration: nodeDuration 
                });
              }
            } catch (emitError) {
              logger.warn('Failed to emit node failed event', { error: emitError as Error });
            }

            // Store as failed result
            nodeResults[nodeId] = {
              success: false,
              error: errorMessage,
              result: result.output || result.details || {}, // Include details for debugging
              node: node.data?.label || node.type,
              nodeType: node.type,
              subtype: node.data?.subtype,
              timestamp: new Date().toISOString(),
              duration: nodeDuration
            };

            // Check if we should continue execution
            if (node.data?.options?.continueOnError !== true) {
              try {
                logger.error(`Workflow execution stopped due to node failure: ${nodeId}`, { runId });
              } catch (e) {
                logger.error('Workflow execution stopped', { nodeId, runId });
              }
              break; // Stop execution
            }
            
            continue; // Continue to next node if continueOnError is true
          }
          
          // Node succeeded
          try {
            logger.info(`Node completed: ${nodeId}`, { runId, duration: nodeDuration });
          } catch (e) {
            logger.info('Node completed', { nodeId, runId, duration: nodeDuration });
          }

          // Emit node completed event
          try {
            const executionMonitor = ExecutionMonitor.getInstance();
            if (executionMonitor) {
              executionMonitor.emitNodeCompleted(runId, workflow.id, nodeId, { 
                result: result.output, 
                duration: nodeDuration 
              });
            }
          } catch (error) {
            logger.warn('Failed to emit node completed event', { error: error as Error });
          }

          // Store results
          nodeResults[nodeId] = {
            success: true,
            result: result.output,
            node: node.data?.label || node.type,
            nodeType: node.type,
            subtype: node.data?.subtype,
            timestamp: new Date().toISOString(),
            duration: nodeDuration
          };

          nodeOutputs[nodeId] = result.output;
          context.variables = { ...context.variables, ...(result.variables || {}) };
          
          // Log data flow for debugging
          logger.info('Node output stored', {
            nodeId,
            nodeType: node.type,
            outputKeys: Object.keys(result.output || {}),
            outputPreview: JSON.stringify(result.output || {}).substring(0, 200),
            nextNodes: workflow.edges
              .filter(e => e.source === nodeId)
              .map(e => ({ target: e.target, targetType: workflow.nodes.find(n => n.id === e.target)?.type }))
          });

        } catch (error) {
          const nodeDuration = Date.now() - nodeStartTime;
          try {
            logger.error(`Node failed: ${nodeId}`, error as Error, { runId, duration: nodeDuration });
          } catch (e) {
            logger.error('Node failed', error as Error, { nodeId, runId });
          }

          // Emit node failed event
          try {
            const executionMonitor = ExecutionMonitor.getInstance();
            if (executionMonitor) {
              executionMonitor.emitNodeFailed(runId, workflow.id, nodeId, (error as Error).message, { 
                duration: nodeDuration 
              });
            }
          } catch (emitError) {
            logger.warn('Failed to emit node failed event', { error: emitError as Error });
          }

          nodeResults[nodeId] = {
            success: false,
            error: (error as Error).message,
            node: node.data?.label || node.type,
            nodeType: node.type,
            subtype: node.data?.subtype,
            timestamp: new Date().toISOString(),
            duration: nodeDuration
          };

          // Check if we should continue execution
          if (node.data?.options?.continueOnError !== true) {
            try {
              logger.error(`Workflow execution stopped due to node failure: ${nodeId}`, { runId });
            } catch (e) {
              logger.error('Workflow stopped due to node failure', { nodeId, runId });
            }
            break; // Stop execution instead of throwing
          }
        }
      }

      const duration = Date.now() - startTime;
      try {
        logger.info('Workflow execution completed', { workflowId: workflow.id, runId, duration });
      } catch (e) {
        logger.info('Workflow execution completed', { workflowId: workflow.id, runId, duration });
      }

      // Get the last node in execution order that succeeded (not the first)
      let output: any = 'No result generated';
      for (let i = executionOrder.length - 1; i >= 0; i--) {
        const nodeId = executionOrder[i];
        const result = nodeResults[nodeId];
        if (result && result.success) {
          output = result.result;
          break;
        }
      }

      // Emit workflow completed event
      try {
        const executionMonitor = ExecutionMonitor.getInstance();
        if (executionMonitor) {
          executionMonitor.emitWorkflowCompleted(runId, workflow.id, { 
            output, 
            nodeResults, 
            duration 
          });
        }
      } catch (error) {
        logger.warn('Failed to emit workflow completed event', { error: error as Error });
      }

      // Unregister execution on success
      executionManager.unregisterExecution(runId);
      
      return {
        success: true,
        output: {
          text: output,
          nodeResults,
          executionOrder,
          nodeOutputs,
          duration
        },
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Unregister execution
      executionManager.unregisterExecution(runId);
      
      try {
        logger.error('Workflow execution failed', error as Error, { workflowId: workflow.id, runId, duration });
      } catch (e) {
        logger.error('Workflow execution failed', error as Error, { workflowId: workflow.id, runId, duration });
      }

      // Emit workflow failed/cancelled event
      try {
        const executionMonitor = ExecutionMonitor.getInstance();
        if (executionMonitor) {
          const isCancelled = (error as Error).message.includes('cancelled');
          if (isCancelled) {
            executionMonitor.emitWorkflowCancelled(runId, workflow.id, { duration });
          } else {
            executionMonitor.emitWorkflowFailed(runId, workflow.id, (error as Error).message, { 
              duration 
            });
          }
        }
      } catch (emitError) {
        logger.warn('Failed to emit workflow event', { error: emitError as Error });
      }
      
      return {
        success: false,
        error: (error as Error).message,
        duration
      };
    }
  }

  private validateWorkflow(workflow: Workflow): void {
    if (!workflow.nodes || workflow.nodes.length === 0) {
      throw new Error('Workflow must have at least one node');
    }

    // Allow single-node workflows without edges
    if (workflow.nodes.length > 1 && (!workflow.edges || workflow.edges.length === 0)) {
      throw new Error('Multi-node workflows must have edges connecting nodes');
    }

    // Check for orphaned nodes
    const nodeIds = new Set(workflow.nodes.map(n => n.id));
    const edgeNodeIds = new Set([
      ...workflow.edges.map(e => e.source),
      ...workflow.edges.map(e => e.target)
    ]);

    for (const nodeId of nodeIds) {
      if (!edgeNodeIds.has(nodeId)) {
        logger.warn('Orphaned node detected', { workflowId: workflow.id, nodeId });
      }
    }
  }

  private getExecutionOrder(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    const nodeIds = nodes.map(n => n.id);
    const executionOrder: string[] = [];
    const visited = new Set<string>();
    
    // Find start nodes (nodes with no incoming edges)
    const startNodes = nodeIds.filter(id => 
      !edges.some(edge => edge.target === id)
    );
    
    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      // Add current node
      executionOrder.push(nodeId);
      
      // Visit all outgoing nodes
      const outgoingEdges = edges.filter(edge => edge.source === nodeId);
      for (const edge of outgoingEdges) {
        visit(edge.target);
      }
    };
    
    // Visit all start nodes
    for (const nodeId of startNodes) {
      visit(nodeId);
    }
    
    // Add any remaining nodes (for disconnected components)
    for (const nodeId of nodeIds) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }
    
    return executionOrder;
  }

  private getNodeInput(
    node: WorkflowNode,
    nodeOutputs: Record<string, any>,
    edges: WorkflowEdge[]
  ): Record<string, any> {
    const inputEdges = edges.filter(edge => edge.target === node.id);
    const inputs: Record<string, any> = {};
    
    try {
      logger.info('Getting node input', {
        nodeId: node.id,
        nodeType: node.type,
        inputEdgesCount: inputEdges.length,
        inputEdges: inputEdges.map(e => ({ source: e.source, target: e.target })),
        nodeOutputsKeys: Object.keys(nodeOutputs),
        nodeOutputs: nodeOutputs
      });
    } catch (e) {
      logger.debug('Getting input for node', {
        nodeId: node.id,
        inputEdges: inputEdges.length,
        nodeOutputs: Object.keys(nodeOutputs)
      });
    }
    
    for (const edge of inputEdges) {
      const sourceNodeId = edge.source;
      const sourceOutput = nodeOutputs[sourceNodeId];
      
      if (sourceOutput !== undefined) {
        inputs[sourceNodeId] = sourceOutput;
        
        // Make AI output easily accessible
        if (sourceOutput.provider === 'OpenRouter' || sourceOutput.provider === 'OpenAI') {
          inputs.aiOutput = sourceOutput;
        }
      } else {
        try {
          logger.warn('Source node output not found', {
            nodeId: node.id,
            sourceNodeId,
            availableOutputs: Object.keys(nodeOutputs)
          });
        } catch (e) {
          logger.warn('Source node output not found', { nodeId: node.id, sourceNodeId, availableOutputs: Object.keys(nodeOutputs) });
        }
      }
    }
    
    return inputs;
  }

  // Apply mappings, normalize common fields and return prepared input
  private prepareNodeInput(
    node: WorkflowNode,
    nodeOutputs: Record<string, any>,
    edges: WorkflowEdge[]
  ): Record<string, any> {
    const rawInputs = this.getNodeInput(node, nodeOutputs, edges) || {};
    
    // If no inputs found from previous nodes, return empty object (don't fall back to initial context.input)
    // This ensures nodes only receive data from their predecessors, not from the initial workflow input
    if (Object.keys(rawInputs).length === 0) {
      try {
        logger.warn('No input found from previous nodes', {
          nodeId: node.id,
          nodeType: node.type,
          availableOutputs: Object.keys(nodeOutputs),
          incomingEdges: edges.filter(e => e.target === node.id).map(e => ({ source: e.source, target: e.target }))
        });
      } catch (e) {
        logger.warn('No input found from previous nodes', { nodeId: node.id, nodeType: node.type, availableOutputs: Object.keys(nodeOutputs) });
      }
      return {};
    }
    
    try {
      logger.info('Preparing node input', {
        nodeId: node.id,
        nodeType: node.type,
        rawInputsKeys: Object.keys(rawInputs),
        rawInputs,
        nodeOutputsKeys: Object.keys(nodeOutputs),
        nodeOutputs
      });
    } catch (e) {
      logger.debug('Preparing input for node', { nodeId: node.id, rawInputsKeys: Object.keys(rawInputs) });
    }

    // Resolve edge-level mappings if provided (edge.data.mappings)
    const inputEdges = edges.filter(e => e.target === node.id);
    const mapped: Record<string, any> = {};
    for (const edge of inputEdges) {
      const mappings = (edge as any)?.data?.mappings as Record<string, string> | undefined;
      if (!mappings) continue;
      for (const [toPath, template] of Object.entries(mappings)) {
        const value = this.resolveTemplate(template, rawInputs, nodeOutputs);
        if (value !== undefined) {
          this.setByPath(mapped, toPath, value);
        }
      }
    }

    // Node-level mappings (node.data.mappings)
    const nodeMappings = (node as any)?.data?.mappings as Record<string, string> | undefined;
    if (nodeMappings) {
      for (const [toPath, template] of Object.entries(nodeMappings)) {
        const value = this.resolveTemplate(template, rawInputs, nodeOutputs);
        if (value !== undefined) {
          this.setByPath(mapped, toPath, value);
        }
      }
    }

    // Merge raw inputs with mapped, mapped takes precedence
    const input = { ...rawInputs, ...mapped } as Record<string, any>;

    // Auto-flatten: If there's only one input source and it's an object, merge its properties into input root
    // This makes data flow more intuitive (nodes can access context.input.data instead of context.input[sourceNodeId].data)
    const inputKeys = Object.keys(input).filter(key => key !== 'data' && key !== 'filePath' && key !== 'aiOutput');
    if (inputKeys.length === 1) {
      const sourceNodeId = inputKeys[0];
      const sourceOutput = input[sourceNodeId];
      if (sourceOutput && typeof sourceOutput === 'object' && !Array.isArray(sourceOutput)) {
        // Merge source output properties into input root, but keep sourceNodeId key too for compatibility
        Object.assign(input, sourceOutput);
      }
    }

    // Normalize common aliases to reduce friction across nodes
    // BUT: Don't override existing data with aliases - only add if missing
    const aliases: Array<[string, string]> = [
      ['prompt', 'text'],
      ['prompt', 'content'],
      ['text', 'content'],
      ['query', 'prompt']
    ];
    for (const [primary, alias] of aliases) {
      // Only add alias if primary doesn't exist AND we have actual data (not just prompt from initial input)
      if (input[primary] === undefined && input[alias] !== undefined) {
        // Skip if this is just the default "prompt" from initial workflow input
        // We want to preserve the actual node output data
        if (primary === 'prompt' && inputKeys.length > 0 && Object.keys(input).length > inputKeys.length) {
          // We have node output data, don't override with prompt alias
          continue;
        }
        input[primary] = input[alias];
      }
    }

    try {
      logger.info('Prepared node input result', {
        nodeId: node.id,
        nodeType: node.type,
        finalInputKeys: Object.keys(input),
        finalInput: input
      });
    } catch (e) {
      logger.debug('Prepared input result for node', { nodeId: node.id, inputKeys: Object.keys(input) });
    }

    return input;
  }

  private resolveTemplate(template: string, rawInputs: Record<string, any>, nodeOutputs: Record<string, any>): any {
    // Supports {{nodeId.path.to.field}} or {{input.path}}
    if (typeof template !== 'string') return undefined;
    const re = /\{\{\s*([^}]+)\s*\}\}/g;
    const match = re.exec(template);
    if (!match) return template; // literal value
    const expr = match[1];
    const [root, ...pathParts] = expr.split('.');
    let base: any;
    if (root === 'input') {
      base = rawInputs;
    } else {
      base = nodeOutputs[root];
    }
    return this.getByPath(base, pathParts.join('.'));
  }

  private getByPath(obj: any, path: string): any {
    if (!obj || !path) return obj;
    return path.split('.').reduce((acc: any, key: string) => (acc ? acc[key] : undefined), obj);
  }

  private setByPath(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let curr = obj;
    while (parts.length > 1) {
      const key = parts.shift() as string;
      curr[key] = curr[key] ?? {};
      curr = curr[key];
    }
    curr[parts[0]] = value;
  }

  // Lightweight schema validator (can be upgraded to AJV). Supports required/type checks.
  private validateAgainstSchema(schema: any, data: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!schema || typeof schema !== 'object') return { valid: true, errors };
    const props = schema.properties || {};
    for (const [key, def] of Object.entries<any>(props)) {
      const val = (data as any)[key];
      if (def.required && (val === undefined || val === null || (def.type === 'string' && val === ''))) {
        errors.push(`Field '${key}' is required`);
        continue;
      }
      if (val !== undefined && def.type && typeof val !== def.type) {
        // Allow number-like strings when type is number
        if (!(def.type === 'number' && typeof val === 'string' && !isNaN(Number(val)))) {
          errors.push(`Field '${key}' must be of type ${def.type}`);
        }
      }
      if (def.enum && val !== undefined && !def.enum.includes(val)) {
        errors.push(`Field '${key}' must be one of: ${def.enum.join(', ')}`);
      }
      if (def.minimum !== undefined && typeof val === 'number' && val < def.minimum) {
        errors.push(`Field '${key}' must be >= ${def.minimum}`);
      }
      if (def.maximum !== undefined && typeof val === 'number' && val > def.maximum) {
        errors.push(`Field '${key}' must be <= ${def.maximum}`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  async executeNodeWithRetry(
    node: WorkflowNode,
    context: ExecutionContext,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<ExecutionResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          logger.info('Retrying node execution', {
            nodeId: node.id,
            attempt,
            maxRetries,
            runId: context.runId
          });
          
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, backoffMs * Math.pow(2, attempt - 1)));
        }
        
        return await this.nodeRunner.executeNode(node, context);
        
      } catch (error) {
        lastError = error as Error;
        logger.warn('Node execution attempt failed', {
          nodeId: node.id,
          attempt,
          error: lastError.message,
          runId: context.runId
        });
        
        if (attempt === maxRetries) {
          break;
        }
      }
    }
    
    throw lastError || new Error('Node execution failed');
  }

  // Agent Orchestration Methods

  /**
   * Check if a node is an agent node
   */
  private isAgentNode(node: WorkflowNode): boolean {
    const subtype = node.data?.subtype || '';
    const type = node.type || '';
    
    // Check if node is an agent node
    return subtype.startsWith('agent-') || 
           subtype === 'agent' ||
           type === 'agent' ||
           (subtype && ['agent-context', 'agent-decision', 'agent-goal', 'agent-reasoning', 'agent-state'].includes(subtype));
  }

  /**
   * Register all agent nodes with the orchestrator before workflow execution
   */
  private registerAgentNodes(nodes: WorkflowNode[], runId: string): void {
    try {
      const agentNodes = nodes.filter(node => this.isAgentNode(node));
      
      if (agentNodes.length === 0) {
        logger.debug('No agent nodes found in workflow', { runId });
        return;
      }

      logger.info('Registering agent nodes with orchestrator', {
        runId,
        agentCount: agentNodes.length,
        agentNodes: agentNodes.map(n => ({ id: n.id, subtype: n.data?.subtype, label: n.data?.label }))
      });

      for (const node of agentNodes) {
        const agentId = node.id;
        const agentSubtype = node.data?.subtype || 'agent';
        const agentLabel = node.data?.label || node.id;

        // Check if agent is already registered
        const existingAgents = agentOrchestrator.getAgents();
        if (existingAgents.find(a => a.id === agentId)) {
          logger.debug('Agent already registered', { agentId, runId });
          continue;
        }

        // Create agent definition
        const agent: Agent = {
          id: agentId,
          name: agentLabel,
          type: 'primary', // Default to primary, can be configured per node
          capabilities: [agentSubtype],
          status: 'idle',
          workload: 0,
          maxWorkload: 1, // Each agent node can handle one task at a time
          preferences: {
            taskTypes: [agentSubtype],
            priority: 5, // Default priority
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

        // Register agent
        agentOrchestrator.registerAgent(agent);
        logger.info('Agent registered with orchestrator', {
          agentId,
          name: agent.name,
          subtype: agentSubtype,
          runId
        });
      }
    } catch (error: any) {
      logger.error('Failed to register agent nodes', error, { runId });
      // Don't throw - allow workflow to continue even if registration fails
    }
  }

  /**
   * Execute an agent node through the orchestrator
   */
  private async executeAgentNodeWithOrchestration(
    node: WorkflowNode,
    context: ExecutionContext,
    runId: string
  ): Promise<ExecutionResult> {
    const agentId = node.id;
    const agentSubtype = node.data?.subtype || 'agent';
    const agentLabel = node.data?.label || node.id;
    const startTime = Date.now();

    try {
      // Ensure agent is registered
      const existingAgents = agentOrchestrator.getAgents();
      if (!existingAgents.find(a => a.id === agentId)) {
        logger.warn('Agent not registered, registering now', { agentId, runId });
        this.registerAgentNodes([node], runId);
      }

      // Update agent status to busy
      agentOrchestrator.updateAgentStatus(agentId, 'busy', `task-${node.id}-${runId}`);

      // Create task for orchestrator
      const task: Task = {
        id: `task-${node.id}-${runId}-${Date.now()}`,
        name: `${agentLabel} (${agentSubtype})`,
        description: `Execute ${agentSubtype} node: ${agentLabel}`,
        type: agentSubtype,
        priority: 5, // Default priority, can be configured
        requirements: [agentSubtype],
        dependencies: [],
        estimatedDuration: 5000, // 5 seconds default
        status: 'pending',
        metadata: {
          nodeId: node.id,
          workflowId: context.workflowId,
          runId: context.runId,
          input: context.input
        }
      };

      // Submit task to orchestrator
      const taskId = agentOrchestrator.submitTask(task);
      logger.info('Task submitted to orchestrator', {
        taskId,
        agentId,
        nodeId: node.id,
        runId
      });

      // Assign task to agent (immediate assignment for sequential execution)
      const assigned = agentOrchestrator.assignTask(taskId, agentId);
      if (!assigned) {
        logger.warn('Failed to assign task to agent, executing directly', {
          taskId,
          agentId,
          runId
        });
      }

      // Execute the node
      logger.info('Executing agent node through orchestrator', {
        agentId,
        nodeId: node.id,
        taskId,
        runId
      });

      const result = await this.executeNodeWithRetry(node, context);

      // Complete task
      if (result.success) {
        agentOrchestrator.completeTask(taskId, result.output);
        logger.info('Agent task completed', {
          taskId,
          agentId,
          nodeId: node.id,
          runId,
          duration: Date.now() - startTime
        });
      } else {
        agentOrchestrator.failTask(taskId, result.error || 'Unknown error');
        logger.error('Agent task failed', {
          taskId,
          agentId,
          nodeId: node.id,
          error: result.error,
          runId
        });
      }

      // Update agent status back to idle
      agentOrchestrator.updateAgentStatus(agentId, 'idle');

      return result;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Update agent status to error
      try {
        agentOrchestrator.updateAgentStatus(agentId, 'error');
      } catch (e) {
        logger.warn('Failed to update agent status to error', { agentId, error: e });
      }

      logger.error('Agent node execution failed', error, {
        agentId,
        nodeId: node.id,
        runId,
        duration
      });

      // Return error result
      return {
        success: false,
        error: error.message || 'Agent node execution failed',
        duration
      };
    }
  }
}
