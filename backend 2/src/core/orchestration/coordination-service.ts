import { ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export interface CoordinationMessage {
  id: string;
  type: 'task_assignment' | 'task_completion' | 'resource_request' | 'status_update' | 'error_notification' | 'coordination_signal';
  from: string;
  to: string[];
  payload: any;
  timestamp: string;
  priority: number;
  ttl: number; // Time to live in milliseconds
}

export interface CoordinationProtocol {
  name: string;
  version: string;
  description: string;
  messageTypes: string[];
  rules: {
    messageOrdering: 'fifo' | 'priority' | 'timestamp';
    deliveryGuarantee: 'at_most_once' | 'at_least_once' | 'exactly_once';
    timeout: number;
    retryPolicy: {
      maxRetries: number;
      backoffStrategy: 'linear' | 'exponential' | 'fixed';
      baseDelay: number;
    };
  };
}

export interface AgentCoordination {
  agentId: string;
  status: 'active' | 'busy' | 'idle' | 'error' | 'offline';
  capabilities: string[];
  currentTasks: string[];
  coordinationData: any;
  lastHeartbeat: string;
  performance: {
    tasksCompleted: number;
    successRate: number;
    averageResponseTime: number;
  };
}

export interface CoordinationConfig {
  maxConcurrentCoordination: number;
  messageTimeout: number;
  heartbeatInterval: number;
  coordinationProtocol: CoordinationProtocol;
  enableMessageOrdering: boolean;
  enableDeliveryGuarantees: boolean;
  enablePerformanceTracking: boolean;
}

export class CoordinationService {
  private agents: Map<string, AgentCoordination> = new Map();
  private messageQueue: CoordinationMessage[] = [];
  private activeCoordination: Map<string, any> = new Map();
  private coordinationHistory: any[] = [];
  private config: CoordinationConfig;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<CoordinationConfig>) {
    this.config = {
      maxConcurrentCoordination: 10,
      messageTimeout: 30000, // 30 seconds
      heartbeatInterval: 5000, // 5 seconds
      coordinationProtocol: {
        name: 'workflow-coordination-v1',
        version: '1.0.0',
        description: 'Standard coordination protocol for workflow execution',
        messageTypes: ['task_assignment', 'task_completion', 'resource_request', 'status_update', 'error_notification', 'coordination_signal'],
        rules: {
          messageOrdering: 'priority',
          deliveryGuarantee: 'at_least_once',
          timeout: 30000,
          retryPolicy: {
            maxRetries: 3,
            backoffStrategy: 'exponential',
            baseDelay: 1000
          }
        }
      },
      enableMessageOrdering: true,
      enableDeliveryGuarantees: true,
      enablePerformanceTracking: true,
      ...config
    };

    this.startHeartbeatMonitoring();
  }

  // Agent Coordination Management
  public registerAgent(agentId: string, capabilities: string[]): void {
    try {
      const coordination: AgentCoordination = {
        agentId,
        status: 'idle',
        capabilities,
        currentTasks: [],
        coordinationData: {},
        lastHeartbeat: new Date().toISOString(),
        performance: {
          tasksCompleted: 0,
          successRate: 1.0,
          averageResponseTime: 0
        }
      };

      this.agents.set(agentId, coordination);
      logger.info('Agent registered for coordination', {
        agentId,
        capabilities,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Failed to register agent for coordination', error, { agentId });
    }
  }

  public unregisterAgent(agentId: string): void {
    try {
      const agent = this.agents.get(agentId);
      if (agent) {
        // Handle any active coordination
        this.handleAgentDisconnection(agentId);
        this.agents.delete(agentId);
        logger.info('Agent unregistered from coordination', { agentId });
      }
    } catch (error: any) {
      logger.error('Failed to unregister agent from coordination', error, { agentId });
    }
  }

  public updateAgentStatus(agentId: string, status: AgentCoordination['status'], currentTasks?: string[]): void {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        logger.warn('Agent not found for status update', { agentId });
        return;
      }

      agent.status = status;
      agent.lastHeartbeat = new Date().toISOString();
      
      if (currentTasks) {
        agent.currentTasks = currentTasks;
      }

      logger.info('Agent status updated', {
        agentId,
        status,
        currentTasks: agent.currentTasks
      });
    } catch (error: any) {
      logger.error('Failed to update agent status', error, { agentId });
    }
  }

  public updateAgentPerformance(agentId: string, performance: Partial<AgentCoordination['performance']>): void {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        logger.warn('Agent not found for performance update', { agentId });
        return;
      }

      Object.assign(agent.performance, performance);
      logger.info('Agent performance updated', { agentId, performance });
    } catch (error: any) {
      logger.error('Failed to update agent performance', error, { agentId });
    }
  }

  // Message Coordination
  public sendMessage(message: Omit<CoordinationMessage, 'id' | 'timestamp'>): string {
    try {
      const coordinationMessage: CoordinationMessage = {
        id: this.generateMessageId(),
        timestamp: new Date().toISOString(),
        ttl: message.ttl || 300000, // 5 minutes default
        ...message
      };

      this.messageQueue.push(coordinationMessage);
      
      if (this.config.enableMessageOrdering) {
        this.sortMessageQueue();
      }

      logger.info('Coordination message sent', {
        messageId: coordinationMessage.id,
        type: coordinationMessage.type,
        from: coordinationMessage.from,
        to: coordinationMessage.to,
        priority: coordinationMessage.priority
      });

      // Process message queue
      this.processMessageQueue();
      return coordinationMessage.id;
    } catch (error: any) {
      logger.error('Failed to send coordination message', error);
      throw error;
    }
  }

  public broadcastMessage(message: Omit<CoordinationMessage, 'id' | 'timestamp' | 'to'>, targetAgents?: string[]): string[] {
    try {
      const recipients = targetAgents || Array.from(this.agents.keys());
      const messageIds: string[] = [];

      for (const agentId of recipients) {
        const messageId = this.sendMessage({
          ...message,
          to: [agentId]
        });
        messageIds.push(messageId);
      }

      logger.info('Broadcast message sent', {
        messageType: message.type,
        recipientCount: recipients.length,
        messageIds
      });

      return messageIds;
    } catch (error: any) {
      logger.error('Failed to broadcast coordination message', error);
      throw error;
    }
  }

  public sendTaskAssignment(agentId: string, taskId: string, taskData: any): string {
    try {
      return this.sendMessage({
        type: 'task_assignment',
        from: 'coordinator',
        to: [agentId],
        payload: {
          taskId,
          taskData,
          assignedAt: new Date().toISOString()
        },
        priority: 8,
        ttl: 300000
      });
    } catch (error: any) {
      logger.error('Failed to send task assignment', error, { agentId, taskId });
      throw error;
    }
  }

  public sendTaskCompletion(agentId: string, taskId: string, result: any): string {
    try {
      return this.sendMessage({
        type: 'task_completion',
        from: agentId,
        to: ['coordinator'],
        payload: {
          taskId,
          result,
          completedAt: new Date().toISOString()
        },
        priority: 7,
        ttl: 300000
      });
    } catch (error: any) {
      logger.error('Failed to send task completion', error, { agentId, taskId });
      throw error;
    }
  }

  public sendResourceRequest(agentId: string, resourceType: string, amount: number, duration: number): string {
    try {
      return this.sendMessage({
        type: 'resource_request',
        from: agentId,
        to: ['coordinator'],
        payload: {
          resourceType,
          amount,
          duration,
          requestedAt: new Date().toISOString()
        },
        priority: 6,
        ttl: 60000
      });
    } catch (error: any) {
      logger.error('Failed to send resource request', error, { agentId, resourceType });
      throw error;
    }
  }

  public sendStatusUpdate(agentId: string, status: string, data: any): string {
    try {
      return this.sendMessage({
        type: 'status_update',
        from: agentId,
        to: ['coordinator'],
        payload: {
          status,
          data,
          updatedAt: new Date().toISOString()
        },
        priority: 5,
        ttl: 120000
      });
    } catch (error: any) {
      logger.error('Failed to send status update', error, { agentId, status });
      throw error;
    }
  }

  public sendErrorNotification(agentId: string, error: any, context: any): string {
    try {
      return this.sendMessage({
        type: 'error_notification',
        from: agentId,
        to: ['coordinator'],
        payload: {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          context,
          occurredAt: new Date().toISOString()
        },
        priority: 9,
        ttl: 300000
      });
    } catch (err: any) {
      logger.error('Failed to send error notification', err, { agentId });
      throw err;
    }
  }

  // Coordination Protocols
  public coordinateTaskExecution(taskId: string, agents: string[], coordinationData: any): Promise<ExecutionResult> {
    return new Promise(async (resolve, reject) => {
      try {
        const coordinationId = this.generateCoordinationId();
        const startTime = Date.now();

        // Initialize coordination
        this.activeCoordination.set(coordinationId, {
          id: coordinationId,
          taskId,
          agents,
          status: 'coordinating',
          startTime,
          coordinationData
        });

        // Send coordination signals to agents
        const coordinationMessages = await this.sendCoordinationSignals(agents, {
          coordinationId,
          taskId,
          coordinationData
        });

        // Wait for coordination completion
        const result = await this.waitForCoordinationCompletion(coordinationId, coordinationMessages);
        
        resolve(result);
      } catch (error: any) {
        logger.error('Failed to coordinate task execution', error, { taskId });
        reject(error);
      }
    });
  }

  public coordinateResourceAllocation(resourceRequests: any[]): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const coordinationId = this.generateCoordinationId();
        
        // Initialize resource coordination
        this.activeCoordination.set(coordinationId, {
          id: coordinationId,
          type: 'resource_allocation',
          requests: resourceRequests,
          status: 'coordinating',
          startTime: Date.now()
        });

        // Process resource requests
        const allocation = await this.processResourceRequests(resourceRequests);
        
        // Update coordination status
        const coordination = this.activeCoordination.get(coordinationId);
        if (coordination) {
          coordination.status = 'completed';
          coordination.result = allocation;
        }

        resolve(allocation);
      } catch (error: any) {
        logger.error('Failed to coordinate resource allocation', error);
        reject(error);
      }
    });
  }

  public coordinateWorkflowExecution(workflowId: string, executionContext: ExecutionContext): Promise<ExecutionResult> {
    return new Promise(async (resolve, reject) => {
      try {
        const coordinationId = this.generateCoordinationId();
        
        // Initialize workflow coordination
        this.activeCoordination.set(coordinationId, {
          id: coordinationId,
          type: 'workflow_execution',
          workflowId,
          executionContext,
          status: 'coordinating',
          startTime: Date.now()
        });

        // Coordinate workflow execution
        const result = await this.coordinateWorkflowSteps(workflowId, executionContext);
        
        resolve(result);
      } catch (error: any) {
        logger.error('Failed to coordinate workflow execution', error, { workflowId });
        reject(error);
      }
    });
  }

  // Message Processing
  private processMessageQueue(): void {
    try {
      const now = Date.now();
      const expiredMessages = this.messageQueue.filter(msg => 
        now - new Date(msg.timestamp).getTime() > msg.ttl
      );

      // Remove expired messages
      this.messageQueue = this.messageQueue.filter(msg => 
        now - new Date(msg.timestamp).getTime() <= msg.ttl
      );

      if (expiredMessages.length > 0) {
        logger.warn('Expired messages removed', { count: expiredMessages.length });
      }

      // Process remaining messages
      const messagesToProcess = this.messageQueue.slice(0, this.config.maxConcurrentCoordination);
      
      for (const message of messagesToProcess) {
        this.processMessage(message);
      }
    } catch (error: any) {
      logger.error('Failed to process message queue', error);
    }
  }

  private processMessage(message: CoordinationMessage): void {
    try {
      logger.info('Processing coordination message', {
        messageId: message.id,
        type: message.type,
        from: message.from,
        to: message.to
      });

      // Record message processing
      this.coordinationHistory.push({
        timestamp: new Date().toISOString(),
        type: 'message_processed',
        messageId: message.id,
        messageType: message.type,
        from: message.from,
        to: message.to
      });

      // Remove processed message from queue
      this.messageQueue = this.messageQueue.filter(msg => msg.id !== message.id);
    } catch (error: any) {
      logger.error('Failed to process message', error, { messageId: message.id });
    }
  }

  private sortMessageQueue(): void {
    try {
      switch (this.config.coordinationProtocol.rules.messageOrdering) {
        case 'fifo':
          // Already in FIFO order
          break;
        case 'priority':
          this.messageQueue.sort((a, b) => b.priority - a.priority);
          break;
        case 'timestamp':
          this.messageQueue.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          break;
      }
    } catch (error: any) {
      logger.error('Failed to sort message queue', error);
    }
  }

  // Coordination Implementation
  private async sendCoordinationSignals(agents: string[], signalData: any): Promise<string[]> {
    try {
      const messageIds: string[] = [];
      
      for (const agentId of agents) {
        const messageId = this.sendMessage({
          type: 'coordination_signal',
          from: 'coordinator',
          to: [agentId],
          payload: signalData,
          priority: 8,
          ttl: 300000
        });
        messageIds.push(messageId);
      }

      return messageIds;
    } catch (error: any) {
      logger.error('Failed to send coordination signals', error);
      throw error;
    }
  }

  private async waitForCoordinationCompletion(coordinationId: string, messageIds: string[]): Promise<ExecutionResult> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const coordination = this.activeCoordination.get(coordinationId);
        if (!coordination) {
          clearInterval(checkInterval);
          reject(new Error('Coordination not found'));
          return;
        }

        if (coordination.status === 'completed' || coordination.status === 'failed') {
          clearInterval(checkInterval);
          if (coordination.status === 'completed') {
            resolve(coordination.result);
          } else {
            reject(new Error('Coordination failed'));
          }
        }
      }, 1000);

      // Timeout
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Coordination timeout'));
      }, this.config.messageTimeout);
    });
  }

  private async processResourceRequests(requests: any[]): Promise<any> {
    try {
      // Simple resource allocation logic
      const allocation = {
        allocated: [],
        denied: [],
        totalAllocated: 0
      };

      for (const request of requests) {
        // Check if resources are available
        const canAllocate = this.checkResourceAvailability(request);
        if (canAllocate) {
          allocation.allocated.push(request);
          allocation.totalAllocated += request.amount;
        } else {
          allocation.denied.push(request);
        }
      }

      return allocation;
    } catch (error: any) {
      logger.error('Failed to process resource requests', error);
      throw error;
    }
  }

  private async coordinateWorkflowSteps(workflowId: string, executionContext: ExecutionContext): Promise<ExecutionResult> {
    try {
      // This would integrate with the workflow manager
      // For now, return a mock result
      return {
        success: true,
        output: { workflowId, coordinated: true },
        duration: 1000
      };
    } catch (error: any) {
      logger.error('Failed to coordinate workflow steps', error, { workflowId });
      throw error;
    }
  }

  // Monitoring and Health Checks
  private startHeartbeatMonitoring(): void {
    try {
      this.heartbeatInterval = setInterval(() => {
        this.checkAgentHeartbeats();
      }, this.config.heartbeatInterval);
    } catch (error: any) {
      logger.error('Failed to start heartbeat monitoring', error);
    }
  }

  private checkAgentHeartbeats(): void {
    try {
      const now = Date.now();
      const heartbeatTimeout = this.config.heartbeatInterval * 3; // 3x interval

      for (const [agentId, agent] of this.agents.entries()) {
        const lastHeartbeat = new Date(agent.lastHeartbeat).getTime();
        const timeSinceHeartbeat = now - lastHeartbeat;

        if (timeSinceHeartbeat > heartbeatTimeout) {
          logger.warn('Agent heartbeat timeout', { agentId, timeSinceHeartbeat });
          this.handleAgentDisconnection(agentId);
        }
      }
    } catch (error: any) {
      logger.error('Failed to check agent heartbeats', error);
    }
  }

  private handleAgentDisconnection(agentId: string): void {
    try {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.status = 'offline';
        
        // Handle any active coordination
        for (const [coordinationId, coordination] of this.activeCoordination.entries()) {
          if (coordination.agents && coordination.agents.includes(agentId)) {
            coordination.status = 'failed';
            coordination.error = 'Agent disconnected';
          }
        }

        logger.info('Agent disconnection handled', { agentId });
      }
    } catch (error: any) {
      logger.error('Failed to handle agent disconnection', error, { agentId });
    }
  }

  private checkResourceAvailability(request: any): boolean {
    try {
      // Simple resource availability check
      // In a real implementation, this would check actual resource availability
      return Math.random() > 0.3; // 70% chance of availability
    } catch (error: any) {
      logger.error('Failed to check resource availability', error);
      return false;
    }
  }

  // Analytics and Monitoring
  public getCoordinationStatus(): any {
    try {
      const agents = Array.from(this.agents.values());
      const activeCoordination = this.activeCoordination.size;
      
      return {
        agents: {
          total: agents.length,
          active: agents.filter(a => a.status === 'active').length,
          busy: agents.filter(a => a.status === 'busy').length,
          idle: agents.filter(a => a.status === 'idle').length,
          error: agents.filter(a => a.status === 'error').length,
          offline: agents.filter(a => a.status === 'offline').length
        },
        coordination: {
          active: activeCoordination,
          queued: this.messageQueue.length,
          totalMessages: this.coordinationHistory.length
        },
        performance: {
          averageResponseTime: this.calculateAverageResponseTime(),
          successRate: this.calculateCoordinationSuccessRate(),
          throughput: this.calculateCoordinationThroughput()
        }
      };
    } catch (error: any) {
      logger.error('Failed to get coordination status', error);
      return null;
    }
  }

  public getCoordinationHistory(limit?: number): any[] {
    try {
      return this.coordinationHistory.slice(-(limit || 100));
    } catch (error: any) {
      logger.error('Failed to get coordination history', error);
      return [];
    }
  }

  private calculateAverageResponseTime(): number {
    try {
      const recentHistory = this.coordinationHistory.slice(-100);
      if (recentHistory.length === 0) return 0;
      
      // This would need actual timing data in a real implementation
      return 1000; // Mock value
    } catch (error: any) {
      logger.error('Failed to calculate average response time', error);
      return 0;
    }
  }

  private calculateCoordinationSuccessRate(): number {
    try {
      const recentHistory = this.coordinationHistory.slice(-100);
      if (recentHistory.length === 0) return 0;
      
      const successfulCoordination = recentHistory.filter(h => h.status === 'completed').length;
      return successfulCoordination / recentHistory.length;
    } catch (error: any) {
      logger.error('Failed to calculate coordination success rate', error);
      return 0;
    }
  }

  private calculateCoordinationThroughput(): number {
    try {
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      
      const recentHistory = this.coordinationHistory.filter(h => 
        h.timestamp && new Date(h.timestamp).getTime() > oneHourAgo
      );
      
      return recentHistory.length;
    } catch (error: any) {
      logger.error('Failed to calculate coordination throughput', error);
      return 0;
    }
  }

  // Utility Methods
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCoordinationId(): string {
    return `coord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup
  public destroy(): void {
    try {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      this.agents.clear();
      this.messageQueue = [];
      this.activeCoordination.clear();
      this.coordinationHistory = [];
      
      logger.info('Coordination service destroyed');
    } catch (error: any) {
      logger.error('Failed to destroy coordination service', error);
    }
  }

  // Public getters
  public getAgents(): AgentCoordination[] {
    return Array.from(this.agents.values());
  }

  public getActiveCoordination(): any[] {
    return Array.from(this.activeCoordination.values());
  }

  public getMessageQueue(): CoordinationMessage[] {
    return this.messageQueue;
  }

  public getConfig(): CoordinationConfig {
    return this.config;
  }

  public updateConfig(newConfig: Partial<CoordinationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Coordination service config updated', { config: this.config });
  }
}

export const coordinationService = new CoordinationService();
