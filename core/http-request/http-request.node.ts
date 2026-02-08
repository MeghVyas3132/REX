import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;

export class HttpRequestNode {
  getNodeDefinition() {
    return {
  id: 'http-request',
  type: 'action',
  name: 'HTTP Request',
  description: 'Make HTTP requests with authentication, query params, and body handling',
  category: 'core',
  version: '1.0.0',
  author: 'Workflow Studio',
  parameters: [
    {
      name: 'method',
      type: 'string',
      displayName: 'Method',
      description: 'method configuration',
      required: true,
      placeholder: 'Enter method...'
    },
    {
      name: 'url',
      type: 'string',
      displayName: 'Url',
      description: 'url configuration',
      required: false,
      placeholder: 'Enter url...'
    },
    {
      name: 'headers',
      type: 'string',
      displayName: 'Headers',
      description: 'headers configuration',
      required: false,
      placeholder: 'Enter headers...'
    },
    {
      name: 'authType',
      type: 'string',
      displayName: 'Auth Type',
      description: 'authType configuration',
      required: false,
      placeholder: 'Enter authType...'
    },
    {
      name: 'username',
      type: 'string',
      displayName: 'Username',
      description: 'username configuration',
      required: false,
      placeholder: 'Enter username...'
    },
    {
      name: 'password',
      type: 'string',
      displayName: 'Password',
      description: 'password configuration',
      required: false,
      placeholder: 'Enter password...'
    },
    {
      name: 'bearerToken',
      type: 'string',
      displayName: 'Bearer Token',
      description: 'bearerToken configuration',
      required: false,
      placeholder: 'Enter bearerToken...'
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
      name: 'timeout',
      type: 'string',
      displayName: 'Timeout',
      description: 'timeout configuration',
      required: false,
      placeholder: 'Enter timeout...'
    },
    {
      name: 'body',
      type: 'string',
      displayName: 'Body',
      description: 'Request body (JSON string or object)',
      required: false,
      placeholder: '{"key": "value"}'
    },
    {
      name: 'bodyType',
      type: 'string',
      displayName: 'Body Type',
      description: 'Type of body content (json, raw, form)',
      required: false,
      placeholder: 'json'
    },
    {
      name: 'queryParams',
      type: 'string',
      displayName: 'Query Parameters',
      description: 'Query parameters as JSON string',
      required: false,
      placeholder: '{"param1": "value1"}'
    },
    {
      name: 'apiKeyHeader',
      type: 'string',
      displayName: 'API Key Header',
      description: 'Header name for API key authentication',
      required: false,
      placeholder: 'X-API-Key'
    },
    {
      name: 'followRedirects',
      type: 'boolean',
      displayName: 'Follow Redirects',
      description: 'Whether to follow HTTP redirects',
      required: false,
      dataType: 'boolean'
    }
  ],
  inputs: [
    {
      name: 'method',
      type: 'any',
      displayName: 'Method',
      description: 'HTTP method from previous node (overrides configured)',
      required: false,
      dataType: 'any'
    },
    {
      name: 'url',
      type: 'string',
      displayName: 'Dynamic URL',
      description: 'URL from previous node (overrides configured URL)',
      required: false,
      dataType: 'text'
    },
    {
      name: 'body',
      type: 'object',
      displayName: 'Request Body',
      description: 'Request body data from previous node (overrides configured body)',
      required: false,
      dataType: 'object'
    },
    {
      name: 'headers',
      type: 'object',
      displayName: 'Dynamic Headers',
      description: 'Headers from previous node (merged with configured headers)',
      required: false,
      dataType: 'object'
    },
    {
      name: 'queryParams',
      type: 'object',
      displayName: 'Query Parameters',
      description: 'Query parameters from previous node (overrides configured)',
      required: false,
      dataType: 'object'
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

    if (!config.method && !context.input?.method) {
      throw new Error('Required parameter "method" is missing');
    }

    const input = context.input || {};

    
    try {
      // Get URL (from input or config)
      const url = input.url || config.url;
      if (!url) {
        throw new Error('URL is required. Configure it in node settings or connect a previous node.');
      }

      // Get method (from config)
      const method = config.method || 'GET';

      // Helper function to parse headers from various formats
      const parseHeaders = (headersInput: any): Record<string, string> => {
        if (!headersInput) return {};
        
        // If it's already an object, return it
        if (typeof headersInput === 'object' && !Array.isArray(headersInput)) {
          return headersInput;
        }
        
        // If it's a string, try to parse it as JSON
        if (typeof headersInput === 'string') {
          try {
            headersInput = JSON.parse(headersInput);
          } catch (e) {
            // If parsing fails, treat as empty
            logger.warn('Failed to parse headers JSON string', { error: e });
            return {};
          }
        }
        
        // If it's an array format [{name, value}], convert to object {name: value}
        if (Array.isArray(headersInput)) {
          const headersObj: Record<string, string> = {};
          for (const header of headersInput) {
            if (header && header.name && header.value !== undefined) {
              headersObj[header.name] = String(header.value);
            }
          }
          return headersObj;
        }
        
        return {};
      };

      // Prepare headers (merge config and input)
      const configHeaders = parseHeaders(config.headers);
      const inputHeaders = parseHeaders(input.headers);
      const headers = { ...configHeaders, ...inputHeaders };

      // Add authentication headers ONLY if authType is explicitly set and NOT 'none'
      // This prevents overriding headers when authType is 'none'
      if (config.authType && config.authType !== 'none') {
        if (config.authType === 'basic' && config.username && config.password) {
          const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
          headers['Authorization'] = `Basic ${auth}`;
        } else if (config.authType === 'bearer' && config.bearerToken) {
          headers['Authorization'] = `Bearer ${config.bearerToken}`;
        } else if (config.authType === 'apikey' && config.apiKey) {
          // Use configurable API key header name, default to 'X-API-Key'
          const apiKeyHeaderName = config.apiKeyHeader || 'X-API-Key';
          headers[apiKeyHeaderName] = config.apiKey;
        }
      }

      // Fallback: allow explicit bearer token or API key to work even if authType is unset/mismatched
      if (!headers['Authorization'] && config.bearerToken) {
        headers['Authorization'] = `Bearer ${config.bearerToken}`;
      }
      const apiKeyHeaderName = config.apiKeyHeader || 'X-API-Key';
      if (!headers[apiKeyHeaderName] && config.apiKey && config.authType === 'apikey') {
        headers[apiKeyHeaderName] = config.apiKey;
      }

      // Helper function to resolve template variables like {{input.field}} or {{nodeId.field}}
      // This allows HTTP Request to access data from ANY connected node, not just immediate input
      const resolveTemplate = (template: any, nodeOutputs: Record<string, any> = {}): any => {
        if (typeof template === 'string') {
          // Replace template variables in string
          return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expr) => {
            const [root, ...pathParts] = expr.trim().split('.');
            let base: any;
            
            // Support {{input.field}} - from immediate input (merged from previous nodes)
            if (root === 'input') {
              base = input;
            } 
            // Support {{nodeId.field}} - from any previous node by ID
            else if (nodeOutputs[root]) {
              base = nodeOutputs[root];
            }
            // Fallback: try to find in input if it's a nested property
            else if (input[root]) {
              base = input[root];
            }
            else {
              return match; // Return original if not found
            }
            
            if (!base) return match;
            const value = pathParts.reduce((acc: any, key: string) => (acc ? acc[key] : undefined), base);
            return value !== undefined && value !== null ? String(value) : match;
          });
        } else if (Array.isArray(template)) {
          return template.map(item => resolveTemplate(item, nodeOutputs));
        } else if (typeof template === 'object' && template !== null) {
          const result: any = {};
          for (const [key, value] of Object.entries(template)) {
            result[key] = resolveTemplate(value, nodeOutputs);
          }
          return result;
        }
        return template;
      };

      // Prepare request body
      // Priority: config.body (explicit body from node config) > input.body > auto-detect from input
      const bodyType = config.bodyType || 'json';
      let body = config.body || input.body || null;
      
      // Log initial body state for debugging
      logger.info('HTTP Request body preparation START', {
        nodeId: node.id,
        hasConfigBody: !!config.body,
        hasInputBody: !!input.body,
        bodyType: typeof body,
        bodyTypeConfig: bodyType,
        configKeys: Object.keys(config),
        bodyPreview: typeof body === 'string' ? body.substring(0, 300) : (body ? JSON.stringify(body).substring(0, 300) : 'null')
      });
      
      // Get nodeOutputs from context to access data from any previous node (needed for template resolution)
      const nodeOutputs = (context as any).nodeOutputs || {};
      
      // Log available data for template resolution
      logger.info('Template resolution context', {
        nodeId: node.id,
        inputKeys: Object.keys(input),
        nodeOutputsKeys: Object.keys(nodeOutputs),
        inputSample: JSON.stringify(input).substring(0, 200)
      });
      
      // If we have a body from config, process it (resolve templates, parse if needed)
      if (body) {
        if (bodyType === 'json') {
          // If body is a string, resolve templates first, then parse JSON
          if (typeof body === 'string') {
            logger.info('Processing body as string', {
              nodeId: node.id,
              bodyLength: body.length,
              hasTemplates: body.includes('{{')
            });
            
            // Resolve templates in the string (supports {{input.field}} and {{nodeId.field}})
            const bodyBeforeResolve = body;
            body = resolveTemplate(body, nodeOutputs);
            
            logger.info('Body after template resolution', {
              nodeId: node.id,
              changed: bodyBeforeResolve !== body,
              bodyPreview: body.substring(0, 500)
            });
            
            // Parse body if it's a JSON string after template resolution
            if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
              try {
                const parsedBody = JSON.parse(body);
                body = parsedBody;
                logger.info('Body parsed successfully', {
                  nodeId: node.id,
                  parsedKeys: typeof parsedBody === 'object' ? Object.keys(parsedBody) : 'not an object'
                });
              } catch (e) {
                logger.error('Failed to parse body JSON string after template resolution', { 
                  error: e,
                  bodyPreview: body.substring(0, 500)
                });
                // Don't throw - keep as string and let it fail at API level
              }
            }
          }
          
          // If body is an object, resolve templates in nested strings
          if (body && typeof body === 'object' && !Array.isArray(body)) {
            logger.info('Processing body as object', {
              nodeId: node.id,
              bodyKeys: Object.keys(body)
            });
            
            // Resolve templates in object values (supports {{input.field}} and {{nodeId.field}})
            body = resolveTemplate(body, nodeOutputs);
          }
          
          // Stringify body for sending (if it's an object)
          if (body && typeof body === 'object') {
            body = JSON.stringify(body);
            // Only set Content-Type if not already set in headers
            if (!headers['Content-Type'] && !headers['content-type']) {
              headers['Content-Type'] = 'application/json';
            }
          }
          
          // Log final body before sending
          logger.info('HTTP Request body after processing', {
            nodeId: node.id,
            bodyType: typeof body,
            bodyLength: typeof body === 'string' ? body.length : 0,
            bodyPreview: typeof body === 'string' ? body.substring(0, 1000) : 'not a string',
            hasContentType: !!(headers['Content-Type'] || headers['content-type'])
          });
        } else if (bodyType === 'form') {
          // Form URL encoded
          // Parse body if it's a JSON string
          if (typeof body === 'string' && body.trim().startsWith('{')) {
            try {
              body = JSON.parse(body);
            } catch (e) {
              logger.warn('Failed to parse form body JSON string, using as-is', { error: e });
            }
          }
          
          if (typeof body === 'object') {
            const formParams = new URLSearchParams();
            Object.entries(body).forEach(([key, value]) => {
              if (value !== null && value !== undefined) {
                formParams.append(key, String(value));
              }
            });
            body = formParams.toString();
          }
          // Only set Content-Type if not already set in headers
          if (!headers['Content-Type'] && !headers['content-type']) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
          }
        } else if (bodyType === 'raw') {
          // Raw text - use body as-is (string)
          if (typeof body === 'object') {
            body = JSON.stringify(body);
          }
          // Only set Content-Type if not already set in headers
          if (!headers['Content-Type'] && !headers['content-type']) {
            headers['Content-Type'] = 'text/plain';
          }
        }
      }

      // Add query parameters
      let finalUrl = url;
      let queryParams = input.queryParams || config.queryParams;
      
      // Parse queryParams if it's a JSON string
      if (typeof queryParams === 'string' && queryParams.trim().startsWith('{')) {
        try {
          queryParams = JSON.parse(queryParams);
        } catch (e) {
          logger.warn('Failed to parse queryParams JSON string', { error: e });
          queryParams = null;
        }
      }
      
      // Handle array format queryParams (from UI: [{key, value}])
      if (Array.isArray(queryParams)) {
        const queryObj: Record<string, any> = {};
        queryParams.forEach((param: any) => {
          if (param && param.key && param.key.trim()) {
            queryObj[param.key] = param.value || '';
          }
        });
        queryParams = Object.keys(queryObj).length > 0 ? queryObj : null;
      }
      
      if (queryParams && typeof queryParams === 'object' && !Array.isArray(queryParams) && Object.keys(queryParams).length > 0) {
        const urlObj = new URL(url);
        Object.entries(queryParams).forEach(([key, value]) => {
          if (value !== null && value !== undefined && String(value).trim() !== '') {
            urlObj.searchParams.append(key, String(value));
          }
        });
        finalUrl = urlObj.toString();
      }

      logger.info('HTTP Request execution', {
        nodeId: node.id,
        method,
        url: finalUrl,
        headers: Object.keys(headers).reduce((acc, key) => {
          // Mask sensitive headers in logs
          if (key.toLowerCase() === 'authorization') {
            acc[key] = headers[key]?.substring(0, 20) + '...';
          } else {
            acc[key] = headers[key];
          }
          return acc;
        }, {} as Record<string, any>),
        hasBody: !!body,
        runId: context.runId
      });

      // Parse timeout (can be string or number)
      const timeout = typeof config.timeout === 'string' 
        ? parseInt(config.timeout, 10) || 30 
        : (config.timeout || 30);
      const timeoutMs = timeout * 1000;

      // Handle followRedirects (fetch follows redirects by default, but we can control it)
      const followRedirects = config.followRedirects !== false; // Default to true

      // Final safety check: ensure body is a string (or null/undefined) before sending
      // fetch() requires body to be string, Buffer, or null/undefined
      if (body && typeof body !== 'string') {
        logger.warn('Body is not a string, stringifying', {
          nodeId: node.id,
          bodyType: typeof body
        });
        body = JSON.stringify(body);
      }

      // Validate body for JSON requests
      if (bodyType === 'json' && body && typeof body === 'string') {
        try {
          // Validate JSON before sending
          JSON.parse(body);
        } catch (e) {
          logger.error('Invalid JSON body before sending', {
            nodeId: node.id,
            error: e,
            bodyPreview: body.substring(0, 200)
          });
          throw new Error(`Invalid JSON in request body: ${(e as Error).message}`);
        }
      }

      // Log final request details (mask sensitive data)
      const logHeaders = { ...headers };
      if (logHeaders['Authorization']) {
        logHeaders['Authorization'] = logHeaders['Authorization'].substring(0, 20) + '...';
      }
      
      logger.info('Sending HTTP request', {
        nodeId: node.id,
        method,
        url: finalUrl,
        hasBody: !!body,
        bodyLength: typeof body === 'string' ? body.length : 0,
        contentType: headers['Content-Type'] || headers['content-type'],
        headers: logHeaders,
        bodyPreview: typeof body === 'string' ? body.substring(0, 300) : 'not a string',
        runId: context.runId
      });

      // Make HTTP request with retry logic for 500/429 errors
      let response: Response;
      let responseText: string;
      let responseData: any;
      let attempt = 0;
      const maxRetries = 2;
      const retryableStatuses = [429, 500, 502, 503, 504];
      
      while (attempt <= maxRetries) {
        try {
          response = await fetch(finalUrl, {
            method,
            headers,
            body: body || undefined, // Convert null to undefined for fetch
            redirect: followRedirects ? 'follow' : 'manual',
            signal: AbortSignal.timeout(timeoutMs)
          });

          responseText = await response.text();
          
          try {
            responseData = JSON.parse(responseText);
          } catch {
            responseData = responseText;
          }

          // If successful or non-retryable error, break
          if (response.ok || !retryableStatuses.includes(response.status)) {
            break;
          }

          // If retryable error and we have retries left, wait and retry
          if (attempt < maxRetries && retryableStatuses.includes(response.status)) {
            const waitTime = (attempt + 1) * 2000; // 2s, 4s
            logger.warn('Retryable error, retrying request', {
              nodeId: node.id,
              status: response.status,
              attempt: attempt + 1,
              maxRetries,
              waitTime,
              runId: context.runId
            });
            await new Promise(resolve => setTimeout(resolve, waitTime));
            attempt++;
            continue;
          }

          break;
        } catch (fetchError: any) {
          // Network errors - retry if we have attempts left
          if (attempt < maxRetries) {
            const waitTime = (attempt + 1) * 2000;
            logger.warn('Network error, retrying request', {
              nodeId: node.id,
              error: fetchError.message,
              attempt: attempt + 1,
              maxRetries,
              waitTime,
              runId: context.runId
            });
            await new Promise(resolve => setTimeout(resolve, waitTime));
            attempt++;
            continue;
          }
          throw fetchError;
        }
      }

      const duration = Date.now() - startTime;

      // Log response details
      logger.info('HTTP Request completed', {
        nodeId: node.id,
        status: response!.status,
        statusText: response!.statusText,
        duration,
        attempts: attempt + 1,
        responsePreview: typeof responseData === 'object' 
          ? JSON.stringify(responseData).substring(0, 500) 
          : String(responseData).substring(0, 500),
        runId: context.runId
      });

      // If response is not OK, log detailed error with helpful messages
      if (!response!.ok) {
        let errorMessage = `HTTP ${response!.status}: ${response!.statusText}`;
        
        // Provide helpful error messages based on status code
        if (response!.status === 401) {
          errorMessage = 'Authentication failed. Check your API key in the Authorization header.';
        } else if (response!.status === 429) {
          errorMessage = 'Rate limit exceeded. The free model is temporarily unavailable. Try a different model or wait a few minutes.';
        } else if (response!.status === 500) {
          errorMessage = 'Server error from API. The model might be temporarily unavailable. Try a different model or retry later.';
        } else if (response!.status === 400) {
          errorMessage = 'Bad request. Check your request body format and required fields.';
        }
        
        // Extract error message from response if available
        if (responseData && typeof responseData === 'object') {
          if (responseData.error && responseData.error.message) {
            errorMessage = responseData.error.message;
          } else if (responseData.message) {
            errorMessage = responseData.message;
          }
        }

        logger.error('HTTP Request returned error status', {
          nodeId: node.id,
          status: response!.status,
          statusText: response!.statusText,
          errorMessage,
          responseData,
          requestUrl: finalUrl,
          requestMethod: method,
          requestBodyPreview: typeof body === 'string' ? body.substring(0, 500) : 'not a string',
          runId: context.runId
        });
      }

      return {
        success: response!.ok,
        output: {
          ...context.input,  // Preserve input data
          data: responseData,
          status: response!.status,
          statusText: response!.statusText,
          headers: Object.fromEntries(response!.headers as any),
          raw: responseText,
          url: finalUrl,
          method: method
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('HTTP Request failed', error, {
        nodeId: node.id,
        duration,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }}


export default HttpRequestNode;

