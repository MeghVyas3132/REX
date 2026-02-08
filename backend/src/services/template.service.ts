import { agentTemplates, getTemplateById, getTemplatesByCategory, getTemplatesByDifficulty, searchTemplates, AgentTemplate } from '../templates/agent-templates';
import { Workflow, WorkflowNode, WorkflowEdge } from '@rex/shared';
const logger = require('../utils/logger');

export class TemplateService {
  private templates: AgentTemplate[];

  constructor() {
    this.templates = agentTemplates;
    logger.info('Template service initialized', { templateCount: this.templates.length });
  }

  /**
   * Get all available templates
   */
  async getAllTemplates(): Promise<AgentTemplate[]> {
    try {
      logger.info('Retrieved all templates', { count: this.templates.length });
      return this.templates;
    } catch (error: any) {
      logger.error('Failed to get all templates', error);
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<AgentTemplate | null> {
    try {
      const template = getTemplateById(id);
      if (template) {
        logger.info('Retrieved template by ID', { templateId: id, templateName: template.name });
        return template;
      } else {
        logger.warn('Template not found', { templateId: id });
        return null;
      }
    } catch (error: any) {
      logger.error('Failed to get template by ID', error, { templateId: id });
      throw error;
    }
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<AgentTemplate[]> {
    try {
      const templates = getTemplatesByCategory(category);
      logger.info('Retrieved templates by category', { category, count: templates.length });
      return templates;
    } catch (error: any) {
      logger.error('Failed to get templates by category', error, { category });
      throw error;
    }
  }

  /**
   * Get templates by difficulty level
   */
  async getTemplatesByDifficulty(difficulty: string): Promise<AgentTemplate[]> {
    try {
      const templates = getTemplatesByDifficulty(difficulty);
      logger.info('Retrieved templates by difficulty', { difficulty, count: templates.length });
      return templates;
    } catch (error: any) {
      logger.error('Failed to get templates by difficulty', error, { difficulty });
      throw error;
    }
  }

  /**
   * Search templates by query
   */
  async searchTemplates(query: string): Promise<AgentTemplate[]> {
    try {
      const templates = searchTemplates(query);
      logger.info('Searched templates', { query, count: templates.length });
      return templates;
    } catch (error: any) {
      logger.error('Failed to search templates', error, { query });
      throw error;
    }
  }

  /**
   * Create workflow from template
   */
  async createWorkflowFromTemplate(templateId: string, customizations: Record<string, any> = {}): Promise<Workflow> {
    try {
      const template = await this.getTemplateById(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Create workflow from template
      const workflow: Workflow = {
        id: `workflow_${Date.now()}`,
        name: `${template.name} - Customized`,
          description: template.description,
        version: '1.0.0',
        author: 'Template Service',
        createdAt: new Date(),
        updatedAt: new Date(),
        nodes: this.customizeNodes(template.workflow.nodes, customizations),
        edges: template.workflow.edges,
        settings: { retries: 3, timeout: 30000 },
        isActive: true,
        userId: 'template-user'
      };

      logger.info('Created workflow from template', {
        templateId,
        workflowId: workflow.id, 
        customizationCount: Object.keys(customizations).length
      });
      
      return workflow;
    } catch (error: any) {
      logger.error('Failed to create workflow from template', error, { templateId });
      throw error;
    }
  }

  /**
   * Customize template nodes with user inputs
   */
  private customizeNodes(nodes: WorkflowNode[], customizations: Record<string, any>): WorkflowNode[] {
    return nodes.map(node => {
      const customizedNode = { ...node };
      
      // Apply customizations to node configuration
      if (customizedNode.data?.config) {
        customizedNode.data.config = this.applyCustomizations(
          customizedNode.data.config,
          customizations
        );
      }

      return customizedNode;
    });
  }

  /**
   * Apply customizations to configuration
   */
  private applyCustomizations(config: any, customizations: Record<string, any>): any {
    const customizedConfig = { ...config };

    // Replace placeholders with actual values
    for (const [key, value] of Object.entries(customizations)) {
      if (typeof value === 'string' && value.includes('{{')) {
        // Handle template variables
        customizedConfig[key] = this.replaceTemplateVariables(value, customizations);
      } else {
        customizedConfig[key] = value;
      }
    }

    return customizedConfig;
  }

  /**
   * Replace template variables in strings
   */
  private replaceTemplateVariables(str: string, variables: Record<string, any>): string {
    return str.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      return variables[variable] || match;
    });
  }

  /**
   * Extract variables from template
   */
  private extractVariables(template: AgentTemplate, customizations: Record<string, any>): Record<string, any> {
    const variables: Record<string, any> = {};

    // Add template customization variables
    template.customization.variables.forEach(variable => {
      variables[variable] = customizations[variable] || null;
    });

    // Add default template variables
    variables.templateId = template.id;
    variables.templateName = template.name;
    variables.templateVersion = template.version;

    return variables;
  }

  /**
   * Get template categories
   */
  async getCategories(): Promise<string[]> {
    try {
      const categories = [...new Set(this.templates.map(template => template.category))];
      logger.info('Retrieved template categories', { categories });
      return categories;
    } catch (error: any) {
      logger.error('Failed to get template categories', error);
      throw error;
    }
  }

  /**
   * Get template difficulty levels
   */
  async getDifficultyLevels(): Promise<string[]> {
    try {
      const difficulties = [...new Set(this.templates.map(template => template.difficulty))];
      logger.info('Retrieved template difficulty levels', { difficulties });
      return difficulties;
    } catch (error: any) {
      logger.error('Failed to get template difficulty levels', error);
      throw error;
    }
  }

  /**
   * Get template statistics
   */
  async getTemplateStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byDifficulty: Record<string, number>;
    averageTime: string;
  }> {
    try {
      const stats = {
        total: this.templates.length,
        byCategory: {} as Record<string, number>,
        byDifficulty: {} as Record<string, number>,
        averageTime: '25 minutes'
      };

      // Count by category
      this.templates.forEach(template => {
        stats.byCategory[template.category] = (stats.byCategory[template.category] || 0) + 1;
      });

      // Count by difficulty
      this.templates.forEach(template => {
        stats.byDifficulty[template.difficulty] = (stats.byDifficulty[template.difficulty] || 0) + 1;
      });

      logger.info('Retrieved template statistics', stats);
      return stats;
    } catch (error: any) {
      logger.error('Failed to get template statistics', error);
      throw error;
    }
  }

  /**
   * Validate template customizations
   */
  async validateCustomizations(templateId: string, customizations: Record<string, any>): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const template = await this.getTemplateById(templateId);
      if (!template) {
        return {
          valid: false,
          errors: [`Template not found: ${templateId}`],
          warnings: []
        };
      }

      const errors: string[] = [];
      const warnings: string[] = [];

      // Check required configuration
      template.configuration.required.forEach(required => {
        if (!customizations[required] && !process.env[required]) {
          errors.push(`Required configuration missing: ${required}`);
        }
      });

      // Check optional configuration
      template.configuration.optional.forEach(optional => {
        if (!customizations[optional] && !process.env[optional]) {
          warnings.push(`Optional configuration missing: ${optional}`);
        }
      });

      // Validate customization variables
      template.customization.variables.forEach(variable => {
        if (customizations[variable] === undefined) {
          warnings.push(`Customization variable not set: ${variable}`);
        }
      });

      const valid = errors.length === 0;

      logger.info('Validated template customizations', {
        templateId,
        valid,
        errorCount: errors.length,
        warningCount: warnings.length
      });

      return { valid, errors, warnings };
    } catch (error: any) {
      logger.error('Failed to validate template customizations', error, { templateId });
      throw error;
    }
  }
}

export const templateService = new TemplateService();