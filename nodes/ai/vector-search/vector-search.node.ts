import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
import { logger } from '../../lib/logger.js';

export class VectorSearchNode {
  getNodeDefinition() {
    return {
      id: 'vector-search',
      type: 'action',
      name: 'Vector Search',
      description: 'Search for similar content using vector embeddings',
      category: 'ai',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'apiKey',
          type: 'string',
          displayName: 'API Key',
          description: 'Vector database API key',
          required: true,
          placeholder: 'your-api-key',
          credentialType: 'vector_db_api_key'
        },
        {
          name: 'provider',
          type: 'options',
          displayName: 'Vector Database',
          description: 'Vector database provider to use',
          required: true,
          default: 'pinecone',
          options: [
            { name: 'Pinecone', value: 'pinecone' },
            { name: 'Chroma', value: 'chroma' },
            { name: 'Weaviate', value: 'weaviate' }
          ]
        },
        {
          name: 'aiProvider',
          type: 'options',
          displayName: 'AI Provider',
          description: 'AI provider to use for generating embeddings',
          required: true,
          default: 'openai',
          options: [
            { name: 'OpenAI', value: 'openai' },
            { name: 'OpenRouter', value: 'openrouter' },
            { name: 'Google Gemini', value: 'gemini' }
          ]
        },
        {
          name: 'aiApiKey',
          type: 'string',
          displayName: 'AI API Key',
          description: 'API key for the selected AI provider',
          required: true,
          placeholder: 'Enter your AI API key...',
          credentialType: 'ai_api_key'
        },
        {
          name: 'embeddingModel',
          type: 'options',
          displayName: 'Embedding Model',
          description: 'Model to use for generating embeddings',
          required: false,
          default: 'text-embedding-ada-002',
          options: [
            { name: 'text-embedding-ada-002', value: 'text-embedding-ada-002' },
            { name: 'text-embedding-3-small', value: 'text-embedding-3-small' },
            { name: 'text-embedding-3-large', value: 'text-embedding-3-large' },
            { name: 'OpenAI via OpenRouter', value: 'openai/text-embedding-ada-002' }
          ]
        },
        {
          name: 'topK',
          type: 'number',
          displayName: 'Top K Results',
          description: 'Number of similar results to return',
          required: false,
          default: 5,
          min: 1,
          max: 100
        },
        {
          name: 'threshold',
          type: 'number',
          displayName: 'Similarity Threshold',
          description: 'Minimum similarity score (0-1)',
          required: false,
          default: 0.7,
          min: 0,
          max: 1,
          step: 0.1
        },
        {
          name: 'namespace',
          type: 'string',
          displayName: 'Namespace',
          description: 'Vector database namespace/collection',
          required: false,
          placeholder: 'my-collection'
        },
        {
          name: 'filter',
          type: 'object',
          displayName: 'Filter Criteria',
          description: 'Metadata filters for search',
          required: false
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'query',
          type: 'string',
          displayName: 'Search Query',
          description: 'Text query to search for from previous node',
          required: true,
          dataType: 'text'
        },
        {
          name: 'topK',
          type: 'number',
          displayName: 'Dynamic Top K',
          description: 'Number of results from previous node (overrides configured)',
          required: false,
          dataType: 'number'
        },
        {
          name: 'threshold',
          type: 'number',
          displayName: 'Dynamic Threshold',
          description: 'Similarity threshold from previous node (overrides configured)',
          required: false,
          dataType: 'number'
        },
        {
          name: 'filter',
          type: 'object',
          displayName: 'Dynamic Filter',
          description: 'Search filters from previous node',
          required: false,
          dataType: 'object'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'results',
          type: 'array',
          displayName: 'Search Results',
          description: 'Array of similar content with scores',
          dataType: 'array'
        },
        {
          name: 'count',
          type: 'number',
          displayName: 'Result Count',
          description: 'Number of results found',
          dataType: 'number'
        },
        {
          name: 'query',
          type: 'string',
          displayName: 'Search Query Used',
          description: 'The query that was searched',
          dataType: 'text'
        },
        {
          name: 'scores',
          type: 'array',
          displayName: 'Similarity Scores',
          description: 'Similarity scores for each result',
          dataType: 'array'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          apiKey: { type: 'string' },
          provider: { type: 'string' },
          aiProvider: { type: 'string' },
          aiApiKey: { type: 'string' },
          embeddingModel: { type: 'string' },
          topK: { type: 'number' },
          threshold: { type: 'number' },
          namespace: { type: 'string' },
          filter: { type: 'object' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          topK: { type: 'number' },
          threshold: { type: 'number' },
          filter: { type: 'object' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          results: { type: 'array' },
          count: { type: 'number' },
          query: { type: 'string' },
          scores: { type: 'array' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    const startTime = Date.now();

    
    // Validation for required parameters
    if (!config.apiKey && !context.input?.apiKey) {
      throw new Error('Required parameter "apiKey" is missing');
    }
    if (!config.provider && !context.input?.provider) {
      throw new Error('Required parameter "provider" is missing');
    }

    
    try {
      const provider = config.provider || 'pinecone';
      const aiProvider = config.aiProvider || 'openai';
      const query = config.query || context.input?.query;
      const topK = config.topK || 5;
      const threshold = config.threshold || 0.7;

      if (!query) {
        throw new Error('Query is required for vector search');
      }

      logger.info('Performing vector search', {
        nodeId: node.id,
        provider,
        aiProvider,
        query: query.substring(0, 100) + '...',
        runId: context.runId
      });

      let results: any[] = [];

      switch (provider) {
        case 'pinecone':
          results = await this.searchPinecone(config, query, topK, threshold, aiProvider);
          break;
        case 'chroma':
          results = await this.searchChroma(config, query, topK, threshold, aiProvider);
          break;
        case 'weaviate':
          results = await this.searchWeaviate(config, query, topK, threshold, aiProvider);
          break;
        default:
          throw new Error(`Unsupported vector provider: ${provider}`);
      }

      const duration = Date.now() - startTime;

      logger.externalService('VectorSearch', provider, duration, true, {
        nodeId: node.id,
        resultCount: results.length,
        runId: context.runId
      });

      return {
        success: true,
        output: {
          results,
          count: results.length,
          query
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.externalService('VectorSearch', config.provider || 'unknown', duration, false, {
        nodeId: node.id,
        error: error.message,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  private async searchPinecone(config: any, query: string, topK: number, threshold: number, aiProvider: string) {
    const apiKey = config.apiKey || process.env.PINECONE_API_KEY;
    const environment = config.environment || process.env.PINECONE_ENVIRONMENT;
    const indexName = config.indexName || process.env.PINECONE_INDEX_NAME;

    if (!apiKey || !environment || !indexName) {
      throw new Error('Pinecone configuration is incomplete');
    }

    // Generate embedding for the query
    const embedding = await this.generateEmbedding(query, aiProvider, config);
    
    const response = await fetch(`https://${indexName}-${environment}.svc.pinecone.io/query`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vector: embedding,
        topK,
        includeMetadata: true,
        filter: config.filter
      })
    });

    if (!response.ok) {
      throw new Error(`Pinecone API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.matches?.filter((match: any) => match.score >= threshold) || [];
  }

  private async searchChroma(config: any, query: string, topK: number, threshold: number, aiProvider: string) {
    const baseUrl = config.baseUrl || process.env.CHROMA_BASE_URL || 'http://localhost:8000';
    const collectionName = config.collectionName || 'default';

    // Generate embedding for the query
    const embedding = await this.generateEmbedding(query, aiProvider, config);

    const response = await fetch(`${baseUrl}/api/v1/collections/${collectionName}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query_embeddings: [embedding],
        n_results: topK,
        where: config.filter
      })
    });

    if (!response.ok) {
      throw new Error(`Chroma API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.matches?.filter((match: any) => match.distance <= (1 - threshold)) || [];
  }

  private async searchWeaviate(config: any, query: string, topK: number, threshold: number, aiProvider: string) {
    const baseUrl = config.baseUrl || process.env.WEAVIATE_BASE_URL || 'http://localhost:8080';
    const className = config.className || 'Document';

    // Generate embedding for the query
    const embedding = await this.generateEmbedding(query, aiProvider, config);

    const response = await fetch(`${baseUrl}/v1/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `
          query($nearVector: NearVectorInpObj!) {
            Get {
              ${className}(nearVector: $nearVector, limit: ${topK}) {
                _additional {
                  distance
                }
                content
                metadata
              }
            }
          }
        `,
        variables: {
          nearVector: {
            vector: embedding
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Weaviate API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data?.Get?.[className]?.filter((item: any) => 
      item._additional?.distance <= (1 - threshold)
    ) || [];
  }

  private async generateEmbedding(text: string, aiProvider: string, config: any): Promise<number[]> {
    const provider = (aiProvider || 'openai').toLowerCase();
    const embeddingModel = config.embeddingModel || 'text-embedding-ada-002';
    const apiKey = this.resolveAiApiKey(provider, config.aiApiKey);

    // Auto-detect OpenRouter if model contains "/"
    const actualProvider = embeddingModel.includes('/') ? 'openrouter' : provider;

    if (actualProvider === 'openrouter') {
      return await this.generateEmbeddingOpenRouter(text, embeddingModel, apiKey);
    } else if (actualProvider === 'gemini') {
      // Gemini doesn't have direct embeddings, use OpenAI via OpenRouter as fallback
      logger.warn('Gemini does not support embeddings directly, using OpenAI via OpenRouter');
      const openRouterKey = apiKey || process.env.OPENROUTER_API_KEY;
      if (!openRouterKey) {
        throw new Error('OpenRouter API key is required when using Gemini (set OPENROUTER_API_KEY or provide aiApiKey in config)');
      }
      return await this.generateEmbeddingOpenRouter(text, 'openai/text-embedding-ada-002', openRouterKey);
    } else {
      // Default to OpenAI
      return await this.generateEmbeddingOpenAI(text, embeddingModel, apiKey);
    }
  }

  private async generateEmbeddingOpenAI(text: string, model: string, apiKey: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text,
        model: model
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI embedding API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  private async generateEmbeddingOpenRouter(text: string, model: string, apiKey: string): Promise<number[]> {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://workflow-studio.com',
        'X-Title': 'Workflow Studio'
      },
      body: JSON.stringify({
        input: text,
        model: model
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter embedding API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  private resolveAiApiKey(provider: string, apiKeyFromConfig?: string): string {
    if (apiKeyFromConfig && apiKeyFromConfig.trim()) {
      return apiKeyFromConfig.trim();
    }
    
    const prov = (provider || 'openai').toLowerCase();
    if (prov === 'openrouter') {
      const key = process.env.OPENROUTER_API_KEY;
      if (!key) throw new Error('OpenRouter API key is required (set OPENROUTER_API_KEY or provide aiApiKey in config).');
      return key;
    }
    if (prov === 'gemini') {
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error('Gemini API key is required (set GEMINI_API_KEY or provide aiApiKey in config).');
      return key;
    }
    // Default to OpenAI
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OpenAI API key is required (set OPENAI_API_KEY or provide aiApiKey in config).');
    return key;
  }

}
export default VectorSearchNode;
