import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
import { memoryStorage, MemoryEntry, ConversationContext, MemoryQuery } from './memory-storage';
const logger = require("../../utils/logger");

export interface AgentMemoryConfig {
  sessionId: string;
  agentId: string;
  maxContextLength: number;
  memoryRetentionDays: number;
  importanceThreshold: number;
  enableSemanticSearch: boolean;
}

export class MemoryManager {
  private config: AgentMemoryConfig;

  constructor(config: AgentMemoryConfig) {
    this.config = config;
  }

  // Store conversation memory
  async storeConversationMemory(
    content: string,
    metadata: Record<string, any> = {},
    importance: number = 5
  ): Promise<string> {
    return await memoryStorage.storeMemory({
      sessionId: this.config.sessionId,
      agentId: this.config.agentId,
      type: 'conversation',
      content,
      metadata,
      importance,
      tags: this.extractTags(content),
      expiresAt: new Date(Date.now() + this.config.memoryRetentionDays * 24 * 60 * 60 * 1000)
    });
  }

  // Store user preference
  async storePreference(key: string, value: any, importance: number = 7): Promise<string> {
    return await memoryStorage.storeMemory({
      sessionId: this.config.sessionId,
      agentId: this.config.agentId,
      type: 'preference',
      content: `User prefers ${key}: ${JSON.stringify(value)}`,
      metadata: { key, value },
      importance,
      tags: ['preference', key],
      expiresAt: new Date(Date.now() + this.config.memoryRetentionDays * 24 * 60 * 60 * 1000)
    });
  }

  // Store important fact
  async storeFact(fact: string, topic: string, importance: number = 6): Promise<string> {
    return await memoryStorage.storeMemory({
      sessionId: this.config.sessionId,
      agentId: this.config.agentId,
      type: 'fact',
      content: fact,
      metadata: { topic },
      importance,
      tags: ['fact', topic],
      expiresAt: new Date(Date.now() + this.config.memoryRetentionDays * 24 * 60 * 60 * 1000)
    });
  }

  // Store agent goal
  async storeGoal(goal: string, priority: number = 8): Promise<string> {
    return await memoryStorage.storeMemory({
      sessionId: this.config.sessionId,
      agentId: this.config.agentId,
      type: 'goal',
      content: goal,
      metadata: { priority },
      importance: priority,
      tags: ['goal'],
      expiresAt: new Date(Date.now() + this.config.memoryRetentionDays * 24 * 60 * 60 * 1000)
    });
  }

  // Get conversation context for agent
  async getConversationContext(): Promise<ConversationContext | null> {
    return await memoryStorage.getConversationContext(this.config.sessionId, this.config.agentId);
  }

  // Get relevant memories for current interaction
  async getRelevantMemories(currentInput: string, limit: number = 10): Promise<MemoryEntry[]> {
    // Get recent conversation history
    const recentMemories = await memoryStorage.retrieveMemories({
      sessionId: this.config.sessionId,
      agentId: this.config.agentId,
      type: 'conversation',
      limit: Math.floor(limit * 0.6)
    });

    // Get important facts and preferences
    const importantMemories = await memoryStorage.retrieveMemories({
      sessionId: this.config.sessionId,
      agentId: this.config.agentId,
      importance: this.config.importanceThreshold,
      limit: Math.floor(limit * 0.4)
    });

    // Combine and deduplicate
    const allMemories = [...recentMemories, ...importantMemories];
    const uniqueMemories = this.deduplicateMemories(allMemories);

    return uniqueMemories.slice(0, limit);
  }

  // Search memories semantically
  async searchMemories(query: string, limit: number = 5): Promise<MemoryEntry[]> {
    return await memoryStorage.searchMemories(
      query,
      this.config.sessionId,
      this.config.agentId,
      limit
    );
  }

  // Get user preferences
  async getUserPreferences(): Promise<Record<string, any>> {
    const preferences = await memoryStorage.retrieveMemories({
      sessionId: this.config.sessionId,
      agentId: this.config.agentId,
      type: 'preference'
    });

    const userPrefs: Record<string, any> = {};
    for (const pref of preferences) {
      if (pref.metadata.key && pref.metadata.value) {
        userPrefs[pref.metadata.key] = pref.metadata.value;
      }
    }

    return userPrefs;
  }

  // Get active goals
  async getActiveGoals(): Promise<string[]> {
    const goals = await memoryStorage.retrieveMemories({
      sessionId: this.config.sessionId,
      agentId: this.config.agentId,
      type: 'goal',
      importance: 7
    });

    return goals.map(goal => goal.content);
  }

  // Update conversation topic
  async updateTopic(topic: string): Promise<void> {
    await memoryStorage.storeMemory({
      sessionId: this.config.sessionId,
      agentId: this.config.agentId,
      type: 'context',
      content: `Current conversation topic: ${topic}`,
      metadata: { topic },
      importance: 4,
      tags: ['topic', topic]
    });
  }

  // Generate context summary for LLM
  async generateContextSummary(currentInput: string): Promise<string> {
    const context = await this.getConversationContext();
    const relevantMemories = await this.getRelevantMemories(currentInput, 15);
    const preferences = await this.getUserPreferences();
    const goals = await this.getActiveGoals();

    let summary = `## Conversation Context\n`;
    
    if (context) {
      summary += `Session: ${context.sessionId}\n`;
      summary += `Agent: ${context.agentId}\n`;
      summary += `Last Interaction: ${context.lastInteraction.toISOString()}\n`;
      
      if (context.currentTopic) {
        summary += `Current Topic: ${context.currentTopic}\n`;
      }
    }

    if (Object.keys(preferences).length > 0) {
      summary += `\n## User Preferences\n`;
      for (const [key, value] of Object.entries(preferences)) {
        summary += `- ${key}: ${JSON.stringify(value)}\n`;
      }
    }

    if (goals.length > 0) {
      summary += `\n## Active Goals\n`;
      for (const goal of goals) {
        summary += `- ${goal}\n`;
      }
    }

    if (relevantMemories.length > 0) {
      summary += `\n## Relevant Context\n`;
      for (const memory of relevantMemories.slice(0, 10)) {
        summary += `- [${memory.type}] ${memory.content}\n`;
      }
    }

    return summary;
  }

  // Extract tags from content
  private extractTags(content: string): string[] {
    const tags: string[] = [];
    
    // Extract common patterns
    const patterns = [
      /\b(urgent|important|critical)\b/gi,
      /\b(meeting|call|email|message)\b/gi,
      /\b(work|personal|family|friends)\b/gi,
      /\b(project|task|goal|objective)\b/gi
    ];

    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        tags.push(...matches.map(m => m.toLowerCase()));
      }
    }

    return [...new Set(tags)];
  }

  // Deduplicate memories
  private deduplicateMemories(memories: MemoryEntry[]): MemoryEntry[] {
    const seen = new Set<string>();
    return memories.filter(memory => {
      if (seen.has(memory.id)) return false;
      seen.add(memory.id);
      return true;
    });
  }

  // Clean up old memories
  async cleanup(): Promise<void> {
    await memoryStorage.cleanupExpiredMemories();
  }

  // Get memory statistics
  async getStats(): Promise<{
    totalMemories: number;
    memoriesByType: Record<string, number>;
    recentActivity: number;
  }> {
    return await memoryStorage.getMemoryStats(this.config.sessionId, this.config.agentId);
  }
}

// Factory function to create memory manager
export function createMemoryManager(config: AgentMemoryConfig): MemoryManager {
  return new MemoryManager(config);
}
