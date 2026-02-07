import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class OpenAINode {
  getNodeDefinition() {
    return {
  id: 'openai',
  type: 'action',
  name: 'OpenAI',
  description: 'Make OpenAI API calls',
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
      required: false,
      placeholder: 'Enter apiKey...'
    },
    {
      name: 'messages',
      type: 'string',
      displayName: 'Messages',
      description: 'messages configuration',
      required: false,
      placeholder: 'Enter messages...'
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
      const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key is required');
      }

      const model = config.model || 'gpt-3.5-turbo';
      const messages = config.messages || [];
      const temperature = config.temperature || 0.7;
      const maxTokens = config.maxTokens || 1000;

      // Prepare messages
      const formattedMessages = this.formatMessages(messages, context);
      
      logger.info('Making OpenAI API call', {
        nodeId: node.id,
        model,
        messageCount: formattedMessages.length,
        runId: context.runId
      });

      // Make API call
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature,
          max_tokens: maxTokens
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      logger.externalService('OpenAI', 'chat/completions', duration, true, {
        nodeId: node.id,
        model,
        runId: context.runId
      });

      // Clean output structure - remove test fields
      const cleanInput = { ...context.input };
      delete cleanInput.test;
      delete cleanInput._test;
      
      return {
        success: true,
        output: {
          // Primary output
          content: data.choices[0]?.message?.content || '',
          // Metadata
          model: data.model,
          provider: 'OpenAI',
          finishReason: data.choices[0]?.finish_reason,
          // Usage information
          ...(data.usage && {
            usage: {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens
            }
          }),
          // Preserve other input fields (except test fields)
          ...(Object.keys(cleanInput).length > 0 && cleanInput)
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.externalService('OpenAI', 'chat/completions', duration, false, {
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

  private formatMessages(messages: any[], context: ExecutionContext): any[] {
    return messages.map(msg => {
      if (typeof msg === 'string') {
        return { role: 'user', content: msg };
      }
      
      if (msg.content && typeof msg.content === 'string') {
        return msg;
      }
      
      // Handle template variables
      if (msg.content && typeof msg.content === 'object') {
        return {
          ...msg,
          content: this.replaceVariables(msg.content, context)
        };
      }
      
      return msg;
    });
  }

  private replaceVariables(content: any, context: ExecutionContext): any {
    if (typeof content === 'string') {
      return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return context.variables[key] || context.input[key] || match;
      });
    }
    
    if (Array.isArray(content)) {
      return content.map(item => this.replaceVariables(item, context));
    }
    
    if (typeof content === 'object' && content !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(content)) {
        result[key] = this.replaceVariables(value, context);
      }
      return result;
    }
    
    return content;
  }}


export default OpenAINode;
