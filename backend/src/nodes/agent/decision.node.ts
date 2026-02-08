import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class DecisionNode {
  getNodeDefinition() {
    return {
      id: 'agent-decision',
      type: 'action',
      name: 'Decision',
      description: 'Make intelligent decisions based on context and rules',
      category: 'agent',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'decisionType',
          type: 'options',
          displayName: 'Decision Type',
          description: 'Type of decision making to use',
          required: true,
          default: 'rule-based',
          options: [
            { name: 'Rule-Based', value: 'rule-based' },
            { name: 'LLM-Based', value: 'llm-based' },
            { name: 'Threshold', value: 'threshold' },
            { name: 'Classification', value: 'classification' }
          ]
        },
        {
          name: 'fallbackAction',
          type: 'string',
          displayName: 'Fallback Action',
          description: 'Action to take if no rules match',
          required: false,
          default: 'default',
          placeholder: 'default, escalate, retry'
        },
        {
          name: 'llmModel',
          type: 'options',
          displayName: 'LLM Model',
          description: 'AI model to use for LLM-based decisions',
          required: false,
          default: 'gpt-3.5-turbo',
          options: [
            { name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
            { name: 'GPT-4', value: 'gpt-4' },
            { name: 'Claude 3', value: 'claude-3' },
            { name: 'Custom Model', value: 'custom' }
          ]
        },
        {
          name: 'decisionPrompt',
          type: 'string',
          displayName: 'Decision Prompt',
          description: 'Prompt template for LLM-based decisions',
          required: false,
          placeholder: 'Based on the context: {context}, make a decision about: {input}'
        },
        {
          name: 'threshold',
          type: 'number',
          displayName: 'Decision Threshold',
          description: 'Threshold for threshold-based decisions',
          required: false,
          default: 0.5,
          min: 0,
          max: 1,
          step: 0.1
        },
        {
          name: 'classificationLabels',
          type: 'array',
          displayName: 'Classification Labels',
          description: 'Labels for classification decisions',
          required: false,
          placeholder: 'urgent, normal, low, critical'
        },
        {
          name: 'confidenceThreshold',
          type: 'number',
          displayName: 'Confidence Threshold',
          description: 'Minimum confidence required for decisions',
          required: false,
          default: 0.7,
          min: 0,
          max: 1,
          step: 0.1
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'context',
          type: 'object',
          displayName: 'Context Data',
          description: 'Context information for decision making from previous node',
          required: true,
          dataType: 'object'
        },
        {
          name: 'input',
          type: 'object',
          displayName: 'Input Data',
          description: 'Input data to make decision about from previous node',
          required: true,
          dataType: 'object'
        },
        {
          name: 'goals',
          type: 'array',
          displayName: 'Agent Goals',
          description: 'Agent goals to consider from previous node',
          required: false,
          dataType: 'array'
        },
        {
          name: 'constraints',
          type: 'array',
          displayName: 'Constraints',
          description: 'Constraints to respect from previous node',
          required: false,
          dataType: 'array'
        },
        {
          name: 'rules',
          type: 'array',
          displayName: 'Dynamic Rules',
          description: 'Decision rules from previous node (overrides configured)',
          required: false,
          dataType: 'array'
        },
        {
          name: 'decisionType',
          type: 'string',
          displayName: 'Dynamic Decision Type',
          description: 'Decision type from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'threshold',
          type: 'number',
          displayName: 'Dynamic Threshold',
          description: 'Threshold from previous node (overrides configured)',
          required: false,
          dataType: 'number'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'decision',
          type: 'string',
          displayName: 'Decision',
          description: 'The decision that was made',
          dataType: 'text'
        },
        {
          name: 'action',
          type: 'string',
          displayName: 'Action',
          description: 'Action to take based on the decision',
          dataType: 'text'
        },
        {
          name: 'confidence',
          type: 'number',
          displayName: 'Confidence',
          description: 'Confidence level of the decision (0-1)',
          dataType: 'number'
        },
        {
          name: 'reasoning',
          type: 'string',
          displayName: 'Reasoning',
          description: 'Explanation of why this decision was made',
          dataType: 'text'
        },
        {
          name: 'alternatives',
          type: 'array',
          displayName: 'Alternative Decisions',
          description: 'Other possible decisions that were considered',
          dataType: 'array'
        },
        {
          name: 'metadata',
          type: 'object',
          displayName: 'Decision Metadata',
          description: 'Additional metadata about the decision',
          dataType: 'object'
        },
        {
          name: 'output',
          type: 'object',
          displayName: 'Output Data',
          description: 'Output data for the decision',
          dataType: 'object'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          decisionType: { type: 'string' },
          fallbackAction: { type: 'string' },
          llmModel: { type: 'string' },
          decisionPrompt: { type: 'string' },
          threshold: { type: 'number' },
          classificationLabels: { type: 'array' },
          confidenceThreshold: { type: 'number' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          context: { type: 'object' },
          input: { type: 'object' },
          goals: { type: 'array' },
          constraints: { type: 'array' },
          rules: { type: 'array' },
          decisionType: { type: 'string' },
          threshold: { type: 'number' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          decision: { type: 'string' },
          action: { type: 'string' },
          confidence: { type: 'number' },
          reasoning: { type: 'string' },
          alternatives: { type: 'array' },
          metadata: { type: 'object' },
          output: { type: 'object' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    const startTime = Date.now();

    // Validation
    if (!config.decisionType && !context.input?.decisionType) {
      throw new Error('Required parameter "decisionType" is missing');
    }

    try {
      const decisionType = config.decisionType || context.input?.decisionType || 'rule-based';
      const input = context.input;
      const agentContext = input.context || {};
      const goals = input.goals || [];
      const constraints = input.constraints || [];

      logger.info('Agent decision making', {
        nodeId: node.id,
        decisionType,
        runId: context.runId,
        hasContext: !!agentContext,
        goalCount: goals.length
      });

      let result: any;

      switch (decisionType) {
        case 'rule-based':
          result = await this.makeRuleBasedDecision(config, input, agentContext, goals, constraints);
          break;
        case 'llm-based':
          result = await this.makeLLMBasedDecision(config, input, agentContext, goals, constraints, context);
          break;
        case 'threshold':
          result = await this.makeThresholdDecision(config, input, agentContext);
          break;
        case 'classification':
          result = await this.makeClassificationDecision(config, input, agentContext, context);
          break;
        default:
          throw new Error(`Unsupported decision type: ${decisionType}`);
      }

      const duration = Date.now() - startTime;

      logger.info('Decision made', {
        nodeId: node.id,
        decision: result.decision,
        confidence: result.confidence,
        duration,
        runId: context.runId
      });

      return {
        success: true,
        output: {
          ...context.input,  // Preserve input data
          ...result  // Add new decision data
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Decision making failed', error, {
        nodeId: node.id,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  private async makeRuleBasedDecision(config: any, input: any, context: any, goals: any[], constraints: any[]): Promise<any> {
    const rules = config.rules || [];
    const fallbackAction = config.fallbackAction || 'default';

    // Evaluate each rule
    for (const rule of rules) {
      try {
        const condition = rule.condition;
        const isMatch = this.evaluateCondition(condition, { input, context, goals, constraints });
        
        if (isMatch) {
          return {
            decision: rule.action,
            action: rule.action,
            confidence: rule.confidence || 1.0,
            reasoning: `Rule matched: ${condition}`,
            alternatives: [],
            metadata: {
              ruleMatched: condition,
              output: rule.output || {}
            }
          };
        }
      } catch (error) {
        logger.warn('Rule evaluation failed', { rule: rule.condition, error: error.message });
      }
    }

    // No rules matched, use fallback
    return {
      decision: fallbackAction,
      action: fallbackAction,
      confidence: 0.5,
      reasoning: 'No rules matched, using fallback action',
      alternatives: [],
      metadata: { fallback: true }
    };
  }

  private async makeLLMBasedDecision(config: any, input: any, context: any, goals: any[], constraints: any[], executionContext: ExecutionContext): Promise<any> {
    const model = config.llmModel || 'gpt-3.5-turbo';
    const prompt = config.decisionPrompt || this.getDefaultDecisionPrompt();

    // Prepare context for LLM
    const decisionContext = {
      input,
      context,
      goals,
      constraints,
      sessionId: executionContext.sessionId,
      agentId: executionContext.agentId
    };

    // Get LLM response
    const llmResponse = await this.callLLM(model, prompt, decisionContext);
    
    // Parse LLM response
    const decision = this.parseLLMResponse(llmResponse);

    return {
      decision: decision.action,
      action: decision.action,
      confidence: decision.confidence || 0.8,
      reasoning: decision.reasoning || 'LLM-based decision',
      alternatives: decision.alternatives || [],
      metadata: {
        model,
        llmResponse: llmResponse,
        context: decisionContext
      }
    };
  }

  private async makeThresholdDecision(config: any, input: any, context: any): Promise<any> {
    const threshold = config.threshold || 0.5;
    const value = this.extractValue(input, context);
    
    const decision = value >= threshold ? 'proceed' : 'skip';
    const confidence = Math.abs(value - threshold) + 0.5;

    return {
      decision,
      action: decision,
      confidence: Math.min(confidence, 1.0),
      reasoning: `Value ${value} ${value >= threshold ? 'exceeds' : 'below'} threshold ${threshold}`,
      alternatives: [],
      metadata: { threshold, value }
    };
  }

  private async makeClassificationDecision(config: any, input: any, context: any, executionContext: ExecutionContext): Promise<any> {
    const labels = config.classificationLabels || ['positive', 'negative', 'neutral'];
    const model = config.llmModel || 'gpt-3.5-turbo';

    const classificationPrompt = `
Classify the following input into one of these categories: ${labels.join(', ')}
Input: ${JSON.stringify(input)}
Context: ${JSON.stringify(context)}
Respond with only the category name.
`;

    const response = await this.callLLM(model, classificationPrompt, { input, context });
    const classification = response.trim().toLowerCase();

    const confidence = labels.includes(classification) ? 0.9 : 0.3;

    return {
      decision: classification,
      action: classification,
      confidence,
      reasoning: `Classified as: ${classification}`,
      alternatives: labels.filter(l => l !== classification),
      metadata: { labels, classification }
    };
  }

  private evaluateCondition(condition: string, data: any): boolean {
    try {
      logger.info('Evaluating condition', { condition, input: data.input });
      
      // Get input text from various possible fields
      const inputText = data.input?.user_input || data.input?.text || data.input?.message || data.input?.input || '';
      
      // Handle "user says hello" pattern
      if (condition.includes('user says')) {
        const word = condition.match(/user says (\w+)/)?.[1];
        if (word) {
          const result = inputText.toLowerCase().includes(word.toLowerCase());
          logger.info('User says match result', { word, inputText, result });
          return result;
        }
      }
      
      // Handle "contains" pattern
      if (condition.includes('contains')) {
        const word = condition.match(/contains (\w+)/)?.[1];
        if (word) {
          const result = inputText.toLowerCase().includes(word.toLowerCase());
          logger.info('Contains match result', { word, inputText, result });
          return result;
        }
      }
      
      // Handle quoted strings
      const quotedMatch = condition.match(/["']([^"']+)["']/);
      if (quotedMatch) {
        const searchTerm = quotedMatch[1];
        const result = inputText.toLowerCase().includes(searchTerm.toLowerCase());
        logger.info('Quoted string match result', { searchTerm, inputText, result });
        return result;
      }
      
      // Handle numeric comparisons
      if (condition.includes('>') || condition.includes('<') || condition.includes('===') || condition.includes('==')) {
        const inputValue = this.extractValue(data.input, data.context);
        const threshold = parseFloat(condition.match(/(\d+\.?\d*)/)?.[1] || '0');
        
        if (condition.includes('>')) return inputValue > threshold;
        if (condition.includes('<')) return inputValue < threshold;
        if (condition.includes('===')) return inputValue === threshold;
        if (condition.includes('==')) return inputValue == threshold;
      }
      
      // Handle boolean conditions
      if (condition.includes('has') || condition.includes('exists')) {
        const key = condition.match(/has\s+(\w+)|exists\s+(\w+)/)?.[1] || condition.match(/has\s+(\w+)|exists\s+(\w+)/)?.[2];
        if (key) {
          return !!(data.input?.[key] || data.context?.[key]);
        }
      }
      
      // Default to false for unrecognized conditions
      logger.info('No pattern matched, returning false', { condition });
      return false;
    } catch (error) {
      logger.warn('Condition evaluation failed', { condition, error: error.message });
      return false;
    }
  }

  private async callLLM(model: string, prompt: string, context: any): Promise<string> {
    try {
      // Use OpenAI node for LLM calls
      const { OpenAINode } = await import('../llm/openai.node');
      const openaiNode = new OpenAINode();
      
      const nodeConfig = {
        model,
        messages: [
          { role: 'system', content: 'You are an AI agent making decisions based on context.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        maxTokens: 500
      };

      const result = await openaiNode.execute({
        id: 'temp-decision',
        type: 'ai.openai',
        position: { x: 0, y: 0 },
        data: { config: nodeConfig }
      } as WorkflowNode, {
        runId: 'temp',
        workflowId: 'temp',
        nodeId: 'temp',
        input: context,
        output: {},
        variables: context,
        credentials: {},
        sessionId: context.sessionId,
        agentId: context.agentId
      });

      if (result.success && result.output?.content) {
        return result.output.content;
      }
      
      throw new Error('LLM call failed');
    } catch (error) {
      logger.error('LLM call failed', error);
      throw new Error('Failed to get LLM decision');
    }
  }

  private getDefaultDecisionPrompt(): string {
    return `
You are an AI agent making decisions. Analyze the provided context and make the best decision.

Context:
- Input: {{input}}
- Agent Context: {{context}}
- Goals: {{goals}}
- Constraints: {{constraints}}

Respond with a JSON object containing:
{
  "action": "the decision/action to take",
  "reasoning": "brief explanation of why this decision was made",
  "confidence": 0.0-1.0,
  "alternatives": ["other options considered"]
}
`;
  }

  private parseLLMResponse(response: string): any {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback parsing
      return {
        action: response.trim(),
        reasoning: 'LLM response',
        confidence: 0.7,
        alternatives: []
      };
    } catch (error) {
      logger.warn('Failed to parse LLM response', { response, error: error.message });
      return {
        action: response.trim(),
        reasoning: 'LLM response (unparsed)',
        confidence: 0.5,
        alternatives: []
      };
    }
  }

  private extractValue(input: any, context: any): number {
    // Extract a numeric value for threshold comparison
    if (typeof input === 'number') return input;
    if (typeof input === 'string') return parseFloat(input) || 0;
    if (input?.value !== undefined) return parseFloat(input.value) || 0;
    if (input?.score !== undefined) return parseFloat(input.score) || 0;
    if (input?.priority !== undefined) return parseFloat(input.priority) || 0;
    
    return 0;
  }
}

export default DecisionNode;
