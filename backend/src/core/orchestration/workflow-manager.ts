import { Workflow, WorkflowNode, WorkflowEdge, WorkflowRun, ExecutionContext, ExecutionResult } from '@rex/shared';
const logger = require("../../utils/logger");

export interface WorkflowExecutionPlan {
  id: string;
  workflowId: string;
  executionOrder: string[];
  dependencies: Map<string, string[]>;
  estimatedDuration: number;
  resourceRequirements: {
    agents: string[];
    memory: number;
    cpu: number;
  };
  priority: number;
  deadline?: string;
  status: 'planned' | 'ready' | 'executing' | 'completed' | 'failed' | 'cancelled';
  metadata: any;
}

export interface WorkflowExecutionContext extends ExecutionContext {
  planId: string;
  workflowId: string;
  executionPlan: WorkflowExecutionPlan;
  agentId?: string;
  coordinationData: any;
}

export interface WorkflowExecutionResult extends ExecutionResult {
  planId: string;
  workflowId: string;
  executionTime: number;
  resourceUsage: {
    memory: number;
    cpu: number;
    agents: string[];
  };
  coordinationLog: any[];
}

export interface WorkflowManagerConfig {
  maxConcurrentWorkflows: number;
  executionTimeout: number;
  retryAttempts: number;
  resourceLimits: {
    maxMemory: number;
    maxCPU: number;
    maxAgents: number;
  };
  schedulingStrategy: 'fifo' | 'priority' | 'resource_based' | 'deadline_based';
  coordinationMode: 'centralized' | 'distributed' | 'hybrid';
}

export class WorkflowManager {
  private workflows: Map<string, Workflow> = new Map();
  private executionPlans: Map<string, WorkflowExecutionPlan> = new Map();
  private activeExecutions: Map<string, WorkflowExecutionContext> = new Map();
  private executionQueue: WorkflowExecutionPlan[] = [];
  private config: WorkflowManagerConfig;
  private executionHistory: any[] = [];

  constructor(config?: Partial<WorkflowManagerConfig>) {
    this.config = {
      maxConcurrentWorkflows: 5,
      executionTimeout: 1800000, // 30 minutes
      retryAttempts: 3,
      resourceLimits: {
        maxMemory: 1024 * 1024 * 1024, // 1GB
        maxCPU: 4,
        maxAgents: 10
      },
      schedulingStrategy: 'priority',
      coordinationMode: 'hybrid',
      ...config
    };
  }

  // Workflow Registration and Management
  public registerWorkflow(workflow: Workflow): void {
    try {
      this.workflows.set(workflow.id, workflow);
      logger.info('Workflow registered', {
        workflowId: workflow.id,
        name: workflow.name,
        nodeCount: workflow.nodes.length,
        edgeCount: workflow.edges.length
      });
    } catch (error: any) {
      logger.error('Failed to register workflow', error, { workflowId: workflow.id });
    }
  }

  public unregisterWorkflow(workflowId: string): void {
    try {
      const workflow = this.workflows.get(workflowId);
      if (workflow) {
        // Cancel any active executions
        this.cancelWorkflowExecution(workflowId);
        this.workflows.delete(workflowId);
        logger.info('Workflow unregistered', { workflowId });
      }
    } catch (error: any) {
      logger.error('Failed to unregister workflow', error, { workflowId });
    }
  }

  public updateWorkflow(workflowId: string, updates: Partial<Workflow>): boolean {
    try {
      const workflow = this.workflows.get(workflowId);
      if (!workflow) {
        logger.warn('Workflow not found for update', { workflowId });
        return false;
      }

      // Check if workflow is currently executing
      const activeExecution = this.getActiveExecution(workflowId);
      if (activeExecution) {
        logger.warn('Cannot update workflow while executing', { workflowId });
        return false;
      }

      // Update workflow
      Object.assign(workflow, updates);
      this.workflows.set(workflowId, workflow);
      
      logger.info('Workflow updated', { workflowId, updates: Object.keys(updates) });
      return true;
    } catch (error: any) {
      logger.error('Failed to update workflow', error, { workflowId });
      return false;
    }
  }

