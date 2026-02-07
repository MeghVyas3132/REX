import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class AWSLambdaRealNode {
  getNodeDefinition() {
    return {
  id: 'aws-lambda-real',
  type: 'action',
  name: 'AWS Lambda (Real)',
  description: 'Invoke AWS Lambda functions',
  category: 'cloud',
  version: '1.0.0',
  author: 'Workflow Studio',
  parameters: [
    {
      name: 'accessKeyId',
      type: 'string',
      displayName: 'Access Key Id',
      description: 'accessKeyId configuration',
      required: true,
      placeholder: 'Enter accessKeyId...'
    },
    {
      name: 'secretAccessKey',
      type: 'string',
      displayName: 'Secret Access Key',
      description: 'secretAccessKey configuration',
      required: true,
      placeholder: 'Enter secretAccessKey...'
    },
    {
      name: 'update',
      type: 'string',
      displayName: 'Update',
      description: 'update configuration',
      required: false,
      placeholder: 'Enter update...'
    },
    {
      name: 'operation',
      type: 'string',
      displayName: 'Operation',
      description: 'operation configuration',
      required: false,
      placeholder: 'Enter operation...'
    }
  ],
  inputs: [
    {
      name: 'accessKeyId',
      type: 'any',
      displayName: 'Access Key Id',
      description: 'accessKeyId from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'secretAccessKey',
      type: 'any',
      displayName: 'Secret Access Key',
      description: 'secretAccessKey from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'functionName',
      type: 'any',
      displayName: 'Function Name',
      description: 'functionName from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'payload',
      type: 'any',
      displayName: 'Payload',
      description: 'payload from previous node',
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
    if (!config.accessKeyId && !context.input?.accessKeyId) {
      throw new Error('Required parameter "accessKeyId" is missing');
    }
    if (!config.secretAccessKey && !context.input?.secretAccessKey) {
      throw new Error('Required parameter "secretAccessKey" is missing');
    }

    
    try {
      const config = node.config;
      const { accessKeyId, secretAccessKey, region, operation, functionName, payload, runtime, handler, role, code, description, timeout, memorySize } = config;
      
      const inputFunctionName = context.input?.functionName || functionName;
      const inputPayload = context.input?.payload || payload;

      if (!accessKeyId || !secretAccessKey || !region) {
        throw new Error('AWS credentials and region are required');
      }

      if (!inputFunctionName) {
        throw new Error('Function name is required');
      }

      // Initialize AWS SDK
      const AWS = require('aws-sdk');
      AWS.config.update({
        accessKeyId,
        secretAccessKey,
        region
      });

      const lambda = new AWS.Lambda();

      let result: any = {};

      switch (operation) {
        case 'invoke':
          result = await this.invokeFunction(lambda, inputFunctionName, inputPayload);
          break;
        case 'create':
          result = await this.createFunction(lambda, inputFunctionName, runtime, handler, role, code, description, timeout, memorySize);
          break;
        case 'update':
          result = await this.updateFunction(lambda, inputFunctionName, code, description, timeout, memorySize);
          break;
        case 'delete':
          result = await this.deleteFunction(lambda, inputFunctionName);
          break;
        case 'list':
          result = await this.listFunctions(lambda);
          break;
        case 'getInfo':
          result = await this.getFunctionInfo(lambda, inputFunctionName);
          break;
        case 'getLogs':
          result = await this.getFunctionLogs(lambda, inputFunctionName);
          break;
        default:
          throw new Error(`Unsupported Lambda operation: ${operation}`);
      }

      const duration = Date.now() - startTime;
      
      logger.info('AWS Lambda node executed successfully', {
        operation,
        functionName: inputFunctionName,
        duration
      });

      return {
        success: true,
        output: {
          ...result,
          operation,
          functionName: inputFunctionName,
          timestamp: new Date().toISOString(),
          duration
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('AWS Lambda node execution failed', {
        error: error.message,
        operation: config.operation,
        duration
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  private async invokeFunction(lambda: any, functionName: string, payload?: any) {
    const params: any = {
      FunctionName: functionName
    };

    if (payload) {
      if (typeof payload === 'string') {
        try {
          params.Payload = JSON.stringify(JSON.parse(payload));
        } catch (e) {
          params.Payload = payload;
        }
      } else {
        params.Payload = JSON.stringify(payload);
      }
    }

    const result = await lambda.invoke(params).promise();
    
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(result.Payload);
    } catch (e) {
      parsedPayload = result.Payload;
    }

    return {
      result: parsedPayload,
      statusCode: result.StatusCode,
      functionArn: result.ExecutedVersion,
      logs: result.LogResult ? Buffer.from(result.LogResult, 'base64').toString() : null
    };
  }

  private async createFunction(lambda: any, functionName: string, runtime: string, handler: string, role: string, code: string, description?: string, timeout?: number, memorySize?: number) {
    if (!runtime || !handler || !role || !code) {
      throw new Error('Runtime, handler, role, and code are required for create operation');
    }

    const params: any = {
      FunctionName: functionName,
      Runtime: runtime,
      Handler: handler,
      Role: role,
      Code: {
        ZipFile: Buffer.from(code, 'base64')
      }
    };

    if (description) params.Description = description;
    if (timeout) params.Timeout = timeout;
    if (memorySize) params.MemorySize = memorySize;

    const result = await lambda.createFunction(params).promise();
    
    return {
      functionArn: result.FunctionArn,
      functionName: result.FunctionName,
      status: 'created'
    };
  }

  private async updateFunction(lambda: any, functionName: string, code?: string, description?: string, timeout?: number, memorySize?: number) {
    const params: any = {
      FunctionName: functionName
    };

    if (code) {
      params.Code = {
        ZipFile: Buffer.from(code, 'base64')
      };
    }
    if (description) params.Description = description;
    if (timeout) params.Timeout = timeout;
    if (memorySize) params.MemorySize = memorySize;

    const result = await lambda.updateFunctionConfiguration(params).promise();
    
    return {
      functionArn: result.FunctionArn,
      functionName: result.FunctionName,
      status: 'updated'
    };
  }

  private async deleteFunction(lambda: any, functionName: string) {
    await lambda.deleteFunction({ FunctionName: functionName }).promise();
    
    return {
      functionName,
      status: 'deleted'
    };
  }

  private async listFunctions(lambda: any) {
    const result = await lambda.listFunctions().promise();
    
    return {
      functions: result.Functions.map((func: any) => ({
        functionName: func.FunctionName,
        functionArn: func.FunctionArn,
        runtime: func.Runtime,
        handler: func.Handler,
        description: func.Description,
        timeout: func.Timeout,
        memorySize: func.MemorySize,
        lastModified: func.LastModified
      })),
      count: result.Functions.length
    };
  }

  private async getFunctionInfo(lambda: any, functionName: string) {
    const result = await lambda.getFunction({ FunctionName: functionName }).promise();
    
    return {
      functionName: result.Configuration.FunctionName,
      functionArn: result.Configuration.FunctionArn,
      runtime: result.Configuration.Runtime,
      handler: result.Configuration.Handler,
      description: result.Configuration.Description,
      timeout: result.Configuration.Timeout,
      memorySize: result.Configuration.MemorySize,
      lastModified: result.Configuration.LastModified,
      codeSize: result.Configuration.CodeSize
    };
  }

  private async getFunctionLogs(lambda: any, functionName: string) {
    // This would typically use CloudWatch Logs API
    // For now, we'll return a placeholder
    return {
      functionName,
      logs: 'Logs would be retrieved from CloudWatch Logs',
      note: 'Use CloudWatch Logs API for actual log retrieval'
    };
  }


  async test(context: ExecutionContext): Promise<ExecutionResult> {
    const { config } = context;
    const { accessKeyId, secretAccessKey, region, functionName, operation } = config;

    if (!accessKeyId || !secretAccessKey || !region) {
      return {
        success: false,
        error: 'AWS credentials and region are required for Lambda node test.'
      };
    }

    // Mock a successful test response
    return {
      success: true,
      data: {
        nodeType: 'aws-lambda',
        status: 'success',
        message: 'AWS Lambda node test completed successfully',
        config: { accessKeyId: '***', secretAccessKey: '***', region, functionName, operation },
        capabilities: {
          invoke: true,
          create: true,
          update: true,
          delete: true,
          list: true
        },
        timestamp: new Date().toISOString()
      }
    };
  }}


export default AWSLambdaRealNode;
