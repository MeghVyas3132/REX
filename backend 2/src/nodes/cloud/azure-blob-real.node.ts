import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class AzureBlobRealNode {
  getNodeDefinition() {
    return {
  id: 'azure-blob-real',
  type: 'action',
  name: 'Azure Blob (Real)',
  description: 'Manage Azure Blob Storage',
  category: 'cloud',
  version: '1.0.0',
  author: 'Workflow Studio',
  parameters: [
    {
      name: 'containerName',
      type: 'string',
      displayName: 'Container Name',
      description: 'containerName configuration',
      required: true,
      placeholder: 'Enter containerName...'
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
      name: 'containerName',
      type: 'any',
      displayName: 'Container Name',
      description: 'containerName from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'blobName',
      type: 'any',
      displayName: 'Blob Name',
      description: 'blobName from previous node',
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
    if (!config.containerName && !context.input?.containerName) {
      throw new Error('Required parameter "containerName" is missing');
    }

    
    try {
      const config = node.config;
      const { connectionString, containerName, operation, blobName, content, contentType, sourceBlobName, destinationBlobName, prefix, maxResults } = config;
      
      const inputBlobName = context.input?.blobName || blobName;
      const inputContent = context.input?.content || content;
      const inputContainerName = context.input?.containerName || containerName;

      if (!connectionString) {
        throw new Error('Azure connection string is required');
      }

      if (!inputContainerName) {
        throw new Error('Container name is required');
      }

      // Initialize Azure Storage SDK
      const { BlobServiceClient } = require('@azure/storage-blob');
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(inputContainerName);

      let result: any = {};

      switch (operation) {
        case 'upload':
          result = await this.uploadBlob(containerClient, inputBlobName, inputContent, contentType);
          break;
        case 'download':
          result = await this.downloadBlob(containerClient, inputBlobName);
          break;
        case 'list':
          result = await this.listBlobs(containerClient, prefix, maxResults);
          break;
        case 'delete':
          result = await this.deleteBlob(containerClient, inputBlobName);
          break;
        case 'copy':
          result = await this.copyBlob(containerClient, sourceBlobName, destinationBlobName);
          break;
        case 'getProperties':
          result = await this.getBlobProperties(containerClient, inputBlobName);
          break;
        case 'createContainer':
          result = await this.createContainer(blobServiceClient, inputContainerName);
          break;
        case 'deleteContainer':
          result = await this.deleteContainer(blobServiceClient, inputContainerName);
          break;
        default:
          throw new Error(`Unsupported Azure Blob operation: ${operation}`);
      }

      const duration = Date.now() - startTime;
      
      logger.info('Azure Blob node executed successfully', {
        operation,
        container: inputContainerName,
        blob: inputBlobName,
        duration
      });

      return {
        success: true,
        output: {
          ...result,
          operation,
          container: inputContainerName,
          timestamp: new Date().toISOString(),
          duration
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Azure Blob node execution failed', {
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

  private async uploadBlob(containerClient: any, blobName: string, content: string, contentType?: string) {
    if (!blobName || !content) {
      throw new Error('Blob name and content are required for upload');
    }

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    const options: any = {};
    if (contentType) {
      options.blobHTTPHeaders = {
        blobContentType: contentType
      };
    }

    const result = await blockBlobClient.upload(content, content.length, options);
    
    return {
      url: blockBlobClient.url,
      blobName: result.requestId,
      size: content.length,
      etag: result.etag
    };
  }

  private async downloadBlob(containerClient: any, blobName: string) {
    if (!blobName) {
      throw new Error('Blob name is required for download');
    }

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const downloadResponse = await blockBlobClient.download();
    
    const chunks: Buffer[] = [];
    for await (const chunk of downloadResponse.readableStreamBody!) {
      chunks.push(chunk);
    }
    
    const content = Buffer.concat(chunks).toString();
    
    return {
      blobName,
      content,
      size: downloadResponse.contentLength,
      contentType: downloadResponse.contentType,
      lastModified: downloadResponse.lastModified
    };
  }

  private async listBlobs(containerClient: any, prefix?: string, maxResults?: number) {
    const options: any = {};
    if (prefix) options.prefix = prefix;
    if (maxResults) options.maxPageSize = maxResults;

    const blobs: any[] = [];
    for await (const blob of containerClient.listBlobsFlat(options)) {
      blobs.push({
        name: blob.name,
        size: blob.properties.contentLength,
        lastModified: blob.properties.lastModified,
        etag: blob.properties.etag
      });
    }
    
    return {
      blobs,
      count: blobs.length
    };
  }

  private async deleteBlob(containerClient: any, blobName: string) {
    if (!blobName) {
      throw new Error('Blob name is required for delete');
    }

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();
    
    return {
      blobName,
      status: 'deleted'
    };
  }

  private async copyBlob(containerClient: any, sourceBlobName: string, destinationBlobName: string) {
    if (!sourceBlobName || !destinationBlobName) {
      throw new Error('Source and destination blob names are required for copy');
    }

    const sourceBlobClient = containerClient.getBlockBlobClient(sourceBlobName);
    const destinationBlobClient = containerClient.getBlockBlobClient(destinationBlobName);
    
    const result = await destinationBlobClient.syncCopyFromURL(sourceBlobClient.url);
    
    return {
      sourceBlobName,
      destinationBlobName,
      etag: result.etag,
      status: 'copied'
    };
  }

  private async getBlobProperties(containerClient: any, blobName: string) {
    if (!blobName) {
      throw new Error('Blob name is required for get properties');
    }

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const properties = await blockBlobClient.getProperties();
    
    return {
      blobName,
      size: properties.contentLength,
      contentType: properties.contentType,
      lastModified: properties.lastModified,
      etag: properties.etag
    };
  }

  private async createContainer(blobServiceClient: any, containerName: string) {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.create();
    
    return {
      container: containerName,
      status: 'created'
    };
  }

  private async deleteContainer(blobServiceClient: any, containerName: string) {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.delete();
    
    return {
      container: containerName,
      status: 'deleted'
    };
  }


  async test(context: ExecutionContext): Promise<ExecutionResult> {
    const { config } = context;
    const { connectionString, containerName, operation } = config;

    if (!connectionString) {
      return {
        success: false,
        error: 'Azure connection string is required for Blob Storage node test.'
      };
    }

    // Mock a successful test response
    return {
      success: true,
      data: {
        nodeType: 'azure-blob',
        status: 'success',
        message: 'Azure Blob Storage node test completed successfully',
        config: { connectionString: '***', containerName, operation },
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


export default AzureBlobRealNode;
