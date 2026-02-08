import { Workflow, WorkflowNode, WorkflowEdge, WorkflowRun, ExecutionContext, ExecutionResult } from '@rex/shared';
import { agentOrchestrator, Agent, Task } from '../core/orchestration/agent-orchestrator';
import { workflowManager, WorkflowExecutionPlan } from '../core/orchestration/workflow-manager';
import { coordinationService, CoordinationMessage } from '../core/orchestration/coordination-service';
const logger = require("../utils/logger");

export interface OrchestrationConfig {
  enableAgentOrchestration: boolean;
  enableWorkflowManagement: boolean;
  enableCoordination: boolean;
  maxConcurrentWorkflows: number;
  maxConcurrentAgents: number;
  coordinationTimeout: number;
  resourceLimits: {
    maxMemory: number;
    maxCPU: number;
    maxAgents: number;
  };
}

export interface OrchestrationResult {
  success: boolean;
  workflowId: string;
  executionId: string;
  agentAssignments: { [agentId: string]: string[] };
  coordinationLog: any[];
  executionTime: number;
  resourceUsage: {
    memory: number;
    cpu: number;
    agents: string[];
  };
  error?: string;
}

export class OrchestrationService {
  private config: OrchestrationConfig;
  private activeOrchestrations: Map<string, any> = new Map();
  private orchestrationHistory: any[] = [];

  constructor(config?: Partial<OrchestrationConfig>) {
    this.config = {
      enableAgentOrchestration: true,
      enableWorkflowManagement: true,
      enableCoordination: true,
      maxConcurrentWorkflows: 5,
      maxConcurrentAgents: 10,
      coordinationTimeout: 300000, // 5 minutes
      resourceLimits: {
        maxMemory: 1024 * 1024 * 1024, // 1GB
        maxCPU: 4,
        maxAgents: 10
      },
      ...config
    };
  }

  // Orchestration Management
  public async orchestrateWorkflow(workflow: Workflow, input: any, options?: any): Promise<OrchestrationResult> {
    try {
      const orchestrationId = this.generateOrchestrationId();
      const startTime = Date.now();

      logger.info('Starting workflow orchestration', {
        orchestrationId,
        workflowId: workflow.id,
        nodeCount: workflow.nodes.length,
        edgeCount: workflow.edges.length
      });

      // Initialize orchestration
      this.activeOrchestrations.set(orchestrationId, {
        id: orchestrationId,
        workflowId: workflow.id,
        status: 'initializing',
        startTime,
        input,
        options
      });

      // Step 1: Register workflow if not already registered
      if (this.config.enableWorkflowManagement) {
        workflowManager.registerWorkflow(workflow);
      }

      // Step 2: Create execution plan
      let executionPlan: WorkflowExecutionPlan;
      if (this.config.enableWorkflowManagement) {
        const planId = workflowManager.createExecutionPlan(workflow.id, input, options);
        executionPlan = workflowManager.getExecutionPlans().find(p => p.id === planId)!;
      } else {
        executionPlan = this.createSimpleExecutionPlan(workflow, input, options);
      }

      // Step 3: Coordinate agent assignments
      const agentAssignments = await this.coordinateAgentAssignments(workflow, executionPlan);

      // Step 4: Execute workflow with coordination
      const executionResult = await this.executeWorkflowWithCoordination(
        workflow, 
        executionPlan, 
        agentAssignments, 
        input
      );

      // Step 5: Complete orchestration
      const orchestrationResult: OrchestrationResult = {
        success: executionResult.success,
        workflowId: workflow.id,
        executionId: orchestrationId,
        agentAssignments,
        coordinationLog: executionResult.coordinationLog || [],
        executionTime: Date.now() - startTime,
        resourceUsage: executionResult.resourceUsage || {
          memory: 0,
          cpu: 0,
          agents: Object.keys(agentAssignments)
        },
        error: executionResult.error
      };

      // Update orchestration status
      const orchestration = this.activeOrchestrations.get(orchestrationId);
      if (orchestration) {
        orchestration.status = orchestrationResult.success ? 'completed' : 'failed';
        orchestration.result = orchestrationResult;
      }

      // Record in history
      this.orchestrationHistory.push(orchestrationResult);

      logger.info('Workflow orchestration completed', {
        orchestrationId,
        workflowId: workflow.id,
        success: orchestrationResult.success,
        executionTime: orchestrationResult.executionTime
      });

      return orchestrationResult;
    } catch (error: any) {
      logger.error('Workflow orchestration failed', error, { workflowId: workflow.id });
      throw error;
    }
  }

