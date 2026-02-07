import { ExecutionContext, ExecutionResult } from '../utils/types';
import { multiAgentCoordinator, MultiAgentTask, CoordinationSession, CoordinationMessage, CoordinationDecision } from '../core/coordination/multi-agent-coordinator';
const logger = require("../utils/logger");

export interface AgentTeam {
  id: string;
  name: string;
  description: string;
  agents: string[];
  roles: Map<string, string>;
  coordinationStyle: 'autonomous' | 'collaborative' | 'hierarchical' | 'peer-to-peer';
  communicationProtocol: string;
  sharedGoals: string[];
  performanceMetrics: {
    tasksCompleted: number;
    successRate: number;
    averageExecutionTime: number;
    collaborationScore: number;
  };
}

export interface CoordinationWorkflow {
  id: string;
  name: string;
  description: string;
  teamId: string;
  workflow: {
    nodes: any[];
    edges: any[];
    triggers: any[];
  };
  coordination: {
    protocol: string;
    style: 'sequential' | 'parallel' | 'collaborative' | 'competitive';
    communication: {
      frequency: string;
      channels: string[];
    };
    decisionMaking: {
      authority: string;
      consensus: boolean;
      voting: boolean;
    };
  };
  monitoring: {
    enabled: boolean;
    metrics: string[];
    alerts: any[];
  };
}

export interface AgentCollaboration {
  id: string;
  name: string;
  description: string;
  participants: string[];
  objective: string;
  constraints: string[];
  timeline: {
    start: string;
    deadline: string;
    milestones: any[];
  };
  resources: {
    allocated: any;
    required: any;
    available: any;
  };
  status: 'planning' | 'active' | 'paused' | 'completed' | 'failed';
  outcomes: any[];
  lessons: string[];
}

export class MultiAgentCoordinationService {
  private teams: Map<string, AgentTeam> = new Map();
  private workflows: Map<string, CoordinationWorkflow> = new Map();
  private collaborations: Map<string, AgentCollaboration> = new Map();
  private activeSessions: Map<string, CoordinationSession> = new Map();

  constructor() {
    this.initializeDefaultTeams();
  }

  // Team Management
  public createTeam(team: Omit<AgentTeam, 'performanceMetrics'>): string {
    try {
      const teamId = this.generateTeamId();
      const newTeam: AgentTeam = {
        ...team,
        performanceMetrics: {
          tasksCompleted: 0,
          successRate: 1.0,
          averageExecutionTime: 0,
          collaborationScore: 0.8
        }
      };
      
      this.teams.set(teamId, newTeam);
      
      // Register team agents with coordinator
      for (const agentId of team.agents) {
        multiAgentCoordinator.registerAgent(agentId, {
          id: agentId,
          name: agentId,
          description: `Agent in team ${team.name}`,
          primaryCapabilities: ['general'],
          secondaryCapabilities: [],
          coordinationStyle: team.coordinationStyle,
          communicationPreferences: {
            frequency: 'realtime',
            channels: ['direct', 'broadcast'],
            protocols: ['json', 'xml']
          },
          decisionAuthority: 'collaborative'
        });
      }
      
      logger.info('Agent team created', {
        teamId,
        name: team.name,
        agentCount: team.agents.length,
        coordinationStyle: team.coordinationStyle
      });
      
      return teamId;
    } catch (error: any) {
      logger.error('Failed to create agent team', error);
      throw error;
    }
  }

  public getTeam(teamId: string): AgentTeam | null {
    try {
      return this.teams.get(teamId) || null;
    } catch (error: any) {
      logger.error('Failed to get team', error, { teamId });
      return null;
    }
  }

  public updateTeam(teamId: string, updates: Partial<AgentTeam>): boolean {
    try {
      const team = this.teams.get(teamId);
      if (!team) {
        logger.warn('Team not found for update', { teamId });
        return false;
      }
      
      Object.assign(team, updates);
      this.teams.set(teamId, team);
      
      logger.info('Team updated', { teamId, updates: Object.keys(updates) });
      return true;
    } catch (error: any) {
      logger.error('Failed to update team', error, { teamId });
      return false;
    }
  }

