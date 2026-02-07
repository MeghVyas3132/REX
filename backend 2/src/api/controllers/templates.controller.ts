import { Request, Response } from 'express';
import { templateService } from '../../services/template.service';
const logger = require('../../utils/logger');

export class TemplatesController {
  /**
   * Get all templates with optional filtering
   */
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { category, difficulty, search, limit = 50, offset = 0 } = req.query;
      
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

      // Apply pagination
      const startIndex = parseInt(offset as string) || 0;
      const endIndex = startIndex + (parseInt(limit as string) || 50);
      const paginatedTemplates = templates.slice(startIndex, endIndex);

      logger.info('Templates retrieved', {
        count: paginatedTemplates.length,
        total: templates.length,
        filters: { category, difficulty, search },
        pagination: { limit, offset }
      });

      res.json({
        success: true,
        data: paginatedTemplates,
        pagination: {
          total: templates.length,
          limit: parseInt(limit as string) || 50,
          offset: parseInt(offset as string) || 0,
          hasMore: endIndex < templates.length
        }
      });
    } catch (error: any) {
      logger.error('Failed to get templates', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve templates',
        message: error.message
      });
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const template = await templateService.getTemplateById(id);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
          message: `Template with ID ${id} does not exist`
        });
        return;
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
  }

  /**
   * Create workflow from template
   */
  async createWorkflowFromTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { customizations = {}, workflowName, workflowDescription } = req.body;

      // Validate customizations
      const validation = await templateService.validateCustomizations(id, customizations);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: 'Invalid customizations',
          message: 'Template customizations are invalid',
          details: {
            errors: validation.errors,
            warnings: validation.warnings
          }
        });
        return;
      }

      // Create workflow from template
      const workflow = await templateService.createWorkflowFromTemplate(id, customizations);

      // Override name and description if provided
      if (workflowName) {
        workflow.name = workflowName;
      }
      if (workflowDescription) {
        workflow.description = workflowDescription;
      }

      logger.info('Workflow created from template', {
        templateId: id,
        workflowId: workflow.id,
        workflowName: workflow.name,
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
  }

  /**
   * Get template categories
   */
  async getCategories(req: Request, res: Response): Promise<void> {
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
  }

  /**
   * Get template difficulty levels
   */
  async getDifficultyLevels(req: Request, res: Response): Promise<void> {
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
  }

  /**
   * Get template statistics
   */
  async getTemplateStats(req: Request, res: Response): Promise<void> {
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
  }

  /**
   * Validate template customizations
   */
  async validateCustomizations(req: Request, res: Response): Promise<void> {
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
  }

  /**
   * Get template recommendations based on user preferences
   */
  async getRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { category, difficulty, useCase, tags } = req.query;
      
      let templates = await templateService.getAllTemplates();
      
      // Filter by category
      if (category) {
        templates = templates.filter(template => template.category === category);
      }
      
      // Filter by difficulty
      if (difficulty) {
        templates = templates.filter(template => template.difficulty === difficulty);
      }
      
      // Filter by use case
      if (useCase) {
        templates = templates.filter(template => 
          template.useCases.some(uc => uc.toLowerCase().includes((useCase as string).toLowerCase()))
        );
      }
      
      // Filter by tags
      if (tags) {
        const tagList = (tags as string).split(',').map(tag => tag.trim().toLowerCase());
        templates = templates.filter(template => 
          template.tags.some(tag => tagList.includes(tag.toLowerCase()))
        );
      }

      // Sort by relevance (simple scoring)
      templates.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        
        if (category && a.category === category) scoreA += 2;
        if (category && b.category === category) scoreB += 2;
        
        if (difficulty && a.difficulty === difficulty) scoreA += 1;
        if (difficulty && b.difficulty === difficulty) scoreB += 1;
        
        return scoreB - scoreA;
      });

      logger.info('Template recommendations generated', {
        filters: { category, difficulty, useCase, tags },
        count: templates.length
      });

      res.json({
        success: true,
        data: templates.slice(0, 10), // Return top 10 recommendations
        count: templates.length
      });
    } catch (error: any) {
      logger.error('Failed to get template recommendations', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve template recommendations',
        message: error.message
      });
    }
  }
}

export const templatesController = new TemplatesController();
