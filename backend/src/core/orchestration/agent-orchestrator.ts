import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
const logger = require("../../utils/logger");

export interface Agent {
  id: string;
  name: string;
  type: 'primary' | 'secondary' | 'specialist';
  capabilities: string[];
  status: 'idle' | 'busy' | 'error' | 'offline';
  currentTask?: string;
  workload: number;
  maxWorkload: number;
  preferences: {
    taskTypes: string[];
    priority: number;
    availability: string[];
  };
  metadata: {
    created: string;
    lastActive: string;
    performance: {
      tasksCompleted: number;
      successRate: number;
      averageExecutionTime: number;
    };
  };
}

export interface Task {
  id: string;
  name: string;
  description: string;
  type: string;
  priority: number;
  requirements: string[];
  dependencies: string[];
  estimatedDuration: number;
  assignedAgent?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  deadline?: string;
  metadata: any;
}

export interface OrchestrationConfig {
  maxConcurrentAgents: number;
  taskTimeout: number;
  retryAttempts: number;
  loadBalancing: 'round_robin' | 'least_busy' | 'capability_based' | 'priority_based';
  coordinationStrategy: 'centralized' | 'distributed' | 'hybrid';
  communicationProtocol: 'direct' | 'broadcast' | 'hierarchical';
}

export class AgentOrchestrator {
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, Task> = new Map();
  private taskQueue: Task[] = [];
  private activeTasks: Map<string, Task> = new Map();
  private config: OrchestrationConfig;
  private coordinationHistory: any[] = [];

  constructor(config?: Partial<OrchestrationConfig>) {
    this.config = {
      maxConcurrentAgents: 10,
      taskTimeout: 300000, // 5 minutes
      retryAttempts: 3,
      loadBalancing: 'capability_based',
      coordinationStrategy: 'hybrid',
      communicationProtocol: 'hierarchical',
      ...config
    };
  }

  // Agent Management
  public registerAgent(agent: Agent): void {
    try {
      this.agents.set(agent.id, agent);
      logger.info('Agent registered', {
        agentId: agent.id,
        name: agent.name,
        type: agent.type,
        capabilities: agent.capabilities
      });
    } catch (error: any) {
      logger.error('Failed to register agent', error, { agentId: agent.id });
    }
  }

  public unregisterAgent(agentId: string): void {
    try {
      const agent = this.agents.get(agentId);
      if (agent) {
        // Reassign active tasks
        this.reassignTasks(agentId);
        this.agents.delete(agentId);
        logger.info('Agent unregistered', { agentId });
      }
    } catch (error: any) {
      logger.error('Failed to unregister agent', error, { agentId });
    }
  }

