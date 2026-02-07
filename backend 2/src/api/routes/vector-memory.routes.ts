import { Router } from 'express';
import { vectorMemoryService } from '../../services/vector-memory.service';
const logger = require('../../utils/logger');

const router = Router();

/**
 * POST /api/vector-memory/store
 * Store memory with vector embedding
 */
router.post('/store', async (req, res) => {
  try {
    const {
      content,
      metadata = {},
      sessionId,
      agentId,
      memoryType = 'conversation',
      importance = 5,
      tags = []
    } = req.body;

    if (!content || !sessionId || !agentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'content, sessionId, and agentId are required'
      });
    }

    const result = await vectorMemoryService.storeMemory({
      content,
      metadata,
      sessionId,
      agentId,
      memoryType,
      importance,
      tags
    });

    logger.info('Vector memory stored via API', {
      id: result.id,
      sessionId,
      agentId,
      dimensions: result.embedding.dimensions
    });

    res.json({
      success: true,
      data: result,
      message: 'Vector memory stored successfully'
    });
  } catch (error: any) {
    logger.error('Failed to store vector memory via API', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store vector memory',
      message: error.message
    });
  }
});

/**
 * POST /api/vector-memory/search
 * Search memories using vector similarity
 */
router.post('/search', async (req, res) => {
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
    } = req.body;

    if (!query || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'query and sessionId are required'
      });
    }

    const result = await vectorMemoryService.searchMemories({
      query,
      sessionId,
      agentId,
      threshold,
      limit,
      memoryTypes,
      tags,
      dateRange,
      importance
    });

    logger.info('Vector memory search via API', {
      query,
      sessionId,
      resultsCount: result.memories.length,
      searchTime: result.searchTime
    });

    res.json({
      success: true,
      data: result,
      message: 'Vector memory search completed'
    });
  } catch (error: any) {
    logger.error('Failed to search vector memories via API', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search vector memories',
      message: error.message
    });
  }
});

/**
 * GET /api/vector-memory/health
 * Health check
 */
router.get('/health', async (req, res) => {
  try {
    const isHealthy = await vectorMemoryService.healthCheck();

    res.json({
      success: true,
      data: { healthy: isHealthy },
      message: isHealthy ? 'Vector memory service is healthy' : 'Vector memory service is unhealthy'
    });
  } catch (error: any) {
    logger.error('Vector memory health check failed', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error.message
    });
  }
});

/**
 * GET /api/vector-memory/:id
 * Get memory by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const memory = await vectorMemoryService.getMemory(id);

    if (!memory) {
      return res.status(404).json({
        success: false,
        error: 'Memory not found',
        message: `Memory with ID ${id} does not exist`
      });
    }

    logger.info('Vector memory retrieved via API', { id });

    res.json({
      success: true,
      data: memory
    });
  } catch (error: any) {
    logger.error('Failed to get vector memory via API', error, { id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve vector memory',
      message: error.message
    });
  }
});

/**
 * PUT /api/vector-memory/:id
 * Update memory with new content and embedding
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, metadata, importance, tags } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'content is required'
      });
    }

    const success = await vectorMemoryService.updateMemory(id, content, metadata, importance, tags);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Memory not found',
        message: `Memory with ID ${id} does not exist`
      });
    }

    logger.info('Vector memory updated via API', { id });

    res.json({
      success: true,
      message: 'Vector memory updated successfully'
    });
  } catch (error: any) {
    logger.error('Failed to update vector memory via API', error, { id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to update vector memory',
      message: error.message
    });
  }
});

/**
 * DELETE /api/vector-memory/:id
 * Delete memory
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const success = await vectorMemoryService.deleteMemory(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Memory not found',
        message: `Memory with ID ${id} does not exist`
      });
    }

    logger.info('Vector memory deleted via API', { id });

    res.json({
      success: true,
      message: 'Vector memory deleted successfully'
    });
  } catch (error: any) {
    logger.error('Failed to delete vector memory via API', error, { id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete vector memory',
      message: error.message
    });
  }
});

/**
 * GET /api/vector-memory/session/:sessionId
 * Get all memories for a session
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const memories = await vectorMemoryService.getSessionMemories(sessionId);

    logger.info('Session vector memories retrieved via API', { sessionId, count: memories.length });

    res.json({
      success: true,
      data: memories,
      count: memories.length
    });
  } catch (error: any) {
    logger.error('Failed to get session vector memories via API', error, { sessionId: req.params.sessionId });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session memories',
      message: error.message
    });
  }
});

/**
 * GET /api/vector-memory/session/:sessionId/stats
 * Get session statistics
 */
router.get('/session/:sessionId/stats', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const stats = await vectorMemoryService.getSessionStats(sessionId);

    logger.info('Session vector memory stats retrieved via API', { sessionId, stats });

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('Failed to get session vector memory stats via API', error, { sessionId: req.params.sessionId });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/vector-memory/embedding
 * Generate embedding for text
 */
router.post('/embedding', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'text is required'
      });
    }

    const result = await vectorMemoryService.generateEmbedding(text);

    logger.info('Embedding generated via API', {
      textLength: text.length,
      dimensions: result.dimensions
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('Failed to generate embedding via API', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate embedding',
      message: error.message
    });
  }
});

/**
 * POST /api/vector-memory/similarity
 * Calculate similarity between two texts
 */
router.post('/similarity', async (req, res) => {
  try {
    const { text1, text2 } = req.body;

    if (!text1 || !text2) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'text1 and text2 are required'
      });
    }

    const similarity = await vectorMemoryService.calculateSimilarity(text1, text2);

    logger.info('Text similarity calculated via API', { similarity });

    res.json({
      success: true,
      data: { similarity }
    });
  } catch (error: any) {
    logger.error('Failed to calculate similarity via API', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate similarity',
      message: error.message
    });
  }
});

/**
 * POST /api/vector-memory/cleanup
 * Clean up old memories
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { maxAge = 30 * 24 * 60 * 60 * 1000 } = req.body; // 30 days default

    const deletedCount = await vectorMemoryService.cleanupMemories(maxAge);

    logger.info('Vector memory cleanup via API', { deletedCount, maxAge });

    res.json({
      success: true,
      data: { deletedCount, maxAge },
      message: 'Vector memory cleanup completed'
    });
  } catch (error: any) {
    logger.error('Failed to cleanup vector memories via API', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup vector memories',
      message: error.message
    });
  }
});

export default router;
