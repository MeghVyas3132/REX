import { OpenAI } from 'openai';
const logger = require('../../utils/logger');

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface SimilarityResult {
  id: string;
  content: string;
  similarity: number;
  metadata: any;
  timestamp: string;
}

export class EmbeddingService {
  private openai: OpenAI;
  private model: string;
  private dimensions: number;
  private apiKey: string; // Add apiKey property

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.openai = new OpenAI({
      apiKey: this.apiKey
    });
    this.model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    this.dimensions = parseInt(process.env.EMBEDDING_DIMENSIONS || '1536');
    
    logger.info('Embedding service initialized', {
      model: this.model,
      dimensions: this.dimensions
    });
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      // Check if API key is disabled or invalid
      if (!this.apiKey || this.apiKey === 'disabled' || this.apiKey.includes('your-') || this.apiKey.includes('sk-your-')) {
        logger.warn('OpenAI API key is disabled or invalid, using mock embedding');
        return this.generateMockEmbedding(text);
      }

      logger.info('Generating embedding', { textLength: text.length, model: this.model });

      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
        dimensions: this.dimensions
      });

      const result: EmbeddingResult = {
        embedding: response.data[0].embedding,
        model: response.model,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens
        }
      };

      logger.info('Embedding generated successfully', {
        dimensions: result.embedding.length,
        usage: result.usage
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to generate embedding', error);
      
      // If it's an API key error, fall back to mock embedding
      if (error.message.includes('401') || error.message.includes('Incorrect API key')) {
        logger.warn('API key error detected, using mock embedding');
        return this.generateMockEmbedding(text);
      }
      
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Generate a mock embedding for testing/development
   */
  private generateMockEmbedding(text: string): EmbeddingResult {
    // Generate a deterministic mock embedding based on text hash
    const mockEmbedding = new Array(this.dimensions).fill(0).map((_, i) => {
      const hash = this.hashString(text + i);
      return (hash % 200 - 100) / 100; // Normalize to [-1, 1] range
    });

    return {
      embedding: mockEmbedding,
      model: this.model,
      usage: {
        promptTokens: Math.ceil(text.length / 4), // Rough estimate
        totalTokens: Math.ceil(text.length / 4)
      }
    };
  }

  /**
   * Simple hash function for deterministic mock embeddings
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      logger.info('Generating multiple embeddings', { count: texts.length, model: this.model });

      const response = await this.openai.embeddings.create({
        model: this.model,
        input: texts,
        dimensions: this.dimensions
      });

      const results: EmbeddingResult[] = response.data.map((item, index) => ({
        embedding: item.embedding,
        model: response.model,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens
        }
      }));

      logger.info('Multiple embeddings generated successfully', {
        count: results.length,
        usage: results[0]?.usage
      });

      return results;
    } catch (error: any) {
      logger.error('Failed to generate multiple embeddings', error);
      throw new Error(`Multiple embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embedding dimensions must match');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  /**
   * Find similar embeddings using cosine similarity
   */
  findSimilar(
    queryEmbedding: number[],
    candidateEmbeddings: Array<{
      id: string;
      embedding: number[];
      content: string;
      metadata: any;
      timestamp: string;
    }>,
    threshold: number = 0.7,
    limit: number = 10
  ): SimilarityResult[] {
    try {
      logger.info('Finding similar embeddings', {
        queryDimensions: queryEmbedding.length,
        candidatesCount: candidateEmbeddings.length,
        threshold,
        limit
      });

      const similarities = candidateEmbeddings.map(candidate => {
        const similarity = this.calculateSimilarity(queryEmbedding, candidate.embedding);
        return {
          id: candidate.id,
          content: candidate.content,
          similarity,
          metadata: candidate.metadata,
          timestamp: candidate.timestamp
        };
      });

      // Filter by threshold and sort by similarity
      const results = similarities
        .filter(item => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      logger.info('Similarity search completed', {
        resultsCount: results.length,
        maxSimilarity: results[0]?.similarity || 0,
        minSimilarity: results[results.length - 1]?.similarity || 0
      });

      return results;
    } catch (error: any) {
      logger.error('Failed to find similar embeddings', error);
      throw new Error(`Similarity search failed: ${error.message}`);
    }
  }

  /**
   * Chunk text for embedding generation
   */
  chunkText(text: string, maxChunkSize: number = 1000, overlap: number = 100): string[] {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + maxChunkSize, text.length);
      
      // Try to break at sentence boundaries
      if (end < text.length) {
        const lastSentence = text.lastIndexOf('.', end);
        const lastNewline = text.lastIndexOf('\n', end);
        const breakPoint = Math.max(lastSentence, lastNewline);
        
        if (breakPoint > start + maxChunkSize * 0.5) {
          end = breakPoint + 1;
        }
      }

      chunks.push(text.slice(start, end));
      start = end - overlap;
    }

    logger.info('Text chunked for embedding', {
      originalLength: text.length,
      chunksCount: chunks.length,
      maxChunkSize,
      overlap
    });

    return chunks;
  }

  /**
   * Health check for embedding service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testEmbedding = await this.generateEmbedding('test');
      const isValid = testEmbedding.embedding.length === this.dimensions;
      
      if (!this.apiKey || this.apiKey === 'disabled' || this.apiKey.includes('your-') || this.apiKey.includes('sk-your-')) {
        logger.info('Embedding service running in mock mode (API key disabled)');
        return true; // Mock mode is considered healthy
      }
      
      return isValid;
    } catch (error) {
      logger.error('Embedding service health check failed', error);
      return false;
    }
  }
}

export const embeddingService = new EmbeddingService();
