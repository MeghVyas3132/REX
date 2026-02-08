import { Router } from 'express';
import { validateQuery, commonSchemas } from '../../utils/validators';
import { PromptService } from '../../services/prompt.service';
import { authenticateToken } from '../middlewares/auth.middleware';
import { prisma } from '../../db/prisma';

const router = Router();
const promptService = new PromptService(prisma as any);

// Apply auth middleware to all routes
router.use(authenticateToken);

// GET /api/prompts - Get all prompts for user
router.get('/', validateQuery(commonSchemas.pagination), async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const includePublic = (req.query as any).includePublic === 'true';
    
    const prompts = await promptService.getUserPrompts(userId, includePublic);
    
    res.json({
      success: true,
      data: prompts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch prompts',
    });
  }
});

// GET /api/prompts/:id - Get specific prompt
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    
    const prompt = await promptService.getPrompt(id, userId);
    
    res.json({
      success: true,
      data: prompt,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error instanceof Error ? error.message : 'Prompt not found',
    });
  }
});

// POST /api/prompts - Create new prompt
router.post('/', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { name, description, content, variables, category, tags, isPublic } = req.body;
    
    if (!name || !content) {
      return res.status(400).json({
        success: false,
        error: 'Name and content are required',
      });
    }
    
    const prompt = await promptService.createPrompt({
      name,
      description,
      content,
      variables,
      category,
      tags,
      isPublic,
      userId,
    });
    
    res.status(201).json({
      success: true,
      data: prompt,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create prompt',
    });
  }
});

// PUT /api/prompts/:id - Update prompt
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const updateData = req.body;
    
    const prompt = await promptService.updatePrompt(id, userId, updateData);
    
    res.json({
      success: true,
      data: prompt,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update prompt',
    });
  }
});

// DELETE /api/prompts/:id - Delete prompt
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    
    await promptService.deletePrompt(id, userId);
    
    res.json({
      success: true,
      message: 'Prompt deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete prompt',
    });
  }
});

// POST /api/prompts/:id/render - Render prompt with variables
router.post('/:id/render', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { variables = {} } = req.body;
    
    const prompt = await promptService.getPrompt(id, userId);
    const renderedContent = promptService.renderPrompt(prompt, variables);
    
    res.json({
      success: true,
      data: {
        original: prompt.content,
        rendered: renderedContent,
        variables,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to render prompt',
    });
  }
});

export default router;
