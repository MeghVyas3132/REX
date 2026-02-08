import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

// Google Drive (v3) via raw REST with automatic OAuth token management
// Operations supported: list, download, upload
export class GoogleDriveNode {
  getNodeDefinition() {
    return {
      id: 'google-drive',
      type: 'action',
      name: 'Google Drive',
      description: 'List, download, and upload files to Google Drive with automatic OAuth',
      category: 'integrations',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'operation',
          type: 'options',
          displayName: 'Google Drive Operation',
          description: 'Google Drive operation to perform',
          required: true,
          default: 'list',
          options: [
            { name: 'List Files', value: 'list' },
            { name: 'Download File', value: 'download' },
            { name: 'Upload File', value: 'upload' },
            { name: 'Create Folder', value: 'create_folder' },
            { name: 'Delete File', value: 'delete' }
          ]
        },
        {
          name: 'accessToken',
          type: 'string',
          displayName: 'Access Token',
          description: 'Google Drive OAuth access token (optional - OAuth will be used if not provided)',
          required: false,
          placeholder: 'ya29.a0...',
          credentialType: 'google_drive_oauth_token'
        },
        {
          name: 'pageSize',
          type: 'number',
          displayName: 'Page Size',
          description: 'Number of files to retrieve per page',
          required: false,
          default: 20,
          min: 1,
          max: 1000
        },
        {
          name: 'mimeType',
          type: 'string',
          displayName: 'MIME Type Filter',
          description: 'Filter files by MIME type',
          required: false,
          placeholder: 'application/pdf, image/jpeg'
        },
        {
          name: 'folderId',
          type: 'string',
          displayName: 'Folder ID',
          description: 'Google Drive folder ID to search in',
          required: false,
          placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'operation',
          type: 'string',
          displayName: 'Dynamic Operation',
          description: 'Google Drive operation from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'q',
          type: 'string',
          displayName: 'Search Query',
          description: 'Google Drive search query from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'mimeType',
          type: 'string',
          displayName: 'Dynamic MIME Type',
          description: 'MIME type filter from previous node (overrides configured)',
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
        },
        {
          name: 'fileId',
          type: 'string',
          displayName: 'File ID',
          description: 'Google Drive file ID from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'name',
          type: 'string',
          displayName: 'File Name',
          description: 'File name for upload from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'parents',
          type: 'array',
          displayName: 'Parent Folders',
          description: 'Parent folder IDs from previous node',
          required: false,
          dataType: 'array'
        },
        {
          name: 'contentBase64',
          type: 'string',
          displayName: 'File Content',
          description: 'Base64 encoded file content from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'uploadMimeType',
          type: 'string',
          displayName: 'Upload MIME Type',
          description: 'MIME type for upload from previous node',
          required: false,
          dataType: 'text'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'success',
          type: 'boolean',
          displayName: 'Success',
          description: 'Whether the operation was successful',
          dataType: 'boolean'
        },
        {
          name: 'files',
          type: 'array',
          displayName: 'Files List',
          description: 'Array of file objects from list operation',
          dataType: 'array'
        },
        {
          name: 'file',
          type: 'object',
          displayName: 'File Object',
          description: 'Single file object from download/upload',
          dataType: 'object'
        },
        {
          name: 'contentBase64',
          type: 'string',
          displayName: 'File Content',
          description: 'Base64 encoded file content from download',
          dataType: 'text'
        },
        {
          name: 'downloadUrl',
          type: 'string',
          displayName: 'Download URL',
          description: 'Direct download URL for the file',
          dataType: 'text'
        },
        {
          name: 'uploadId',
          type: 'string',
          displayName: 'Upload ID',
          description: 'ID of the uploaded file',
          dataType: 'text'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string' },
          accessToken: { type: 'string' },
          pageSize: { type: 'number' },
          mimeType: { type: 'string' },
          folderId: { type: 'string' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string' },
          q: { type: 'string' },
          mimeType: { type: 'string' },
          folderId: { type: 'string' },
          pageSize: { type: 'number' },
          fileId: { type: 'string' },
          name: { type: 'string' },
          parents: { type: 'array' },
          uploadMimeType: { type: 'string' },
          contentBase64: { type: 'string' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          files: { type: 'array' },
          file: { type: 'object' },
          contentBase64: { type: 'string' },
          downloadUrl: { type: 'string' },
          uploadId: { type: 'string' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const cfg = node.data?.config || {};
    const startTime = Date.now();

    try {
      const operation = cfg.operation || context.input?.operation || 'list';
      
      // Get access token (manual or OAuth)
      let accessToken = cfg.accessToken;
      
      if (!accessToken) {
        // Try to get OAuth token automatically
        try {
          const { oauthService } = await import('../../services/oauth.service');
          
          if (!oauthService) {
            throw new Error('OAuth service not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
          }
          
          // IMPORTANT: Use context.userId which is set by workflow engine from authenticated user
          // This MUST match the userId used when storing OAuth tokens during OAuth callback
          const userId = (context as any).userId;
          
          if (!userId || userId === 'default-user') {
            throw new Error(`User ID not found in workflow context. Ensure you are authenticated and running workflows through the authenticated API.`);
          }
          
          logger.info('Google Drive node getting OAuth token', {
            nodeId: node.id,
            userId,
            userIdType: typeof userId,
            userIdLength: userId?.length,
            contextUserId: (context as any).userId,
            inputUserId: context.input?.userId,
            agentId: context.agentId,
            workflowId: context.workflowId,
            runId: context.runId
          });
          
          // Clean userId to ensure consistent format
          const cleanUserId = String(userId || '').trim();
          if (!cleanUserId || cleanUserId === 'default-user') {
            throw new Error(`Invalid userId: ${userId}. Ensure you are authenticated and running workflows through the authenticated API.`);
          }
          
          accessToken = await oauthService.getValidAccessToken(cleanUserId, 'google');
          
          logger.info('Google Drive node got OAuth token successfully', {
            nodeId: node.id,
            userId: cleanUserId,
            tokenLength: accessToken?.length || 0,
            hasToken: !!accessToken,
            provider: 'google'
          });
        } catch (oauthError: any) {
          const errorMessage = oauthError?.message || oauthError?.toString() || String(oauthError);
          logger.error('Google Drive node failed to get OAuth token', {
            nodeId: node.id,
            userId: (context as any).userId,
            contextUserId: (context as any).userId,
            inputUserId: context.input?.userId,
            agentId: context.agentId,
            error: errorMessage,
            stack: oauthError?.stack
          });
          throw new Error(`Google Drive access token is required. Please provide accessToken in config or connect your Google account via OAuth. Error: ${errorMessage}`);
        }
      }

      logger.info('Google Drive node execute', { nodeId: node.id, operation, runId: context.runId });

      switch (operation) {
        case 'list': {
          const q = this.buildQuery(cfg, context);
          const pageSize = cfg.pageSize || context.input?.pageSize || 20;
          const url = new URL('https://www.googleapis.com/drive/v3/files');
          url.searchParams.set('pageSize', String(pageSize));
          url.searchParams.set('fields', 'files(id,name,mimeType,modifiedTime,parents,owners,iconLink,webViewLink)');
          if (q) url.searchParams.set('q', q);

          const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (!res.ok) throw new Error(`Drive list error: ${res.status} ${res.statusText}`);
          const data = await res.json() as any;
          return this.ok({ files: data.files }, startTime);
        }
        case 'download': {
          const fileId = cfg.fileId || context.input?.fileId;
          if (!fileId) throw new Error('fileId is required for download');
          const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
          const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
          if (!res.ok) throw new Error(`Drive download error: ${res.status} ${res.statusText}`);
          const arr = await res.arrayBuffer();
          const base64 = Buffer.from(arr).toString('base64');
          return this.ok({ contentBase64: base64 }, startTime);
        }
        case 'upload': {
          // Log what we're receiving from previous nodes for debugging
          logger.info('Google Drive upload - checking input data', {
            nodeId: node.id,
            runId: context.runId,
            inputKeys: Object.keys(context.input),
            hasCleanedData: context.input?.cleanedData !== undefined,
            hasContent: context.input?.content !== undefined,
            hasFileContent: context.input?.fileContent !== undefined,
            hasFilePath: context.input?.filePath !== undefined,
            hasFileInfo: context.input?.fileInfo !== undefined,
            cleanedDataType: typeof context.input?.cleanedData,
            cleanedDataIsArray: Array.isArray(context.input?.cleanedData),
            cleanedDataKeys: context.input?.cleanedData && typeof context.input?.cleanedData === 'object' ? Object.keys(context.input?.cleanedData) : null
          });
          
          // Accept multiple frontend shapes and map to Drive API
          let name = cfg.name || cfg.fileName || context.input?.name || context.input?.fileName || context.input?.fileInfo?.name;
          const parents = cfg.parents || context.input?.parents;
          let uploadMimeType = cfg.uploadMimeType || cfg.mimeType || context.input?.uploadMimeType || 'application/octet-stream';
          let contentBase64 = cfg.contentBase64 || context.input?.contentBase64;

          // Allow plain text content (from previous node) and convert to base64 automatically
          // Support data from Data Cleaning node (cleanedData), File Upload (filePath), Webhook body, and other formats
          // Check multiple locations: direct fields, body.content, body.text, etc.
          let textContent = cfg.fileContent || context.input?.fileContent || context.input?.content || context.input?.reasoning;
          
          // Check for nested node outputs first (workflow engine passes data as context.input[nodeId])
          // This is the most common case for webhook triggers and other nodes
          // IMPORTANT: We check for filePath separately - don't use filePath as content, read the file instead
          if (!textContent) {
            for (const key of Object.keys(context.input)) {
              // Check if this is a node output (trigger-xxx, action-xxx, node-xxx)
              if (key.includes('trigger-') || key.includes('action-') || key.includes('node-')) {
                const nodeOutput = context.input[key];
                
                if (!nodeOutput || typeof nodeOutput !== 'object') continue;
                
                logger.info('Checking nested node output', {
                  nodeId: node.id,
                  sourceKey: key,
                  outputKeys: Object.keys(nodeOutput)
                });
                
                // CRITICAL: If this is File Upload output with filePath, skip it - we'll read the file separately
                if (nodeOutput.filePath && !nodeOutput.content && !nodeOutput.fileContent && !nodeOutput.cleanedData) {
                  logger.info('Found File Upload output with filePath - will read file separately, skipping as content', {
                    nodeId: node.id,
                    sourceKey: key,
                    filePath: nodeOutput.filePath
                  });
                  continue; // Skip this node output - filePath will be handled separately
                }
                
                // Check webhook trigger output structure (has body, headers, query, etc.)
                if (nodeOutput.body) {
                  if (typeof nodeOutput.body === 'string') {
                    textContent = nodeOutput.body;
                    logger.info('Google Drive found content in node.body (string)', { nodeId: node.id, sourceKey: key, length: textContent.length });
                    break;
                  } else if (nodeOutput.body.content) {
                    textContent = typeof nodeOutput.body.content === 'string' ? nodeOutput.body.content : JSON.stringify(nodeOutput.body.content);
                    logger.info('Google Drive found content in node.body.content', { nodeId: node.id, sourceKey: key, length: textContent.length });
                    break;
                  } else if (nodeOutput.body.text) {
                    textContent = typeof nodeOutput.body.text === 'string' ? nodeOutput.body.text : JSON.stringify(nodeOutput.body.text);
                    logger.info('Google Drive found content in node.body.text', { nodeId: node.id, sourceKey: key, length: textContent.length });
                    break;
                  } else if (nodeOutput.body.data) {
                    textContent = typeof nodeOutput.body.data === 'string' ? nodeOutput.body.data : JSON.stringify(nodeOutput.body.data);
                    logger.info('Google Drive found content in node.body.data', { nodeId: node.id, sourceKey: key, length: textContent.length });
                    break;
                  } else {
                    // If body is an object with no specific content field, stringify the whole body
                    textContent = JSON.stringify(nodeOutput.body, null, 2);
                    if (!cfg.uploadMimeType && !context.input?.uploadMimeType) uploadMimeType = 'application/json';
                    logger.info('Google Drive found content in node.body (object, stringified)', { nodeId: node.id, sourceKey: key, length: textContent.length });
                    break;
                  }
                }
                
                // Check for cleanedData from Data Cleaning node
                if (!textContent && nodeOutput.cleanedData !== undefined) {
                  if (typeof nodeOutput.cleanedData === 'string') {
                    textContent = nodeOutput.cleanedData;
                    logger.info('Google Drive found cleanedData in nested output (string)', { nodeId: node.id, sourceKey: key, length: textContent.length });
                    break;
                  } else if (Array.isArray(nodeOutput.cleanedData) || typeof nodeOutput.cleanedData === 'object') {
                    textContent = JSON.stringify(nodeOutput.cleanedData, null, 2);
                    if (!cfg.uploadMimeType && !context.input?.uploadMimeType) uploadMimeType = 'application/json';
                    logger.info('Google Drive found cleanedData in nested output (object)', { nodeId: node.id, sourceKey: key, length: textContent.length });
                    break;
                  }
                }
                
                // Check for content, fileContent from other nodes
                if (!textContent) {
                  const data = nodeOutput.content || nodeOutput.fileContent;
                  if (data) {
                    if (typeof data === 'string') {
                      textContent = data;
                      logger.info('Google Drive found content in nested output', { nodeId: node.id, sourceKey: key, length: textContent.length });
                      break;
                    } else if (Array.isArray(data) || typeof data === 'object') {
                      textContent = JSON.stringify(data, null, 2);
                      if (!cfg.uploadMimeType && !context.input?.uploadMimeType) uploadMimeType = 'application/json';
                      logger.info('Google Drive found content in nested output (object)', { nodeId: node.id, sourceKey: key, length: textContent.length });
                      break;
                    }
                  }
                }
                
                // Last resort: if nodeOutput itself is an object with data, try to extract useful content
                // This handles cases where the webhook trigger passes input directly
                // BUT: Skip filePath - we'll read the file from path separately
                if (!textContent && typeof nodeOutput === 'object' && !Array.isArray(nodeOutput)) {
                  const keys = Object.keys(nodeOutput);
                  
                  // Check if this is a File Upload output (has filePath) - don't use filePath as content, read the file instead
                  if (nodeOutput.filePath && !nodeOutput.content && !nodeOutput.fileContent) {
                    // This is from File Upload node - we'll handle filePath separately below
                    logger.info('Found File Upload output with filePath - will read file separately', {
                      nodeId: node.id,
                      sourceKey: key,
                      filePath: nodeOutput.filePath
                    });
                    continue; // Skip this node output, let the filePath reading logic below handle it
                  }
                  
                  logger.info('Checking nodeOutput keys for content', {
                    nodeId: node.id,
                    sourceKey: key,
                    outputKeys: keys,
                    hasBody: !!nodeOutput.body,
                    hasInput: !!nodeOutput.input,
                    hasData: !!nodeOutput.data
                  });
                  
                  // Try to find any string content in the output (but skip filePath)
                  for (const outputKey of keys) {
                    if (outputKey === 'filePath' || outputKey === 'fileInfo' || outputKey === 'fileSize') {
                      continue; // Skip file metadata - handle filePath separately
                    }
                    
                    const value = nodeOutput[outputKey];
                    if (typeof value === 'string' && value.length > 0) {
                      textContent = value;
                      logger.info('Google Drive found string content in nodeOutput', { nodeId: node.id, sourceKey: key, field: outputKey, length: textContent.length });
                      break;
                    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                      // Check nested objects
                      const nestedValue = value.content || value.text || value.data || value.body;
                      if (typeof nestedValue === 'string' && nestedValue.length > 0) {
                        textContent = nestedValue;
                        logger.info('Google Drive found nested string content', { nodeId: node.id, sourceKey: key, field: outputKey, length: textContent.length });
                        break;
                      }
                    }
                  }
                  
                  // If still no content and it's a meaningful object, stringify it
                  if (!textContent && keys.length > 0) {
                    textContent = JSON.stringify(nodeOutput, null, 2);
                    if (!cfg.uploadMimeType && !context.input?.uploadMimeType) uploadMimeType = 'application/json';
                    logger.info('Google Drive stringified entire nodeOutput as content', { nodeId: node.id, sourceKey: key, length: textContent.length, keys: keys });
                    break;
                  }
                }
              }
            }
          }
          
          // Also check direct access (for flattened inputs)
          if (!textContent && context.input?.body) {
            if (typeof context.input?.body === 'string') {
              textContent = context.input?.body;
              logger.info('Google Drive found content in body (string, direct)', { nodeId: node.id });
            } else if (context.input?.body.content) {
              textContent = typeof context.input?.body.content === 'string' ? context.input?.body.content : JSON.stringify(context.input?.body.content);
              logger.info('Google Drive found content in body.content (direct)', { nodeId: node.id, length: textContent.length });
            } else if (context.input?.body.text) {
              textContent = typeof context.input?.body.text === 'string' ? context.input?.body.text : JSON.stringify(context.input?.body.text);
              logger.info('Google Drive found content in body.text (direct)', { nodeId: node.id, length: textContent.length });
            } else if (context.input?.body.data) {
              textContent = typeof context.input?.body.data === 'string' ? context.input?.body.data : JSON.stringify(context.input?.body.data);
              logger.info('Google Drive found content in body.data (direct)', { nodeId: node.id, length: textContent.length });
            }
          }
          
          // Check for cleanedData (direct access)
          if (!textContent && context.input?.cleanedData !== undefined) {
            if (typeof context.input?.cleanedData === 'string') {
              textContent = context.input?.cleanedData;
              logger.info('Google Drive found cleanedData (string, direct)', { nodeId: node.id, length: textContent.length });
            } else if (Array.isArray(context.input?.cleanedData) || typeof context.input?.cleanedData === 'object') {
              textContent = JSON.stringify(context.input?.cleanedData, null, 2);
              if (!cfg.uploadMimeType && !context.input?.uploadMimeType) uploadMimeType = 'application/json';
              logger.info('Google Drive found cleanedData (object/array, direct)', { nodeId: node.id, length: textContent.length, type: Array.isArray(context.input?.cleanedData) ? 'array' : 'object' });
            }
          }
          
          // If we still don't have content, try reading from filePath (from File Upload node)
          // Check both direct filePath and nested node outputs
          if (!contentBase64 && !textContent) {
            let filePathToRead: string | undefined = undefined;
            
            // Check direct filePath first
            if (context.input?.filePath && typeof context.input?.filePath === 'string') {
              filePathToRead = context.input?.filePath;
            }
            
            // Also check nested node outputs for filePath (from File Upload node)
            if (!filePathToRead) {
              for (const key of Object.keys(context.input)) {
                if (key.includes('trigger-') || key.includes('action-') || key.includes('node-')) {
                  const nodeOutput = context.input[key];
                  if (nodeOutput && typeof nodeOutput === 'object' && nodeOutput.filePath && typeof nodeOutput.filePath === 'string') {
                    filePathToRead = nodeOutput.filePath;
                    logger.info('Google Drive found filePath in nested node output', {
                      nodeId: node.id,
                      sourceKey: key,
                      filePath: filePathToRead
                    });
                    break;
                  }
                }
              }
            }
            
            // Read the file if we found a filePath
            if (filePathToRead) {
              try {
                const fs = await import('fs/promises');
                const path = await import('path');
                
                // Check if file exists
                try {
                  await fs.access(filePathToRead);
                } catch (accessError) {
                  logger.warn('File does not exist at filePath', {
                    filePath: filePathToRead,
                    nodeId: node.id
                  });
                  throw new Error(`File not found at path: ${filePathToRead}`);
                }
                
                // Read file content
                const content = await fs.readFile(filePathToRead, 'utf8');
                textContent = content;
                
                // Auto-detect file type from extension for better MIME type
                const ext = path.extname(filePathToRead).toLowerCase();
                if (ext === '.json' && !cfg.uploadMimeType && !context.input?.uploadMimeType) {
                  uploadMimeType = 'application/json';
                } else if (ext === '.csv' && !cfg.uploadMimeType && !context.input?.uploadMimeType) {
                  uploadMimeType = 'text/csv';
                } else if (ext === '.txt' && !cfg.uploadMimeType && !context.input?.uploadMimeType) {
                  uploadMimeType = 'text/plain';
                }
                
                logger.info('Google Drive read file from filePath successfully', {
                  filePath: filePathToRead,
                  contentLength: content.length,
                  fileExtension: ext,
                  detectedMimeType: uploadMimeType,
                  nodeId: node.id
                });
              } catch (fileReadError: any) {
                logger.error('Failed to read file from filePath', {
                  filePath: filePathToRead,
                  error: fileReadError?.message,
                  errorName: fileReadError?.name,
                  nodeId: node.id
                });
                throw new Error(`Failed to read file from path: ${filePathToRead}. Error: ${fileReadError?.message}`);
              }
            }
          }
          
          if (!contentBase64 && typeof textContent === 'string') {
            contentBase64 = Buffer.from(textContent, 'utf8').toString('base64');
            if (!cfg.uploadMimeType && !context.input?.uploadMimeType && !name?.endsWith('.json')) {
              uploadMimeType = 'text/plain';
            }
          }

          // Generate filename if not provided
          if (!name) {
            // Try to get name from fileInfo or generate based on data type
            if (context.input?.fileInfo?.name) {
              name = context.input?.fileInfo.name;
            } else if (context.input?.cleanedData !== undefined) {
              // Generate name based on data type
              if (uploadMimeType === 'application/json') {
                name = `cleaned_data_${Date.now()}.json`;
              } else {
                name = `cleaned_data_${Date.now()}.txt`;
              }
            } else if (uploadMimeType === 'application/json') {
              // Auto-detect JSON and set .json extension
              name = `data_${Date.now()}.json`;
            } else {
              name = `upload_${Date.now()}.txt`;
            }
          } else {
            // Ensure filename has correct extension based on MIME type
            if (uploadMimeType === 'application/json' && !name.endsWith('.json')) {
              // Remove existing extension and add .json
              const nameWithoutExt = name.replace(/\.[^/.]+$/, '');
              name = `${nameWithoutExt}.json`;
              logger.info('Google Drive auto-corrected filename extension for JSON', {
                nodeId: node.id,
                originalName: name,
                correctedName: name
              });
            }
          }
          
          if (!contentBase64) {
            logger.error('Google Drive upload failed - no content found', {
              nodeId: node.id,
              runId: context.runId,
              inputKeys: Object.keys(context.input),
              hasTextContent: !!textContent,
              hasContentBase64: !!contentBase64,
              hasFilePath: !!context.input?.filePath,
              configKeys: Object.keys(cfg || {})
            });
            throw new Error('Missing file content. Provide contentBase64, fileContent, cleanedData, or filePath from previous node.');
          }

          const metadata = { name, parents };
          const media = Buffer.from(contentBase64, 'base64');

          logger.info('Google Drive upload preparing', {
            nodeId: node.id,
            runId: context.runId,
            fileName: name,
            fileSize: media.length,
            mimeType: uploadMimeType,
            hasParents: !!parents,
            contentBase64Length: contentBase64.length,
            mediaBufferLength: media.length
          });

          const boundary = '-------314159265358979323846';
          const delimiter = `\r\n--${boundary}\r\n`;
          const closeDelim = `\r\n--${boundary}--`;
          const body = Buffer.concat([
            Buffer.from(
              `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}${delimiter}Content-Type: ${uploadMimeType}\r\n\r\n`
            ),
            media,
            Buffer.from(closeDelim)
          ]);

          logger.info('Google Drive upload starting', {
            nodeId: node.id,
            runId: context.runId,
            fileName: name,
            fileSize: media.length,
            mimeType: uploadMimeType,
            hasParents: !!parents,
            bodyLength: body.length
          });

          const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body
          });
          
          if (!res.ok) {
            const text = await res.text();
            logger.error('Google Drive upload failed', {
              status: res.status,
              statusText: res.statusText,
              error: text
            });
            throw new Error(`Drive upload error: ${res.status} ${res.statusText} ${text}`);
          }
          
          const data = await res.json() as any;
          logger.info('Google Drive upload successful', {
            fileId: data.id,
            fileName: data.name,
            fileSize: data.size,
            webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`
          });
          
          return this.ok({ 
            file: data, 
            uploadId: data.id,
            fileName: data.name,
            fileUrl: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
            fileId: data.id
          }, startTime);
        }
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    } catch (error: any) {
      return { success: false, error: error.message, duration: Date.now() - startTime };
    }
  }

  private ok(output: any, startTime: number): ExecutionResult {
    return { success: true, output, duration: Date.now() - startTime };
  }

  private buildQuery(cfg: any, context: ExecutionContext): string | undefined {
    const qParts: string[] = [];
    const mimeType = cfg.mimeType || context.input?.mimeType;
    const folderId = cfg.folderId || context.input?.folderId;
    if (mimeType) qParts.push(`mimeType='${mimeType.replace(/'/g, "\\'")}'`);
    if (folderId) qParts.push(`'${folderId.replace(/'/g, "\\'")}' in parents`);
    // Allow raw q override
    const raw = cfg.q || context.input?.q;
    if (raw) qParts.push(raw);
    return qParts.length ? qParts.join(' and ') : undefined;
  }

}
export default GoogleDriveNode;
