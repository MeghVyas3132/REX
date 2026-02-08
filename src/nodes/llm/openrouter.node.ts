import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
import logger from '../../utils/logger';
import { createLLMProvider } from '../../providers/llm';

export class OpenRouterNode {
  getNodeDefinition() {
    return {
      id: 'openrouter',
      type: 'action',
      name: 'OpenRouter',
      description: 'Unified LLM API via OpenRouter',
      category: 'llm',
      version: '1.0.0',
      author: 'Workflow Studio',

      parameters: [
        {
          name: 'apiKey',
          type: 'string',
          displayName: 'API Key',
          description: 'OpenRouter API key',
          required: false,
          placeholder: 'sk-or-v1-...'
        },
        {
          name: 'model',
          type: 'options',
          displayName: 'Model',
          description: 'Model routed through OpenRouter',
          required: true,
          default: 'openai/gpt-4o-mini',
          options: [
            { name: 'GPT-4o Mini', value: 'openai/gpt-4o-mini' },
            { name: 'GPT-4o', value: 'openai/gpt-4o' },
            { name: 'Claude 3 Haiku', value: 'anthropic/claude-3-haiku' },
            { name: 'Claude 3 Sonnet', value: 'anthropic/claude-3-sonnet' },
            { name: 'Gemini Pro', value: 'google/gemini-pro' }
          ]
        },
        {
          name: 'temperature',
          type: 'number',
          displayName: 'Temperature',
          description: 'Controls randomness (0-2)',
          required: false,
          default: 0.7,
          min: 0,
          max: 2,
          step: 0.1
        },
        {
          name: 'maxTokens',
          type: 'number',
          displayName: 'Max Tokens',
          description: 'Maximum tokens to generate',
          required: false,
          default: 800,
          min: 1,
          max: 4096
        },
        {
          name: 'systemPrompt',
          type: 'string',
          displayName: 'System Prompt',
          description: 'System instruction for the model',
          required: false,
          placeholder: 'You are a helpful assistant.'
        }
      ],

      inputs: [
        { name: 'messages', type: 'array', displayName: 'Messages', description: 'Chat messages', required: false, dataType: 'array' },
        { name: 'prompt', type: 'string', displayName: 'Prompt', description: 'Single prompt', required: false, dataType: 'text' }
      ],

      outputs: [
        { name: 'content', type: 'string', displayName: 'Generated Text', description: 'Model output', dataType: 'text' },
        { name: 'provider', type: 'string', displayName: 'Provider', description: 'Provider info', dataType: 'text' }
      ],

      configSchema: {
        type: 'object',
        properties: {
          apiKey: { type: 'string' },
          model: { type: 'string' },
          temperature: { type: 'number' },
          maxTokens: { type: 'number' },
          systemPrompt: { type: 'string' },
          messages: { type: 'array' },
          prompt: { type: 'string' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const provider = createLLMProvider();
    const cfg = (node.data?.config || {}) as any;
    const start = Date.now();

    try {
      const model: string = cfg.model || 'openai/gpt-4o-mini';
      const apiKey: string | undefined = cfg.apiKey || process.env.OPENROUTER_API_KEY;
      
      // Debug logging for API key
      logger.info('OpenRouter node executing', {
        nodeId: node.id,
        runId: context.runId,
        model,
        hasConfigApiKey: !!cfg.apiKey,
        hasEnvApiKey: !!process.env.OPENROUTER_API_KEY,
        apiKeyLength: apiKey?.length || 0,
        apiKeyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : 'none'
      });
      
      if (!apiKey) {
        throw new Error('OpenRouter API key is required. Please provide it in node configuration or set OPENROUTER_API_KEY environment variable.');
      }
      
      const temperature: number = typeof cfg.temperature === 'number' ? cfg.temperature : 0.7;
      const maxTokens: number = typeof cfg.maxTokens === 'number' ? cfg.maxTokens : 800;

      // Resolve template variables in prompts and messages
      const nodeOutputs = context.nodeOutputs || {};
      const resolveTemplate = (template: any): any => {
        if (typeof template === 'string') {
          // Replace template variables in string
          return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expr) => {
            const trimmedExpr = expr.trim();
            
            // Support {{$json.field}} - from immediate input (current node's input)
            if (trimmedExpr.startsWith('$json.')) {
              const path = trimmedExpr.substring(6); // Remove '$json.' prefix
              const pathParts = path.split('.');
              let value = context.input;
              for (const part of pathParts) {
                // Handle array access like [0] or messages[0]
                const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
                if (arrayMatch) {
                  const arrayName = arrayMatch[1];
                  const arrayIndex = parseInt(arrayMatch[2], 10);
                  value = value?.[arrayName]?.[arrayIndex];
                } else {
                  // Handle JSONPath-like syntax: payload.headers[?(@.name=='Subject')].value
                  if (part.includes('[?(@')) {
                    // Simple JSONPath support for common cases
                    const jsonPathMatch = part.match(/^(.+)\[\?\(@\.(.+?)==['"](.+?)['"]\)\]\.(.+)$/);
                    if (jsonPathMatch) {
                      const arrayName = jsonPathMatch[1];
                      const filterKey = jsonPathMatch[2];
                      const filterValue = jsonPathMatch[3];
                      const resultKey = jsonPathMatch[4];
                      const array = value?.[arrayName];
                      if (Array.isArray(array)) {
                        const found = array.find((item: any) => item?.[filterKey] === filterValue);
                        value = found?.[resultKey];
                      } else {
                        value = undefined;
                      }
                    } else {
                      value = value?.[part];
                    }
                  } else {
                    value = value?.[part];
                  }
                }
                if (value === undefined || value === null) break;
              }
              return value !== undefined && value !== null ? String(value) : match;
            }
            
            // Support {{$node['NodeName'].json.field}} - from specific node by name
            const nodeNameMatch = trimmedExpr.match(/^\$node\['([^']+)'\]\.json\.(.+)$/);
            if (nodeNameMatch) {
              const nodeName = nodeNameMatch[1];
              const path = nodeNameMatch[2];
              // Find node by name in nodeOutputs
              let targetNodeOutput: any = null;
              for (const [nodeId, output] of Object.entries(nodeOutputs)) {
                // We need to check node names, but we only have nodeId in nodeOutputs
                // For now, try to match by nodeId or check if we can get node info
                if (nodeId === nodeName || output?.nodeName === nodeName) {
                  targetNodeOutput = output;
                  break;
                }
              }
              if (targetNodeOutput) {
                const pathParts = path.split('.');
                let value = targetNodeOutput;
                for (const part of pathParts) {
                  const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
                  if (arrayMatch) {
                    const arrayName = arrayMatch[1];
                    const arrayIndex = parseInt(arrayMatch[2], 10);
                    value = value?.[arrayName]?.[arrayIndex];
                  } else if (part.includes('[?(@')) {
                    const jsonPathMatch = part.match(/^(.+)\[\?\(@\.(.+?)==['"](.+?)['"]\)\]\.(.+)$/);
                    if (jsonPathMatch) {
                      const arrayName = jsonPathMatch[1];
                      const filterKey = jsonPathMatch[2];
                      const filterValue = jsonPathMatch[3];
                      const resultKey = jsonPathMatch[4];
                      const array = value?.[arrayName];
                      if (Array.isArray(array)) {
                        const found = array.find((item: any) => item?.[filterKey] === filterValue);
                        value = found?.[resultKey];
                      } else {
                        value = undefined;
                      }
                    } else {
                      value = value?.[part];
                    }
                  } else {
                    value = value?.[part];
                  }
                  if (value === undefined || value === null) break;
                }
                return value !== undefined && value !== null ? String(value) : match;
              }
            }
            
            // Support {{input.field}} - from immediate input
            if (trimmedExpr.startsWith('input.')) {
              const path = trimmedExpr.substring(6);
              const pathParts = path.split('.');
              let value = context.input;
              for (const part of pathParts) {
                const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
                if (arrayMatch) {
                  const arrayName = arrayMatch[1];
                  const arrayIndex = parseInt(arrayMatch[2], 10);
                  value = value?.[arrayName]?.[arrayIndex];
                } else {
                  value = value?.[part];
                }
                if (value === undefined || value === null) break;
              }
              return value !== undefined && value !== null ? String(value) : match;
            }
            
            // Support {{nodeId.field}} - from any previous node by ID
            const [nodeId, ...pathParts] = trimmedExpr.split('.');
            if (nodeOutputs[nodeId]) {
              let value = nodeOutputs[nodeId];
              for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
                if (arrayMatch) {
                  const arrayName = arrayMatch[1];
                  const arrayIndex = parseInt(arrayMatch[2], 10);
                  value = value?.[arrayName]?.[arrayIndex];
                } else {
                  value = value?.[part];
                }
                if (value === undefined || value === null) break;
              }
              return value !== undefined && value !== null ? String(value) : match;
            }
            
            // Try to find in input if it's a direct property
            if (context.input && context.input[trimmedExpr]) {
              const value = context.input[trimmedExpr];
              return value !== undefined && value !== null ? String(value) : match;
            }
            
            return match; // Return original if not found
          });
        } else if (Array.isArray(template)) {
          return template.map(item => resolveTemplate(item));
        } else if (typeof template === 'object' && template !== null) {
          const result: any = {};
          for (const [key, value] of Object.entries(template)) {
            result[key] = resolveTemplate(value);
          }
          return result;
        }
        return template;
      };

      // Build messages from prompt or provided messages
      // Priority: context.input (from previous node) > config
      // Resolve template variables in systemPrompt and userPrompt
      const systemPrompt: string = resolveTemplate(cfg.systemPrompt || '');
      
      // Check context.input first (data from Manual Trigger or previous node)
      let userPrompt: string | undefined;
      let incomingMessages: any[] = [];
      
      if (context.input) {
        // If context.input has a prompt field, use it
        if (context.input.prompt && typeof context.input.prompt === 'string') {
          userPrompt = context.input.prompt;
        }
        // If context.input has messages array, use it
        else if (Array.isArray(context.input.messages)) {
          incomingMessages = context.input.messages;
        }
        // If context.input itself is a string, use it as prompt
        else if (typeof context.input === 'string') {
          userPrompt = context.input;
        }
        // If context.input is an object with a single string value, use it
        else if (typeof context.input === 'object' && Object.keys(context.input).length === 1) {
          const firstValue = Object.values(context.input)[0];
          if (typeof firstValue === 'string') {
            userPrompt = firstValue;
          }
        }
      }
      
      // Fallback to config if no input from previous node
      if (!userPrompt && incomingMessages.length === 0) {
        userPrompt = resolveTemplate(cfg.userPrompt || cfg.prompt);
        incomingMessages = Array.isArray(cfg.messages) ? resolveTemplate(cfg.messages) : [];
      } else {
        // Resolve templates in userPrompt if it came from context.input
        if (userPrompt) {
          userPrompt = resolveTemplate(userPrompt);
        }
        // Resolve templates in incomingMessages
        if (incomingMessages.length > 0) {
          incomingMessages = resolveTemplate(incomingMessages);
        }
      }

      const messages = this.composeMessages(systemPrompt, userPrompt, incomingMessages, context);

      const { content, raw } = await provider.chatGenerate({ model, messages, apiKey, provider: 'openrouter' });

      const duration = Date.now() - start;
      try {
        logger.externalService('OpenRouter', 'chat/completions', duration, true, { nodeId: node.id, model, runId: context.runId });
      } catch {}

      // Extract useful metadata from raw response without duplication
      const rawResponse = raw || {};
      const usage = rawResponse.usage || {};
      const responseModel = rawResponse.model || model;
      
      // Build clean output - only include essential fields to avoid duplication
      const output: any = {
        // Primary output
        content,
        // Metadata (single source, no duplication)
        model: responseModel,
        provider: 'OpenRouter',
        // Usage information (if available)
        ...(usage.total_tokens && {
          usage: {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens
          }
        })
      };
      
      // Only include specific useful fields from input, not the entire input object
      // This prevents duplication and keeps output clean
      if (context.input && typeof context.input === 'object') {
        // Include only specific fields that might be useful for downstream nodes
        const usefulFields = ['id', 'messageId', 'threadId', 'subject', 'from', 'to'];
        for (const field of usefulFields) {
          if (context.input[field] !== undefined && context.input[field] !== null) {
            output[field] = context.input[field];
          }
        }
      }
      
      // Full raw response available for advanced use cases (but not in main output structure)
      output._raw = raw;
      
      return {
        success: true,
        output,
        duration
      };
    } catch (e: any) {
      const duration = Date.now() - start;
      try {
        logger.externalService('OpenRouter', 'chat/completions', duration, false, { nodeId: node.id, error: e?.message, runId: context.runId });
      } catch {}
      return { success: false, error: e?.message || String(e), duration };
    }
  }

  private composeMessages(systemPrompt: string, prompt: string | undefined, messages: any[], context: ExecutionContext) {
    const result: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    
    // Add system prompt first (if provided)
    if (systemPrompt) result.push({ role: 'system', content: systemPrompt });
    
    // Add messages array (if provided)
    if (Array.isArray(messages) && messages.length > 0) {
      for (const m of messages) {
        if (typeof m === 'string') {
          result.push({ role: 'user', content: m });
        } else if (m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant' || m.role === 'system')) {
          result.push(m);
        }
      }
    }
    
    // Add single prompt (if provided and no messages)
    if (prompt && messages.length === 0) {
      result.push({ role: 'user', content: String(prompt) });
    }
    
    // Last resort: if nothing else, try to extract from context.input
    if (result.length === 0 && context?.input) {
      // If context.input is a string, use it directly
      if (typeof context.input === 'string') {
        result.push({ role: 'user', content: context.input });
      }
      // If context.input is an object, try to find a text field
      else if (typeof context.input === 'object') {
        const textFields = ['text', 'question', 'query', 'input', 'message', 'content'];
        for (const field of textFields) {
          if (context.input[field] && typeof context.input[field] === 'string') {
            result.push({ role: 'user', content: context.input[field] });
            break;
          }
        }
        // If no common field found, stringify the object
        if (result.length === 0) {
          result.push({ role: 'user', content: JSON.stringify(context.input) });
        }
      }
    }
    
    return result;
  }

}
export default OpenRouterNode;


