import { createMemoryManager, MemoryManager, AgentMemoryConfig } from '../core/memory/memory-manager';
import { memoryStorage } from '../core/memory/memory-storage';
const logger = require('../utils/logger');

export class MemoryService {
  private memoryManagers: Map<string, MemoryManager> = new Map();

  constructor() {
    logger.info('Memory service initialized');
  }

  // Get or create memory manager for agent
  getMemoryManager(sessionId: string, agentId: string): MemoryManager {
    const key = `${sessionId}_${agentId}`;
    
    if (!this.memoryManagers.has(key)) {
      const config: AgentMemoryConfig = {
        sessionId,
        agentId,
        maxContextLength: 4000,
        memoryRetentionDays: 30,
        importanceThreshold: 5,
        enableSemanticSearch: true
      };
      
      const manager = createMemoryManager(config);
      this.memoryManagers.set(key, manager);
    }
    
    return this.memoryManagers.get(key)!;
  }

  // Store conversation memory
  async storeConversation(
    sessionId: string,
    agentId: string,
    content: string,
    metadata: Record<string, any> = {},
    importance: number = 5
  ): Promise<string> {
    const manager = this.getMemoryManager(sessionId, agentId);
    return await manager.storeConversationMemory(content, metadata, importance);
  }

  // Store user preference
  async storePreference(
    sessionId: string,
    agentId: string,
    key: string,
    value: any,
    importance: number = 7
  ): Promise<string> {
    const manager = this.getMemoryManager(sessionId, agentId);
    return await manager.storePreference(key, value, importance);
  }

  // Store important fact
  async storeFact(
    sessionId: string,
    agentId: string,
    fact: string,
    topic: string,
    importance: number = 6
  ): Promise<string> {
    const manager = this.getMemoryManager(sessionId, agentId);
    return await manager.storeFact(fact, topic, importance);
  }

  // Store agent goal
  async storeGoal(
    sessionId: string,
    agentId: string,
    goal: string,
    priority: number = 8
  ): Promise<string> {
    const manager = this.getMemoryManager(sessionId, agentId);
    return await manager.storeGoal(goal, priority);
  }

  // Get conversation context
  async getConversationContext(sessionId: string, agentId: string) {
    const manager = this.getMemoryManager(sessionId, agentId);
    return await manager.getConversationContext();
  }

  // Get relevant memories for current interaction
  async getRelevantMemories(
    sessionId: string,
    agentId: string,
    currentInput: string,
    limit: number = 10
  ) {
    const manager = this.getMemoryManager(sessionId, agentId);
    return await manager.getRelevantMemories(currentInput, limit);
  }

  // Search memories
  async searchMemories(
    sessionId: string,
    agentId: string,
    query: string,
    limit: number = 5
  ) {
    const manager = this.getMemoryManager(sessionId, agentId);
    return await manager.searchMemories(query, limit);
  }

  // Generate context summary for LLM
  async generateContextSummary(
    sessionId: string,
    agentId: string,
    currentInput: string
  ): Promise<string> {
    const manager = this.getMemoryManager(sessionId, agentId);
    return await manager.generateContextSummary(currentInput);
  }

  // Get user preferences
  async getUserPreferences(sessionId: string, agentId: string) {
    const manager = this.getMemoryManager(sessionId, agentId);
    return await manager.getUserPreferences();
  }

  // Get active goals
  async getActiveGoals(sessionId: string, agentId: string) {
    const manager = this.getMemoryManager(sessionId, agentId);
    return await manager.getActiveGoals();
  }

  // Update conversation topic
  async updateTopic(sessionId: string, agentId: string, topic: string) {
    const manager = this.getMemoryManager(sessionId, agentId);
    return await manager.updateTopic(topic);
  }

  // Clean up old memories
  async cleanup(): Promise<void> {
    await memoryStorage.cleanupExpiredMemories();
  }

  // Get memory statistics
  async getStats(sessionId?: string, agentId?: string) {
    return await memoryStorage.getMemoryStats(sessionId, agentId);
  }

  // Enhanced LLM context injection
  async enhanceLLMContext(
    sessionId: string,
    agentId: string,
    currentInput: string,
    basePrompt: string
  ): Promise<string> {
    const contextSummary = await this.generateContextSummary(sessionId, agentId, currentInput);
    const preferences = await this.getUserPreferences(sessionId, agentId);
    const goals = await this.getActiveGoals(sessionId, agentId);

    let enhancedPrompt = basePrompt;

    // Add context if available
    if (contextSummary) {
      enhancedPrompt += `\n\n## Context\n${contextSummary}`;
    }

    // Add user preferences
    if (Object.keys(preferences).length > 0) {
      enhancedPrompt += `\n\n## User Preferences\n`;
      for (const [key, value] of Object.entries(preferences)) {
        enhancedPrompt += `- ${key}: ${JSON.stringify(value)}\n`;
      }
    }

    // Add active goals
    if (goals.length > 0) {
      enhancedPrompt += `\n\n## Active Goals\n`;
      for (const goal of goals) {
        enhancedPrompt += `- ${goal}\n`;
      }
    }

    return enhancedPrompt;
  }