  public async orchestrateMultiAgentTask(taskData: any, agents: string[], options?: any): Promise<OrchestrationResult> {
    try {
      const orchestrationId = this.generateOrchestrationId();
      const startTime = Date.now();

      logger.info('Starting multi-agent task orchestration', {
        orchestrationId,
        taskType: taskData.type,
        agentCount: agents.length
      });

      // Initialize orchestration
      this.activeOrchestrations.set(orchestrationId, {
        id: orchestrationId,
        type: 'multi_agent_task',
        status: 'initializing',
        startTime,
        taskData,
        agents
      });

      // Step 1: Coordinate agents
      const coordinationResult = await this.coordinateMultiAgentExecution(taskData, agents, options);

      // Step 2: Execute coordinated task
      const executionResult = await this.executeMultiAgentTask(taskData, agents, coordinationResult);

      // Step 3: Complete orchestration
      const orchestrationResult: OrchestrationResult = {
        success: executionResult.success,
        workflowId: 'multi-agent-task',
        executionId: orchestrationId,
        agentAssignments: coordinationResult.agentAssignments,
        coordinationLog: coordinationResult.coordinationLog,
        executionTime: Date.now() - startTime,
        resourceUsage: executionResult.resourceUsage || {
          memory: 0,
          cpu: 0,
          agents
        },
        error: executionResult.error
      };

      // Update orchestration status
      const orchestration = this.activeOrchestrations.get(orchestrationId);
      if (orchestration) {
        orchestration.status = orchestrationResult.success ? 'completed' : 'failed';
        orchestration.result = orchestrationResult;
      }

      // Record in history
      this.orchestrationHistory.push(orchestrationResult);

      logger.info('Multi-agent task orchestration completed', {
        orchestrationId,
        success: orchestrationResult.success,
        executionTime: orchestrationResult.executionTime
      });

      return orchestrationResult;
    } catch (error: any) {
      logger.error('Multi-agent task orchestration failed', error);
      throw error;
    }
  }

  // Agent Coordination
  private async coordinateAgentAssignments(workflow: Workflow, executionPlan: WorkflowExecutionPlan): Promise<{ [agentId: string]: string[] }> {
    try {
      const agentAssignments: { [agentId: string]: string[] } = {};

      if (!this.config.enableAgentOrchestration) {
        // Simple assignment without orchestration
        const availableAgents = this.getAvailableAgents();
        for (let i = 0; i < executionPlan.executionOrder.length; i++) {
          const nodeId = executionPlan.executionOrder[i];
          const agentId = availableAgents[i % availableAgents.length];
          if (!agentAssignments[agentId]) {
            agentAssignments[agentId] = [];
          }
          agentAssignments[agentId].push(nodeId);
        }
        return agentAssignments;
      }

      // Advanced agent coordination
      const requiredCapabilities = this.extractRequiredCapabilities(workflow);
      const suitableAgents = this.findSuitableAgents(requiredCapabilities);
      
      if (suitableAgents.length === 0) {
        throw new Error('No suitable agents found for workflow execution');
      }

      // Assign nodes to agents based on capabilities and workload
      for (const nodeId of executionPlan.executionOrder) {
        const node = workflow.nodes.find(n => n.id === nodeId);
        if (!node) continue;

        const nodeCapabilities = this.extractNodeCapabilities(node);
        const bestAgent = this.selectBestAgent(suitableAgents, nodeCapabilities);
        
        if (bestAgent) {
          if (!agentAssignments[bestAgent.id]) {
            agentAssignments[bestAgent.id] = [];
          }
          agentAssignments[bestAgent.id].push(nodeId);
        }
      }

      logger.info('Agent assignments coordinated', {
        workflowId: workflow.id,
        agentCount: Object.keys(agentAssignments).length,
        totalAssignments: Object.values(agentAssignments).reduce((sum, nodes) => sum + nodes.length, 0)
      });

      return agentAssignments;
    } catch (error: any) {
      logger.error('Failed to coordinate agent assignments', error, { workflowId: workflow.id });
      throw error;
    }
  }

