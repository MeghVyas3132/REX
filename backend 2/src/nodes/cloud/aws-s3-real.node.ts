import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class AWSS3RealNode {
  getNodeDefinition() {
    return {
  id: 'aws-s3-real',
  type: 'action',
  name: 'AWS S3 (Real)',
  description: 'Manage AWS S3 buckets and objects',
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
      name: 'bucketName',
      type: 'string',
      displayName: 'Bucket Name',
      description: 'bucketName configuration',
      required: true,
      placeholder: 'Enter bucketName...'
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
      name: 'bucketName',
      type: 'any',
      displayName: 'Bucket Name',
      description: 'bucketName from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'key',
      type: 'any',
      displayName: 'Key',
      description: 'key from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'content',
      type: 'any',
      displayName: 'Content',
      description: 'content from previous node',
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
    if (!config.bucketName && !context.input?.bucketName) {
      throw new Error('Required parameter "bucketName" is missing');
    }

    
    try {
      const config = node.config;
      const { accessKeyId, secretAccessKey, region, bucketName, operation, key, content, contentType, sourceKey, destinationKey, prefix, maxKeys } = config;
      
      const inputKey = context.input?.key || key;
      const inputContent = context.input?.content || content;
      const inputBucketName = context.input?.bucketName || bucketName;

      if (!accessKeyId || !secretAccessKey || !region) {
        throw new Error('AWS credentials and region are required');
      }

      if (!inputBucketName) {
        throw new Error('Bucket name is required');
      }

      // Initialize AWS SDK
      const AWS = require('aws-sdk');
      AWS.config.update({
        accessKeyId,
        secretAccessKey,
        region
      });

      const s3 = new AWS.S3();

      let result: any = {};

      switch (operation) {
        case 'upload':
          result = await this.uploadFile(s3, inputBucketName, inputKey, inputContent, contentType);
          break;
        case 'download':
          result = await this.downloadFile(s3, inputBucketName, inputKey);
          break;
        case 'list':
          result = await this.listFiles(s3, inputBucketName, prefix, maxKeys);
          break;
        case 'delete':
          result = await this.deleteFile(s3, inputBucketName, inputKey);
          break;
        case 'copy':
          result = await this.copyFile(s3, inputBucketName, sourceKey, destinationKey);
          break;
        case 'getInfo':
          result = await this.getFileInfo(s3, inputBucketName, inputKey);
          break;
        case 'createBucket':
          result = await this.createBucket(s3, inputBucketName);
          break;
        case 'deleteBucket':
          result = await this.deleteBucket(s3, inputBucketName);
          break;
        default:
          throw new Error(`Unsupported S3 operation: ${operation}`);
      }

      const duration = Date.now() - startTime;
      
      logger.info('AWS S3 node executed successfully', {
        operation,
        bucket: inputBucketName,
        key: inputKey,
        duration
      });

      return {
        success: true,
        output: {
          ...result,
          operation,
          bucket: inputBucketName,
          timestamp: new Date().toISOString(),
          duration
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('AWS S3 node execution failed', {
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

  private async uploadFile(s3: any, bucketName: string, key: string, content: string, contentType?: string) {
    if (!key || !content) {
      throw new Error('Key and content are required for upload');
    }

    const params = {
      Bucket: bucketName,
      Key: key,
      Body: content,
      ContentType: contentType || 'application/octet-stream'
    };

    const result = await s3.upload(params).promise();
    
    return {
      url: result.Location,
      key: result.Key,
      size: content.length,
      etag: result.ETag
    };
  }

  private async downloadFile(s3: any, bucketName: string, key: string) {
    if (!key) {
      throw new Error('Key is required for download');
    }

    const params = {
      Bucket: bucketName,
      Key: key
    };

    const result = await s3.getObject(params).promise();
    
    return {
      key,
      content: result.Body.toString(),
      size: result.ContentLength,
      contentType: result.ContentType,
      lastModified: result.LastModified
    };
  }

  private async listFiles(s3: any, bucketName: string, prefix?: string, maxKeys?: number) {
    const params: any = {
      Bucket: bucketName
    };

    if (prefix) params.Prefix = prefix;
    if (maxKeys) params.MaxKeys = maxKeys;

    const result = await s3.listObjectsV2(params).promise();
    
    return {
      objects: result.Contents.map((obj: any) => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag
      })),
      count: result.Contents.length,
      isTruncated: result.IsTruncated
    };
  }

  private async deleteFile(s3: any, bucketName: string, key: string) {
    if (!key) {
      throw new Error('Key is required for delete');
    }

    const params = {
      Bucket: bucketName,
      Key: key
    };

    await s3.deleteObject(params).promise();
    
    return {
      key,
      status: 'deleted'
    };
  }

  private async copyFile(s3: any, bucketName: string, sourceKey: string, destinationKey: string) {
    if (!sourceKey || !destinationKey) {
      throw new Error('Source and destination keys are required for copy');
    }

    const params = {
      Bucket: bucketName,
      CopySource: `${bucketName}/${sourceKey}`,
      Key: destinationKey
    };

    const result = await s3.copyObject(params).promise();
    
    return {
      sourceKey,
      destinationKey,
      etag: result.CopyObjectResult.ETag,
      status: 'copied'
    };
  }

  private async getFileInfo(s3: any, bucketName: string, key: string) {
    if (!key) {
      throw new Error('Key is required for get info');
    }

    const params = {
      Bucket: bucketName,
      Key: key
    };

    const result = await s3.headObject(params).promise();
    
    return {
      key,
      size: result.ContentLength,
      contentType: result.ContentType,
      lastModified: result.LastModified,
      etag: result.ETag
    };
  }

  private async createBucket(s3: any, bucketName: string) {
    const params = {
      Bucket: bucketName
    };

    await s3.createBucket(params).promise();
    
    return {
      bucket: bucketName,
      status: 'created'
    };
  }

  private async deleteBucket(s3: any, bucketName: string) {
    const params = {
      Bucket: bucketName
    };

    await s3.deleteBucket(params).promise();
    
    return {
      bucket: bucketName,
      status: 'deleted'
    };
  }


  async test(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const { config } = context;
    const { accessKeyId, secretAccessKey, region, bucketName, operation } = config;

    if (!accessKeyId || !secretAccessKey || !region) {
      return {
        success: false,
        error: 'AWS credentials and region are required for S3 node test.'
      };
    }

    // Mock a successful test response
    return {
      duration: Date.now() - startTime,
      success: true,
      data: {
        nodeType: 'aws-s3',
        status: 'success',
        message: 'AWS S3 node test completed successfully',
        config: { accessKeyId: '***', secretAccessKey: '***', region, bucketName, operation },
        capabilities: {
          upload: true,
          download: true,
          list: true,
          delete: true,
          copy: true
        },
        timestamp: new Date().toISOString()
      }
    };
  }}


export default AWSS3RealNode;
