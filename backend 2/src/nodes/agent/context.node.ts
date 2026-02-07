import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class ContextNode {
  getNodeDefinition() {
    return {
      id: 'agent-context',
      type: 'action',
      name: 'Context',
      description: 'Manage and analyze context for agent decision making',
      category: 'agent',
      version: '1.0.0',
      author: 'Workflow Studio',

      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'contextType',
          type: 'options',
          displayName: 'Context Type',
          description: 'Type of context analysis to perform',
          required: true,
          default: 'analyze',
          options: [
            { name: 'Analyze Context', value: 'analyze' },
            { name: 'Extract Context', value: 'extract' },
            { name: 'Update Context', value: 'update' },
            { name: 'Merge Context', value: 'merge' }
          ]
        },
        {
          name: 'contextFields',
          type: 'array',
          displayName: 'Context Fields',
          description: 'Fields to include in context analysis',
          required: false,
          placeholder: 'user, environment, history, preferences'
        },
        {
          name: 'analysisDepth',
          type: 'options',
          displayName: 'Analysis Depth',
          description: 'Depth of context analysis',
          required: false,
          default: 'medium',
          options: [
            { name: 'Shallow', value: 'shallow' },
            { name: 'Medium', value: 'medium' },
            { name: 'Deep', value: 'deep' }
          ]
        },
        {
          name: 'includeHistory',
          type: 'boolean',
          displayName: 'Include History',
          description: 'Include historical context data',
          required: false,
          default: true
        },
        {
          name: 'includePreferences',
          type: 'boolean',
          displayName: 'Include Preferences',
          description: 'Include user preferences in context',
          required: false,
          default: true
        },
        {
          name: 'contextWindow',
          type: 'number',
          displayName: 'Context Window',
          description: 'Number of recent interactions to include',
          required: false,
          default: 10,
          min: 1,
          max: 100
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'data',
          type: 'object',
          displayName: 'Input Data',
          description: 'Data to analyze for context from previous node',
          required: true,
          dataType: 'object'
        },
        {
          name: 'contextType',
          type: 'string',
          displayName: 'Dynamic Context Type',
          description: 'Context type from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'contextFields',
          type: 'array',
          displayName: 'Dynamic Context Fields',
          description: 'Context fields from previous node (overrides configured)',
          required: false,
          dataType: 'array'
        },
        {
          name: 'existingContext',
          type: 'object',
          displayName: 'Existing Context',
          description: 'Existing context to merge/update from previous node',
          required: false,
          dataType: 'object'
        },
        {
          name: 'userProfile',
          type: 'object',
          displayName: 'User Profile',
          description: 'User profile data from previous node',
          required: false,
          dataType: 'object'
        },
        {
          name: 'environment',
          type: 'object',
          displayName: 'Environment Data',
          description: 'Environment information from previous node',
          required: false,
          dataType: 'object'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'context',
          type: 'object',
          displayName: 'Context Object',
          description: 'Analyzed context information',
          dataType: 'object'
        },
        {
          name: 'contextSummary',
          type: 'string',
          displayName: 'Context Summary',
          description: 'Summary of the context analysis',
          dataType: 'text'
        },
        {
          name: 'keyInsights',
          type: 'array',
          displayName: 'Key Insights',
          description: 'Key insights from context analysis',
          dataType: 'array'
        },
        {
          name: 'relevanceScore',
          type: 'number',
          displayName: 'Relevance Score',
          description: 'Relevance score of the context (0-1)',
          dataType: 'number'
        },
        {
          name: 'confidence',
          type: 'number',
          displayName: 'Confidence',
          description: 'Confidence in context analysis (0-1)',
          dataType: 'number'
        },
        {
          name: 'contextFields',
          type: 'array',
          displayName: 'Context Fields',
          description: 'Fields that were analyzed',
          dataType: 'array'
        },
        {
          name: 'metadata',
          type: 'object',
          displayName: 'Context Metadata',
          description: 'Additional metadata about the context',
          dataType: 'object'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          contextType: { type: 'string' },
          contextFields: { type: 'array' },
          analysisDepth: { type: 'string' },
          includeHistory: { type: 'boolean' },
          includePreferences: { type: 'boolean' },
          contextWindow: { type: 'number' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          data: { type: 'object' },
          contextType: { type: 'string' },
          contextFields: { type: 'array' },
          existingContext: { type: 'object' },
          userProfile: { type: 'object' },
          environment: { type: 'object' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          context: { type: 'object' },
          contextSummary: { type: 'string' },
          keyInsights: { type: 'array' },
          relevanceScore: { type: 'number' },
          confidence: { type: 'number' },
          contextFields: { type: 'array' },
          metadata: { type: 'object' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    const startTime = Date.now();

    const contextType = String(
      config.contextType ?? context.input?.contextType ?? 'analyze'
    ).toLowerCase();

    const contextFields = this.parseArray(config.contextFields ?? context.input?.contextFields);
    const analysisDepth = config.analysisDepth ?? context.input?.analysisDepth ?? 'medium';
    const includeHistory = Boolean(config.includeHistory ?? context.input?.includeHistory ?? false);
    const includePreferences = Boolean(
      config.includePreferences ?? context.input?.includePreferences ?? false
    );
    const contextWindow = Number(
      config.contextWindow ?? context.input?.contextWindow ?? 10
    );

    const payload =
      context.input?.data ??
      context.input?.premises ??
      context.input ??
      node.data?.input ??
      {};
    const existingContext = context.input?.existingContext ?? config.existingContext ?? {};
    const userProfile = context.input?.userProfile ?? config.userProfile ?? {};
    const environment = context.input?.environment ?? config.environment ?? {};

    try {
      let result: any;

      switch (contextType) {
        case 'analyze':
          result = await this.analyzeContext(payload, {
            contextFields,
            analysisDepth,
            includeHistory,
            includePreferences,
            contextWindow,
            userProfile,
            environment
          });
          break;
        case 'extract':
          result = await this.extractContext(payload, { contextFields });
          break;
        case 'update':
          result = await this.updateContext(existingContext, payload);
          break;
        case 'merge':
          result = await this.mergeContext(existingContext, payload);
          break;
        default:
          throw new Error(`Unknown context type: ${contextType}`);
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        output: {
          ...context.input,  // Preserve input data
          ...result  // Add new context data
        },
        duration,
        metadata: {
          contextType,
          analysisDepth,
          fieldsAnalyzed: contextFields,
          includeHistory,
          includePreferences,
          contextWindow
        }
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('Context node execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      };
    }
  }

  private parseArray(raw: any): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.filter((item) => typeof item === 'string' && item.trim().length > 0);
    }
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => typeof item === 'string' && item.trim().length > 0);
        }
      } catch {
        return raw
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }
    return [];
  }

  private async analyzeContext(
    data: any,
    options: {
      contextFields: string[];
      analysisDepth: string;
      includeHistory: boolean;
      includePreferences: boolean;
      contextWindow: number;
      userProfile: Record<string, any>;
      environment: Record<string, any>;
    }
  ) {
    // Mock context analysis
    return {
      context: {
        user: data.user || 'unknown',
        environment: data.environment || 'default',
        timestamp: new Date().toISOString(),
        analysis: 'Context analyzed successfully',
        preferences: options.includePreferences ? data.preferences ?? {} : undefined,
        historyIncluded: options.includeHistory
      },
      contextSummary: 'Context analysis completed',
      keyInsights: ['User context identified', 'Environment context captured'],
      relevanceScore: 0.85,
      confidence: 0.9,
      contextFields: options.contextFields.length > 0 ? options.contextFields : ['user', 'environment'],
      metadata: {
        analysisDepth: options.analysisDepth,
        includeHistory: options.includeHistory,
        includePreferences: options.includePreferences,
        contextWindow: options.contextWindow,
        userProfile: options.userProfile,
        environment: options.environment
      }
    };
  }

  private async extractContext(
    data: any,
    options: {
      contextFields: string[];
    }
  ) {
    // Mock context extraction
    return {
      context: {
        extracted: data,
        timestamp: new Date().toISOString()
      },
      contextSummary: 'Context extracted successfully',
      keyInsights: ['Context data extracted'],
      relevanceScore: 0.8,
      confidence: 0.85,
      contextFields:
        options.contextFields.length > 0
          ? options.contextFields
          : Object.keys(data ?? {}),
      metadata: {
        extractionMethod: 'automatic'
      }
    };
  }

  private async updateContext(existingContext: any, updates: any) {
    // Mock context update
    const merged = {
      ...(typeof existingContext === 'object' && existingContext !== null ? existingContext : {}),
      ...(typeof updates === 'object' && updates !== null ? updates : {})
    };

    return {
      context: {
        ...merged,
        updated: true,
        timestamp: new Date().toISOString()
      },
      contextSummary: 'Context updated successfully',
      keyInsights: ['Context updated with new data'],
      relevanceScore: 0.9,
      confidence: 0.95,
      contextFields: Object.keys(merged),
      metadata: {
        updateType: 'incremental'
      }
    };
  }

  private async mergeContext(existingContext: any, incoming: any) {
    // Mock context merge
    const sources = [
      existingContext ?? {},
      incoming ?? {}
    ].filter((item) => item && typeof item === 'object');

    const merged =
      sources.length === 0
        ? {}
        : sources.reduce(
            (acc: any, curr: any) => ({
              ...acc,
              ...curr
            }),
            {}
          );

    return {
      context: {
        merged,
        sources,
        timestamp: new Date().toISOString()
      },
      contextSummary: 'Context merged successfully',
      keyInsights: ['Multiple contexts merged'],
      relevanceScore: 0.88,
      confidence: 0.92,
      contextFields: Object.keys(merged),
      metadata: {
        mergeStrategy: 'intelligent'
      }
    };
  }
}

export default ContextNode;