  private async coordinateMultiAgentExecution(taskData: any, agents: string[], options?: any): Promise<any> {
    try {
      if (!this.config.enableCoordination) {
        return {
          agentAssignments: { [agents[0]]: ['task'] },
          coordinationLog: []
        };
      }

      // Send coordination signals to all agents
      const coordinationMessages = await Promise.all(
        agents.map(agentId => 
          coordinationService.sendMessage({
            type: 'coordination_signal',
            from: 'orchestrator',
            to: [agentId],
            payload: {
              taskData,
              coordinationId: this.generateOrchestrationId(),
              options
            },
            priority: 8,
            ttl: 300000
          })
        )
      );

      // Wait for coordination responses
      const coordinationResult = await this.waitForCoordinationResponses(coordinationMessages);

      return {
        agentAssignments: coordinationResult.agentAssignments,
        coordinationLog: coordinationResult.coordinationLog
      };
    } catch (error: any) {
      logger.error('Failed to coordinate multi-agent execution', error);
      throw error;
    }
  }

  // Workflow Execution
  private async executeWorkflowWithCoordination(
    workflow: Workflow, 
    executionPlan: WorkflowExecutionPlan, 
    agentAssignments: { [agentId: string]: string[] },
    input: any
  ): Promise<ExecutionResult> {
    try {
      const startTime = Date.now();
      const coordinationLog: any[] = [];

      // Initialize execution context
      const context: ExecutionContext = {
        runId: this.generateRunId(),
        workflowId: workflow.id,
        nodeId: '',
        input,
        output: {},
        variables: { ...input },
        credentials: {},
        sessionId: 'orchestration',
        agentId: 'orchestrator'
      };

      // Execute nodes in coordination order
      for (const nodeId of executionPlan.executionOrder) {
        const node = workflow.nodes.find(n => n.id === nodeId);
        if (!node) continue;

        // Find assigned agent
        const assignedAgent = this.findAssignedAgent(nodeId, agentAssignments);
        
        // Coordinate node execution
        const nodeResult = await this.executeNodeWithCoordination(node, context, assignedAgent);
        
        if (!nodeResult.success) {
          logger.error('Node execution failed', { nodeId, error: nodeResult.error });
          return {
            success: false,
            error: nodeResult.error,
            duration: Date.now() - startTime
          };
        }

        // Update context
        context.output = { ...context.output, ...nodeResult.output };
        context.variables = { ...context.variables, ...nodeResult.output };

        // Log coordination
        coordinationLog.push({
          timestamp: new Date().toISOString(),
          nodeId,
          agentId: assignedAgent,
          result: nodeResult,
          duration: nodeResult.duration
        });
      }

      const executionTime = Date.now() - startTime;
      
      logger.info('Workflow execution with coordination completed', {
        workflowId: workflow.id,
        executionTime,
        coordinationSteps: coordinationLog.length
      });

      return {
        success: true,
        output: context.output,
        duration: executionTime,
        coordinationLog,
        resourceUsage: {
          memory: 0, // Would be calculated in real implementation
          cpu: 0,
          agents: Object.keys(agentAssignments)
        }
      };
    } catch (error: any) {
      logger.error('Failed to execute workflow with coordination', error, { workflowId: workflow.id });
      return {
        success: false,
        error: error.message,
        duration: Date.now() - Date.now()
      };
    }
  }

