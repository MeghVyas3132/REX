import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
const logger = require("../../utils/logger");

export interface MemoryEntry {
  id: string;
  sessionId: string;
  agentId: string;
  timestamp: Date;
  type: 'conversation' | 'context' | 'fact' | 'preference' | 'goal';
  content: string;
  metadata: Record<string, any>;
  importance: number; // 1-10 scale
  tags: string[];
  expiresAt?: Date;
}

export interface ConversationContext {
  sessionId: string;
  agentId: string;
  currentTopic: string;
  userProfile: Record<string, any>;
  conversationHistory: MemoryEntry[];
  activeGoals: string[];
  preferences: Record<string, any>;
  lastInteraction: Date;
}

export interface MemoryQuery {
  sessionId?: string;
  agentId?: string;
  type?: MemoryEntry['type'];
  tags?: string[];
  importance?: number;
  timeRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  searchText?: string;
}

export class MemoryStorage {
  private memories: Map<string, MemoryEntry[]> = new Map();
  private conversations: Map<string, ConversationContext> = new Map();
  private index: Map<string, Set<string>> = new Map(); // tag -> memory IDs

  constructor() {
    logger.info('Memory storage initialized');
  }

  // Store a new memory entry
  async storeMemory(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<string> {
    const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const memory: MemoryEntry = {
      ...entry,
      id,
      timestamp: new Date()
    };

    // Store in session
    const sessionKey = `${entry.sessionId}_${entry.agentId}`;
    if (!this.memories.has(sessionKey)) {
      this.memories.set(sessionKey, []);
    }
    this.memories.get(sessionKey)!.push(memory);

    // Update index
    this.updateIndex(memory);

    // Update conversation context
    await this.updateConversationContext(entry.sessionId, entry.agentId, memory);

    logger.info('Memory stored', {
      id: memory.id,
      sessionId: entry.sessionId,
      agentId: entry.agentId,
      type: entry.type
    });

    return id;
  }

  // Retrieve memories based on query
  async retrieveMemories(query: MemoryQuery): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = [];
    
    for (const [sessionKey, memories] of this.memories.entries()) {
      const [sessionId, agentId] = sessionKey.split('_');
      
      // Filter by session/agent
      if (query.sessionId && query.sessionId !== sessionId) continue;
      if (query.agentId && query.agentId !== agentId) continue;
      
      for (const memory of memories) {
        // Apply filters
        if (query.type && memory.type !== query.type) continue;
        if (query.importance && memory.importance < query.importance) continue;
        if (query.timeRange) {
          if (memory.timestamp < query.timeRange.start || memory.timestamp > query.timeRange.end) continue;
        }
        if (query.tags && !query.tags.some(tag => memory.tags.includes(tag))) continue;
        if (query.searchText && !memory.content.toLowerCase().includes(query.searchText.toLowerCase())) continue;
        
        results.push(memory);
      }
    }

    // Sort by importance and timestamp
    results.sort((a, b) => {
      if (a.importance !== b.importance) return b.importance - a.importance;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    // Apply limit
    if (query.limit) {
      return results.slice(0, query.limit);
    }

    return results;
  }

  // Get conversation context
  async getConversationContext(sessionId: string, agentId: string): Promise<ConversationContext | null> {
    const key = `${sessionId}_${agentId}`;
    return this.conversations.get(key) || null;
  }

  // Update conversation context
  private async updateConversationContext(sessionId: string, agentId: string, memory: MemoryEntry): Promise<void> {
    const key = `${sessionId}_${agentId}`;
    let context = this.conversations.get(key);

    if (!context) {
      context = {
        sessionId,
        agentId,
        currentTopic: '',
        userProfile: {},
        conversationHistory: [],
        activeGoals: [],
        preferences: {},
        lastInteraction: new Date()
      };
      this.conversations.set(key, context);
    }

    // Update context based on memory type
    switch (memory.type) {
      case 'conversation':
        context.conversationHistory.push(memory);
        context.lastInteraction = memory.timestamp;
        break;
      case 'preference':
        context.preferences = { ...context.preferences, ...memory.metadata };
        break;
      case 'goal':
        if (memory.metadata.goal) {
          context.activeGoals.push(memory.metadata.goal);
        }
        break;
      case 'fact':
        if (memory.metadata.topic) {
          context.currentTopic = memory.metadata.topic;
        }
        break;
    }

    // Keep only recent conversation history (last 50 entries)
    if (context.conversationHistory.length > 50) {
      context.conversationHistory = context.conversationHistory.slice(-50);
    }
  }

  // Update index for search
  private updateIndex(memory: MemoryEntry): void {
    for (const tag of memory.tags) {
      if (!this.index.has(tag)) {
        this.index.set(tag, new Set());
      }
      this.index.get(tag)!.add(memory.id);
    }
  }

  // Search memories by semantic similarity (basic implementation)
  async searchMemories(query: string, sessionId: string, agentId: string, limit: number = 10): Promise<MemoryEntry[]> {
    const sessionKey = `${sessionId}_${agentId}`;
    const memories = this.memories.get(sessionKey) || [];
    
    // Simple text-based search (can be enhanced with vector embeddings)
    const results = memories.filter(memory => 
      memory.content.toLowerCase().includes(query.toLowerCase()) ||
      memory.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );

    return results
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);
  }

  // Get relevant context for a conversation
  async getRelevantContext(sessionId: string, agentId: string, currentInput: string): Promise<MemoryEntry[]> {
    const context = await this.getConversationContext(sessionId, agentId);
    if (!context) return [];

    // Get recent conversation history
    const recentMemories = await this.retrieveMemories({
      sessionId,
      agentId,
      type: 'conversation',
      limit: 10
    });

    // Get relevant facts and preferences
    const relevantMemories = await this.retrieveMemories({
      sessionId,
      agentId,
      type: 'fact',
      importance: 5,
      limit: 5
    });

    const preferences = await this.retrieveMemories({
      sessionId,
      agentId,
      type: 'preference',
      limit: 5
    });

    return [...recentMemories, ...relevantMemories, ...preferences];
  }

  // Clean up expired memories
  async cleanupExpiredMemories(): Promise<void> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionKey, memories] of this.memories.entries()) {
      const validMemories = memories.filter(memory => {
        if (memory.expiresAt && memory.expiresAt < now) {
          cleanedCount++;
          return false;
        }
        return true;
      });
      
      this.memories.set(sessionKey, validMemories);
    }

    logger.info('Cleaned up expired memories', { count: cleanedCount });
  }

  // Get memory statistics
  async getMemoryStats(sessionId?: string, agentId?: string): Promise<{
    totalMemories: number;
    memoriesByType: Record<string, number>;
    recentActivity: number;
  }> {
    let totalMemories = 0;
    const memoriesByType: Record<string, number> = {};
    let recentActivity = 0;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const [sessionKey, memories] of this.memories.entries()) {
      const [memSessionId, memAgentId] = sessionKey.split('_');
      
      if (sessionId && memSessionId !== sessionId) continue;
      if (agentId && memAgentId !== agentId) continue;

      totalMemories += memories.length;
      
      for (const memory of memories) {
        memoriesByType[memory.type] = (memoriesByType[memory.type] || 0) + 1;
        
        if (memory.timestamp > oneDayAgo) {
          recentActivity++;
        }
      }
    }

    return {
      totalMemories,
      memoriesByType,
      recentActivity
    };
  }
}

// Export singleton instance
export const memoryStorage = new MemoryStorage();
