import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
const logger = require("../../utils/logger");

export interface AgentState {
  agentId: string;
  sessionId: string;
  status: 'active' | 'idle' | 'busy' | 'sleeping' | 'error';
  currentGoal?: string;
  currentTask?: string;
  context: Record<string, any>;
  variables: Record<string, any>;
  preferences: Record<string, any>;
  capabilities: string[];
  limitations: string[];
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface StateTransition {
  from: string;
  to: string;
  trigger: string;
  conditions?: Record<string, any>;
  actions?: string[];
  timestamp: Date;
}

export interface StateSnapshot {
  agentId: string;
  sessionId: string;
  state: AgentState;
  transitions: StateTransition[];
  metadata: Record<string, any>;
  timestamp: Date;
}

export class AgentStateManager {
  private static instance: AgentStateManager;
  private states: Map<string, AgentState> = new Map();
  private transitions: Map<string, StateTransition[]> = new Map();
  private snapshots: Map<string, StateSnapshot[]> = new Map();

  private constructor() {}

  public static getInstance(): AgentStateManager {
    if (!AgentStateManager.instance) {
      AgentStateManager.instance = new AgentStateManager();
    }
    return AgentStateManager.instance;
  }

  public async createAgentState(agentId: string, sessionId: string, initialState?: Partial<AgentState>): Promise<AgentState> {
    const state: AgentState = {
      agentId,
      sessionId,
      status: 'idle',
      context: {},
      variables: {},
      preferences: {},
      capabilities: ['decision', 'goal', 'context', 'reasoning'],
      limitations: [],
      lastActivity: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      ...initialState
    };

    this.states.set(agentId, state);
    this.transitions.set(agentId, []);
    this.snapshots.set(agentId, []);

    // Store in memory system
    await this.persistState(state);

    logger.info('Agent state created', {
      agentId,
      sessionId,
      status: state.status,
      capabilities: state.capabilities.length
    });

    return state;
  }

  public async getAgentState(agentId: string): Promise<AgentState | null> {
    let state = this.states.get(agentId);
    
    if (!state) {
      // Try to load from memory
      state = await this.loadStateFromMemory(agentId);
      if (state) {
        this.states.set(agentId, state);
      }
    }

    return state;
  }

  public async updateAgentState(agentId: string, updates: Partial<AgentState>): Promise<AgentState | null> {
    const currentState = await this.getAgentState(agentId);
    if (!currentState) {
      throw new Error(`Agent state not found: ${agentId}`);
    }

    const updatedState: AgentState = {
      ...currentState,
      ...updates,
      updatedAt: new Date(),
      version: currentState.version + 1
    };

    this.states.set(agentId, updatedState);

    // Record state transition
    await this.recordStateTransition(agentId, currentState.status, updatedState.status, 'update');

    // Persist to memory
    await this.persistState(updatedState);

    logger.info('Agent state updated', {
      agentId,
      from: currentState.status,
      to: updatedState.status,
      version: updatedState.version
    });

    return updatedState;
  }

  public async transitionAgentState(agentId: string, newStatus: string, trigger: string, conditions?: Record<string, any>): Promise<boolean> {
    const currentState = await this.getAgentState(agentId);
    if (!currentState) {
      throw new Error(`Agent state not found: ${agentId}`);
    }

    // Check if transition is valid
    if (!this.isValidTransition(currentState.status, newStatus)) {
      logger.warn('Invalid state transition', {
        agentId,
        from: currentState.status,
        to: newStatus,
        trigger
      });
      return false;
    }

    // Check conditions
    if (conditions && !this.evaluateConditions(conditions, currentState)) {
      logger.warn('State transition conditions not met', {
        agentId,
        conditions,
        currentState
      });
      return false;
    }

    // Perform transition
    const updatedState = await this.updateAgentState(agentId, { status: newStatus as any });
    
    if (updatedState) {
      await this.recordStateTransition(agentId, currentState.status, newStatus, trigger, conditions);
      return true;
    }

    return false;
  }

  public async getAgentContext(agentId: string): Promise<Record<string, any>> {
    const state = await this.getAgentState(agentId);
    return state?.context || {};
  }

  public async updateAgentContext(agentId: string, context: Record<string, any>): Promise<void> {
    const currentState = await this.getAgentState(agentId);
    if (!currentState) {
      throw new Error(`Agent state not found: ${agentId}`);
    }

    const updatedContext = {
      ...currentState.context,
      ...context
    };

    await this.updateAgentState(agentId, { context: updatedContext });
  }