  private async executeMultiAgentTask(taskData: any, agents: string[], coordinationResult: any): Promise<ExecutionResult> {
    try {
      const startTime = Date.now();
      const coordinationLog: any[] = [];

      // Execute task with coordinated agents
      for (const agentId of agents) {
        const agentTasks = coordinationResult.agentAssignments[agentId] || [];
        
        for (const task of agentTasks) {
          const taskResult = await this.executeAgentTask(agentId, task, taskData);
          
          if (!taskResult.success) {
            logger.error('Agent task execution failed', { agentId, task, error: taskResult.error });
            return {
              success: false,
              error: taskResult.error,
              duration: Date.now() - startTime
            };
          }

          coordinationLog.push({
            timestamp: new Date().toISOString(),
            agentId,
            task,
            result: taskResult,
            duration: taskResult.duration
          });
        }
      }

      const executionTime = Date.now() - startTime;
      
      logger.info('Multi-agent task execution completed', {
        agentCount: agents.length,
        executionTime,
        coordinationSteps: coordinationLog.length
      });

      return {
        success: true,
        output: { coordinated: true, agentCount: agents.length },
        duration: executionTime,
        coordinationLog,
        resourceUsage: {
          memory: 0,
          cpu: 0,
          agents
        }
      };
    } catch (error: any) {
      logger.error('Failed to execute multi-agent task', error);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - Date.now()
      };
    }
  }

  // Node Execution
  private async executeNodeWithCoordination(node: WorkflowNode, context: ExecutionContext, agentId?: string): Promise<ExecutionResult> {
    try {
      if (!this.config.enableCoordination || !agentId) {
        // Execute without coordination
        return this.executeNodeDirectly(node, context);
      }

      // Send task assignment to agent
      const assignmentMessage = await coordinationService.sendTaskAssignment(agentId, node.id, {
        node,
        context: {
          input: context.input,
          variables: context.variables,
          credentials: context.credentials
        }
      });

      // Wait for task completion
      const taskResult = await this.waitForTaskCompletion(agentId, node.id);
      
      return taskResult;
    } catch (error: any) {
      logger.error('Failed to execute node with coordination', error, { nodeId: node.id, agentId });
      return {
        success: false,
        error: error.message,
        duration: 0
      };
    }
  }

  private async executeNodeDirectly(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    try {
      // This would integrate with the existing node execution system
      // For now, return a mock result
      return {
        success: true,
        output: { [node.id]: 'executed_directly' },
        duration: 100
      };
    } catch (error: any) {
      logger.error('Failed to execute node directly', error, { nodeId: node.id });
      return {
        success: false,
        error: error.message,
        duration: 0
      };
    }
  }

  private async executeAgentTask(agentId: string, task: string, taskData: any): Promise<ExecutionResult> {
    try {
      // This would integrate with the agent execution system
      // For now, return a mock result
      return {
        success: true,
        output: { agentId, task, result: 'completed' },
        duration: 200
      };
    } catch (error: any) {
      logger.error('Failed to execute agent task', error, { agentId, task });
      return {
        success: false,
        error: error.message,
        duration: 0
      };
    }
  }

  // Utility Methods
  private createSimpleExecutionPlan(workflow: Workflow, input: any, options?: any): WorkflowExecutionPlan {
    return {
      id: this.generatePlanId(),
      workflowId: workflow.id,
      executionOrder: workflow.nodes.map(n => n.id),
      dependencies: new Map(),
      estimatedDuration: workflow.nodes.length * 1000,
      resourceRequirements: {
        agents: ['default-agent'],
        memory: workflow.nodes.length * 1024,
        cpu: Math.ceil(workflow.nodes.length / 2)
      },
      priority: options?.priority || 5,
      deadline: options?.deadline,
      status: 'ready',
      metadata: { input, options }
    };
  }

  private extractRequiredCapabilities(workflow: Workflow): string[] {
    const capabilities = new Set<string>();
    
    for (const node of workflow.nodes) {
      const nodeCapabilities = this.extractNodeCapabilities(node);
      nodeCapabilities.forEach(cap => capabilities.add(cap));
    }
    
    return Array.from(capabilities);
  }

  private extractNodeCapabilities(node: WorkflowNode): string[] {
    // Extract capabilities based on node type and configuration
    const capabilities: string[] = [];
    
    switch (node.type) {
      case 'ai':
        capabilities.push('ai_processing', 'llm_integration');
        break;
      case 'llm':
        capabilities.push('llm_integration', 'text_processing');
        break;
      case 'integrations':
        capabilities.push('api_integration', 'external_services');
        break;
      case 'data':
        capabilities.push('data_processing', 'data_transformation');
        break;
      case 'logic':
        capabilities.push('logical_processing', 'decision_making');
        break;
      default:
        capabilities.push('general_processing');
    }
    
    return capabilities;
  }

  private findSuitableAgents(requiredCapabilities: string[]): Agent[] {
    if (!this.config.enableAgentOrchestration) {
      return [];
    }
    
    return agentOrchestrator.getAgents().filter(agent => 
      agent.status === 'idle' && 
      requiredCapabilities.every(cap => agent.capabilities.includes(cap))
    );
  }

  private selectBestAgent(agents: Agent[], nodeCapabilities: string[]): Agent | null {
    if (agents.length === 0) return null;
    
    // Simple selection based on workload and capabilities
    return agents.reduce((best, current) => {
      const currentScore = this.calculateAgentScore(current, nodeCapabilities);
      const bestScore = this.calculateAgentScore(best, nodeCapabilities);
      return currentScore > bestScore ? current : best;
    });
  }

  private calculateAgentScore(agent: Agent, nodeCapabilities: string[]): number {
    let score = 0;
    
    // Capability match score
    const capabilityMatches = nodeCapabilities.filter(cap => 
      agent.capabilities.includes(cap)
    ).length;
    score += capabilityMatches * 10;
    
    // Workload availability score
    const workloadScore = (agent.maxWorkload - agent.workload) / agent.maxWorkload;
    score += workloadScore * 5;
    
    // Performance score
    score += agent.metadata.performance.successRate * 3;
    
    return score;
  }

  private findAssignedAgent(nodeId: string, agentAssignments: { [agentId: string]: string[] }): string | undefined {
    for (const [agentId, nodes] of Object.entries(agentAssignments)) {
      if (nodes.includes(nodeId)) {
        return agentId;
      }
    }
    return undefined;
  }

  private getAvailableAgents(): string[] {
    if (!this.config.enableAgentOrchestration) {
      return ['default-agent'];
    }
    
    return agentOrchestrator.getAgents()
      .filter(agent => agent.status === 'idle')
      .map(agent => agent.id);
  }

  private async waitForCoordinationResponses(messageIds: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const responses: any[] = [];
      const checkInterval = setInterval(() => {
        if (responses.length >= messageIds.length) {
          clearInterval(checkInterval);
          resolve({
            agentAssignments: this.generateAgentAssignments(responses),
            coordinationLog: responses
          });
        }
      }, 1000);

      // Timeout
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Coordination timeout'));
      }, this.config.coordinationTimeout);
    });
  }

  private async waitForTaskCompletion(agentId: string, taskId: string): Promise<ExecutionResult> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        // This would check for actual task completion
        // For now, resolve with mock result
        clearInterval(checkInterval);
        resolve({
          success: true,
          output: { [taskId]: 'completed_by_agent', agentId },
          duration: 1000
        });
      }, 1000);

      // Timeout
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Task completion timeout'));
      }, this.config.coordinationTimeout);
    });
  }

  private generateAgentAssignments(responses: any[]): { [agentId: string]: string[] } {
    const assignments: { [agentId: string]: string[] } = {};
    
    for (const response of responses) {
      const agentId = response.agentId || 'unknown';
      if (!assignments[agentId]) {
        assignments[agentId] = [];
      }
      assignments[agentId].push(response.taskId || 'task');
    }
    
    return assignments;
  }

  // Monitoring and Analytics
  public getOrchestrationStatus(): any {
    try {
      const activeOrchestrations = this.activeOrchestrations.size;
      const totalHistory = this.orchestrationHistory.length;
      
      return {
        orchestration: {
          active: activeOrchestrations,
          total: totalHistory,
          successRate: this.calculateSuccessRate()
        },
        agents: this.config.enableAgentOrchestration ? agentOrchestrator.getSystemStatus() : null,
        workflows: this.config.enableWorkflowManagement ? workflowManager.getSystemStatus() : null,
        coordination: this.config.enableCoordination ? coordinationService.getCoordinationStatus() : null
      };
    } catch (error: any) {
      logger.error('Failed to get orchestration status', error);
      return null;
    }
  }

  public getOrchestrationHistory(limit?: number): any[] {
    try {
      return this.orchestrationHistory.slice(-(limit || 100));
    } catch (error: any) {
      logger.error('Failed to get orchestration history', error);
      return [];
    }
  }

  private calculateSuccessRate(): number {
    try {
      if (this.orchestrationHistory.length === 0) return 0;
      
      const successfulOrchestrations = this.orchestrationHistory.filter(h => h.success).length;
      return successfulOrchestrations / this.orchestrationHistory.length;
    } catch (error: any) {
      logger.error('Failed to calculate success rate', error);
      return 0;
    }
  }

  // Utility Methods
  private generateOrchestrationId(): string {
    return `orch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRunId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public getters
  public getActiveOrchestrations(): any[] {
    return Array.from(this.activeOrchestrations.values());
  }

  public getConfig(): OrchestrationConfig {
    return this.config;
  }

  public updateConfig(newConfig: Partial<OrchestrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Orchestration service config updated', { config: this.config });
  }
}

export const orchestrationService = new OrchestrationService();