  // Execution Planning and Scheduling
  public createExecutionPlan(workflowId: string, input: any, options?: any): string {
    try {
      const workflow = this.workflows.get(workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      const planId = this.generatePlanId();
      const executionOrder = this.calculateExecutionOrder(workflow);
      const dependencies = this.calculateDependencies(workflow);
      const resourceRequirements = this.calculateResourceRequirements(workflow);
      const estimatedDuration = this.estimateExecutionDuration(workflow);

      const plan: WorkflowExecutionPlan = {
        id: planId,
        workflowId,
        executionOrder,
        dependencies,
        estimatedDuration,
        resourceRequirements,
        priority: options?.priority || 5,
        deadline: options?.deadline,
        status: 'planned',
        metadata: {
          input,
          options,
          createdAt: new Date().toISOString(),
          createdBy: options?.createdBy || 'system'
        }
      };

      this.executionPlans.set(planId, plan);
      this.executionQueue.push(plan);
      
      logger.info('Execution plan created', {
        planId,
        workflowId,
        estimatedDuration,
        resourceRequirements,
        priority: plan.priority
      });

      // Try to schedule immediately
      this.processExecutionQueue();
      return planId;
    } catch (error: any) {
      logger.error('Failed to create execution plan', error, { workflowId });
      throw error;
    }
  }

  public executeWorkflow(workflowId: string, input: any, options?: any): Promise<WorkflowExecutionResult> {
    return new Promise(async (resolve, reject) => {
      try {
        const planId = this.createExecutionPlan(workflowId, input, options);
        const plan = this.executionPlans.get(planId);
        
        if (!plan) {
          throw new Error('Execution plan not found');
        }

        // Wait for execution to complete
        const result = await this.waitForExecution(planId);
        resolve(result);
      } catch (error: any) {
        logger.error('Failed to execute workflow', error, { workflowId });
        reject(error);
      }
    });
  }

  public scheduleWorkflow(workflowId: string, input: any, scheduleTime: Date, options?: any): string {
    try {
      const planId = this.createExecutionPlan(workflowId, input, {
        ...options,
        scheduledFor: scheduleTime.toISOString()
      });

      // Schedule for later execution
      const delay = scheduleTime.getTime() - Date.now();
      if (delay > 0) {
        setTimeout(() => {
          this.processExecutionQueue();
        }, delay);
      }

      logger.info('Workflow scheduled', { planId, workflowId, scheduleTime });
      return planId;
    } catch (error: any) {
      logger.error('Failed to schedule workflow', error, { workflowId });
      throw error;
    }
  }

  // Execution Management
  public startExecution(planId: string): boolean {
    try {
      const plan = this.executionPlans.get(planId);
      if (!plan) {
        logger.warn('Execution plan not found', { planId });
        return false;
      }

      if (plan.status !== 'ready') {
        logger.warn('Execution plan not ready', { planId, status: plan.status });
        return false;
      }

      // Check resource availability
      if (!this.checkResourceAvailability(plan)) {
        logger.warn('Insufficient resources for execution', { planId });
        return false;
      }

      // Create execution context
      const context: WorkflowExecutionContext = {
        runId: this.generateRunId(),
        workflowId: plan.workflowId,
        nodeId: '',
        input: plan.metadata.input,
        output: {},
        variables: { ...plan.metadata.input },
        credentials: {},
        sessionId: 'system',
        agentId: 'system',
        planId,
        executionPlan: plan,
        coordinationData: {}
      };

      this.activeExecutions.set(planId, context);
      plan.status = 'executing';

      logger.info('Workflow execution started', {
        planId,
        workflowId: plan.workflowId,
        runId: context.runId
      });

      // Start execution
      this.executeWorkflowPlan(planId, context);
      return true;
    } catch (error: any) {
      logger.error('Failed to start execution', error, { planId });
      return false;
    }
  }

  public cancelExecution(planId: string): boolean {
    try {
      const plan = this.executionPlans.get(planId);
      const context = this.activeExecutions.get(planId);

      if (!plan) {
        logger.warn('Execution plan not found for cancellation', { planId });
        return false;
      }

      if (plan.status === 'completed' || plan.status === 'failed') {
        logger.warn('Cannot cancel completed execution', { planId, status: plan.status });
        return false;
      }

      // Cancel execution
      plan.status = 'cancelled';
      if (context) {
        this.activeExecutions.delete(planId);
      }

      logger.info('Workflow execution cancelled', { planId });
      return true;
    } catch (error: any) {
      logger.error('Failed to cancel execution', error, { planId });
      return false;
    }
  }

  public pauseExecution(planId: string): boolean {
    try {
      const plan = this.executionPlans.get(planId);
      if (!plan || plan.status !== 'executing') {
        logger.warn('Cannot pause execution', { planId, status: plan?.status });
        return false;
      }

      plan.status = 'ready';
      logger.info('Workflow execution paused', { planId });
      return true;
    } catch (error: any) {
      logger.error('Failed to pause execution', error, { planId });
      return false;
    }
  }

  public resumeExecution(planId: string): boolean {
    try {
      const plan = this.executionPlans.get(planId);
      if (!plan || plan.status !== 'ready') {
        logger.warn('Cannot resume execution', { planId, status: plan?.status });
        return false;
      }

      plan.status = 'executing';
      const context = this.activeExecutions.get(planId);
      if (context) {
        this.executeWorkflowPlan(planId, context);
      }

      logger.info('Workflow execution resumed', { planId });
      return true;
    } catch (error: any) {
      logger.error('Failed to resume execution', error, { planId });
      return false;
    }
  }

  // Execution Processing
  private async executeWorkflowPlan(planId: string, context: WorkflowExecutionContext): Promise<void> {
    try {
      const plan = this.executionPlans.get(planId);
      if (!plan) {
        throw new Error('Execution plan not found');
      }

      const workflow = this.workflows.get(plan.workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const startTime = Date.now();
      const coordinationLog: any[] = [];

      // Execute nodes in order
      for (const nodeId of plan.executionOrder) {
        if (plan.status !== 'executing') {
          break; // Execution was cancelled or paused
        }

        const node = workflow.nodes.find(n => n.id === nodeId);
        if (!node) {
          logger.warn('Node not found in workflow', { nodeId, workflowId: plan.workflowId });
          continue;
        }

        // Check dependencies
        const dependencies = plan.dependencies.get(nodeId) || [];
        const dependencyResults = await this.checkDependencies(dependencies, context);
        if (!dependencyResults.allSatisfied) {
          logger.warn('Dependencies not satisfied', { nodeId, dependencies });
          continue;
        }

        // Execute node
        const nodeResult = await this.executeNode(node, context);
        if (!nodeResult.success) {
          logger.error('Node execution failed', { nodeId, error: nodeResult.error });
          plan.status = 'failed';
          break;
        }

        // Update context
        context.output = { ...context.output, ...nodeResult.output };
        context.variables = { ...context.variables, ...nodeResult.output };

        // Log coordination
        coordinationLog.push({
          timestamp: new Date().toISOString(),
          nodeId,
          result: nodeResult,
          duration: nodeResult.duration
        });
      }

      // Complete execution
      const executionTime = Date.now() - startTime;
      const result: WorkflowExecutionResult = {
        success: plan.status === 'executing',
        output: context.output,
        duration: executionTime,
        planId,
        workflowId: plan.workflowId,
        executionTime,
        resourceUsage: {
          memory: 0, // Would be calculated in real implementation
          cpu: 0,
          agents: plan.resourceRequirements.agents
        },
        coordinationLog
      };

      plan.status = result.success ? 'completed' : 'failed';
      this.activeExecutions.delete(planId);
      this.executionHistory.push(result);

      logger.info('Workflow execution completed', {
        planId,
        workflowId: plan.workflowId,
        success: result.success,
        executionTime
      });

    } catch (error: any) {
      logger.error('Workflow execution failed', error, { planId });
      const plan = this.executionPlans.get(planId);
      if (plan) {
        plan.status = 'failed';
      }
      this.activeExecutions.delete(planId);
    }
  }

  private async executeNode(node: WorkflowNode, context: WorkflowExecutionContext): Promise<ExecutionResult> {
    try {
      // This would integrate with the existing node execution system
      // For now, return a mock result
      return {
        success: true,
        output: { [node.id]: 'executed' },
        duration: 100
      };
    } catch (error: any) {
      logger.error('Node execution failed', error, { nodeId: node.id });
      return {
        success: false,
        error: error.message,
        duration: 0
      };
    }
  }

  private async checkDependencies(dependencies: string[], context: WorkflowExecutionContext): Promise<{ allSatisfied: boolean; missing: string[] }> {
    try {
      const missing: string[] = [];
      
      for (const dep of dependencies) {
        if (!context.output[dep]) {
          missing.push(dep);
        }
      }

      return {
        allSatisfied: missing.length === 0,
        missing
      };
    } catch (error: any) {
      logger.error('Failed to check dependencies', error);
      return { allSatisfied: false, missing: dependencies };
    }
  }

  // Queue Processing
  private processExecutionQueue(): void {
    try {
      const availableSlots = this.config.maxConcurrentWorkflows - this.activeExecutions.size;
      if (availableSlots <= 0) {
        logger.debug('No available execution slots');
        return;
      }

      // Sort queue by strategy
      this.sortExecutionQueue();

      const readyPlans = this.executionQueue.filter(plan => plan.status === 'planned');
      const plansToExecute = readyPlans.slice(0, availableSlots);

      for (const plan of plansToExecute) {
        if (this.checkResourceAvailability(plan)) {
          plan.status = 'ready';
          this.startExecution(plan.id);
          this.executionQueue = this.executionQueue.filter(p => p.id !== plan.id);
        }
      }
    } catch (error: any) {
      logger.error('Failed to process execution queue', error);
    }
  }

  private sortExecutionQueue(): void {
    try {
      switch (this.config.schedulingStrategy) {
        case 'fifo':
          // Already in FIFO order
          break;
        case 'priority':
          this.executionQueue.sort((a, b) => b.priority - a.priority);
          break;
        case 'resource_based':
          this.executionQueue.sort((a, b) => 
            a.resourceRequirements.memory - b.resourceRequirements.memory
          );
          break;
        case 'deadline_based':
          this.executionQueue.sort((a, b) => {
            const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Infinity;
            const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Infinity;
            return aDeadline - bDeadline;
          });
          break;
      }
    } catch (error: any) {
      logger.error('Failed to sort execution queue', error);
    }
  }

  // Resource Management
  private checkResourceAvailability(plan: WorkflowExecutionPlan): boolean {
    try {
      const currentUsage = this.calculateCurrentResourceUsage();
      
      return (
        currentUsage.memory + plan.resourceRequirements.memory <= this.config.resourceLimits.maxMemory &&
        currentUsage.cpu + plan.resourceRequirements.cpu <= this.config.resourceLimits.maxCPU &&
        currentUsage.agents + plan.resourceRequirements.agents.length <= this.config.resourceLimits.maxAgents
      );
    } catch (error: any) {
      logger.error('Failed to check resource availability', error);
      return false;
    }
  }

  private calculateCurrentResourceUsage(): { memory: number; cpu: number; agents: number } {
    try {
      let memory = 0;
      let cpu = 0;
      let agents = 0;

      for (const context of this.activeExecutions.values()) {
        const plan = context.executionPlan;
        memory += plan.resourceRequirements.memory;
        cpu += plan.resourceRequirements.cpu;
        agents += plan.resourceRequirements.agents.length;
      }

      return { memory, cpu, agents };
    } catch (error: any) {
      logger.error('Failed to calculate current resource usage', error);
      return { memory: 0, cpu: 0, agents: 0 };
    }
  }

  // Planning and Analysis
  private calculateExecutionOrder(workflow: Workflow): string[] {
    try {
      // Simple topological sort for now
      const visited = new Set<string>();
      const visiting = new Set<string>();
      const order: string[] = [];

      const visit = (nodeId: string) => {
        if (visiting.has(nodeId)) {
          throw new Error('Circular dependency detected');
        }
        if (visited.has(nodeId)) {
          return;
        }

        visiting.add(nodeId);
        const node = workflow.nodes.find(n => n.id === nodeId);
        if (node) {
          // Visit dependencies first
          const dependencies = this.getNodeDependencies(node, workflow);
          for (const dep of dependencies) {
            visit(dep);
          }
        }
        visiting.delete(nodeId);
        visited.add(nodeId);
        order.push(nodeId);
      };

      for (const node of workflow.nodes) {
        if (!visited.has(node.id)) {
          visit(node.id);
        }
      }

      return order;
    } catch (error: any) {
      logger.error('Failed to calculate execution order', error);
      return workflow.nodes.map(n => n.id);
    }
  }

  private calculateDependencies(workflow: Workflow): Map<string, string[]> {
    try {
      const dependencies = new Map<string, string[]>();

      for (const node of workflow.nodes) {
        const nodeDeps = this.getNodeDependencies(node, workflow);
        dependencies.set(node.id, nodeDeps);
      }

      return dependencies;
    } catch (error: any) {
      logger.error('Failed to calculate dependencies', error);
      return new Map();
    }
  }

  private getNodeDependencies(node: WorkflowNode, workflow: Workflow): string[] {
    try {
      const dependencies: string[] = [];
      
      for (const edge of workflow.edges) {
        if (edge.target === node.id) {
          dependencies.push(edge.source);
        }
      }

      return dependencies;
    } catch (error: any) {
      logger.error('Failed to get node dependencies', error);
      return [];
    }
  }

  private calculateResourceRequirements(workflow: Workflow): any {
    try {
      // Simple resource calculation
      return {
        agents: ['default-agent'],
        memory: workflow.nodes.length * 1024 * 1024, // 1MB per node
        cpu: Math.ceil(workflow.nodes.length / 2)
      };
    } catch (error: any) {
      logger.error('Failed to calculate resource requirements', error);
      return { agents: [], memory: 0, cpu: 0 };
    }
  }

  private estimateExecutionDuration(workflow: Workflow): number {
    try {
      // Simple duration estimation
      return workflow.nodes.length * 1000; // 1 second per node
    } catch (error: any) {
      logger.error('Failed to estimate execution duration', error);
      return 0;
    }
  }

  // Monitoring and Analytics
  public getSystemStatus(): any {
    try {
      const plans = Array.from(this.executionPlans.values());
      const activeExecutions = this.activeExecutions.size;
      
      return {
        workflows: {
          total: this.workflows.size,
          active: activeExecutions,
          queued: this.executionQueue.length
        },
        executions: {
          total: plans.length,
          planned: plans.filter(p => p.status === 'planned').length,
          ready: plans.filter(p => p.status === 'ready').length,
          executing: plans.filter(p => p.status === 'executing').length,
          completed: plans.filter(p => p.status === 'completed').length,
          failed: plans.filter(p => p.status === 'failed').length,
          cancelled: plans.filter(p => p.status === 'cancelled').length
        },
        resources: {
          currentUsage: this.calculateCurrentResourceUsage(),
          limits: this.config.resourceLimits,
          utilization: this.calculateResourceUtilization()
        },
        performance: {
          averageExecutionTime: this.calculateAverageExecutionTime(),
          successRate: this.calculateSuccessRate(),
          throughput: this.calculateThroughput()
        }
      };
    } catch (error: any) {
      logger.error('Failed to get system status', error);
      return null;
    }
  }

  public getExecutionHistory(limit?: number): any[] {
    try {
      const history = this.executionHistory.slice(-(limit || 100));
      return history;
    } catch (error: any) {
      logger.error('Failed to get execution history', error);
      return [];
    }
  }

  // Utility Methods
  private async waitForExecution(planId: string): Promise<WorkflowExecutionResult> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const plan = this.executionPlans.get(planId);
        if (!plan) {
          clearInterval(checkInterval);
          reject(new Error('Execution plan not found'));
          return;
        }

        if (plan.status === 'completed' || plan.status === 'failed') {
          clearInterval(checkInterval);
          const result = this.executionHistory.find(h => h.planId === planId);
          if (result) {
            resolve(result);
          } else {
            reject(new Error('Execution result not found'));
          }
        }
      }, 1000);

