import { embeddingService, SimilarityResult } from './embedding-service';
const logger = require('../../utils/logger');

export interface VectorMemory {
  id: string;
  content: string;
  embedding: number[];
  metadata: any;
  timestamp: string;
  sessionId: string;
  agentId: string;
  memoryType: string;
  importance: number;
  tags: string[];
}

export interface VectorSearchOptions {
  threshold?: number;
  limit?: number;
  memoryTypes?: string[];
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  importance?: {
    min: number;
    max: number;
  };
}

export class VectorStorage {
  private memories: Map<string, VectorMemory> = new Map();
  private index: Map<string, VectorMemory[]> = new Map(); // sessionId -> memories

  constructor() {
    logger.info('Vector storage initialized');
  }

  /**
   * Store a memory with vector embedding
   */
  async storeMemory(
    content: string,
    metadata: any,
    sessionId: string,
    agentId: string,
    memoryType: string = 'conversation',
    importance: number = 5,
    tags: string[] = []
  ): Promise<string> {
    try {
      const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info('Storing memory with embedding', {
        id,
        contentLength: content.length,
        sessionId,
        agentId,
        memoryType,
        importance
      });

      // Generate embedding for the content
      const embeddingResult = await embeddingService.generateEmbedding(content);

      const memory: VectorMemory = {
        id,
        content,
        embedding: embeddingResult.embedding,
        metadata,
        timestamp: new Date().toISOString(),
        sessionId,
        agentId,
        memoryType,
        importance,
        tags
      };

      // Store in memory
      this.memories.set(id, memory);

      // Add to session index
      if (!this.index.has(sessionId)) {
        this.index.set(sessionId, []);
      }
      this.index.get(sessionId)!.push(memory);

      logger.info('Memory stored with embedding', {
        id,
        embeddingDimensions: embeddingResult.embedding.length,
        sessionId,
        agentId
      });

      return id;
    } catch (error: any) {
      logger.error('Failed to store memory with embedding', error);
      throw new Error(`Vector memory storage failed: ${error.message}`);
    }
  }

  /**
   * Search for similar memories using vector similarity
   */
  async searchMemories(
    query: string,
    sessionId: string,
    options: VectorSearchOptions = {}
  ): Promise<SimilarityResult[]> {
    try {
      const {
        threshold = 0.7,
        limit = 10,
        memoryTypes = [],
        tags = [],
        dateRange,
        importance = { min: 1, max: 10 }
      } = options;

      logger.info('Searching memories with vector similarity', {
        query,
        sessionId,
        threshold,
        limit,
        filters: { memoryTypes, tags, dateRange, importance }
      });

      // Get session memories
      const sessionMemories = this.index.get(sessionId) || [];
      
      if (sessionMemories.length === 0) {
        logger.info('No memories found for session', { sessionId });
        return [];
      }

      // Apply filters
      let filteredMemories = sessionMemories.filter(memory => {
        // Memory type filter
        if (memoryTypes.length > 0 && !memoryTypes.includes(memory.memoryType)) {
          return false;
        }

        // Tags filter
        if (tags.length > 0 && !tags.some(tag => memory.tags.includes(tag))) {
          return false;
        }

        // Date range filter
        if (dateRange) {
          const memoryDate = new Date(memory.timestamp);
          const startDate = new Date(dateRange.start);
          const endDate = new Date(dateRange.end);
          if (memoryDate < startDate || memoryDate > endDate) {
            return false;
          }
        }

        // Importance filter
        if (memory.importance < importance.min || memory.importance > importance.max) {
          return false;
        }

        return true;
      });

      if (filteredMemories.length === 0) {
        logger.info('No memories match the filters', { sessionId });
        return [];
      }

      // Generate embedding for the query
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // Prepare candidates for similarity search
      const candidates = filteredMemories.map(memory => ({
        id: memory.id,
        embedding: memory.embedding,
        content: memory.content,
        metadata: memory.metadata,
        timestamp: memory.timestamp
      }));

      // Find similar memories
      const results = embeddingService.findSimilar(
        queryEmbedding.embedding,
        candidates,
        threshold,
        limit
      );

      logger.info('Vector similarity search completed', {
        query,
        sessionId,
        resultsCount: results.length,
        maxSimilarity: results[0]?.similarity || 0,
        minSimilarity: results[results.length - 1]?.similarity || 0
      });

      return results;
    } catch (error: any) {
      logger.error('Failed to search memories with vector similarity', error);
      throw new Error(`Vector memory search failed: ${error.message}`);
    }
  }

