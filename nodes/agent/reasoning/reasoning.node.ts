import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;

export class ReasoningNode {
  getNodeDefinition() {
    return {
      id: 'agent-reasoning',
      type: 'action',
      name: 'Reasoning',
      description: 'Perform logical reasoning and inference for agent decision making',
      category: 'agent',
      version: '1.0.0',
      author: 'Workflow Studio',

      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'reasoningType',
          type: 'options',
          displayName: 'Reasoning Type',
          description: 'Type of reasoning to perform',
          required: true,
          default: 'deductive',
          options: [
            { name: 'Deductive', value: 'deductive' },
            { name: 'Inductive', value: 'inductive' },
            { name: 'Abductive', value: 'abductive' },
            { name: 'Analogical', value: 'analogical' },
            { name: 'Causal', value: 'causal' }
          ]
        },
        {
          name: 'reasoningDepth',
          type: 'options',
          displayName: 'Reasoning Depth',
          description: 'Depth of reasoning analysis',
          required: false,
          default: 'medium',
          options: [
            { name: 'Shallow', value: 'shallow' },
            { name: 'Medium', value: 'medium' },
            { name: 'Deep', value: 'deep' }
          ]
        },
        {
          name: 'includeUncertainty',
          type: 'boolean',
          displayName: 'Include Uncertainty',
          description: 'Include uncertainty analysis in reasoning',
          required: false,
          default: true
        },
        {
          name: 'maxSteps',
          type: 'number',
          displayName: 'Max Reasoning Steps',
          description: 'Maximum number of reasoning steps',
          required: false,
          default: 10,
          min: 1,
          max: 50
        },
        {
          name: 'confidenceThreshold',
          type: 'number',
          displayName: 'Confidence Threshold',
          description: 'Minimum confidence for reasoning conclusions',
          required: false,
          default: 0.7,
          min: 0,
          max: 1,
          step: 0.1
        },
        {
          name: 'reasoningPrompt',
          type: 'string',
          displayName: 'Reasoning Prompt',
          description: 'Custom prompt for reasoning process',
          required: false,
          placeholder: 'Analyze the following situation and provide reasoning...'
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'premises',
          type: 'array',
          displayName: 'Premises',
          description: 'Logical premises for reasoning from previous node',
          required: true,
          dataType: 'array'
        },
        {
          name: 'context',
          type: 'object',
          displayName: 'Context Data',
          description: 'Context information for reasoning from previous node',
          required: false,
          dataType: 'object'
        },
        {
          name: 'reasoningType',
          type: 'string',
          displayName: 'Dynamic Reasoning Type',
          description: 'Reasoning type from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'goals',
          type: 'array',
          displayName: 'Goals',
          description: 'Goals to consider in reasoning from previous node',
          required: false,
          dataType: 'array'
        },
        {
          name: 'constraints',
          type: 'array',
          displayName: 'Constraints',
          description: 'Constraints to respect in reasoning from previous node',
          required: false,
          dataType: 'array'
        },
        {
          name: 'evidence',
          type: 'array',
          displayName: 'Evidence',
          description: 'Evidence to support reasoning from previous node',
          required: false,
          dataType: 'array'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'conclusion',
          type: 'string',
          displayName: 'Conclusion',
          description: 'The main conclusion from reasoning',
          dataType: 'text'
        },
        {
          name: 'reasoningSteps',
          type: 'array',
          displayName: 'Reasoning Steps',
          description: 'Step-by-step reasoning process',
          dataType: 'array'
        },
        {
          name: 'confidence',
          type: 'number',
          displayName: 'Confidence',
          description: 'Confidence in the reasoning conclusion (0-1)',
          dataType: 'number'
        },
        {
          name: 'uncertainty',
          type: 'object',
          displayName: 'Uncertainty Analysis',
          description: 'Analysis of uncertainty in reasoning',
          dataType: 'object'
        },
        {
          name: 'assumptions',
          type: 'array',
          displayName: 'Assumptions',
          description: 'Assumptions made during reasoning',
          dataType: 'array'
        },
        {
          name: 'alternatives',
          type: 'array',
          displayName: 'Alternative Conclusions',
          description: 'Alternative conclusions considered',
          dataType: 'array'
        },
        {
          name: 'reasoningType',
          type: 'string',
          displayName: 'Reasoning Type Used',
          description: 'Type of reasoning that was performed',
          dataType: 'text'
        },
        {
          name: 'metadata',
          type: 'object',
          displayName: 'Reasoning Metadata',
          description: 'Additional metadata about the reasoning process',
          dataType: 'object'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          reasoningType: { type: 'string' },
          reasoningDepth: { type: 'string' },
          includeUncertainty: { type: 'boolean' },
          maxSteps: { type: 'number' },
          confidenceThreshold: { type: 'number' },
          reasoningPrompt: { type: 'string' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          premises: { type: 'array' },
          context: { type: 'object' },
          reasoningType: { type: 'string' },
          goals: { type: 'array' },
          constraints: { type: 'array' },
          evidence: { type: 'array' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          conclusion: { type: 'string' },
          reasoningSteps: { type: 'array' },
          confidence: { type: 'number' },
          uncertainty: { type: 'object' },
          assumptions: { type: 'array' },
          alternatives: { type: 'array' },
          reasoningType: { type: 'string' },
          metadata: { type: 'object' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    const startTime = Date.now();

    // Validation
    if (!config.reasoningType && !context.input?.reasoningType) {
      throw new Error('Required parameter "reasoningType" is missing');
    }

    try {
      const reasoningType = config.reasoningType || context.input?.reasoningType || 'deductive';
      const premises = node.data?.input?.premises || [];
      
      logger.info(`Executing reasoning node with type: ${reasoningType}`);

      let result: any = {};

      switch (reasoningType) {
        case 'deductive':
          result = await this.deductiveReasoning(premises, config);
          break;
        case 'inductive':
          result = await this.inductiveReasoning(premises, config);
          break;
        case 'abductive':
          result = await this.abductiveReasoning(premises, config);
          break;
        case 'analogical':
          result = await this.analogicalReasoning(premises, config);
          break;
        case 'causal':
          result = await this.causalReasoning(premises, config);
          break;
        default:
          throw new Error(`Unknown reasoning type: ${reasoningType}`);
      }

      const duration = Date.now() - startTime;
      
      return {
        success: true,
        output: {
          ...context.input,  // Preserve input data
          ...result  // Add new reasoning data
        },
        duration,
        metadata: {
          reasoningType,
          depth: config.reasoningDepth || 'medium',
          steps: result.reasoningSteps?.length || 0
        }
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('Reasoning node execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      };
    }
  }

  private async deductiveReasoning(premises: any[], config: any) {
    return {
      conclusion: 'Deductive conclusion based on premises',
      reasoningSteps: [
        'Analyzed premises',
        'Applied logical rules',
        'Reached conclusion'
      ],
      confidence: 0.9,
      uncertainty: { level: 'low', factors: [] },
      assumptions: ['Premises are valid'],
      alternatives: [],
      reasoningType: 'deductive',
      metadata: { method: 'classical_logic' }
    };
  }

  private async inductiveReasoning(premises: any[], config: any) {
    return {
      conclusion: 'Inductive conclusion based on patterns',
      reasoningSteps: [
        'Identified patterns',
        'Generalized from examples',
        'Formed conclusion'
      ],
      confidence: 0.7,
      uncertainty: { level: 'medium', factors: ['limited_data'] },
      assumptions: ['Patterns will continue'],
      alternatives: ['Alternative pattern interpretation'],
      reasoningType: 'inductive',
      metadata: { method: 'pattern_recognition' }
    };
  }

  private async abductiveReasoning(premises: any[], config: any) {
    return {
      conclusion: 'Best explanation for observed phenomena',
      reasoningSteps: [
        'Identified phenomena',
        'Generated explanations',
        'Selected best explanation'
      ],
      confidence: 0.8,
      uncertainty: { level: 'medium', factors: ['multiple_explanations'] },
      assumptions: ['Best explanation principle'],
      alternatives: ['Alternative explanations'],
      reasoningType: 'abductive',
      metadata: { method: 'inference_to_best_explanation' }
    };
  }

  private async analogicalReasoning(premises: any[], config: any) {
    return {
      conclusion: 'Conclusion based on analogy',
      reasoningSteps: [
        'Identified source domain',
        'Mapped to target domain',
        'Applied analogy'
      ],
      confidence: 0.6,
      uncertainty: { level: 'high', factors: ['analogy_strength'] },
      assumptions: ['Analogy is valid'],
      alternatives: ['Different analogy interpretation'],
      reasoningType: 'analogical',
      metadata: { method: 'analogical_mapping' }
    };
  }

  private async causalReasoning(premises: any[], config: any) {
    return {
      conclusion: 'Causal relationship identified',
      reasoningSteps: [
        'Identified cause-effect pairs',
        'Analyzed causal chains',
        'Determined causal relationship'
      ],
      confidence: 0.75,
      uncertainty: { level: 'medium', factors: ['causal_complexity'] },
      assumptions: ['Causal relationships exist'],
      alternatives: ['Alternative causal explanations'],
      reasoningType: 'causal',
      metadata: { method: 'causal_analysis' }
    };
  }
}

export default ReasoningNode;