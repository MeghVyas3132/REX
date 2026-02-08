import { vectorStorage, VectorMemory, VectorSearchOptions } from '../core/embeddings/vector-storage';
import { embeddingService } from '../core/embeddings/embedding-service';
const logger = require('../utils/logger');

export interface VectorMemorySearchRequest {
  query: string;
  sessionId: string;
  agentId?: string;
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

export interface VectorMemorySearchResponse {
  memories: Array<{
    id: string;
    content: string;
    similarity: number;
    metadata: any;
    timestamp: string;
    memoryType: string;
    importance: number;
    tags: string[];
  }>;
  totalFound: number;
  searchTime: number;
  queryEmbedding: {
    dimensions: number;
    model: string;
  };
}

export interface VectorMemoryStoreRequest {
  content: string;
  metadata?: any;
  sessionId: string;
  agentId: string;
  memoryType?: string;
  importance?: number;
  tags?: string[];
}

export interface VectorMemoryStoreResponse {
  id: string;
  success: boolean;
  embedding: {
    dimensions: number;
    model: string;
  };
  timestamp: string;
}

export class VectorMemoryService {
  constructor() {
    logger.info('Vector memory service initialized');
  }

  /**
   * Store memory with vector embedding
   */
  async storeMemory(request: VectorMemoryStoreRequest): Promise<VectorMemoryStoreResponse> {
    try {
      const {
        content,
        metadata = {},
        sessionId,
        agentId,
        memoryType = 'conversation',
        importance = 5,
        tags = []
      } = request;

      logger.info('Storing vector memory', {
        contentLength: content.length,
        sessionId,
        agentId,
        memoryType,
        importance,
        tagsCount: tags.length
      });

      const id = await vectorStorage.storeMemory(
        content,
        metadata,
        sessionId,
        agentId,
        memoryType,
        importance,
        tags
      );

      const memory = vectorStorage.getMemory(id);
      if (!memory) {
        throw new Error('Failed to retrieve stored memory');
      }

      const response: VectorMemoryStoreResponse = {
        id,
        success: true,
        embedding: {
          dimensions: memory.embedding.length,
          model: 'text-embedding-3-small'
        },
        timestamp: memory.timestamp
      };

      logger.info('Vector memory stored successfully', {
        id,
        dimensions: memory.embedding.length,
        sessionId,
        agentId
      });

      return response;
    } catch (error: any) {
      logger.error('Failed to store vector memory', error);
      throw new Error(`Vector memory storage failed: ${error.message}`);
    }
  }

  /**
   * Search memories using vector similarity
   */
  async searchMemories(request: VectorMemorySearchRequest): Promise<VectorMemorySearchResponse> {
    const startTime = Date.now();
    
    try {
      const {
        query,
        sessionId,
        agentId,
        threshold = 0.7,
        limit = 10,
        memoryTypes = [],
        tags = [],
        dateRange,
        importance = { min: 1, max: 10 }
      } = request;

      logger.info('Searching vector memories', {
        query,
        sessionId,
        agentId,
        threshold,
        limit,
        filters: { memoryTypes, tags, dateRange, importance }
      });

      const searchOptions: VectorSearchOptions = {
        threshold,
        limit,
        memoryTypes,
        tags,
        dateRange,
        importance
      };

      const results = await vectorStorage.searchMemories(query, sessionId, searchOptions);

      const memories = results.map(result => {
        const memory = vectorStorage.getMemory(result.id);
        return {
          id: result.id,
          content: result.content,
          similarity: result.similarity,
          metadata: result.metadata,
          timestamp: result.timestamp,
          memoryType: memory?.memoryType || 'unknown',
          importance: memory?.importance || 5,
          tags: memory?.tags || []
        };
      });

      const searchTime = Date.now() - startTime;

      const response: VectorMemorySearchResponse = {
        memories,
        totalFound: results.length,
        searchTime,
        queryEmbedding: {
          dimensions: 1536, // OpenAI text-embedding-3-small dimensions
          model: 'text-embedding-3-small'
        }
      };

      logger.info('Vector memory search completed', {
        query,
        sessionId,
        resultsCount: memories.length,
        searchTime,
        maxSimilarity: memories[0]?.similarity || 0
      });

      return response;
    } catch (error: any) {
      logger.error('Failed to search vector memories', error);
      throw new Error(`Vector memory search failed: ${error.message}`);
    }
  }