  /**
   * Get memory by ID
   */
  getMemory(id: string): VectorMemory | undefined {
    return this.memories.get(id);
  }

  /**
   * Update memory content and regenerate embedding
   */
  async updateMemory(
    id: string,
    content: string,
    metadata?: any,
    importance?: number,
    tags?: string[]
  ): Promise<boolean> {
    try {
      const memory = this.memories.get(id);
      if (!memory) {
        logger.warn('Memory not found for update', { id });
        return false;
      }

      logger.info('Updating memory with new embedding', { id, contentLength: content.length });

      // Generate new embedding
      const embeddingResult = await embeddingService.generateEmbedding(content);

      // Update memory
      memory.content = content;
      memory.embedding = embeddingResult.embedding;
      memory.timestamp = new Date().toISOString();
      
      if (metadata) memory.metadata = metadata;
      if (importance !== undefined) memory.importance = importance;
      if (tags) memory.tags = tags;

      logger.info('Memory updated with new embedding', { id });
      return true;
    } catch (error: any) {
      logger.error('Failed to update memory', error, { id });
      return false;
    }
  }

  /**
   * Delete memory
   */
  deleteMemory(id: string): boolean {
    try {
      const memory = this.memories.get(id);
      if (!memory) {
        logger.warn('Memory not found for deletion', { id });
        return false;
      }

      // Remove from main storage
      this.memories.delete(id);

      // Remove from session index
      const sessionMemories = this.index.get(memory.sessionId) || [];
      const updatedSessionMemories = sessionMemories.filter(m => m.id !== id);
      this.index.set(memory.sessionId, updatedSessionMemories);

      logger.info('Memory deleted', { id, sessionId: memory.sessionId });
      return true;
    } catch (error: any) {
      logger.error('Failed to delete memory', error, { id });
      return false;
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): {
    totalMemories: number;
    memoryTypes: Record<string, number>;
    averageImportance: number;
    dateRange: { earliest: string; latest: string };
    totalEmbeddings: number;
  } {
    const sessionMemories = this.index.get(sessionId) || [];
    
    if (sessionMemories.length === 0) {
      return {
        totalMemories: 0,
        memoryTypes: {},
        averageImportance: 0,
        dateRange: { earliest: '', latest: '' },
        totalEmbeddings: 0
      };
    }

    const memoryTypes: Record<string, number> = {};
    let totalImportance = 0;
    let earliest = sessionMemories[0].timestamp;
    let latest = sessionMemories[0].timestamp;

    sessionMemories.forEach(memory => {
      memoryTypes[memory.memoryType] = (memoryTypes[memory.memoryType] || 0) + 1;
      totalImportance += memory.importance;
      
      if (memory.timestamp < earliest) earliest = memory.timestamp;
      if (memory.timestamp > latest) latest = memory.timestamp;
    });

    return {
      totalMemories: sessionMemories.length,
      memoryTypes,
      averageImportance: totalImportance / sessionMemories.length,
      dateRange: { earliest, latest },
      totalEmbeddings: sessionMemories.length
    };
  }

  /**
   * Clean up old memories
   */
  cleanupMemories(maxAge: number = 30 * 24 * 60 * 60 * 1000): number {
    const cutoffTime = new Date(Date.now() - maxAge).toISOString();
    let deletedCount = 0;

    for (const [id, memory] of this.memories.entries()) {
      if (memory.timestamp < cutoffTime) {
        this.deleteMemory(id);
        deletedCount++;
      }
    }

    logger.info('Memory cleanup completed', { deletedCount, maxAge });
    return deletedCount;
  }

  /**
   * Get all memories for a session
   */
  getSessionMemories(sessionId: string): VectorMemory[] {
    return this.index.get(sessionId) || [];
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const embeddingHealth = await embeddingService.healthCheck();
      return embeddingHealth;
    } catch (error) {
      logger.error('Vector storage health check failed', error);
      return false;
    }
  }
}

export const vectorStorage = new VectorStorage();