  public deleteTeam(teamId: string): boolean {
    try {
      const team = this.teams.get(teamId);
      if (!team) {
        logger.warn('Team not found for deletion', { teamId });
        return false;
      }
      
      // Unregister team agents
      for (const agentId of team.agents) {
        multiAgentCoordinator.unregisterAgent(agentId);
      }
      
      this.teams.delete(teamId);
      
      logger.info('Team deleted', { teamId });
      return true;
    } catch (error: any) {
      logger.error('Failed to delete team', error, { teamId });
      return false;
    }
  }

  // Workflow Management
  public createCoordinationWorkflow(workflow: Omit<CoordinationWorkflow, 'id'>): string {
    try {
      const workflowId = this.generateWorkflowId();
      const newWorkflow: CoordinationWorkflow = {
        id: workflowId,
        ...workflow
      };
      
      this.workflows.set(workflowId, newWorkflow);
      
      logger.info('Coordination workflow created', {
        workflowId,
        name: workflow.name,
        teamId: workflow.teamId
      });
      
      return workflowId;
    } catch (error: any) {
      logger.error('Failed to create coordination workflow', error);
      throw error;
    }
  }

  public executeCoordinationWorkflow(workflowId: string, input: any): Promise<ExecutionResult> {
    return new Promise(async (resolve, reject) => {
      try {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
          reject(new Error('Coordination workflow not found'));
          return;
        }
        
        const team = this.teams.get(workflow.teamId);
        if (!team) {
          reject(new Error('Team not found for workflow'));
          return;
        }
        
        logger.info('Executing coordination workflow', {
          workflowId,
          teamId: workflow.teamId,
          agentCount: team.agents.length
        });
        
        // Create coordination session
        const sessionId = multiAgentCoordinator.createCoordinationSession(
          `Workflow: ${workflow.name}`,
          workflow.description,
          team.agents,
          multiAgentCoordinator.getProtocols().find(p => p.id === workflow.coordination.protocol)!
        );
        
        // Start coordination session
        multiAgentCoordinator.startCoordinationSession(sessionId);
        
        // Execute workflow with coordination
        const result = await this.executeWorkflowWithCoordination(workflow, team, sessionId, input);
        
        // End coordination session
        multiAgentCoordinator.endCoordinationSession(sessionId, result);
        
        resolve(result);
      } catch (error: any) {
        logger.error('Failed to execute coordination workflow', error, { workflowId });
        reject(error);
      }
    });
  }

  // Collaboration Management
  public startCollaboration(collaboration: Omit<AgentCollaboration, 'id' | 'status' | 'outcomes' | 'lessons'>): string {
    try {
      const collaborationId = this.generateCollaborationId();
      const newCollaboration: AgentCollaboration = {
        id: collaborationId,
        ...collaboration,
        status: 'planning',
        outcomes: [],
        lessons: []
      };
      
      this.collaborations.set(collaborationId, newCollaboration);
      
      logger.info('Agent collaboration started', {
        collaborationId,
        name: collaboration.name,
        participantCount: collaboration.participants.length,
        objective: collaboration.objective
      });
      
      return collaborationId;
    } catch (error: any) {
      logger.error('Failed to start collaboration', error);
      throw error;
    }
  }

  public coordinateCollaboration(collaborationId: string): Promise<ExecutionResult> {
    return new Promise(async (resolve, reject) => {
      try {
        const collaboration = this.collaborations.get(collaborationId);
        if (!collaboration) {
          reject(new Error('Collaboration not found'));
          return;
        }
        
        collaboration.status = 'active';
        
        // Create coordination session for collaboration
        const sessionId = multiAgentCoordinator.createCoordinationSession(
          `Collaboration: ${collaboration.name}`,
          collaboration.description,
          collaboration.participants,
          multiAgentCoordinator.getProtocols().find(p => p.id === 'collaboration')!
        );
        
        // Start coordination session
        multiAgentCoordinator.startCoordinationSession(sessionId);
        
        // Execute collaboration with coordination
        const result = await this.executeCollaborationWithCoordination(collaboration, sessionId);
        
        // End coordination session
        multiAgentCoordinator.endCoordinationSession(sessionId, result);
        
        // Update collaboration status
        collaboration.status = result.success ? 'completed' : 'failed';
        collaboration.outcomes.push(result);
        
        resolve(result);
      } catch (error: any) {
        logger.error('Failed to coordinate collaboration', error, { collaborationId });
        reject(error);
      }
    });
  }

  // Communication Management
  public sendTeamMessage(teamId: string, from: string, message: string, priority: number = 5): string {
    try {
      const team = this.teams.get(teamId);
      if (!team) {
        throw new Error('Team not found');
      }
      
      // Find active session for team
      const activeSession = this.findActiveSessionForTeam(teamId);
      if (!activeSession) {
        throw new Error('No active coordination session for team');
      }
      
      const messageId = multiAgentCoordinator.sendMessage({
        sessionId: activeSession.id,
        from,
        to: team.agents.filter(agent => agent !== from),
        type: 'notification',
        content: { message },
        priority,
        ttl: 300000,
        metadata: { teamId }
      });
      
      logger.info('Team message sent', {
        teamId,
        from,
        messageId,
        recipientCount: team.agents.length - 1
      });
      
      return messageId;
    } catch (error: any) {
      logger.error('Failed to send team message', error, { teamId, from });
      throw error;
    }
  }

  public broadcastToTeam(teamId: string, from: string, content: any, messageType: CoordinationMessage['type'] = 'notification'): string[] {
    try {
      const team = this.teams.get(teamId);
      if (!team) {
        throw new Error('Team not found');
      }
      
      const activeSession = this.findActiveSessionForTeam(teamId);
      if (!activeSession) {
        throw new Error('No active coordination session for team');
      }
      
      const messageIds = multiAgentCoordinator.broadcastMessage(
        activeSession.id,
        from,
        messageType,
        content,
        5
      );
      
      logger.info('Team broadcast sent', {
        teamId,
        from,
        messageType,
        messageCount: messageIds.length
      });
      
      return messageIds;
    } catch (error: any) {
      logger.error('Failed to broadcast to team', error, { teamId, from });
      throw error;
    }
  }

  // Decision Making
  public makeTeamDecision(teamId: string, decisionType: CoordinationDecision['decisionType'], proposal: any): Promise<CoordinationDecision> {
    return new Promise(async (resolve, reject) => {
      try {
        const team = this.teams.get(teamId);
        if (!team) {
          reject(new Error('Team not found'));
          return;
        }
        
        const activeSession = this.findActiveSessionForTeam(teamId);
        if (!activeSession) {
          reject(new Error('No active coordination session for team'));
          return;
        }
        
        const decision = await multiAgentCoordinator.makeDecision(
          activeSession.id,
          decisionType,
          proposal,
          team.agents
        );
        
        logger.info('Team decision made', {
          teamId,
          decisionId: decision.id,
          decisionType,
          outcome: decision.outcome,
          confidence: decision.confidence
        });
        
        resolve(decision);
      } catch (error: any) {
        logger.error('Failed to make team decision', error, { teamId, decisionType });
        reject(error);
      }
    });
  }

  // Knowledge Sharing
  public shareTeamKnowledge(teamId: string, key: string, value: any): void {
    try {
      const team = this.teams.get(teamId);
      if (!team) {
        throw new Error('Team not found');
      }
      
      const activeSession = this.findActiveSessionForTeam(teamId);
      if (activeSession) {
        multiAgentCoordinator.shareKnowledge(key, value, activeSession.id);
      }
      
      logger.info('Team knowledge shared', { teamId, key });
    } catch (error: any) {
      logger.error('Failed to share team knowledge', error, { teamId, key });
    }
  }

  public getTeamKnowledge(teamId: string, key: string): any {
    try {
      const team = this.teams.get(teamId);
      if (!team) {
        return null;
      }
      
      return multiAgentCoordinator.getSharedKnowledge(key);
    } catch (error: any) {
      logger.error('Failed to get team knowledge', error, { teamId, key });
      return null;
    }
  }

  // Performance Monitoring
  public getTeamPerformance(teamId: string): any {
    try {
      const team = this.teams.get(teamId);
      if (!team) {
        return null;
      }
      
      return {
        teamId,
        name: team.name,
        agentCount: team.agents.length,
        performance: team.performanceMetrics,
        coordination: {
          style: team.coordinationStyle,
          protocol: team.communicationProtocol
        },
        goals: team.sharedGoals
      };
    } catch (error: any) {
      logger.error('Failed to get team performance', error, { teamId });
      return null;
    }
  }

  public getSystemStatus(): any {
    try {
      const teams = Array.from(this.teams.values());
      const workflows = Array.from(this.workflows.values());
      const collaborations = Array.from(this.collaborations.values());
      const activeSessions = Array.from(this.activeSessions.values());
      
      return {
        teams: {
          total: teams.length,
          byStyle: teams.reduce((acc, team) => {
            acc[team.coordinationStyle] = (acc[team.coordinationStyle] || 0) + 1;
            return acc;
          }, {} as any)
        },
        workflows: {
          total: workflows.length,
          byTeam: workflows.reduce((acc, workflow) => {
            acc[workflow.teamId] = (acc[workflow.teamId] || 0) + 1;
            return acc;
          }, {} as any)
        },
        collaborations: {
          total: collaborations.length,
          active: collaborations.filter(c => c.status === 'active').length,
          completed: collaborations.filter(c => c.status === 'completed').length
        },
        sessions: {
          active: activeSessions.length,
          byStatus: activeSessions.reduce((acc, session) => {
            acc[session.status] = (acc[session.status] || 0) + 1;
            return acc;
          }, {} as any)
        },
        coordination: multiAgentCoordinator.getCoordinationStatus()
      };
    } catch (error: any) {
      logger.error('Failed to get system status', error);
      return null;
    }
  }

  // Private Methods
  private initializeDefaultTeams(): void {
    // Initialize default teams for common use cases
    const defaultTeams = [
      {
        id: 'content-team',
        name: 'Content Creation Team',
        description: 'Specialized team for content creation workflows',
        agents: ['writer-agent', 'editor-agent', 'reviewer-agent'],
        roles: new Map([
          ['writer-agent', 'content-creator'],
          ['editor-agent', 'content-editor'],
          ['reviewer-agent', 'quality-reviewer']
        ]),
        coordinationStyle: 'collaborative' as const,
        communicationProtocol: 'collaboration',
        sharedGoals: ['create-high-quality-content', 'meet-deadlines', 'maintain-consistency']
      },
      {
        id: 'support-team',
        name: 'Customer Support Team',
        description: 'Team for handling customer support workflows',
        agents: ['triage-agent', 'specialist-agent', 'escalation-agent'],
        roles: new Map([
          ['triage-agent', 'initial-assessment'],
          ['specialist-agent', 'problem-solving'],
          ['escalation-agent', 'complex-issues']
        ]),
        coordinationStyle: 'hierarchical' as const,
        communicationProtocol: 'consensus',
        sharedGoals: ['resolve-customer-issues', 'maintain-satisfaction', 'escalate-when-needed']
      }
    ];
    
    for (const team of defaultTeams) {
      this.teams.set(team.id, {
        ...team,
        performanceMetrics: {
          tasksCompleted: 0,
          successRate: 1.0,
          averageExecutionTime: 0,
          collaborationScore: 0.8
        }
      });
    }
  }

  private async executeWorkflowWithCoordination(
    workflow: CoordinationWorkflow,
    team: AgentTeam,
    sessionId: string,
    input: any
  ): Promise<ExecutionResult> {
    try {
      const startTime = Date.now();
      const results: any[] = [];
      
      // Execute workflow nodes with team coordination
      for (const node of workflow.workflow.nodes) {
        const nodeResult = await this.executeNodeWithTeamCoordination(node, team, sessionId, input);
        results.push(nodeResult);
        
        // Share results with team
        multiAgentCoordinator.shareKnowledge(`node-${node.id}-result`, nodeResult, sessionId);
      }
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        output: {
          workflowId: workflow.id,
          teamId: team.id,
          results,
          executionTime,
          coordinationSession: sessionId
        },
        duration: executionTime
      };
    } catch (error: any) {
      logger.error('Failed to execute workflow with coordination', error, { workflowId: workflow.id });
      return {
        success: false,
        error: error.message,
        duration: 0
      };
    }
  }

  private async executeNodeWithTeamCoordination(
    node: any,
    team: AgentTeam,
    sessionId: string,
    input: any
  ): Promise<any> {
    try {
      // Find best agent for node
      const bestAgent = this.findBestAgentForNode(node, team);
      if (!bestAgent) {
        throw new Error('No suitable agent found for node');
      }
      
      // Execute node with agent
      const result = await this.executeNodeWithAgent(node, bestAgent, input);
      
      // Share result with team
      multiAgentCoordinator.shareKnowledge(`node-${node.id}-result`, result, sessionId);
      
      return result;
    } catch (error: any) {
      logger.error('Failed to execute node with team coordination', error, { nodeId: node.id });
      throw error;
    }
  }

  private findBestAgentForNode(node: any, team: AgentTeam): string | null {
    try {
      // Simple agent selection based on node type
      // In a real implementation, this would use more sophisticated matching
      const nodeType = node.type || 'general';
      
      for (const agentId of team.agents) {
        const role = team.roles.get(agentId);
        if (role && this.isRoleSuitableForNode(role, nodeType)) {
          return agentId;
        }
      }
      
      // Fallback to first available agent
      return team.agents[0] || null;
    } catch (error: any) {
      logger.error('Failed to find best agent for node', error, { nodeId: node.id });
      return null;
    }
  }

  private isRoleSuitableForNode(role: string, nodeType: string): boolean {
    // Simple role-to-node-type matching
    const roleMappings: { [key: string]: string[] } = {
      'content-creator': ['text', 'writing', 'content'],
      'content-editor': ['text', 'editing', 'review'],
      'quality-reviewer': ['review', 'quality', 'validation'],
      'initial-assessment': ['triage', 'assessment', 'routing'],
      'problem-solving': ['analysis', 'solution', 'processing'],
      'complex-issues': ['escalation', 'complex', 'advanced']
    };
    
    const suitableNodeTypes = roleMappings[role] || ['general'];
    return suitableNodeTypes.some(type => nodeType.includes(type));
  }

  private async executeNodeWithAgent(node: any, agentId: string, input: any): Promise<any> {
    try {
      // Simulate node execution with agent
      // In a real implementation, this would call the actual agent
      return {
        nodeId: node.id,
        agentId,
        result: `Executed by ${agentId}`,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error('Failed to execute node with agent', error, { nodeId: node.id, agentId });
      throw error;
    }
  }

  private async executeCollaborationWithCoordination(
    collaboration: AgentCollaboration,
    sessionId: string
  ): Promise<ExecutionResult> {
    try {
      const startTime = Date.now();
      const results: any[] = [];
      
      // Execute collaboration with coordination
      for (const participant of collaboration.participants) {
        const participantResult = await this.executeParticipantTask(participant, collaboration, sessionId);
        results.push(participantResult);
      }
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        output: {
          collaborationId: collaboration.id,
          results,
          executionTime,
          coordinationSession: sessionId
        },
        duration: executionTime
      };
    } catch (error: any) {
      logger.error('Failed to execute collaboration with coordination', error, { collaborationId: collaboration.id });
      return {
        success: false,
        error: error.message,
        duration: 0
      };
    }
  }

  private async executeParticipantTask(
    participant: string,
    collaboration: AgentCollaboration,
    sessionId: string
  ): Promise<any> {
    try {
      // Simulate participant task execution
      return {
        participant,
        collaborationId: collaboration.id,
        result: `Task completed by ${participant}`,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error('Failed to execute participant task', error, { participant, collaborationId: collaboration.id });
      throw error;
    }
  }

  private findActiveSessionForTeam(teamId: string): CoordinationSession | null {
    try {
      const team = this.teams.get(teamId);
      if (!team) {
        return null;
      }
      
      // Find active session with team agents
      for (const session of this.activeSessions.values()) {
        if (session.status === 'active' && 
            session.participants.some(agent => team.agents.includes(agent))) {
          return session;
        }
      }
      
      return null;
    } catch (error: any) {
      logger.error('Failed to find active session for team', error, { teamId });
      return null;
    }
  }

  // Utility Methods
  private generateTeamId(): string {
    return `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCollaborationId(): string {
    return `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public getters
  public getTeams(): AgentTeam[] {
    return Array.from(this.teams.values());
  }

  public getWorkflows(): CoordinationWorkflow[] {
    return Array.from(this.workflows.values());
  }

  public getCollaborations(): AgentCollaboration[] {
    return Array.from(this.collaborations.values());
  }

  public getActiveSessions(): CoordinationSession[] {
    return Array.from(this.activeSessions.values());
  }
}

export const multiAgentCoordinationService = new MultiAgentCoordinationService();