  public async getAgentVariables(agentId: string): Promise<Record<string, any>> {
    const state = await this.getAgentState(agentId);
    return state?.variables || {};
  }

  public async updateAgentVariables(agentId: string, variables: Record<string, any>): Promise<void> {
    const currentState = await this.getAgentState(agentId);
    if (!currentState) {
      throw new Error(`Agent state not found: ${agentId}`);
    }

    const updatedVariables = {
      ...currentState.variables,
      ...variables
    };

    await this.updateAgentState(agentId, { variables: updatedVariables });
  }

  public async getAgentPreferences(agentId: string): Promise<Record<string, any>> {
    const state = await this.getAgentState(agentId);
    return state?.preferences || {};
  }

  public async updateAgentPreferences(agentId: string, preferences: Record<string, any>): Promise<void> {
    const currentState = await this.getAgentState(agentId);
    if (!currentState) {
      throw new Error(`Agent state not found: ${agentId}`);
    }

    const updatedPreferences = {
      ...currentState.preferences,
      ...preferences
    };

    await this.updateAgentState(agentId, { preferences: updatedPreferences });
  }

  public async setAgentGoal(agentId: string, goal: string): Promise<void> {
    await this.updateAgentState(agentId, { currentGoal: goal });
  }

  public async setAgentTask(agentId: string, task: string): Promise<void> {
    await this.updateAgentState(agentId, { currentTask: task });
  }

  public async getAgentStatus(agentId: string): Promise<string> {
    const state = await this.getAgentState(agentId);
    return state?.status || 'unknown';
  }

  public async setAgentStatus(agentId: string, status: string): Promise<void> {
    await this.transitionAgentState(agentId, status, 'manual');
  }

  public async getStateHistory(agentId: string): Promise<StateTransition[]> {
    return this.transitions.get(agentId) || [];
  }

  public async createStateSnapshot(agentId: string, metadata?: Record<string, any>): Promise<StateSnapshot> {
    const state = await this.getAgentState(agentId);
    if (!state) {
      throw new Error(`Agent state not found: ${agentId}`);
    }

    const snapshot: StateSnapshot = {
      agentId,
      sessionId: state.sessionId,
      state: { ...state },
      transitions: [...(this.transitions.get(agentId) || [])],
      metadata: metadata || {},
      timestamp: new Date()
    };

    const snapshots = this.snapshots.get(agentId) || [];
    snapshots.push(snapshot);
    this.snapshots.set(agentId, snapshots);

    // Keep only last 10 snapshots
    if (snapshots.length > 10) {
      snapshots.splice(0, snapshots.length - 10);
    }

    logger.info('State snapshot created', {
      agentId,
      status: state.status,
      version: state.version
    });

    return snapshot;
  }

  public async restoreFromSnapshot(agentId: string, snapshotIndex: number): Promise<boolean> {
    const snapshots = this.snapshots.get(agentId);
    if (!snapshots || snapshotIndex >= snapshots.length) {
      return false;
    }

    const snapshot = snapshots[snapshotIndex];
    this.states.set(agentId, snapshot.state);
    this.transitions.set(agentId, snapshot.transitions);

    await this.persistState(snapshot.state);

    logger.info('State restored from snapshot', {
      agentId,
      snapshotIndex,
      status: snapshot.state.status
    });

    return true;
  }

  public async getActiveAgents(): Promise<AgentState[]> {
    const activeAgents: AgentState[] = [];
    
    for (const [agentId, state] of this.states) {
      if (state.status === 'active' || state.status === 'busy') {
        activeAgents.push(state);
      }
    }

    return activeAgents;
  }

  public async getAgentCapabilities(agentId: string): Promise<string[]> {
    const state = await this.getAgentState(agentId);
    return state?.capabilities || [];
  }

  public async addAgentCapability(agentId: string, capability: string): Promise<void> {
    const currentState = await this.getAgentState(agentId);
    if (!currentState) {
      throw new Error(`Agent state not found: ${agentId}`);
    }

    if (!currentState.capabilities.includes(capability)) {
      const updatedCapabilities = [...currentState.capabilities, capability];
      await this.updateAgentState(agentId, { capabilities: updatedCapabilities });
    }
  }

  public async removeAgentCapability(agentId: string, capability: string): Promise<void> {
    const currentState = await this.getAgentState(agentId);
    if (!currentState) {
      throw new Error(`Agent state not found: ${agentId}`);
    }

    const updatedCapabilities = currentState.capabilities.filter(c => c !== capability);
    await this.updateAgentState(agentId, { capabilities: updatedCapabilities });
  }