  // Generic memory storage method for API routes
  async storeMemory(params: {
    sessionId: string;
    agentId: string;
    type: 'conversation' | 'preference' | 'fact' | 'goal' | 'context' | 'agent_state' | 'state_snapshot' | 'state_transition';
    content: string;
    metadata?: Record<string, any>;
    importance?: number;
    tags?: string[];
  }): Promise<{ memoryId: string; type: string; content: string; importance: number }> {
    const { sessionId, agentId, type, content, metadata = {}, importance = 5, tags = [] } = params;
    
    let memoryId: string;
    
    switch (type) {
      case 'conversation':
        memoryId = await this.storeConversation(sessionId, agentId, content, metadata, importance);
        break;
      case 'preference':
        const key = metadata.key || 'preference';
        memoryId = await this.storePreference(sessionId, agentId, key, content, importance);
        break;
      case 'fact':
        const topic = metadata.topic || 'general';
        memoryId = await this.storeFact(sessionId, agentId, content, topic, importance);
        break;
      case 'goal':
        memoryId = await this.storeGoal(sessionId, agentId, content, importance);
        break;
      case 'context':
        await this.updateTopic(sessionId, agentId, content);
        memoryId = 'context-updated';
        break;
      case 'agent_state':
        // Store agent state as a special type of memory
        memoryId = await this.storeConversation(sessionId, agentId, content, metadata, importance);
        break;
      default:
        throw new Error(`Unknown memory type: ${type}`);
    }

    return {
      memoryId,
      type,
      content,
      importance
    };
  }

  // Get relevant memories for API routes
  async getRelevantMemoriesForAPI(params: {
    sessionId: string;
    agentId: string;
    currentInput: string;
    limit: number;
  }): Promise<{
    memories: any[];
    context: any;
    summary: string;
  }> {
    const { sessionId, agentId, currentInput, limit } = params;
    
    const manager = this.getMemoryManager(sessionId, agentId);
    const memories = await manager.getRelevantMemories(currentInput, limit);
    const context = await manager.getConversationContext();
    const summary = await manager.generateContextSummary(currentInput);

    return {
      memories: memories.map(m => ({
        id: m.id,
        type: m.type,
        content: m.content,
        importance: m.importance,
        timestamp: m.timestamp,
        metadata: m.metadata,
        tags: m.tags
      })),
      context,
      summary
    };
  }

  // Search memories for API routes
  async searchMemoriesForAPI(params: {
    sessionId: string;
    agentId: string;
    query: string;
    limit: number;
  }): Promise<{
    query: string;
    memories: any[];
  }> {
    const { sessionId, agentId, query, limit } = params;
    
    const manager = this.getMemoryManager(sessionId, agentId);
    const memories = await manager.searchMemories(query, limit);

    return {
      query,
      memories: memories.map(m => ({
        id: m.id,
        type: m.type,
        content: m.content,
        importance: m.importance,
        timestamp: m.timestamp,
        metadata: m.metadata,
        tags: m.tags
      }))
    };
  }

  // Get conversation context for API routes
  async getConversationContextForAPI(params: {
    sessionId: string;
    agentId: string;
    currentInput: string;
  }): Promise<{
    context: any;
    summary: string;
    preferences: any;
    goals: any[];
  }> {
    const { sessionId, agentId, currentInput } = params;
    
    const manager = this.getMemoryManager(sessionId, agentId);
    const context = await manager.getConversationContext();
    const summary = await manager.generateContextSummary(currentInput);
    const preferences = await manager.getUserPreferences();
    const goals = await manager.getActiveGoals();

    return {
      context,
      summary,
      preferences,
      goals
    };
  }

  // Update memory for API routes
  async updateMemory(params: {
    sessionId: string;
    agentId: string;
    memoryId: string;
    content?: string;
    metadata?: Record<string, any>;
    importance?: number;
  }): Promise<{ memoryId: string; updated: boolean; content: string }> {
    const { sessionId, agentId, memoryId, content, metadata, importance } = params;
    
    // For now, we'll store as new conversation memory
    // In a full implementation, you'd update the existing memory
    if (content) {
      const newMemoryId = await this.storeConversation(sessionId, agentId, content, metadata, importance);
      return {
        memoryId: newMemoryId,
        updated: true,
        content
      };
    }

    return {
      memoryId,
      updated: false,
      content: ''
    };
  }

  // Delete memory for API routes
  async deleteMemory(params: {
    sessionId: string;
    agentId: string;
    memoryId: string;
  }): Promise<{ deleted: boolean; memoryId: string }> {
    const { memoryId } = params;
    
    // For now, we'll just return success
    // In a full implementation, you'd actually delete from storage
    return {
      deleted: true,
      memoryId
    };
  }

  // Get memory statistics for API routes
  async getMemoryStats(params: {
    sessionId: string;
    agentId: string;
  }): Promise<any> {
    const { sessionId, agentId } = params;
    return await this.getStats(sessionId, agentId);
  }

  // Cleanup memories for API routes
  async cleanupMemories(params: {
    sessionId: string;
    agentId: string;
    olderThanDays: number;
  }): Promise<{ cleaned: boolean; stats: any }> {
    await this.cleanup();
    const stats = await this.getStats(params.sessionId, params.agentId);
    
    return {
      cleaned: true,
      stats
    };
  }
}

// Export singleton instance
export const memoryService = new MemoryService();
