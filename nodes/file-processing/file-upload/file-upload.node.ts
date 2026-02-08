import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../../utils/logger';

export class FileUploadNode {
  getNodeDefinition() {
    return {
      id: 'file-upload',
      type: 'action',
      name: 'File Upload',
      description: 'Upload and process files from various sources',
      category: 'file-processing',
      version: '1.0.0',
      author: 'Workflow Studio',
      inputs: [
        {
          id: 'filePath',
          name: 'File Path',
          type: 'string',
          required: false,
          description: 'Local file path or URL (optional - use UI upload instead)'
        },
        {
          id: 'fileData',
          name: 'File Data',
          type: 'string',
          required: false,
          description: 'Base64 encoded file data (optional - use UI upload instead)'
        }
      ],
      outputs: [
        {
          id: 'fileInfo',
          name: 'File Information',
          type: 'object',
          description: 'Uploaded file metadata'
        },
        {
          id: 'filePath',
          name: 'File Path',
          type: 'string',
          description: 'Path to uploaded file'
        },
        {
          id: 'fileSize',
          name: 'File Size',
          type: 'number',
          description: 'File size in bytes'
        }
      ],
      configSchema: {
        type: 'object',
        properties: {
          source: {
            type: 'string',
            enum: ['local', 'url', 'base64'],
            default: 'local',
            description: 'File source type (defaults to local)'
          },
          uploadPath: {
            type: 'string',
            default: './uploads',
            description: 'Upload directory path (defaults to ./uploads)'
          },
          allowedTypes: {
            type: 'array',
            items: { type: 'string' },
            default: ['*'],
            description: 'Allowed file types'
          },
          maxSize: {
            type: 'number',
            default: 10485760,
            description: 'Maximum file size in bytes (10MB default)'
          },
          preserveName: {
            type: 'boolean',
            default: false,
            description: 'Preserve original filename'
          }
        },
        required: []
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    try {
      const config = node.data?.config || {};
      // Accept both 'allowedTypes' and 'acceptedTypes' for compatibility
      const allowedTypes = config.allowedTypes || config.acceptedTypes || ['*'];
      const { source = 'local', uploadPath, maxSize, preserveName, uploadedFile } = config;
      
      logger.info('File upload node executing', { 
        source, 
        uploadPath, 
        nodeId: node.id,
        hasUploadedFile: !!uploadedFile
      });

      let fileInfo: any = {};
      let uploadedFilePath = '';

      // Priority 1: Use file uploaded via frontend UI (stored in config.uploadedFile)
      if (uploadedFile) {
        if (uploadedFile.text) {
          // Frontend uploaded as text (CSV/TXT/JSON)
          fileInfo = await this.handleUploadedFileText(uploadedFile, uploadPath || './uploads', preserveName);
          uploadedFilePath = fileInfo.path;
        } else if (uploadedFile.base64) {
          // Frontend uploaded as base64
          const mimeType = uploadedFile.type || 'application/octet-stream';
          const base64Data = `data:${mimeType};base64,${uploadedFile.base64}`;
          fileInfo = await this.handleBase64File(base64Data, uploadPath || './uploads', preserveName);
          uploadedFilePath = fileInfo.path;
        } else {
          throw new Error('Invalid uploadedFile format - must have text or base64 property');
        }
      } else {
        // Priority 2: Use traditional input methods (for API/programmatic use)
        switch (source) {
          case 'local':
            if (!context.input?.filePath) {
              throw new Error('File path is required for local file upload. Either upload a file via the UI or provide context.input?.filePath');
            }
            fileInfo = await this.handleLocalFile(context.input?.filePath, uploadPath || './uploads', preserveName);
            uploadedFilePath = fileInfo.path;
            break;

          case 'url':
            if (!context.input?.filePath) {
              throw new Error('URL is required for URL file upload. Provide context.input?.filePath with the file URL');
            }
            fileInfo = await this.handleUrlFile(context.input?.filePath, uploadPath || './uploads', preserveName);
            uploadedFilePath = fileInfo.path;
            break;

          case 'base64':
            if (!context.input?.fileData) {
              throw new Error('Base64 data is required for base64 file upload. Provide context.input?.fileData with base64 string');
            }
            fileInfo = await this.handleBase64File(context.input?.fileData, uploadPath || './uploads', preserveName);
            uploadedFilePath = fileInfo.path;
            break;

          default:
            throw new Error(`Unsupported file source: ${source}`);
        }
      }

      // Validate file
      await this.validateFile(fileInfo, allowedTypes, maxSize);

      return {
        success: true,
        output: {
          fileInfo: {
            name: fileInfo.name,
            path: fileInfo.path,
            size: fileInfo.size,
            type: fileInfo.type,
            extension: fileInfo.extension,
            uploadedAt: new Date().toISOString()
          },
          filePath: uploadedFilePath,
          fileSize: fileInfo.size
        },
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('File upload failed', error as Error, { nodeId: node.id });
      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  private async handleLocalFile(filePath: string, uploadPath: string, preserveName: boolean): Promise<any> {
    if (!filePath) {
      throw new Error('File path is required for local file upload');
    }

    const stats = await fs.stat(filePath);
    const fileName = preserveName ? path.basename(filePath) : `${Date.now()}_${path.basename(filePath)}`;
    const uploadDir = path.resolve(uploadPath);
    
    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    
    const destinationPath = path.join(uploadDir, fileName);
    await fs.copyFile(filePath, destinationPath);

    return {
      name: fileName,
      path: destinationPath,
      size: stats.size,
      type: this.getMimeType(path.extname(filePath)),
      extension: path.extname(filePath)
    };
  }

  private async handleUrlFile(url: string, uploadPath: string, preserveName: boolean): Promise<any> {
    if (!url) {
      throw new Error('URL is required for URL file upload');
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const fileName = preserveName ? 
      this.extractFileNameFromUrl(url) : 
      `${Date.now()}_${this.extractFileNameFromUrl(url)}`;

    const uploadDir = path.resolve(uploadPath);
    await fs.mkdir(uploadDir, { recursive: true });
    
    const destinationPath = path.join(uploadDir, fileName);
    await fs.writeFile(destinationPath, buffer);

    return {
      name: fileName,
      path: destinationPath,
      size: buffer.length,
      type: contentType,
      extension: path.extname(fileName)
    };
  }

  private async handleUploadedFileText(uploadedFile: any, uploadPath: string, preserveName: boolean): Promise<any> {
    if (!uploadedFile || !uploadedFile.text) {
      throw new Error('Uploaded file text data is required');
    }

    const fileName = preserveName && uploadedFile.name 
      ? uploadedFile.name 
      : `${Date.now()}_${uploadedFile.name || 'uploaded_file'}`;
    
    const uploadDir = path.resolve(uploadPath);
    await fs.mkdir(uploadDir, { recursive: true });
    
    const destinationPath = path.join(uploadDir, fileName);
    await fs.writeFile(destinationPath, uploadedFile.text, 'utf8');

    const stats = await fs.stat(destinationPath);
    const ext = path.extname(fileName).toLowerCase();

    return {
      name: fileName,
      path: destinationPath,
      size: stats.size,
      type: uploadedFile.type || this.getMimeType(ext),
      extension: ext
    };
  }

  private async handleBase64File(base64Data: string, uploadPath: string, preserveName: boolean): Promise<any> {
    if (!base64Data) {
      throw new Error('Base64 data is required for base64 file upload');
    }

    // Extract MIME type and data from base64 string
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid base64 data format');
    }

    const mimeType = matches[1];
    const base64Content = matches[2];
    const buffer = Buffer.from(base64Content, 'base64');
    
    const extension = this.getExtensionFromMimeType(mimeType);
    const fileName = `${Date.now()}_file${extension}`;

    const uploadDir = path.resolve(uploadPath);
    await fs.mkdir(uploadDir, { recursive: true });
    
    const destinationPath = path.join(uploadDir, fileName);
    await fs.writeFile(destinationPath, buffer);

    return {
      name: fileName,
      path: destinationPath,
      size: buffer.length,
      type: mimeType,
      extension: extension
    };
  }

  private async validateFile(fileInfo: any, allowedTypes: string[], maxSize: number | string): Promise<void> {
    // Convert maxSize string (e.g., "50MB") to bytes if needed
    let maxSizeBytes: number;
    if (typeof maxSize === 'string') {
      const sizeStr = maxSize.trim().toUpperCase();
      const match = sizeStr.match(/^(\d+)(KB|MB|GB)?$/);
      if (!match) {
        throw new Error(`Invalid maxSize format: ${maxSize}. Use number (bytes) or string like "50MB"`);
      }
      const value = parseInt(match[1], 10);
      const unit = match[2] || 'BYTES';
      const multipliers: Record<string, number> = {
        'BYTES': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024
      };
      maxSizeBytes = value * (multipliers[unit] || 1);
    } else {
      maxSizeBytes = maxSize;
    }
    
    // Check file size
    if (fileInfo.size > maxSizeBytes) {
      throw new Error(`File size ${fileInfo.size} exceeds maximum allowed size ${maxSizeBytes}`);
    }

    // Check file type
    if (!allowedTypes.includes('*')) {
      const fileExtension = fileInfo.extension.toLowerCase();
      const fileMimeType = fileInfo.type?.toLowerCase() || '';
      
      const isAllowed = allowedTypes.some(type => {
        const normalizedType = type.trim().toLowerCase();
        
        // Handle wildcard types (e.g., "image/*", "video/*")
        if (normalizedType.endsWith('/*')) {
          const prefix = normalizedType.slice(0, -2); // Remove "/*"
          return fileMimeType.startsWith(prefix + '/');
        }
        
        // Handle extension-based types (e.g., ".pdf", "pdf")
        if (normalizedType.startsWith('.')) {
          return fileExtension === normalizedType;
        }
        if (!normalizedType.includes('/')) {
          // Just extension without dot (e.g., "pdf")
          return fileExtension === '.' + normalizedType || fileExtension === normalizedType;
        }
        
        // Handle MIME types (e.g., "application/pdf")
        // Check exact match or if file type includes the type
        return fileMimeType === normalizedType || fileMimeType.includes(normalizedType);
      });

      if (!isAllowed) {
        throw new Error(`File type ${fileInfo.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
      }
    }
  }

  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.csv': 'text/csv',
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.zip': 'application/zip'
    };
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'text/plain': '.txt',
      'application/json': '.json',
      'text/csv': '.csv',
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'audio/mpeg': '.mp3',
      'application/zip': '.zip'
    };
    return extensions[mimeType] || '.bin';
  }

  private extractFileNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = path.basename(pathname);
      return fileName || 'downloaded_file';
    } catch {
      return 'downloaded_file';
    }
  }}


export default FileUploadNode;
