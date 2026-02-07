import { Router } from 'express';
import { MemoryService } from '../../services/memory.service';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import { asyncHandler } from '../../utils/error-handler';
import { z } from 'zod';

const router = Router();
const memoryService = new MemoryService();

// GET /api/memory - List all memories (public access)
router.get('/', asyncHandler(async (req, res) => {
  try {
    const memories = await memoryService.searchMemoriesForAPI({
      sessionId: 'public',
      agentId: 'public',
      query: '',
      limit: 100
    });
    res.status(200).json({ success: true, data: memories });
  } catch (error) {
    res.status(200).json({ 
      success: true, 
      data: [],
      message: 'No memories found'
    });
  }
}));

// Store memory
const storeMemorySchema = z.object({
  sessionId: z.string().optional(),
  agentId: z.string().optional(),
  type: z.enum(['conversation', 'preference', 'fact', 'goal', 'context']),
  content: z.string(),
  metadata: z.object({}).optional(),
  importance: z.number().min(1).max(10).optional(),
  tags: z.array(z.string()).optional()
});

router.post('/store', authenticateToken, validateBody(storeMemorySchema), async (req, res) => {
  try {
    const { sessionId, agentId, type, content, metadata, importance, tags } = req.body;
    const userId = req.user?.id || 'anonymous';

    const result = await memoryService.storeMemory({
      sessionId: sessionId || `session_${userId}`,
      agentId: agentId || `agent_${userId}`,
      type,
      content,
      metadata: metadata || {},
      importance: importance || 5,
      tags: tags || []
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Retrieve memories
const retrieveMemoriesSchema = z.object({
  sessionId: z.string().optional(),
  agentId: z.string().optional(),
  currentInput: z.string().optional(),
  limit: z.number().min(1).max(100).optional()
});

router.post('/retrieve', authenticateToken, validateBody(retrieveMemoriesSchema), async (req, res) => {
  try {
    const { sessionId, agentId, currentInput, limit } = req.body;
    const userId = req.user?.id || 'anonymous';

    const result = await memoryService.getRelevantMemoriesForAPI({
      sessionId: sessionId || `session_${userId}`,
      agentId: agentId || `agent_${userId}`,
      currentInput: currentInput || '',
      limit: limit || 10
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search memories
const searchMemoriesSchema = z.object({
  sessionId: z.string().optional(),
  agentId: z.string().optional(),
  query: z.string(),
  limit: z.number().min(1).max(100).optional()
});

router.post('/search', authenticateToken, validateBody(searchMemoriesSchema), async (req, res) => {
  try {
    const { sessionId, agentId, query, limit } = req.body;
    const userId = req.user?.id || 'anonymous';

    const result = await memoryService.searchMemoriesForAPI({
      sessionId: sessionId || `session_${userId}`,
      agentId: agentId || `agent_${userId}`,
      query,
      limit: limit || 5
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get conversation context
const getContextSchema = z.object({
  sessionId: z.string().optional(),
  agentId: z.string().optional(),
  currentInput: z.string().optional()
});

router.post('/context', authenticateToken, validateBody(getContextSchema), async (req, res) => {
  try {
    const { sessionId, agentId, currentInput } = req.body;
    const userId = req.user?.id || 'anonymous';

    const result = await memoryService.getConversationContextForAPI({
      sessionId: sessionId || `session_${userId}`,
      agentId: agentId || `agent_${userId}`,
      currentInput: currentInput || ''
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update memory
const updateMemorySchema = z.object({
  sessionId: z.string().optional(),
  agentId: z.string().optional(),
  memoryId: z.string(),
  content: z.string().optional(),
  metadata: z.object({}).optional(),
  importance: z.number().min(1).max(10).optional()
});

router.put('/update', authenticateToken, validateBody(updateMemorySchema), async (req, res) => {
  try {
    const { sessionId, agentId, memoryId, content, metadata, importance } = req.body;
    const userId = req.user?.id || 'anonymous';

    const result = await memoryService.updateMemory({
      sessionId: sessionId || `session_${userId}`,
      agentId: agentId || `agent_${userId}`,
      memoryId,
      content,
      metadata,
      importance
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete memory
const deleteMemorySchema = z.object({
  sessionId: z.string().optional(),
  agentId: z.string().optional(),
  memoryId: z.string()
});

router.delete('/delete', authenticateToken, validateBody(deleteMemorySchema), async (req, res) => {
  try {
    const { sessionId, agentId, memoryId } = req.body;
    const userId = req.user?.id || 'anonymous';

    const result = await memoryService.deleteMemory({
      sessionId: sessionId || `session_${userId}`,
      agentId: agentId || `agent_${userId}`,
      memoryId
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get memory statistics
const getStatsSchema = z.object({
  sessionId: z.string().optional(),
  agentId: z.string().optional()
});

router.post('/stats', authenticateToken, validateBody(getStatsSchema), async (req, res) => {
  try {
    const { sessionId, agentId } = req.body;
    const userId = req.user?.id || 'anonymous';

    const result = await memoryService.getMemoryStats({
      sessionId: sessionId || `session_${userId}`,
      agentId: agentId || `agent_${userId}`
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cleanup old memories
const cleanupSchema = z.object({
  sessionId: z.string().optional(),
  agentId: z.string().optional(),
  olderThanDays: z.number().min(1).optional()
});

router.post('/cleanup', authenticateToken, validateBody(cleanupSchema), async (req, res) => {
  try {
    const { sessionId, agentId, olderThanDays } = req.body;
    const userId = req.user?.id || 'anonymous';

    const result = await memoryService.cleanupMemories({
      sessionId: sessionId || `session_${userId}`,
      agentId: agentId || `agent_${userId}`,
      olderThanDays: olderThanDays || 30
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
