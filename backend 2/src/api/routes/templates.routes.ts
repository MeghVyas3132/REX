import { Router } from 'express';
import { templateService } from '../../services/template.service';
const logger = require('../../utils/logger');

const router = Router();

/**
 * GET /api/templates
 * Get all available templates
 */
router.get('/', async (req, res) => {
  try {
    const { category, difficulty, search } = req.query;
    
    let templates;
    
    if (search) {
      templates = await templateService.searchTemplates(search as string);
    } else if (category) {
      templates = await templateService.getTemplatesByCategory(category as string);
    } else if (difficulty) {
      templates = await templateService.getTemplatesByDifficulty(difficulty as string);
    } else {
      templates = await templateService.getAllTemplates();
    }

    logger.info('Templates retrieved', {
      count: templates.length,
      filters: { category, difficulty, search }
    });

    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error: any) {
    logger.error('Failed to get templates', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve templates',
      message: error.message
    });
  }
});

/**
 * GET /api/templates/:id
 * Get template by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await templateService.getTemplateById(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
        message: `Template with ID ${id} does not exist`
      });
    }

    logger.info('Template retrieved by ID', { templateId: id, templateName: template.name });

    res.json({
      success: true,
      data: template
    });
  } catch (error: any) {
    logger.error('Failed to get template by ID', error, { templateId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve template',
      message: error.message
    });
  }
});

/**
 * POST /api/templates/:id/create-workflow
 * Create workflow from template
 */
router.post('/:id/create-workflow', async (req, res) => {
  try {
    const { id } = req.params;
    const { customizations = {} } = req.body;

    // Validate customizations
    const validation = await templateService.validateCustomizations(id, customizations);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid customizations',
        message: 'Template customizations are invalid',
        details: {
          errors: validation.errors,
          warnings: validation.warnings
        }
      });
    }

    // Create workflow from template
    const workflow = await templateService.createWorkflowFromTemplate(id, customizations);

    logger.info('Workflow created from template', {
      templateId: id,
      workflowId: workflow.id,
      customizationCount: Object.keys(customizations).length
    });

    res.json({
      success: true,
      data: workflow,
      message: 'Workflow created successfully from template'
    });
  } catch (error: any) {
    logger.error('Failed to create workflow from template', error, { templateId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to create workflow from template',
      message: error.message
    });
  }
});

/**
 * GET /api/templates/categories
 * Get all template categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await templateService.getCategories();
    
    logger.info('Template categories retrieved', { categories });

    res.json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    logger.error('Failed to get template categories', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve template categories',
      message: error.message
    });
  }
});

/**
 * GET /api/templates/difficulties
 * Get all template difficulty levels
 */
router.get('/difficulties', async (req, res) => {
  try {
    const difficulties = await templateService.getDifficultyLevels();
    
    logger.info('Template difficulty levels retrieved', { difficulties });

    res.json({
      success: true,
      data: difficulties
    });
  } catch (error: any) {
    logger.error('Failed to get template difficulty levels', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve template difficulty levels',
      message: error.message
    });
  }
});

/**
 * GET /api/templates/stats
 * Get template statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await templateService.getTemplateStats();
    
    logger.info('Template statistics retrieved', stats);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('Failed to get template statistics', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve template statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/templates/:id/validate
 * Validate template customizations
 */
router.post('/:id/validate', async (req, res) => {
  try {
    const { id } = req.params;
    const { customizations = {} } = req.body;

    const validation = await templateService.validateCustomizations(id, customizations);

    logger.info('Template customizations validated', {
      templateId: id,
      valid: validation.valid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length
    });

    res.json({
      success: true,
      data: validation
    });
  } catch (error: any) {
    logger.error('Failed to validate template customizations', error, { templateId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to validate template customizations',
      message: error.message
    });
  }
});

export default router;