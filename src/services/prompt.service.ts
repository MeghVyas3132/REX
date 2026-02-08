import { PrismaClient } from '@prisma/client';
import { logger } from "../utils/logger";

export class PromptService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // Create a new prompt template
  async createPrompt(data: {
    name: string;
    description?: string;
    content: string;
    variables?: string[];
    category?: string;
    tags?: string[];
    isPublic?: boolean;
    userId: string;
  }) {
    try {
      const prompt = await this.prisma.prompt.create({
        data: {
          name: data.name,
          description: data.description,
          content: data.content,
          variables: data.variables || [],
          category: data.category,
          tags: data.tags || [],
          isPublic: data.isPublic || false,
          userId: data.userId,
        },
      });

      logger.info(`Created prompt: ${prompt.id}`);
      return prompt;
    } catch (error) {
      logger.error('Error creating prompt:', error);
      throw error;
    }
  }

  // Get all prompts for a user
  async getUserPrompts(userId: string, includePublic = false) {
    try {
      const where = includePublic 
        ? {
            OR: [
              { userId },
              { isPublic: true }
            ]
          }
        : { userId };

      const prompts = await this.prisma.prompt.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return prompts;
    } catch (error) {
      logger.error('Error fetching user prompts:', error);
      throw error;
    }
  }

  // Get a specific prompt
  async getPrompt(id: string, userId: string) {
    try {
      const prompt = await this.prisma.prompt.findFirst({
        where: {
          id,
          OR: [
            { userId },
            { isPublic: true }
          ]
        },
      });

      if (!prompt) {
        throw new Error('Prompt not found');
      }

      return prompt;
    } catch (error) {
      logger.error('Error fetching prompt:', error);
      throw error;
    }
  }

  // Update a prompt
  async updatePrompt(id: string, userId: string, data: {
    name?: string;
    description?: string;
    content?: string;
    variables?: string[];
    category?: string;
    tags?: string[];
    isPublic?: boolean;
  }) {
    try {
      const prompt = await this.prisma.prompt.updateMany({
        where: {
          id,
          userId, // Only allow updating own prompts
        },
        data,
      });

      if (prompt.count === 0) {
        throw new Error('Prompt not found or not authorized');
      }

      logger.info(`Updated prompt: ${id}`);
      return prompt;
    } catch (error) {
      logger.error('Error updating prompt:', error);
      throw error;
    }
  }

  // Delete a prompt
  async deletePrompt(id: string, userId: string) {
    try {
      const prompt = await this.prisma.prompt.deleteMany({
        where: {
          id,
          userId, // Only allow deleting own prompts
        },
      });

      if (prompt.count === 0) {
        throw new Error('Prompt not found or not authorized');
      }

      logger.info(`Deleted prompt: ${id}`);
      return prompt;
    } catch (error) {
      logger.error('Error deleting prompt:', error);
      throw error;
    }
  }

  // Render a prompt with variables
  renderPrompt(prompt: any, variables: Record<string, any> = {}) {
    let content = prompt.content;
    
    // Replace variables in the format {{variableName}}
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, String(value));
    });

    return content;
  }
}