  public async getAgentLimitations(agentId: string): Promise<string[]> {
    const state = await this.getAgentState(agentId);
    return state?.limitations || [];
  }

  public async addAgentLimitation(agentId: string, limitation: string): Promise<void> {
    const currentState = await this.getAgentState(agentId);
    if (!currentState) {
      throw new Error(`Agent state not found: ${agentId}`);
    }

    if (!currentState.limitations.includes(limitation)) {
      const updatedLimitations = [...currentState.limitations, limitation];
      await this.updateAgentState(agentId, { limitations: updatedLimitations });
    }
  }

  public async removeAgentLimitation(agentId: string, limitation: string): Promise<void> {
    const currentState = await this.getAgentState(agentId);
    if (!currentState) {
      throw new Error(`Agent state not found: ${agentId}`);
    }

    const updatedLimitations = currentState.limitations.filter(l => l !== limitation);
    await this.updateAgentState(agentId, { limitations: updatedLimitations });
  }

  public async cleanupInactiveAgents(maxInactiveHours: number = 24): Promise<number> {
    const cutoffTime = new Date(Date.now() - maxInactiveHours * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [agentId, state] of this.states) {
      if (state.lastActivity < cutoffTime && state.status === 'idle') {
        this.states.delete(agentId);
        this.transitions.delete(agentId);
        this.snapshots.delete(agentId);
        cleanedCount++;
      }
    }

    logger.info('Cleaned up inactive agents', { cleanedCount, maxInactiveHours });
    return cleanedCount;
  }

  private isValidTransition(from: string, to: string): boolean {
    const validTransitions: Record<string, string[]> = {
      'idle': ['active', 'busy', 'sleeping'],
      'active': ['idle', 'busy', 'sleeping', 'error'],
      'busy': ['active', 'idle', 'sleeping', 'error'],
      'sleeping': ['active', 'idle'],
      'error': ['active', 'idle']
    };

    return validTransitions[from]?.includes(to) || false;
  }

  private evaluateConditions(conditions: Record<string, any>, state: AgentState): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      if (key === 'status' && state.status !== value) {
        return false;
      }
      if (key === 'hasGoal' && !!state.currentGoal !== value) {
        return false;
      }
      if (key === 'hasTask' && !!state.currentTask !== value) {
        return false;
      }
      if (key === 'capability' && !state.capabilities.includes(value)) {
        return false;
      }
      if (key === 'limitation' && !state.limitations.includes(value)) {
        return false;
      }
    }
    return true;
  }

  private async recordStateTransition(agentId: string, from: string, to: string, trigger: string, conditions?: Record<string, any>): Promise<void> {
    const transition: StateTransition = {
      from,
      to,
      trigger,
      conditions,
      timestamp: new Date()
    };

    const transitions = this.transitions.get(agentId) || [];
    transitions.push(transition);
    this.transitions.set(agentId, transitions);

    // Keep only last 50 transitions
    if (transitions.length > 50) {
      transitions.splice(0, transitions.length - 50);
    }
  }

  private async persistState(state: AgentState): Promise<void> {
    try {
      const { memoryService } = await import('../../services/memory.service');
      await memoryService.storeMemory({
        sessionId: state.sessionId,
        agentId: state.agentId,
        type: 'agent_state',
        content: JSON.stringify(state),
        metadata: {
          status: state.status,
          version: state.version,
          hasGoal: !!state.currentGoal,
          hasTask: !!state.currentTask,
          capabilities: state.capabilities,
          limitations: state.limitations
        },
        importance: 8,
        tags: ['agent_state', state.status, `version-${state.version}`]
      });
    } catch (error) {
      logger.warn('Failed to persist agent state', { agentId: state.agentId, error: error.message });
    }
  }

  private async loadStateFromMemory(agentId: string): Promise<AgentState | null> {
    try {
      const { memoryService } = await import('../../services/memory.service');
      const memories = await memoryService.searchMemories(
        'default-session',
        agentId,
        'agent_state',
        1
      );

      if (memories && memories.length > 0) {
        return JSON.parse(memories[0].content);
      }
    } catch (error) {
      logger.warn('Failed to load agent state from memory', { agentId, error: error.message });
    }
    return null;
  }
}

export const agentStateManager = AgentStateManager.getInstance();
