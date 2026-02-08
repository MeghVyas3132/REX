import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;
import axios from 'axios';

export class OneDriveNode {
  getNodeDefinition() {
    return {
      id: 'onedrive',
      type: 'action',
      name: 'Microsoft OneDrive',
      description: 'Upload, download, and manage files in Microsoft OneDrive using Microsoft Graph API',
      category: 'integrations',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'operation',
          type: 'options',
          displayName: 'Operation',
          description: 'OneDrive operation to perform',
          required: true,
          default: 'list',
          options: [
            { name: 'List Files', value: 'list' },
            { name: 'Upload File', value: 'upload' },
            { name: 'Download File', value: 'download' },
            { name: 'Get File Info', value: 'getInfo' },
            { name: 'Delete File', value: 'delete' },
            { name: 'Create Folder', value: 'createFolder' },
            { name: 'Search Files', value: 'search' },
            { name: 'Copy File', value: 'copy' },
            { name: 'Move File', value: 'move' },
            { name: 'Share File', value: 'share' }
          ]
        },
        {
          name: 'accessToken',
          type: 'string',
          displayName: 'Access Token',
          description: 'Microsoft Graph API access token',
          required: true,
          placeholder: 'Bearer token',
          credentialType: 'onedrive_access_token'
        },
        {
          name: 'path',
          type: 'string',
          displayName: 'Path',
          description: 'File or folder path (e.g., /Documents/file.txt or /root:/Documents/file.txt for drive root)',
          required: false,
          placeholder: '/Documents/file.txt'
        },
        {
          name: 'fileId',
          type: 'string',
          displayName: 'File ID',
          description: 'OneDrive file ID (alternative to path)',
          required: false,
          placeholder: '01BYE5RZ6QN3ZWBTUFOFD3GSPGOHDJD36'
        },
        {
          name: 'fileName',
          type: 'string',
          displayName: 'File Name',
          description: 'File name for upload operation',
          required: false,
          placeholder: 'document.pdf'
        },
        {
          name: 'fileContent',
          type: 'string',
          displayName: 'File Content',
          description: 'File content (base64 string for binary files)',
          required: false,
          placeholder: 'Base64 encoded content or text'
        },
        {
          name: 'folderId',
          type: 'string',
          displayName: 'Folder ID',
          description: 'Folder ID for upload/list operations',
          required: false,
          placeholder: '01BYE5RZ6QN3ZWBTUFOFD3GSPGOHDJD36'
        },
        {
          name: 'folderName',
          type: 'string',
          displayName: 'Folder Name',
          description: 'Folder name for create folder operation',
          required: false,
          placeholder: 'NewFolder'
        },
        {
          name: 'query',
          type: 'string',
          displayName: 'Search Query',
          description: 'Search query for search operation',
          required: false,
          placeholder: 'filename:document.pdf'
        },
        {
          name: 'destinationPath',
          type: 'string',
          displayName: 'Destination Path',
          description: 'Destination path for copy/move operations',
          required: false,
          placeholder: '/Documents/newfile.txt'
        },
        {
          name: 'shareEmail',
          type: 'string',
          displayName: 'Share Email',
          description: 'Email address to share file with',
          required: false,
          placeholder: 'user@example.com'
        },
        {
          name: 'permission',
          type: 'options',
          displayName: 'Permission',
          description: 'Permission level for sharing',
          required: false,
          default: 'read',
          options: [
            { name: 'Read', value: 'read' },
            { name: 'Write', value: 'write' },
            { name: 'Owner', value: 'owner' }
          ]
        },
        {
          name: 'overwrite',
          type: 'boolean',
          displayName: 'Overwrite',
          description: 'Overwrite existing file on upload',
          required: false,
          default: false
        },
        {
          name: 'pageSize',
          type: 'number',
          displayName: 'Page Size',
          description: 'Number of items per page',
          required: false,
          default: 20,
          min: 1,
          max: 200
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'operation',
          type: 'string',
          displayName: 'Dynamic Operation',
          description: 'OneDrive operation from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'path',
          type: 'string',
          displayName: 'Dynamic Path',
          description: 'File path from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'fileId',
          type: 'string',
          displayName: 'Dynamic File ID',
          description: 'File ID from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'fileName',
          type: 'string',
          displayName: 'Dynamic File Name',
          description: 'File name from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'fileContent',
          type: 'string',
          displayName: 'Dynamic File Content',
          description: 'File content from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'folderId',
          type: 'string',
          displayName: 'Dynamic Folder ID',
          description: 'Folder ID from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'fileId',
          type: 'string',
          displayName: 'File ID',
          description: 'OneDrive file ID',
          dataType: 'text'
        },
        {
          name: 'fileName',
          type: 'string',
          displayName: 'File Name',
          description: 'File name',
          dataType: 'text'
        },
        {
          name: 'fileContent',
          type: 'string',
          displayName: 'File Content',
          description: 'Downloaded file content',
          dataType: 'text'
        },
        {
          name: 'fileInfo',
          type: 'object',
          displayName: 'File Info',
          description: 'File information object',
          dataType: 'object'
        },
        {
          name: 'files',
          type: 'array',
          displayName: 'Files List',
          description: 'List of files/folders',
          dataType: 'array'
        },
        {
          name: 'count',
          type: 'number',
          displayName: 'Count',
          description: 'Number of items',
          dataType: 'number'
        },
        {
          name: 'shareLink',
          type: 'string',
          displayName: 'Share Link',
          description: 'Share link URL',
          dataType: 'text'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string' },
          accessToken: { type: 'string' },
          path: { type: 'string' },
          fileId: { type: 'string' },
          fileName: { type: 'string' },
          fileContent: { type: 'string' },
          folderId: { type: 'string' },
          folderName: { type: 'string' },
          query: { type: 'string' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string' },
          path: { type: 'string' },
          fileId: { type: 'string' },
          fileName: { type: 'string' },
          fileContent: { type: 'string' },
          folderId: { type: 'string' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          fileId: { type: 'string' },
          fileName: { type: 'string' },
          fileContent: { type: 'string' },
          fileInfo: { type: 'object' },
          files: { type: 'array' },
          count: { type: 'number' },
          shareLink: { type: 'string' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    
    // Validation for required parameters
    if (!config.operation && !context.input?.operation) {
      throw new Error('Required parameter "operation" is missing');
    }
    

    const startTime = Date.now();
    
    try {
      const operation = context.input?.operation || config.operation || 'list';
      const accessToken = config.accessToken;
      
      if (!accessToken) {
        throw new Error('Microsoft Graph API access token is required');
      }

      // Get dynamic inputs
      const path = context.input?.path || config.path;
      const fileId = context.input?.fileId || config.fileId;
      const fileName = context.input?.fileName || config.fileName;
      const fileContent = context.input?.fileContent || config.fileContent;
      const folderId = context.input?.folderId || config.folderId;
      const folderName = config.folderName;
      const query = config.query;
      const destinationPath = config.destinationPath;
      const shareEmail = config.shareEmail;
      const permission = config.permission || 'read';
      const overwrite = config.overwrite === true;
      const pageSize = config.pageSize || 20;

      logger.info('OneDrive operation executed', {
        nodeId: node.id,
        operation,
        runId: context.runId
      });

      const baseUrl = 'https://graph.microsoft.com/v1.0';
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      };

      let result: any;

      switch (operation) {
        case 'list':
          result = await this.listFiles(baseUrl, headers, folderId || path || 'me/drive/root', pageSize);
          break;

        case 'upload':
          if (!fileName && !fileId) {
            throw new Error('File name or file ID is required for upload');
          }
          if (!fileContent && !context.input?.fileContent) {
            throw new Error('File content is required for upload');
          }
          const uploadPath = path || (folderId ? `me/drive/items/${folderId}` : 'me/drive/root');
          result = await this.uploadFile(baseUrl, headers, uploadPath, fileName, fileContent, overwrite);
          break;

        case 'download':
          if (!fileId && !path) {
            throw new Error('File ID or path is required for download');
          }
          result = await this.downloadFile(baseUrl, headers, fileId, path);
          break;

        case 'getInfo':
          if (!fileId && !path) {
            throw new Error('File ID or path is required for getInfo');
          }
          result = await this.getFileInfo(baseUrl, headers, fileId, path);
          break;

        case 'delete':
          if (!fileId && !path) {
            throw new Error('File ID or path is required for delete');
          }
          result = await this.deleteFile(baseUrl, headers, fileId, path);
          break;

        case 'createFolder':
          if (!folderName) {
            throw new Error('Folder name is required for createFolder');
          }
          const parentPath = path || folderId || 'me/drive/root';
          result = await this.createFolder(baseUrl, headers, parentPath, folderName);
          break;

        case 'search':
          if (!query) {
            throw new Error('Search query is required for search');
          }
          result = await this.searchFiles(baseUrl, headers, query, pageSize);
          break;

        case 'copy':
          if (!fileId && !path) {
            throw new Error('File ID or path is required for copy');
          }
          if (!destinationPath) {
            throw new Error('Destination path is required for copy');
          }
          result = await this.copyFile(baseUrl, headers, fileId, path, destinationPath);
          break;

        case 'move':
          if (!fileId && !path) {
            throw new Error('File ID or path is required for move');
          }
          if (!destinationPath) {
            throw new Error('Destination path is required for move');
          }
          result = await this.moveFile(baseUrl, headers, fileId, path, destinationPath);
          break;

        case 'share':
          if (!fileId && !path) {
            throw new Error('File ID or path is required for share');
          }
          if (!shareEmail) {
            throw new Error('Share email is required for share');
          }
          result = await this.shareFile(baseUrl, headers, fileId, path, shareEmail, permission);
          break;

        default:
          throw new Error(`Unsupported OneDrive operation: ${operation}`);
      }

      return {
        success: true,
        output: {
          ...result,
          operation,
          timestamp: new Date().toISOString()
        },
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('OneDrive operation failed', error, {
        nodeId: node.id,
        operation: config.operation,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  private async listFiles(baseUrl: string, headers: any, path: string, pageSize: number) {
    const endpoint = path.includes(':') 
      ? `${baseUrl}/${path}/children`
      : `${baseUrl}/${path.replace(/^\//, '')}/children`;
    
    const response = await axios.get(endpoint, {
      headers,
      params: {
        '$top': pageSize
      }
    });

    return {
      files: response.data.value || [],
      count: (response.data.value || []).length,
      nextLink: response.data['@odata.nextLink']
    };
  }

  private async uploadFile(baseUrl: string, headers: any, path: string, fileName: string, fileContent: string, overwrite: boolean) {
    // Determine if path is a folder ID or path
    const uploadPath = path.startsWith('me/drive/items/')
      ? `${baseUrl}/${path}:/${fileName}:/content`
      : path.includes(':')
        ? `${baseUrl}/${path}/${fileName}:/content`
        : `${baseUrl}/me/drive/root:/${path}/${fileName}:/content`;

    // If overwrite is false, use createUploadSession for conflict handling
    const contentHeaders = {
      ...headers,
      'Content-Type': 'application/octet-stream'
    };

    // Remove JSON Content-Type for binary upload
    delete contentHeaders['Content-Type'];

    // Decode base64 if needed
    let binaryContent: Buffer;
    try {
      binaryContent = Buffer.from(fileContent, 'base64');
    } catch {
      binaryContent = Buffer.from(fileContent, 'utf8');
    }

    const response = await axios.put(uploadPath, binaryContent, {
      headers: contentHeaders
    });

    return {
      fileId: response.data.id,
      fileName: response.data.name,
      fileInfo: response.data,
      webUrl: response.data.webUrl
    };
  }

  private async downloadFile(baseUrl: string, headers: any, fileId?: string, path?: string) {
    const endpoint = fileId
      ? `${baseUrl}/me/drive/items/${fileId}/content`
      : path?.includes(':')
        ? `${baseUrl}/${path}/content`
        : `${baseUrl}/me/drive/root:/${path?.replace(/^\//, '')}/content`;

    const response = await axios.get(endpoint, {
      headers,
      responseType: 'arraybuffer'
    });

    const base64Content = Buffer.from(response.data).toString('base64');

    return {
      fileContent: base64Content,
      contentType: response.headers['content-type'] || 'application/octet-stream'
    };
  }

  private async getFileInfo(baseUrl: string, headers: any, fileId?: string, path?: string) {
    const endpoint = fileId
      ? `${baseUrl}/me/drive/items/${fileId}`
      : path?.includes(':')
        ? `${baseUrl}/${path}`
        : `${baseUrl}/me/drive/root:/${path?.replace(/^\//, '')}`;

    const response = await axios.get(endpoint, { headers });

    return {
      fileId: response.data.id,
      fileName: response.data.name,
      fileInfo: response.data,
      webUrl: response.data.webUrl
    };
  }

  private async deleteFile(baseUrl: string, headers: any, fileId?: string, path?: string) {
    const endpoint = fileId
      ? `${baseUrl}/me/drive/items/${fileId}`
      : path?.includes(':')
        ? `${baseUrl}/${path}`
        : `${baseUrl}/me/drive/root:/${path?.replace(/^\//, '')}`;

    await axios.delete(endpoint, { headers });

    return { success: true };
  }

  private async createFolder(baseUrl: string, headers: any, parentPath: string, folderName: string) {
    const endpoint = parentPath.includes(':')
      ? `${baseUrl}/${parentPath}/children`
      : `${baseUrl}/${parentPath.replace(/^\//, '')}/children`;

    const response = await axios.post(endpoint, {
      name: folderName,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename'
    }, { headers });

    return {
      folderId: response.data.id,
      folderName: response.data.name,
      folderInfo: response.data
    };
  }

  private async searchFiles(baseUrl: string, headers: any, query: string, pageSize: number) {
    const endpoint = `${baseUrl}/me/drive/root/search(q='${encodeURIComponent(query)}')`;

    const response = await axios.get(endpoint, {
      headers,
      params: {
        '$top': pageSize
      }
    });

    return {
      files: response.data.value || [],
      count: (response.data.value || []).length
    };
  }

  private async copyFile(baseUrl: string, headers: any, fileId?: string, path?: string, destinationPath?: string) {
    const endpoint = fileId
      ? `${baseUrl}/me/drive/items/${fileId}/copy`
      : path?.includes(':')
        ? `${baseUrl}/${path}/copy`
        : `${baseUrl}/me/drive/root:/${path?.replace(/^\//, '')}/copy`;

    const parentReference: any = {};
    if (destinationPath?.includes(':')) {
      const parts = destinationPath.split(':');
      parentReference.path = parts[0];
      parentReference.name = parts.slice(1).join(':');
    } else {
      parentReference.path = `/drive/root:${destinationPath?.replace(/^\//, '')}`;
    }

    await axios.post(endpoint, {
      parentReference
    }, { headers });

    return { success: true };
  }

  private async moveFile(baseUrl: string, headers: any, fileId?: string, path?: string, destinationPath?: string) {
    const endpoint = fileId
      ? `${baseUrl}/me/drive/items/${fileId}`
      : path?.includes(':')
        ? `${baseUrl}/${path}`
        : `${baseUrl}/me/drive/root:/${path?.replace(/^\//, '')}`;

    const parentReference: any = {};
    if (destinationPath?.includes(':')) {
      const parts = destinationPath.split(':');
      parentReference.path = parts[0];
      parentReference.name = parts.slice(1).join(':');
    } else {
      parentReference.path = `/drive/root:${destinationPath?.replace(/^\//, '')}`;
    }

    const response = await axios.patch(endpoint, {
      parentReference
    }, { headers });

    return {
      fileId: response.data.id,
      fileName: response.data.name,
      fileInfo: response.data
    };
  }

  private async shareFile(baseUrl: string, headers: any, fileId?: string, path?: string, shareEmail?: string, permission?: string) {
    const endpoint = fileId
      ? `${baseUrl}/me/drive/items/${fileId}/invite`
      : path?.includes(':')
        ? `${baseUrl}/${path}/invite`
        : `${baseUrl}/me/drive/root:/${path?.replace(/^\//, '')}/invite`;

    const permissionMap: Record<string, string> = {
      'read': 'read',
      'write': 'write',
      'owner': 'owner'
    };

    const response = await axios.post(endpoint, {
      recipients: [{ email: shareEmail }],
      roles: [permissionMap[permission || 'read']],
      requireSignIn: true,
      sendInvitation: false
    }, { headers });

    return {
      shareLink: response.data.shareLink?.webUrl || response.data.link?.webUrl,
      permissions: response.data.value || []
    };
  }

}
export default OneDriveNode;

