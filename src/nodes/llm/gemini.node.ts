import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class GeminiNode {
  getNodeDefinition() {
    return {
  id: 'gemini',
  type: 'action',
  name: 'Gemini',
  description: 'Make Google Gemini API calls',
  category: 'llm',
  version: '1.0.0',
  author: 'Workflow Studio',
  parameters: [
    {
      name: 'model',
      type: 'string',
      displayName: 'Model',
      description: 'model configuration',
      required: true,
      placeholder: 'Enter model...'
    },
    {
      name: 'apiKey',
      type: 'string',
      displayName: 'Api Key',
      description: 'apiKey configuration',
      required: true,
      placeholder: 'Enter apiKey...'
    },
    {
      name: 'prompt',
      type: 'string',
      displayName: 'Prompt',
      description: 'prompt configuration',
      required: false,
      placeholder: 'Enter prompt...'
    },
    {
      name: 'temperature',
      type: 'string',
      displayName: 'Temperature',
      description: 'temperature configuration',
      required: false,
      placeholder: 'Enter temperature...'
    },
    {
      name: 'maxTokens',
      type: 'string',
      displayName: 'Max Tokens',
      description: 'maxTokens configuration',
      required: false,
      placeholder: 'Enter maxTokens...'
    },
    {
      name: 'systemPrompt',
      type: 'string',
      displayName: 'System Prompt',
      description: 'systemPrompt configuration',
      required: false,
      placeholder: 'Enter systemPrompt...'
    }
  ],
  inputs: [
    {
      name: 'model',
      type: 'any',
      displayName: 'Model',
      description: 'model from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'prompt',
      type: 'any',
      displayName: 'Prompt',
      description: 'prompt from previous node',
      required: false,
      dataType: 'any'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'any',
      displayName: 'Output',
      description: 'Output from the node',
      dataType: 'any'
    },
    {
      name: 'success',
      type: 'boolean',
      displayName: 'Success',
      description: 'Whether the operation succeeded',
      dataType: 'boolean'
    }
  ]
};
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    const startTime = Date.now();

    if (!config.model && !context.input?.model) {
      throw new Error('Required parameter "model" is missing');
    }

    
    try {
      const apiKey = config.apiKey || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error('Google API key is required');
      }

      const model = config.model || 'gemini-pro';
      const prompt = config.prompt || context.input?.prompt;
      const temperature = config.temperature || 0.7;
      const maxTokens = config.maxTokens || 1000;

      if (!prompt) {
        throw new Error('Prompt is required');
      }

      logger.info('Making Gemini API call', {
        nodeId: node.id,
        model,
        runId: context.runId
      });

      // Prepare the request
      const requestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens
        }
      };

      // Add system prompt if provided
      if (config.systemPrompt) {
        requestBody.contents[0].parts.unshift({
          text: `System: ${config.systemPrompt}`
        });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      logger.externalService('Gemini', 'generateContent', duration, true, {
        nodeId: node.id,
        model,
        runId: context.runId
      });

      return {
        success: true,
        output: {
          ...context.input,  // Preserve input data
          content: data.candidates[0]?.content?.parts[0]?.text || '',
          usage: data.usageMetadata || {},
          model: model,
          provider: 'Google Gemini'
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.externalService('Gemini', 'generateContent', duration, false, {
        nodeId: node.id,
        error: error.message,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }}


export default GeminiNode;