  public updateAgentStatus(agentId: string, status: Agent['status'], currentTask?: string): void {
    try {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.status = status;
        agent.currentTask = currentTask;
        agent.metadata.lastActive = new Date().toISOString();
        logger.info('Agent status updated', { agentId, status, currentTask });
      }
    } catch (error: any) {
      logger.error('Failed to update agent status', error, { agentId });
    }
  }

  // Task Management
  public submitTask(task: Task): string {
    try {
      task.id = task.id || this.generateTaskId();
      task.status = 'pending';
      this.tasks.set(task.id, task);
      this.taskQueue.push(task);
      
      logger.info('Task submitted', {
        taskId: task.id,
        name: task.name,
        type: task.type,
        priority: task.priority
      });

      // Try to assign immediately
      this.processTaskQueue();
      return task.id;
    } catch (error: any) {
      logger.error('Failed to submit task', error, { taskName: task.name });
      throw error;
    }
  }

  public assignTask(taskId: string, agentId: string): boolean {
    try {
      const task = this.tasks.get(taskId);
      const agent = this.agents.get(agentId);

      if (!task || !agent) {
        logger.warn('Task or agent not found for assignment', { taskId, agentId });
        return false;
      }

      if (agent.status !== 'idle' || agent.workload >= agent.maxWorkload) {
        logger.warn('Agent not available for assignment', { agentId, status: agent.status, workload: agent.workload });
        return false;
      }

      if (!this.canAgentHandleTask(agent, task)) {
        logger.warn('Agent cannot handle task requirements', { agentId, taskId, requirements: task.requirements });
        return false;
      }

      // Assign task
      task.assignedAgent = agentId;
      task.status = 'assigned';
      agent.currentTask = taskId;
      agent.workload += 1;
      agent.status = 'busy';
      this.activeTasks.set(taskId, task);

      logger.info('Task assigned', { taskId, agentId, taskName: task.name });
      return true;
    } catch (error: any) {
      logger.error('Failed to assign task', error, { taskId, agentId });
      return false;
    }
  }

  public completeTask(taskId: string, result: any): void {
    try {
      const task = this.tasks.get(taskId);
      if (!task) {
        logger.warn('Task not found for completion', { taskId });
        return;
      }

      const agent = this.agents.get(task.assignedAgent!);
      if (agent) {
        agent.workload = Math.max(0, agent.workload - 1);
        agent.status = agent.workload > 0 ? 'busy' : 'idle';
        agent.currentTask = agent.workload > 0 ? agent.currentTask : undefined;
        
        // Update performance metrics
        agent.metadata.performance.tasksCompleted += 1;
        agent.metadata.performance.successRate = this.calculateSuccessRate(agent);
      }

      task.status = 'completed';
      this.activeTasks.delete(taskId);

      logger.info('Task completed', { taskId, agentId: task.assignedAgent, result });
      
      // Process next tasks
      this.processTaskQueue();
    } catch (error: any) {
      logger.error('Failed to complete task', error, { taskId });
    }
  }

  public failTask(taskId: string, error: string): void {
    try {
      const task = this.tasks.get(taskId);
      if (!task) {
        logger.warn('Task not found for failure', { taskId });
        return;
      }

      const agent = this.agents.get(task.assignedAgent!);
      if (agent) {
        agent.workload = Math.max(0, agent.workload - 1);
        agent.status = agent.workload > 0 ? 'busy' : 'idle';
        agent.currentTask = agent.workload > 0 ? agent.currentTask : undefined;
      }

      task.status = 'failed';
      this.activeTasks.delete(taskId);

      logger.error('Task failed', { taskId, agentId: task.assignedAgent, error });
      
      // Retry if possible
      if (task.metadata?.retryCount < this.config.retryAttempts) {
        task.metadata.retryCount = (task.metadata.retryCount || 0) + 1;
        task.status = 'pending';
        task.assignedAgent = undefined;
        this.taskQueue.push(task);
        this.processTaskQueue();
      }
    } catch (error: any) {
      logger.error('Failed to handle task failure', error, { taskId });
    }
  }

  // Coordination and Load Balancing
  public processTaskQueue(): void {
    try {
      const availableAgents = this.getAvailableAgents();
      if (availableAgents.length === 0) {
        logger.debug('No available agents for task processing');
        return;
      }

      const pendingTasks = this.taskQueue.filter(task => task.status === 'pending');
      if (pendingTasks.length === 0) {
        logger.debug('No pending tasks to process');
        return;
      }

      // Sort tasks by priority
      pendingTasks.sort((a, b) => b.priority - a.priority);

      for (const task of pendingTasks) {
        if (this.activeTasks.size >= this.config.maxConcurrentAgents) {
          break;
        }

        const assigned = this.assignTaskToBestAgent(task, availableAgents);
        if (assigned) {
          this.taskQueue = this.taskQueue.filter(t => t.id !== task.id);
        }
      }
    } catch (error: any) {
      logger.error('Failed to process task queue', error);
    }
  }

  private assignTaskToBestAgent(task: Task, availableAgents: Agent[]): boolean {
    try {
      const suitableAgents = availableAgents.filter(agent => this.canAgentHandleTask(agent, task));
      
      if (suitableAgents.length === 0) {
        logger.warn('No suitable agents found for task', { taskId: task.id, requirements: task.requirements });
        return false;
      }

      let selectedAgent: Agent;
      
      switch (this.config.loadBalancing) {
        case 'round_robin':
          selectedAgent = this.selectRoundRobin(suitableAgents);
          break;
        case 'least_busy':
          selectedAgent = this.selectLeastBusy(suitableAgents);
          break;
        case 'capability_based':
          selectedAgent = this.selectByCapability(suitableAgents, task);
          break;
        case 'priority_based':
          selectedAgent = this.selectByPriority(suitableAgents, task);
          break;
        default:
          selectedAgent = suitableAgents[0];
      }

      return this.assignTask(task.id, selectedAgent.id);
    } catch (error: any) {
      logger.error('Failed to assign task to best agent', error, { taskId: task.id });
      return false;
    }
  }

  private selectRoundRobin(agents: Agent[]): Agent {
    // Simple round-robin selection
    return agents[Math.floor(Math.random() * agents.length)];
  }

  private selectLeastBusy(agents: Agent[]): Agent {
    return agents.reduce((least, current) => 
      current.workload < least.workload ? current : least
    );
  }

  private selectByCapability(agents: Agent[], task: Task): Agent {
    return agents.reduce((best, current) => {
      const currentScore = this.calculateCapabilityScore(current, task);
      const bestScore = this.calculateCapabilityScore(best, task);
      return currentScore > bestScore ? current : best;
    });
  }

  private selectByPriority(agents: Agent[], task: Task): Agent {
    return agents.reduce((best, current) => 
      current.preferences.priority > best.preferences.priority ? current : best
    );
  }

  private calculateCapabilityScore(agent: Agent, task: Task): number {
    let score = 0;
    
    // Check capability matches
    const capabilityMatches = task.requirements.filter(req => 
      agent.capabilities.includes(req)
    ).length;
    score += capabilityMatches * 10;
    
    // Check workload availability
    const workloadScore = (agent.maxWorkload - agent.workload) / agent.maxWorkload;
    score += workloadScore * 5;
    
    // Check performance history
    score += agent.metadata.performance.successRate * 3;
    
    return score;
  }

  // Communication and Coordination
  public broadcastMessage(message: any, targetAgents?: string[]): void {
    try {
      const recipients = targetAgents || Array.from(this.agents.keys());
      
      for (const agentId of recipients) {
        const agent = this.agents.get(agentId);
        if (agent && agent.status !== 'offline') {
          this.sendMessageToAgent(agentId, message);
        }
      }
      
      logger.info('Message broadcasted', { 
        messageType: message.type, 
        recipientCount: recipients.length 
      });
    } catch (error: any) {
      logger.error('Failed to broadcast message', error);
    }
  }

  public sendMessageToAgent(agentId: string, message: any): void {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        logger.warn('Agent not found for message', { agentId });
        return;
      }

      // In a real implementation, this would send to the agent's communication channel
      logger.info('Message sent to agent', { 
        agentId, 
        messageType: message.type,
        timestamp: new Date().toISOString()
      });

      // Record coordination history
      this.coordinationHistory.push({
        timestamp: new Date().toISOString(),
        type: 'message_sent',
        agentId,
        message
      });
    } catch (error: any) {
      logger.error('Failed to send message to agent', error, { agentId });
    }
  }

  // Monitoring and Analytics
  public getSystemStatus(): any {
    try {
      const agents = Array.from(this.agents.values());
      const tasks = Array.from(this.tasks.values());
      
      return {
        agents: {
          total: agents.length,
          idle: agents.filter(a => a.status === 'idle').length,
          busy: agents.filter(a => a.status === 'busy').length,
          error: agents.filter(a => a.status === 'error').length,
          offline: agents.filter(a => a.status === 'offline').length
        },
        tasks: {
          total: tasks.length,
          pending: tasks.filter(t => t.status === 'pending').length,
          assigned: tasks.filter(t => t.status === 'assigned').length,
          inProgress: tasks.filter(t => t.status === 'in_progress').length,
          completed: tasks.filter(t => t.status === 'completed').length,
          failed: tasks.filter(t => t.status === 'failed').length
        },
        performance: {
          averageTaskCompletionTime: this.calculateAverageCompletionTime(),
          systemThroughput: this.calculateSystemThroughput(),
          agentUtilization: this.calculateAgentUtilization()
        },
        coordination: {
          totalMessages: this.coordinationHistory.length,
          recentActivity: this.coordinationHistory.slice(-10)
        }
      };
    } catch (error: any) {
      logger.error('Failed to get system status', error);
      return null;
    }
  }

  public getAgentPerformance(agentId: string): any {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        return null;
      }

      return {
        agentId,
        name: agent.name,
        type: agent.type,
        status: agent.status,
        workload: agent.workload,
        maxWorkload: agent.maxWorkload,
        performance: agent.metadata.performance,
        currentTask: agent.currentTask,
        lastActive: agent.metadata.lastActive
      };
    } catch (error: any) {
      logger.error('Failed to get agent performance', error, { agentId });
      return null;
    }
  }

  // Utility Methods
  private canAgentHandleTask(agent: Agent, task: Task): boolean {
    try {
      // Check if agent has required capabilities
      const hasCapabilities = task.requirements.every(req => 
        agent.capabilities.includes(req)
      );
      
      if (!hasCapabilities) {
        return false;
      }

      // Check if agent is available
      if (agent.status !== 'idle' && agent.status !== 'busy') {
        return false;
      }

      // Check workload capacity
      if (agent.workload >= agent.maxWorkload) {
        return false;
      }

      return true;
    } catch (error: any) {
      logger.error('Failed to check if agent can handle task', error, { agentId: agent.id, taskId: task.id });
      return false;
    }
  }

  private getAvailableAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(agent => 
      agent.status === 'idle' && agent.workload < agent.maxWorkload
    );
  }

  private reassignTasks(agentId: string): void {
    try {
      const agentTasks = Array.from(this.activeTasks.values()).filter(task => 
        task.assignedAgent === agentId
      );

      for (const task of agentTasks) {
        task.status = 'pending';
        task.assignedAgent = undefined;
        this.taskQueue.push(task);
        this.activeTasks.delete(task.id);
      }

      logger.info('Tasks reassigned after agent removal', { agentId, taskCount: agentTasks.length });
    } catch (error: any) {
      logger.error('Failed to reassign tasks', error, { agentId });
    }
  }

  private calculateSuccessRate(agent: Agent): number {
    const performance = agent.metadata.performance;
    return performance.tasksCompleted > 0 ? 
      (performance.tasksCompleted - (performance.tasksCompleted * (1 - performance.successRate))) / performance.tasksCompleted : 
      1.0;
  }

  private calculateAverageCompletionTime(): number {
    const completedTasks = Array.from(this.tasks.values()).filter(task => 
      task.status === 'completed'
    );
    
    if (completedTasks.length === 0) return 0;
    
    // This would need actual timing data in a real implementation
    return 0;
  }

  private calculateSystemThroughput(): number {
    const completedTasks = Array.from(this.tasks.values()).filter(task => 
      task.status === 'completed'
    );
    
    // This would need actual timing data in a real implementation
    return completedTasks.length;
  }

  private calculateAgentUtilization(): number {
    const agents = Array.from(this.agents.values());
    if (agents.length === 0) return 0;
    
    const totalWorkload = agents.reduce((sum, agent) => sum + agent.workload, 0);
    const totalCapacity = agents.reduce((sum, agent) => sum + agent.maxWorkload, 0);
    
    return totalCapacity > 0 ? totalWorkload / totalCapacity : 0;
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public getters
  public getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  public getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  public getActiveTasks(): Task[] {
    return Array.from(this.activeTasks.values());
  }

  public getTaskQueue(): Task[] {
    return this.taskQueue;
  }

  public getConfig(): OrchestrationConfig {
    return this.config;
  }

  public updateConfig(newConfig: Partial<OrchestrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Orchestration config updated', { config: this.config });
  }
}

export const agentOrchestrator = new AgentOrchestrator();