      // Timeout
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Execution timeout'));
      }, this.config.executionTimeout);
    });
  }

  private getActiveExecution(workflowId: string): WorkflowExecutionContext | undefined {
    return Array.from(this.activeExecutions.values()).find(
      context => context.workflowId === workflowId
    );
  }

  private cancelWorkflowExecution(workflowId: string): void {
    try {
      const activeExecution = this.getActiveExecution(workflowId);
      if (activeExecution) {
        this.cancelExecution(activeExecution.planId);
      }
    } catch (error: any) {
      logger.error('Failed to cancel workflow execution', error, { workflowId });
    }
  }

  private calculateResourceUtilization(): number {
    try {
      const currentUsage = this.calculateCurrentResourceUsage();
      const totalCapacity = this.config.resourceLimits.maxMemory + 
                           this.config.resourceLimits.maxCPU + 
                           this.config.resourceLimits.maxAgents;
      const currentTotal = currentUsage.memory + currentUsage.cpu + currentUsage.agents;
      
      return totalCapacity > 0 ? currentTotal / totalCapacity : 0;
    } catch (error: any) {
      logger.error('Failed to calculate resource utilization', error);
      return 0;
    }
  }

  private calculateAverageExecutionTime(): number {
    try {
      const completedExecutions = this.executionHistory.filter(h => h.success);
      if (completedExecutions.length === 0) return 0;
      
      const totalTime = completedExecutions.reduce((sum, h) => sum + h.executionTime, 0);
      return totalTime / completedExecutions.length;
    } catch (error: any) {
      logger.error('Failed to calculate average execution time', error);
      return 0;
    }
  }

  private calculateSuccessRate(): number {
    try {
      if (this.executionHistory.length === 0) return 0;
      
      const successfulExecutions = this.executionHistory.filter(h => h.success).length;
      return successfulExecutions / this.executionHistory.length;
    } catch (error: any) {
      logger.error('Failed to calculate success rate', error);
      return 0;
    }
  }

  private calculateThroughput(): number {
    try {
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      
      const recentExecutions = this.executionHistory.filter(h => 
        h.timestamp && new Date(h.timestamp).getTime() > oneHourAgo
      );
      
      return recentExecutions.length;
    } catch (error: any) {
      logger.error('Failed to calculate throughput', error);
      return 0;
    }
  }

  private generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRunId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public getters
  public getWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  public getExecutionPlans(): WorkflowExecutionPlan[] {
    return Array.from(this.executionPlans.values());
  }

  public getActiveExecutions(): WorkflowExecutionContext[] {
    return Array.from(this.activeExecutions.values());
  }

  public getExecutionQueue(): WorkflowExecutionPlan[] {
    return this.executionQueue;
  }

  public getConfig(): WorkflowManagerConfig {
    return this.config;
  }

  public updateConfig(newConfig: Partial<WorkflowManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Workflow manager config updated', { config: this.config });
  }
}

export const workflowManager = new WorkflowManager();
