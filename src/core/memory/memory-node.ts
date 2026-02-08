import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
import { createMemoryManager, MemoryManager } from './memory-manager';
const logger = require("../../utils/logger");

export class MemoryNode {
  getNodeDefinition() {
    return {
      id: 'memory',
      type: 'action',
      name: 'Memory Manager',
      description: 'Store and retrieve conversation memory, user preferences, and context',
      category: 'ai',
      version: '1.0.0',
      author: 'Workflow Studio',
      configSchema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['store', 'retrieve', 'search', 'update', 'cleanup'],
            required: true
          },
          memoryType: {
            type: 'string',
            enum: ['conversation', 'preference', 'fact', 'goal', 'context'],
            default: 'conversation'
          },
          content: { type: 'string' },
          metadata: { type: 'object' },
          importance: { type: 'number', minimum: 1, maximum: 10, default: 5 },
          tags: { type: 'array', items: { type: 'string' } },
          searchQuery: { type: 'string' },
          limit: { type: 'number', default: 10 }
        },
        required: ['operation']
      },
      inputSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string' },
          content: { type: 'string' },
          metadata: { type: 'object' },
          importance: { type: 'number' },
          tags: { type: 'array' },
          searchQuery: { type: 'string' },
          limit: { type: 'number' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          memoryId: { type: 'string' },
          memories: { type: 'array' },
          context: { type: 'object' },
          summary: { type: 'string' },
          stats: { type: 'object' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    const input = context.input || {};
    
    const operation = config.operation || input.operation;
    const sessionId = context.sessionId || 'default-session';
    const agentId = context.agentId || 'default-agent';

    try {
      // Create memory manager
      const memoryManager = createMemoryManager({
        sessionId,
        agentId,
        maxContextLength: 4000,
        memoryRetentionDays: 30,
        importanceThreshold: 5,
        enableSemanticSearch: true
      });

      let result: any = { success: true };

      switch (operation) {
        case 'store':
          result = await this.handleStore(memoryManager, config, input);
          break;
        case 'retrieve':
          result = await this.handleRetrieve(memoryManager, config, input);
          break;
        case 'search':
          result = await this.handleSearch(memoryManager, config, input);
          break;
        case 'update':
          result = await this.handleUpdate(memoryManager, config, input);
          break;
        case 'cleanup':
          result = await this.handleCleanup(memoryManager, config, input);
          break;
        default:
          throw new Error(`Unknown memory operation: ${operation}`);
      }

      logger.info('Memory operation completed', {
        operation,
        sessionId,
        agentId,
        nodeId: node.id
      });

      return {
        success: true,
        output: result
      };

    } catch (error: any) {
      logger.error('Memory operation failed', error, {
        operation,
        sessionId,
        agentId,
        nodeId: node.id
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  private async handleStore(memoryManager: MemoryManager, config: any, input: any): Promise<any> {
    const content = config.content || input.content;
    const memoryType = config.memoryType || 'conversation';
    const metadata = config.metadata || input.metadata || {};
    const importance = config.importance || input.importance || 5;
    const tags = config.tags || input.tags || [];

    if (!content) {
      throw new Error('Content is required for store operation');
    }

    let memoryId: string;

    switch (memoryType) {
      case 'conversation':
        memoryId = await memoryManager.storeConversationMemory(content, metadata, importance);
        break;
      case 'preference':
        const key = metadata.key || 'preference';
        const value = metadata.value || content;
        memoryId = await memoryManager.storePreference(key, value, importance);
        break;
      case 'fact':
        const topic = metadata.topic || 'general';
        memoryId = await memoryManager.storeFact(content, topic, importance);
        break;
      case 'goal':
        memoryId = await memoryManager.storeGoal(content, importance);
        break;
      case 'context':
        await memoryManager.updateTopic(content);
        memoryId = 'context-updated';
        break;
      default:
        throw new Error(`Unknown memory type: ${memoryType}`);
    }

    return {
      memoryId,
      type: memoryType,
      content,
      importance
    };
  }

  private async handleRetrieve(memoryManager: MemoryManager, config: any, input: any): Promise<any> {
    const currentInput = config.content || input.content || '';
    const limit = config.limit || input.limit || 10;

    const memories = await memoryManager.getRelevantMemories(currentInput, limit);
    const context = await memoryManager.getConversationContext();
    const summary = await memoryManager.generateContextSummary(currentInput);

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

  private async handleSearch(memoryManager: MemoryManager, config: any, input: any): Promise<any> {
    const query = config.searchQuery || input.searchQuery;
    const limit = config.limit || input.limit || 5;

    if (!query) {
      throw new Error('Search query is required for search operation');
    }

    const memories = await memoryManager.searchMemories(query, limit);

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

  private async handleUpdate(memoryManager: MemoryManager, config: any, input: any): Promise<any> {
    const content = config.content || input.content;
    const metadata = config.metadata || input.metadata || {};

    if (metadata.topic) {
      await memoryManager.updateTopic(metadata.topic);
    }

    // Store as conversation memory
    const memoryId = await memoryManager.storeConversationMemory(content, metadata);

    return {
      memoryId,
      updated: true,
      content
    };
  }

  private async handleCleanup(memoryManager: MemoryManager, config: any, input: any): Promise<any> {
    await memoryManager.cleanup();
    const stats = await memoryManager.getStats();

    return {
      cleaned: true,
      stats
    };
  }
}