  /**
   * Get memory by ID
   */
  async getMemory(id: string): Promise<VectorMemory | null> {
    try {
      const memory = vectorStorage.getMemory(id);
      return memory || null;
    } catch (error: any) {
      logger.error('Failed to get memory', error, { id });
      return null;
    }
  }

  /**
   * Update memory with new content and embedding
   */
  async updateMemory(
    id: string,
    content: string,
    metadata?: any,
    importance?: number,
    tags?: string[]
  ): Promise<boolean> {
    try {
      logger.info('Updating vector memory', { id, contentLength: content.length });

      const success = await vectorStorage.updateMemory(id, content, metadata, importance, tags);

      if (success) {
        logger.info('Vector memory updated successfully', { id });
      } else {
        logger.warn('Failed to update vector memory', { id });
      }

      return success;
    } catch (error: any) {
      logger.error('Failed to update vector memory', error, { id });
      return false;
    }
  }

  /**
   * Delete memory
   */
  async deleteMemory(id: string): Promise<boolean> {
    try {
      logger.info('Deleting vector memory', { id });

      const success = vectorStorage.deleteMemory(id);

      if (success) {
        logger.info('Vector memory deleted successfully', { id });
      } else {
        logger.warn('Failed to delete vector memory', { id });
      }

      return success;
    } catch (error: any) {
      logger.error('Failed to delete vector memory', error, { id });
      return false;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(sessionId: string): Promise<{
    totalMemories: number;
    memoryTypes: Record<string, number>;
    averageImportance: number;
    dateRange: { earliest: string; latest: string };
    totalEmbeddings: number;
  }> {
    try {
      const stats = vectorStorage.getSessionStats(sessionId);
      
      logger.info('Retrieved session statistics', { sessionId, stats });
      
      return stats;
    } catch (error: any) {
      logger.error('Failed to get session statistics', error, { sessionId });
      throw new Error(`Failed to get session statistics: ${error.message}`);
    }
  }

  /**
   * Get all memories for a session
   */
  async getSessionMemories(sessionId: string): Promise<VectorMemory[]> {
    try {
      const memories = vectorStorage.getSessionMemories(sessionId);
      
      logger.info('Retrieved session memories', { sessionId, count: memories.length });
      
      return memories;
    } catch (error: any) {
      logger.error('Failed to get session memories', error, { sessionId });
      throw new Error(`Failed to get session memories: ${error.message}`);
    }
  }

  /**
   * Clean up old memories
   */
  async cleanupMemories(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    try {
      logger.info('Cleaning up old vector memories', { maxAge });

      const deletedCount = vectorStorage.cleanupMemories(maxAge);

      logger.info('Vector memory cleanup completed', { deletedCount, maxAge });

      return deletedCount;
    } catch (error: any) {
      logger.error('Failed to cleanup vector memories', error);
      throw new Error(`Vector memory cleanup failed: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbedding(text: string): Promise<{
    embedding: number[];
    dimensions: number;
    model: string;
  }> {
    try {
      logger.info('Generating embedding for text', { textLength: text.length });

      const result = await embeddingService.generateEmbedding(text);

      return {
        embedding: result.embedding,
        dimensions: result.embedding.length,
        model: result.model
      };
    } catch (error: any) {
      logger.error('Failed to generate embedding', error);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Calculate similarity between two texts
   */
  async calculateSimilarity(text1: string, text2: string): Promise<number> {
    try {
      logger.info('Calculating text similarity', { text1Length: text1.length, text2Length: text2.length });

      const [embedding1, embedding2] = await Promise.all([
        embeddingService.generateEmbedding(text1),
        embeddingService.generateEmbedding(text2)
      ]);

      const similarity = embeddingService.calculateSimilarity(
        embedding1.embedding,
        embedding2.embedding
      );

      logger.info('Text similarity calculated', { similarity });

      return similarity;
    } catch (error: any) {
      logger.error('Failed to calculate similarity', error);
      throw new Error(`Similarity calculation failed: ${error.message}`);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const vectorHealth = await vectorStorage.healthCheck();
      const embeddingHealth = await embeddingService.healthCheck();
      
      const isHealthy = vectorHealth && embeddingHealth;
      
      logger.info('Vector memory service health check', { 
        vectorHealth, 
        embeddingHealth, 
        isHealthy 
      });
      
      return isHealthy;
    } catch (error: any) {
      logger.error('Vector memory service health check failed', error);
      return false;
    }
  }
}

export const vectorMemoryService = new VectorMemoryService();
