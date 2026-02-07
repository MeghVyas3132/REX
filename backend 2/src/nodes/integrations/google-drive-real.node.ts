import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class GoogleDriveRealNode {
  getNodeDefinition() {
    return {
      id: 'google-drive-real',
      type: 'action',
      name: 'Google Drive',
      description: 'Upload, download, and manage files in Google Drive',
      category: 'integrations',
      version: '1.0.0',
      author: 'Workflow Studio',
      
      parameters: [
        {
          name: 'accessToken',
          type: 'string',
          displayName: 'Access Token',
          description: 'Google OAuth Access Token',
          required: true,
          placeholder: 'ya29.xxx...',
          credentialType: 'google_access_token'
        },
        {
          name: 'operation',
          type: 'options',
          displayName: 'Operation',
          description: 'Google Drive operation to perform',
          required: true,
          default: 'upload',
          options: [
            { name: 'Upload File', value: 'upload' },
            { name: 'Download File', value: 'download' },
            { name: 'List Files', value: 'list' },
            { name: 'Search Files', value: 'search' },
            { name: 'Create Folder', value: 'createFolder' },
            { name: 'Delete File', value: 'delete' },
            { name: 'Get File Info', value: 'getInfo' },
            { name: 'Share File', value: 'share' }
          ]
        },
        {
          name: 'fileName',
          type: 'string',
          displayName: 'File Name',
          description: 'Name of the file',
          required: false,
          placeholder: 'document.pdf'
        },
        {
          name: 'fileContent',
          type: 'string',
          displayName: 'File Content',
          description: 'File content (base64 encoded or text)',
          required: false,
          placeholder: 'Base64 encoded content'
        },
        {
          name: 'fileUrl',
          type: 'string',
          displayName: 'File URL',
          description: 'URL of file to upload',
          required: false,
          placeholder: 'https://example.com/file.pdf'
        },
        {
          name: 'fileId',
          type: 'string',
          displayName: 'File ID',
          description: 'Google Drive File ID',
          required: false,
          placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
        },
        {
          name: 'folderId',
          type: 'string',
          displayName: 'Folder ID',
          description: 'Google Drive Folder ID',
          required: false,
          placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
        },
        {
          name: 'folderName',
          type: 'string',
          displayName: 'Folder Name',
          description: 'Name of folder to create',
          required: false,
          placeholder: 'New Folder'
        },
        {
          name: 'query',
          type: 'string',
          displayName: 'Search Query',
          description: 'Search query for files',
          required: false,
          placeholder: 'name contains "report"'
        },
        {
          name: 'mimeType',
          type: 'string',
          displayName: 'MIME Type',
          description: 'File MIME type',
          required: false,
          placeholder: 'application/pdf'
        },
        {
          name: 'shareEmail',
          type: 'string',
          displayName: 'Share Email',
          description: 'Email to share file with',
          required: false,
          placeholder: 'user@example.com'
        },
        {
          name: 'permission',
          type: 'options',
          displayName: 'Permission',
          description: 'Permission level for sharing',
          required: false,
          default: 'reader',
          options: [
            { name: 'Reader', value: 'reader' },
            { name: 'Writer', value: 'writer' },
            { name: 'Commenter', value: 'commenter' }
          ]
        }
      ],

      inputs: [
        {
          name: 'fileData',
          type: 'object',
          description: 'File data from previous node',
          required: false
        },
        {
          name: 'fileName',
          type: 'string',
          description: 'File name from previous node',
          required: false
        },
        {
          name: 'folderId',
          type: 'string',
          description: 'Folder ID from previous node',
          required: false
        }
      ],

      outputs: [
        {
          name: 'fileId',
          type: 'string',
          description: 'Google Drive File ID'
        },
        {
          name: 'fileUrl',
          type: 'string',
          description: 'Google Drive File URL'
        },
        {
          name: 'fileName',
          type: 'string',
          description: 'File name'
        },
        {
          name: 'fileSize',
          type: 'number',
          description: 'File size in bytes'
        },
        {
          name: 'files',
          type: 'array',
          description: 'List of files (for list/search operations)'
        }
      ]
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = node.data?.config || {};
    
    // Validation for required parameters
    if (!config.accessToken && !context.input?.accessToken) {
      throw new Error('Required parameter "accessToken" is missing');
    }
    if (!config.operation && !context.input?.operation) {
      throw new Error('Required parameter "operation" is missing');
    }

    
    try {

      const { accessToken, operation, fileName, fileContent, fileUrl, fileId, folderId, folderName, query, mimeType, shareEmail, permission } = config;
      const inputFileData = context.input?.fileData;
      const inputFileName = context.input?.fileName || fileName;
      const inputFolderId = context.input?.folderId || folderId;

      if (!accessToken) {
        throw new Error('Google Access Token is required');
      }

      let result: any = {};

      switch (operation) {
        case 'upload':
          result = await this.uploadFile(accessToken, inputFileName, fileContent || inputFileData?.content, fileUrl, inputFolderId, mimeType);
          break;
        case 'download':
          result = await this.downloadFile(accessToken, fileId);
          break;
        case 'list':
          result = await this.listFiles(accessToken, inputFolderId);
          break;
        case 'search':
          result = await this.searchFiles(accessToken, query);
          break;
        case 'createFolder':
          result = await this.createFolder(accessToken, folderName, inputFolderId);
          break;
        case 'delete':
          result = await this.deleteFile(accessToken, fileId);
          break;
        case 'getInfo':
          result = await this.getFileInfo(accessToken, fileId);
          break;
        case 'share':
          result = await this.shareFile(accessToken, fileId, shareEmail, permission);
          break;
        default:
          throw new Error(`Unsupported Google Drive operation: ${operation}`);
      }

      const duration = Date.now() - startTime;
      
      logger.info('Google Drive node executed successfully', {
        operation,
        fileName: inputFileName,
        duration
      });

      return {
        success: true,
        output: {
          ...result,
          operation,
          timestamp: new Date().toISOString(),
          duration
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Google Drive node execution failed', {
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

  private async uploadFile(accessToken: string, fileName: string, fileContent?: string, fileUrl?: string, folderId?: string, mimeType?: string) {
    let fileData: string;
    
    if (fileUrl) {
      // Download file from URL
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file from URL: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      fileData = Buffer.from(buffer).toString('base64');
    } else if (fileContent) {
      fileData = fileContent;
    } else {
      throw new Error('File content or URL is required for upload');
    }

    // Create file metadata
    const metadata: any = {
      name: fileName
    };

    if (folderId) {
      metadata.parents = [folderId];
    }

    if (mimeType) {
      metadata.mimeType = mimeType;
    }

    // Upload file
    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    
    const boundary = '----formdata-boundary-' + Math.random().toString(36);
    const formData = [
      '--' + boundary,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      '--' + boundary,
      'Content-Type: ' + (mimeType || 'application/octet-stream'),
      '',
      fileData,
      '--' + boundary + '--'
    ].join('\r\n');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Drive API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    
    return {
      fileId: result.id,
      fileName: result.name,
      fileUrl: `https://drive.google.com/file/d/${result.id}/view`,
      fileSize: result.size ? parseInt(result.size) : 0
    };
  }

  private async downloadFile(accessToken: string, fileId: string) {
    if (!fileId) {
      throw new Error('File ID is required for download');
    }

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Drive API error: ${response.status} ${error}`);
    }

    const fileData = await response.arrayBuffer();
    const base64Content = Buffer.from(fileData).toString('base64');
    
    return {
      fileId,
      content: base64Content,
      size: fileData.byteLength
    };
  }

  private async listFiles(accessToken: string, folderId?: string) {
    let url = 'https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,size,createdTime,modifiedTime)';
    
    if (folderId) {
      url += `&q='${folderId}' in parents`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Drive API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    
    return {
      files: result.files.map((file: any) => ({
        fileId: file.id,
        fileName: file.name,
        mimeType: file.mimeType,
        fileSize: file.size ? parseInt(file.size) : 0,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime
      }))
    };
  }

  private async searchFiles(accessToken: string, query: string) {
    if (!query) {
      throw new Error('Search query is required');
    }

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime)`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Drive API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    
    return {
      files: result.files.map((file: any) => ({
        fileId: file.id,
        fileName: file.name,
        mimeType: file.mimeType,
        fileSize: file.size ? parseInt(file.size) : 0,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime
      }))
    };
  }

  private async createFolder(accessToken: string, folderName: string, parentFolderId?: string) {
    if (!folderName) {
      throw new Error('Folder name is required');
    }

    const url = 'https://www.googleapis.com/drive/v3/files';
    
    const metadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };

    if (parentFolderId) {
      metadata.parents = [parentFolderId];
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Drive API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    
    return {
      fileId: result.id,
      fileName: result.name,
      fileUrl: `https://drive.google.com/drive/folders/${result.id}`
    };
  }

  private async deleteFile(accessToken: string, fileId: string) {
    if (!fileId) {
      throw new Error('File ID is required for delete');
    }

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Drive API error: ${response.status} ${error}`);
    }

    return {
      fileId,
      status: 'deleted'
    };
  }

  private async getFileInfo(accessToken: string, fileId: string) {
    if (!fileId) {
      throw new Error('File ID is required');
    }

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Drive API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    
    return {
      fileId: result.id,
      fileName: result.name,
      mimeType: result.mimeType,
      fileSize: result.size ? parseInt(result.size) : 0,
      createdTime: result.createdTime,
      modifiedTime: result.modifiedTime,
      fileUrl: result.webViewLink
    };
  }

  private async shareFile(accessToken: string, fileId: string, shareEmail: string, permission: string) {
    if (!fileId || !shareEmail) {
      throw new Error('File ID and share email are required');
    }

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: permission,
        type: 'user',
        emailAddress: shareEmail
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Drive API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    
    return {
      fileId,
      permissionId: result.id,
      status: 'shared'
    };
  }


  async test(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    

    const { config } = context;
    const { accessToken, operation } = config;

    if (!accessToken) {
      return {
        success: false,
        error: 'Access Token is required for Google Drive node test.',
        duration: Date.now() - startTime
      };
    }

    // Mock a successful test response
    return {
      duration: Date.now() - startTime,
      success: true,
      data: {
        nodeType: 'google-drive',
        status: 'success',
        message: 'Google Drive node test completed successfully',
        config: { accessToken: '***', operation },
        capabilities: {
          upload: true,
          download: true,
          list: true,
          search: true,
          share: true
        },
        timestamp: new Date().toISOString()
      }
    };
  }}


export default GoogleDriveRealNode;
