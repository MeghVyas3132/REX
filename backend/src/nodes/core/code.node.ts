import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class CodeNode {
  getNodeDefinition() {
    return {
      id: 'code',
      type: 'action',
      name: 'Code',
      description: 'Execute custom JavaScript or Python code - Enhanced with proper input fields like n8n/Flowise',
      category: 'core',
      version: '1.0.0',
      author: 'Workflow Studio',
      
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'language',
          type: 'options',
          displayName: 'Language',
          description: 'Programming language to execute',
          required: true,
          default: 'javascript',
          options: [
            { name: 'JavaScript', value: 'javascript' },
            { name: 'Python', value: 'python' }
          ]
        },
        {
          name: 'code',
          type: 'string',
          displayName: 'Code',
          description: 'Code to execute',
          required: true,
          placeholder: 'return { result: "Hello World" };'
        },
        {
          name: 'timeout',
          type: 'number',
          displayName: 'Timeout (seconds)',
          description: 'Maximum execution time in seconds',
          required: false,
          default: 30,
          min: 1,
          max: 300
        },
        {
          name: 'allowImports',
          type: 'boolean',
          displayName: 'Allow Imports',
          description: 'Allow importing external modules',
          required: false,
          default: false
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'data',
          type: 'object',
          displayName: 'Input Data',
          description: 'Data from previous node to use in code',
          required: false,
          dataType: 'object'
        },
        {
          name: 'variables',
          type: 'object',
          displayName: 'Variables',
          description: 'Additional variables from previous node',
          required: false,
          dataType: 'object'
        },
        {
          name: 'code',
          type: 'string',
          displayName: 'Dynamic Code',
          description: 'Code from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'language',
          type: 'string',
          displayName: 'Dynamic Language',
          description: 'Language from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'result',
          type: 'object',
          displayName: 'Result',
          description: 'Result from code execution',
          dataType: 'object'
        },
        {
          name: 'output',
          type: 'string',
          displayName: 'Output',
          description: 'Console output from code execution',
          dataType: 'text'
        },
        {
          name: 'error',
          type: 'string',
          displayName: 'Error',
          description: 'Error message if execution failed',
          dataType: 'text'
        },
        {
          name: 'executionTime',
          type: 'number',
          displayName: 'Execution Time',
          description: 'Time taken to execute code (ms)',
          dataType: 'number'
        },
        {
          name: 'language',
          type: 'string',
          displayName: 'Language Used',
          description: 'Programming language that was executed',
          dataType: 'text'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          language: { type: 'string' },
          code: { type: 'string' },
          timeout: { type: 'number' },
          allowImports: { type: 'boolean' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          data: { type: 'object' },
          variables: { type: 'object' },
          code: { type: 'string' },
          language: { type: 'string' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          result: { type: 'object' },
          output: { type: 'string' },
          error: { type: 'string' },
          duration: { type: 'number' },
          language: { type: 'string' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};

    // Support new UI field names (jsCode, Python vs JavaScript casing)
    const rawLanguage = (config.language ?? config.Language ?? context.input?.language) as string | undefined;
    const rawCode = (config.code ?? config.jsCode ?? context.input?.code) as string | undefined;

    logger.info('Code node configuration', {
      nodeId: node.id,
      rawLanguage,
      rawCodePresent: rawCode ? true : false,
      configKeys: Object.keys(config || {}),
    });

    // Validation for required parameters
    if (!rawLanguage || !String(rawLanguage).trim()) {
      throw new Error('Required parameter "language" is missing');
    }
    if (!rawCode || !String(rawCode).trim()) {
      throw new Error('Required parameter "code" is missing');
    }

    const startTime = Date.now();
    
    try {
      const code = rawCode as string;
      const language = (rawLanguage as string) || 'javascript';
      
      if (!code.trim()) {
        throw new Error('No code provided');
      }

      logger.info('Executing code node', {
        nodeId: node.id,
        language,
        runId: context.runId
      });

      let result: any;

      switch (language.toLowerCase()) {
        case 'javascript':
        case 'js':
          result = await this.executeJavaScript(code, context);
          break;
        case 'python':
          result = await this.executePython(code, context);
          break;
        default:
          throw new Error(`Unsupported language: ${language}`);
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        output: {
          ...context.input,  // Preserve input data
          ...result  // Add code execution result (result takes precedence)
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Code execution failed', error, {
        nodeId: node.id,
        runId: context.runId,
        duration
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  private async executeJavaScript(code: string, context: ExecutionContext): Promise<any> {
    // Log input for debugging
    logger.info('Code node executing JavaScript', {
      nodeId: context.nodeId,
      inputKeys: Object.keys(context.input || {}),
      input: context.input,
      hasItems: !!(context.input?.items)
    });
    
    // Create a safe execution context
    // If input has items array, use it; otherwise, wrap the input in an items array for compatibility
    const inputData = context.input || {};
    const items = inputData.items || (inputData && typeof inputData === 'object' && !Array.isArray(inputData) ? [inputData] : []);
    
    // Create inputs object (plural) for compatibility with user code that expects inputs.apiResponse
    // This makes the previous node's output easily accessible
    // Handle multiple possible data structures:
    // 1. input.data (auto-flattened from HTTP Request)
    // 2. input.output.data (if output structure is preserved)
    // 3. Direct data in input root
    const findData = () => {
      // Try direct data field first
      if (inputData.data) return inputData.data;
      // Try nested output.data (HTTP Request node structure)
      if (inputData.output?.data) return inputData.output.data;
      // Try response field
      if (inputData.response) return inputData.response;
      // Try body field
      if (inputData.body) return inputData.body;
      // If input itself looks like API response (has choices, etc.), return it
      if (inputData.choices || inputData.id) return inputData;
      return null;
    };
    
    const apiResponseData = findData();
    
    const inputs = {
      ...inputData,
      // Add apiResponse as an alias for data field (common pattern from HTTP Request nodes)
      // This allows users to access inputs.apiResponse instead of inputs.data
      apiResponse: apiResponseData,
      // Also expose data directly (try multiple locations)
      data: inputData.data || inputData.output?.data || apiResponseData,
      // Expose response if it exists
      response: inputData.response || inputData.output?.data || apiResponseData,
      // Expose body if it exists
      body: inputData.body || apiResponseData,
      // Also expose output if it exists (for accessing nested structures)
      output: inputData.output
    };
    
    // Log available inputs for debugging
    logger.info('Code node inputs available', {
      nodeId: context.nodeId,
      inputKeys: Object.keys(inputData),
      hasData: !!inputData.data,
      hasApiResponse: !!inputs.apiResponse,
      apiResponseKeys: inputs.apiResponse ? Object.keys(inputs.apiResponse) : [],
      runId: context.runId
    });
    
    const sandbox = {
      input: inputData,
      inputs: inputs,  // Add inputs (plural) for compatibility
      apiResponse: inputs.apiResponse,  // Direct access to API response
      variables: context.variables,
      output: {},
      $input: {
        all: () => items,
        first: () => items.length > 0 ? items[0] : undefined,
        item: (index = 0) => items[index],
      },
      console: {
        log: (...args: any[]) => logger.info('Code console.log', { args, runId: context.runId }),
        error: (...args: any[]) => logger.error('Code console.error', new Error(args.join(' '))),
        warn: (...args: any[]) => logger.warn('Code console.warn', { args, runId: context.runId })
      },
      setTimeout: (fn: Function, delay: number) => {
        return new Promise(resolve => {
          setTimeout(() => {
            try {
              const result = fn();
              resolve(result);
            } catch (error) {
              logger.error('Code setTimeout error', error as Error);
              resolve(undefined);
            }
          }, delay);
        });
      },
      fetch: async (url: string, options?: any) => {
        const response = await fetch(url, options);
        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers as any),
          json: () => response.json(),
          text: () => response.text()
        };
      }
    };

    // Create function with sandbox - add inputs and apiResponse to function parameters
    const func = new Function(
      'input',
      'inputs',
      'apiResponse',
      'variables',
      'output',
      '$input',
      'console',
      'setTimeout',
      'fetch',
      `${code}`
    );

    // Execute the code
    const result = func(
      sandbox.input,
      sandbox.inputs,
      sandbox.apiResponse,
      sandbox.variables,
      sandbox.output,
      sandbox.$input,
      sandbox.console,
      sandbox.setTimeout,
      sandbox.fetch
    );

    return result !== undefined ? result : sandbox.output;
  }

  private async executePython(code: string, context: ExecutionContext): Promise<any> {
    // For now, return an error as Python execution requires additional setup
    // In production, you would use a Python execution service or container
    throw new Error('Python execution not implemented. Use JavaScript instead.');
  }

}
export default CodeNode;
