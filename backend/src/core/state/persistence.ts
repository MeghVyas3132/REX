import { AgentState, StateTransition, StateSnapshot } from './agent-state';
const logger = require("../../utils/logger");

export interface PersistenceConfig {
  provider: 'memory' | 'database' | 'file';
  retentionDays: number;
  maxSnapshots: number;
  maxTransitions: number;
  compressionEnabled: boolean;
}

export class StatePersistence {
  private static instance: StatePersistence;
  private config: PersistenceConfig;

  private constructor() {
    this.config = {
      provider: 'memory',
      retentionDays: 30,
      maxSnapshots: 10,
      maxTransitions: 50,
      compressionEnabled: true
    };
  }

  public static getInstance(): StatePersistence {
    if (!StatePersistence.instance) {
      StatePersistence.instance = new StatePersistence();
    }
    return StatePersistence.instance;
  }

  public configure(config: Partial<PersistenceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public async saveState(state: AgentState): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'memory':
          await this.saveToMemory(state);
          break;
        case 'database':
          await this.saveToDatabase(state);
          break;
        case 'file':
          await this.saveToFile(state);
          break;
      }
    } catch (error) {
      logger.error('Failed to save agent state', { agentId: state.agentId, error: error.message });
      throw error;
    }
  }

  public async loadState(agentId: string): Promise<AgentState | null> {
    try {
      switch (this.config.provider) {
        case 'memory':
          return await this.loadFromMemory(agentId);
        case 'database':
          return await this.loadFromDatabase(agentId);
        case 'file':
          return await this.loadFromFile(agentId);
        default:
          return null;
      }
    } catch (error) {
      logger.error('Failed to load agent state', { agentId, error: error.message });
      return null;
    }
  }

  public async saveTransition(agentId: string, transition: StateTransition): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'memory':
          await this.saveTransitionToMemory(agentId, transition);
          break;
        case 'database':
          await this.saveTransitionToDatabase(agentId, transition);
          break;
        case 'file':
          await this.saveTransitionToFile(agentId, transition);
          break;
      }
    } catch (error) {
      logger.error('Failed to save state transition', { agentId, error: error.message });
    }
  }

  public async loadTransitions(agentId: string): Promise<StateTransition[]> {
    try {
      switch (this.config.provider) {
        case 'memory':
          return await this.loadTransitionsFromMemory(agentId);
        case 'database':
          return await this.loadTransitionsFromDatabase(agentId);
        case 'file':
          return await this.loadTransitionsFromFile(agentId);
        default:
          return [];
      }
    } catch (error) {
      logger.error('Failed to load state transitions', { agentId, error: error.message });
      return [];
    }
  }

  public async saveSnapshot(agentId: string, snapshot: StateSnapshot): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'memory':
          await this.saveSnapshotToMemory(agentId, snapshot);
          break;
        case 'database':
          await this.saveSnapshotToDatabase(agentId, snapshot);
          break;
        case 'file':
          await this.saveSnapshotToFile(agentId, snapshot);
          break;
      }
    } catch (error) {
      logger.error('Failed to save state snapshot', { agentId, error: error.message });
    }
  }

  public async loadSnapshots(agentId: string): Promise<StateSnapshot[]> {
    try {
      switch (this.config.provider) {
        case 'memory':
          return await this.loadSnapshotsFromMemory(agentId);
        case 'database':
          return await this.loadSnapshotsFromDatabase(agentId);
        case 'file':
          return await this.loadSnapshotsFromFile(agentId);
        default:
          return [];
      }
    } catch (error) {
      logger.error('Failed to load state snapshots', { agentId, error: error.message });
      return [];
    }
  }

  public async cleanup(agentId: string): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
      
      switch (this.config.provider) {
        case 'memory':
          await this.cleanupMemory(agentId, cutoffDate);
          break;
        case 'database':
          await this.cleanupDatabase(agentId, cutoffDate);
          break;
        case 'file':
          await this.cleanupFile(agentId, cutoffDate);
          break;
      }
    } catch (error) {
      logger.error('Failed to cleanup agent state', { agentId, error: error.message });
    }
  }

  private async saveToMemory(state: AgentState): Promise<void> {
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
  }

  private async loadFromMemory(agentId: string): Promise<AgentState | null> {
    const { memoryService } = await import('../../services/memory.service');
    const memories = await memoryService.searchMemories(
      'default-session',
      agentId,
      'agent_state',
      1
    );

    if (memories.length > 0) {
      return JSON.parse(memories[0].content);
    }
    return null;
  }

  private async saveTransitionToMemory(agentId: string, transition: StateTransition): Promise<void> {
    const { memoryService } = await import('../../services/memory.service');
    await memoryService.storeMemory({
      sessionId: 'default-session',
      agentId,
      type: 'state_transition',
      content: JSON.stringify(transition),
      metadata: {
        from: transition.from,
        to: transition.to,
        trigger: transition.trigger
      },
      importance: 5,
      tags: ['state_transition', transition.from, transition.to]
    });
  }

  private async loadTransitionsFromMemory(agentId: string): Promise<StateTransition[]> {
    const { memoryService } = await import('../../services/memory.service');
    const memories = await memoryService.searchMemories(
      'default-session',
      agentId,
      'state_transition',
      this.config.maxTransitions
    );

    return memories.map(m => JSON.parse(m.content));
  }

  private async saveSnapshotToMemory(agentId: string, snapshot: StateSnapshot): Promise<void> {
    const { memoryService } = await import('../../services/memory.service');
    await memoryService.storeMemory({
      sessionId: snapshot.sessionId,
      agentId: snapshot.agentId,
      type: 'state_snapshot',
      content: JSON.stringify(snapshot),
      metadata: {
        status: snapshot.state.status,
        version: snapshot.state.version,
        timestamp: snapshot.timestamp.toISOString()
      },
      importance: 7,
      tags: ['state_snapshot', snapshot.state.status]
    });
  }

  private async loadSnapshotsFromMemory(agentId: string): Promise<StateSnapshot[]> {
    const { memoryService } = await import('../../services/memory.service');
    const memories = await memoryService.searchMemories(
      'default-session',
      agentId,
      'state_snapshot',
      this.config.maxSnapshots
    );

    return memories.map(m => JSON.parse(m.content));
  }

  private async cleanupMemory(agentId: string, cutoffDate: Date): Promise<void> {
    const { memoryService } = await import('../../services/memory.service');
    // Cleanup old memories
    await memoryService.cleanupMemories({
      sessionId: 'default-session',
      agentId,
      olderThanDays: this.config.retentionDays
    });
  }

  private async saveToDatabase(state: AgentState): Promise<void> {
    // TODO: Implement database persistence
    logger.warn('Database persistence not implemented yet');
  }

  private async loadFromDatabase(agentId: string): Promise<AgentState | null> {
    // TODO: Implement database persistence
    logger.warn('Database persistence not implemented yet');
    return null;
  }

  private async saveTransitionToDatabase(agentId: string, transition: StateTransition): Promise<void> {
    // TODO: Implement database persistence
    logger.warn('Database persistence not implemented yet');
  }

  private async loadTransitionsFromDatabase(agentId: string): Promise<StateTransition[]> {
    // TODO: Implement database persistence
    logger.warn('Database persistence not implemented yet');
    return [];
  }

  private async saveSnapshotToDatabase(agentId: string, snapshot: StateSnapshot): Promise<void> {
    // TODO: Implement database persistence
    logger.warn('Database persistence not implemented yet');
  }

  private async loadSnapshotsFromDatabase(agentId: string): Promise<StateSnapshot[]> {
    // TODO: Implement database persistence
    logger.warn('Database persistence not implemented yet');
    return [];
  }

  private async cleanupDatabase(agentId: string, cutoffDate: Date): Promise<void> {
    // TODO: Implement database persistence
    logger.warn('Database persistence not implemented yet');
  }

  private async saveToFile(state: AgentState): Promise<void> {
    // TODO: Implement file persistence
    logger.warn('File persistence not implemented yet');
  }

  private async loadFromFile(agentId: string): Promise<AgentState | null> {
    // TODO: Implement file persistence
    logger.warn('File persistence not implemented yet');
    return null;
  }

  private async saveTransitionToFile(agentId: string, transition: StateTransition): Promise<void> {
    // TODO: Implement file persistence
    logger.warn('File persistence not implemented yet');
  }

  private async loadTransitionsFromFile(agentId: string): Promise<StateTransition[]> {
    // TODO: Implement file persistence
    logger.warn('File persistence not implemented yet');
    return [];
  }

  private async saveSnapshotToFile(agentId: string, snapshot: StateSnapshot): Promise<void> {
    // TODO: Implement file persistence
    logger.warn('File persistence not implemented yet');
  }

  private async loadSnapshotsFromFile(agentId: string): Promise<StateSnapshot[]> {
    // TODO: Implement file persistence
    logger.warn('File persistence not implemented yet');
    return [];
  }

  private async cleanupFile(agentId: string, cutoffDate: Date): Promise<void> {
    // TODO: Implement file persistence
    logger.warn('File persistence not implemented yet');
  }
}

export const statePersistence = StatePersistence.getInstance();
