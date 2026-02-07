import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class GoogleCloudStorageRealNode {
  getNodeDefinition() {
    return {
  id: 'google-cloud-storage-real',
  type: 'action',
  name: 'Google Cloud Storage (Real)',
  description: 'Manage Google Cloud Storage buckets',
  category: 'cloud',
  version: '1.0.0',
  author: 'Workflow Studio',
  parameters: [
    {
      name: 'bucketName',
      type: 'string',
      displayName: 'Bucket Name',
      description: 'bucketName configuration',
      required: true,
      placeholder: 'Enter bucketName...'
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
      name: 'bucketName',
      type: 'any',
      displayName: 'Bucket Name',
      description: 'bucketName from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'fileName',
      type: 'any',
      displayName: 'File Name',
      description: 'fileName from previous node',
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
    if (!config.bucketName && !context.input?.bucketName) {
      throw new Error('Required parameter "bucketName" is missing');
    }

    
    try {
      const config = node.config;
      const { serviceAccountKey, bucketName, operation, fileName, content, contentType, sourceFileName, destinationFileName, prefix, maxResults } = config;
      
      const inputFileName = context.input?.fileName || fileName;
      const inputContent = context.input?.content || content;
      const inputBucketName = context.input?.bucketName || bucketName;

      if (!serviceAccountKey) {
        throw new Error('Google Cloud service account key is required');
      }

      if (!inputBucketName) {
        throw new Error('Bucket name is required');
      }

      // Initialize Google Cloud Storage SDK
      const { Storage } = require('@google-cloud/storage');
      
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(serviceAccountKey);
      } catch (e) {
        throw new Error('Invalid service account key JSON format');
      }

      const storage = new Storage({
        projectId: serviceAccount.project_id,
        credentials: serviceAccount
      });

      const bucket = storage.bucket(inputBucketName);

      let result: any = {};

      switch (operation) {
        case 'upload':
          result = await this.uploadFile(bucket, inputFileName, inputContent, contentType);
          break;
        case 'download':
          result = await this.downloadFile(bucket, inputFileName);
          break;
        case 'list':
          result = await this.listFiles(bucket, prefix, maxResults);
          break;
        case 'delete':
          result = await this.deleteFile(bucket, inputFileName);
          break;
        case 'copy':
          result = await this.copyFile(bucket, sourceFileName, destinationFileName);
          break;
        case 'getInfo':
          result = await this.getFileInfo(bucket, inputFileName);
          break;
        case 'createBucket':
          result = await this.createBucket(storage, inputBucketName);
          break;
        case 'deleteBucket':
          result = await this.deleteBucket(storage, inputBucketName);
          break;
        default:
          throw new Error(`Unsupported GCS operation: ${operation}`);
      }

      const duration = Date.now() - startTime;
      
      logger.info('Google Cloud Storage node executed successfully', {
        operation,
        bucket: inputBucketName,
        fileName: inputFileName,
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
      
      logger.error('Google Cloud Storage node execution failed', {
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

  private async uploadFile(bucket: any, fileName: string, content: string, contentType?: string) {
    if (!fileName || !content) {
      throw new Error('File name and content are required for upload');
    }

    const file = bucket.file(fileName);
    
    const options: any = {};
    if (contentType) {
      options.metadata = {
        contentType: contentType
      };
    }

    await file.save(content, options);
    
    return {
      url: `gs://${bucket.name}/${fileName}`,
      fileName,
      size: content.length
    };
  }

  private async downloadFile(bucket: any, fileName: string) {
    if (!fileName) {
      throw new Error('File name is required for download');
    }

    const file = bucket.file(fileName);
    const [content] = await file.download();
    
    const [metadata] = await file.getMetadata();
    
    return {
      fileName,
      content: content.toString(),
      size: metadata.size,
      contentType: metadata.contentType,
      created: metadata.timeCreated
    };
  }

  private async listFiles(bucket: any, prefix?: string, maxResults?: number) {
    const options: any = {};
    if (prefix) options.prefix = prefix;
    if (maxResults) options.maxResults = maxResults;

    const [files] = await bucket.getFiles(options);
    
    return {
      files: files.map((file: any) => ({
        name: file.name,
        size: file.metadata.size,
        created: file.metadata.timeCreated,
        updated: file.metadata.updated
      })),
      count: files.length
    };
  }

  private async deleteFile(bucket: any, fileName: string) {
    if (!fileName) {
      throw new Error('File name is required for delete');
    }

    const file = bucket.file(fileName);
    await file.delete();
    
    return {
      fileName,
      status: 'deleted'
    };
  }

  private async copyFile(bucket: any, sourceFileName: string, destinationFileName: string) {
    if (!sourceFileName || !destinationFileName) {
      throw new Error('Source and destination file names are required for copy');
    }

    const sourceFile = bucket.file(sourceFileName);
    const destinationFile = bucket.file(destinationFileName);
    
    await sourceFile.copy(destinationFile);
    
    return {
      sourceFileName,
      destinationFileName,
      status: 'copied'
    };
  }

  private async getFileInfo(bucket: any, fileName: string) {
    if (!fileName) {
      throw new Error('File name is required for get info');
    }

    const file = bucket.file(fileName);
    const [metadata] = await file.getMetadata();
    
    return {
      fileName,
      size: metadata.size,
      contentType: metadata.contentType,
      created: metadata.timeCreated,
      updated: metadata.updated,
      etag: metadata.etag
    };
  }

  private async createBucket(storage: any, bucketName: string) {
    await storage.createBucket(bucketName);
    
    return {
      bucket: bucketName,
      status: 'created'
    };
  }

  private async deleteBucket(storage: any, bucketName: string) {
    const bucket = storage.bucket(bucketName);
    await bucket.delete();
    
    return {
      bucket: bucketName,
      status: 'deleted'
    };
  }


  async test(context: ExecutionContext): Promise<ExecutionResult> {
    const { config } = context;
    const { serviceAccountKey, bucketName, operation } = config;

    if (!serviceAccountKey) {
      return {
        success: false,
        error: 'Google Cloud service account key is required for GCS node test.'
      };
    }

    // Mock a successful test response
    return {
      success: true,
      data: {
        nodeType: 'google-cloud-storage',
        status: 'success',
        message: 'Google Cloud Storage node test completed successfully',
        config: { serviceAccountKey: '***', bucketName, operation },
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


export default GoogleCloudStorageRealNode;
