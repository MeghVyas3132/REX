import { vectorMemoryService } from '../services/vector-memory.service';
import { embeddingService } from '../core/embeddings/embedding-service';
const logger = require('../utils/logger');

export class VectorSearchTest {
  async runTests(): Promise<void> {
    logger.info('Starting vector search tests...');

    try {
      // Test 1: Health Check
      await this.testHealthCheck();
      
      // Test 2: Embedding Generation
      await this.testEmbeddingGeneration();
      
      // Test 3: Memory Storage
      await this.testMemoryStorage();
      
      // Test 4: Vector Search
      await this.testVectorSearch();
      
      // Test 5: Similarity Calculation
      await this.testSimilarityCalculation();
      
      // Test 6: Session Statistics
      await this.testSessionStatistics();
      
      logger.info('All vector search tests completed successfully!');
    } catch (error: any) {
      logger.error('Vector search tests failed', error);
      throw error;
    }
  }

  private async testHealthCheck(): Promise<void> {
    logger.info('Testing health check...');
    
    const isHealthy = await vectorMemoryService.healthCheck();
    
    if (!isHealthy) {
      throw new Error('Vector memory service health check failed');
    }
    
    logger.info('✅ Health check passed');
  }

  private async testEmbeddingGeneration(): Promise<void> {
    logger.info('Testing embedding generation...');
    
    const testText = 'This is a test text for embedding generation';
    const embedding = await vectorMemoryService.generateEmbedding(testText);
    
    if (!embedding.embedding || embedding.embedding.length === 0) {
      throw new Error('Embedding generation failed');
    }
    
    if (embedding.dimensions !== 1536) {
      throw new Error(`Expected 1536 dimensions, got ${embedding.dimensions}`);
    }
    
    logger.info('✅ Embedding generation passed', {
      dimensions: embedding.dimensions,
      model: embedding.model
    });
  }

  private async testMemoryStorage(): Promise<void> {
    logger.info('Testing memory storage...');
    
    const testSessionId = 'test-session-' + Date.now();
    const testAgentId = 'test-agent-' + Date.now();
    
    const storeResult = await vectorMemoryService.storeMemory({
      content: 'This is a test memory for vector storage',
      metadata: { test: true, type: 'test' },
      sessionId: testSessionId,
      agentId: testAgentId,
      memoryType: 'conversation',
      importance: 7,
      tags: ['test', 'vector']
    });
    
    if (!storeResult.id || !storeResult.success) {
      throw new Error('Memory storage failed');
    }
    
    // Verify memory can be retrieved
    const retrievedMemory = await vectorMemoryService.getMemory(storeResult.id);
    if (!retrievedMemory) {
      throw new Error('Memory retrieval failed');
    }
    
    if (retrievedMemory.content !== 'This is a test memory for vector storage') {
      throw new Error('Memory content mismatch');
    }
    
    logger.info('✅ Memory storage passed', { memoryId: storeResult.id });
  }

  private async testVectorSearch(): Promise<void> {
    logger.info('Testing vector search...');
    
    const testSessionId = 'test-session-' + Date.now();
    const testAgentId = 'test-agent-' + Date.now();
    
    // Store multiple test memories
    const memories = [
      'I love programming and coding',
      'Machine learning is fascinating',
      'Python is my favorite programming language',
      'I enjoy working with AI and neural networks',
      'JavaScript is great for web development'
    ];
    
    for (let i = 0; i < memories.length; i++) {
      await vectorMemoryService.storeMemory({
        content: memories[i],
        metadata: { index: i, test: true },
        sessionId: testSessionId,
        agentId: testAgentId,
        memoryType: 'conversation',
        importance: 5 + i,
        tags: ['test', 'programming']
      });
    }
    
    // Search for similar content
    const searchResult = await vectorMemoryService.searchMemories({
      query: 'programming languages and coding',
      sessionId: testSessionId,
      threshold: 0.3,
      limit: 3
    });
    
    if (searchResult.memories.length === 0) {
      throw new Error('Vector search returned no results');
    }
    
    if (searchResult.memories[0].similarity < 0.3) {
      throw new Error('Vector search similarity too low');
    }
    
    logger.info('✅ Vector search passed', {
      resultsCount: searchResult.memories.length,
      maxSimilarity: searchResult.memories[0].similarity,
      searchTime: searchResult.searchTime
    });
  }

  private async testSimilarityCalculation(): Promise<void> {
    logger.info('Testing similarity calculation...');
    
    const text1 = 'I love programming and coding';
    const text2 = 'Programming and coding are my passion';
    const text3 = 'I hate vegetables and broccoli';
    
    const similarity1 = await vectorMemoryService.calculateSimilarity(text1, text2);
    const similarity2 = await vectorMemoryService.calculateSimilarity(text1, text3);
    
    if (similarity1 <= 0 || similarity1 > 1) {
      throw new Error('Invalid similarity score for similar texts');
    }
    
    if (similarity2 <= 0 || similarity2 > 1) {
      throw new Error('Invalid similarity score for different texts');
    }
    
    if (similarity1 <= similarity2) {
      throw new Error('Similar texts should have higher similarity than different texts');
    }
    
    logger.info('✅ Similarity calculation passed', {
      similarTexts: similarity1,
      differentTexts: similarity2
    });
  }

  private async testSessionStatistics(): Promise<void> {
    logger.info('Testing session statistics...');
    
    const testSessionId = 'test-session-stats-' + Date.now();
    const testAgentId = 'test-agent-stats-' + Date.now();
    
    // Store memories with different types and importance levels
    await vectorMemoryService.storeMemory({
      content: 'High importance memory',
      metadata: { type: 'important' },
      sessionId: testSessionId,
      agentId: testAgentId,
      memoryType: 'conversation',
      importance: 9,
      tags: ['important']
    });
    
    await vectorMemoryService.storeMemory({
      content: 'Low importance memory',
      metadata: { type: 'casual' },
      sessionId: testSessionId,
      agentId: testAgentId,
      memoryType: 'preference',
      importance: 2,
      tags: ['casual']
    });
    
    const stats = await vectorMemoryService.getSessionStats(testSessionId);
    
    if (stats.totalMemories !== 2) {
      throw new Error(`Expected 2 memories, got ${stats.totalMemories}`);
    }
    
    if (stats.memoryTypes.conversation !== 1) {
      throw new Error('Expected 1 conversation memory');
    }
    
    if (stats.memoryTypes.preference !== 1) {
      throw new Error('Expected 1 preference memory');
    }
    
    if (stats.averageImportance < 5) {
      throw new Error('Average importance should be around 5.5');
    }
    
    logger.info('✅ Session statistics passed', stats);
  }
}

// Export for use in other files
export const vectorSearchTest = new VectorSearchTest();
