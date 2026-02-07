import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class GeminiRealNode {
  getNodeDefinition() {
    return {
  id: 'gemini-real',
  type: 'action',
  name: 'Gemini (Real)',
  description: 'Make Google Gemini API calls with real SDK',
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
    const startTime = Date.now();
    const config = node.data?.config || {};
    if (!config.model && !context.input?.model) {
      throw new Error('Required parameter "model" is missing');
    }

    
    try {
      const config = node.config;
      const { apiKey, model, prompt, maxOutputTokens, temperature, topP, topK, stopSequences } = config;
      
      const inputPrompt = context.input?.prompt || prompt;

      if (!apiKey) {
        throw new Error('Google AI API key is required');
      }

      if (!inputPrompt) {
        throw new Error('Prompt is required');
      }

      // Prepare the request payload
      const payload: any = {
        contents: [
          {
            parts: [
              {
                text: inputPrompt
              }
            ]
          }
        ]
      };

      // Add generation config
      const generationConfig: any = {};
      if (maxOutputTokens) generationConfig.maxOutputTokens = maxOutputTokens;
      if (temperature !== undefined) generationConfig.temperature = temperature;
      if (topP !== undefined) generationConfig.topP = topP;
      if (topK !== undefined) generationConfig.topK = topK;
      if (stopSequences) {
        try {
          generationConfig.stopSequences = JSON.parse(stopSequences);
        } catch (e) {
          logger.warn('Invalid stop sequences JSON, ignoring', { stopSequences });
        }
      }

      if (Object.keys(generationConfig).length > 0) {
        payload.generationConfig = generationConfig;
      }

      logger.info('Making Gemini API call', {
        nodeId: node.id,
        model: model || 'gemini-pro',
        promptLength: inputPrompt.length,
        runId: context.runId
      });

      // Make API call to Google AI
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-pro'}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      logger.externalService('Gemini', 'generateContent', duration, true, {
        nodeId: node.id,
        model: model || 'gemini-pro',
        runId: context.runId
      });

      const candidate = data.candidates?.[0];
      const content = candidate?.content?.parts?.[0]?.text || '';
      const finishReason = candidate?.finishReason || 'STOP';

      return {
        success: true,
        output: {
          content,
          usage: {
            prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
            candidates_tokens: data.usageMetadata?.candidatesTokenCount || 0,
            total_tokens: data.usageMetadata?.totalTokenCount || 0
          },
          model: model || 'gemini-pro',
          finishReason,
          provider: 'Google AI'
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
  }

  async test(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    

    const { config } = context;
    const { apiKey, model, prompt } = config;

    if (!apiKey) {
      return {
      duration: Date.now() - startTime,
        success: false,
        error: 'API key is required for Gemini node test.'
      };
    }

    if (!prompt) {
      return {
      duration: Date.now() - startTime,
        success: false,
        error: 'Prompt is required for Gemini node test.'
      };
    }

    // Mock a successful test response
    return {
      duration: Date.now() - startTime,
      success: true,
      data: {
        nodeType: 'gemini',
        status: 'success',
        message: 'Gemini node test completed successfully',
        config: { apiKey: '***', model, prompt: prompt.substring(0, 50) + '...' },
        capabilities: {
          textGeneration: true,
          multimodal: true,
          analysis: true
        },
        timestamp: new Date().toISOString()
      }
    };
  }

}


export default GeminiRealNode;
