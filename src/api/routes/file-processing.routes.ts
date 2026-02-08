import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../../utils/logger';
import { nodeRegistry } from '../../core/registry/node-registry';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now
    cb(null, true);
  }
});

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  const uploadDir = path.join(process.cwd(), 'uploads');
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
};

// Initialize uploads directory
ensureUploadsDir();

// File upload endpoint
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const fileInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString()
    };

    logger.info('File uploaded successfully', {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    res.json({
      success: true,
      data: fileInfo
    });

  } catch (error: any) {
    logger.error('File upload failed', error as Error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Multiple file upload endpoint
router.post('/upload-multiple', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const fileInfos = files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date().toISOString()
    }));

    logger.info('Multiple files uploaded successfully', {
      fileCount: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0)
    });

    res.json({
      success: true,
      data: fileInfos
    });

  } catch (error: any) {
    logger.error('Multiple file upload failed', error as Error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// File processing endpoints for each node type
router.post('/process/file-upload', async (req: Request, res: Response) => {
  try {
    const { config, input } = req.body;
    
    const nodeInstance = nodeRegistry.createNodeInstance('file-upload');
    const result = await nodeInstance.execute(
      { id: 'temp', type: 'action', config },
      { input, startTime: Date.now() }
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    logger.error('File upload processing failed', error as Error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/process/file-validation', async (req: Request, res: Response) => {
  try {
    const { config, input } = req.body;
    
    const nodeInstance = nodeRegistry.createNodeInstance('file-validation');
    const result = await nodeInstance.execute(
      { id: 'temp', type: 'action', config },
      { input, startTime: Date.now() }
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    logger.error('File validation processing failed', error as Error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/process/data-cleaning', async (req: Request, res: Response) => {
  try {
    const { config, input } = req.body;
    
    const nodeInstance = nodeRegistry.createNodeInstance('data-cleaning');
    const result = await nodeInstance.execute(
      { id: 'temp', type: 'action', config },
      { input, startTime: Date.now() }
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    logger.error('Data cleaning processing failed', error as Error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/process/data-transformation', async (req: Request, res: Response) => {
  try {
    const { config, input } = req.body;
    
    const nodeInstance = nodeRegistry.createNodeInstance('data-transformation');
    const result = await nodeInstance.execute(
      { id: 'temp', type: 'action', config },
      { input, startTime: Date.now() }
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    logger.error('Data transformation processing failed', error as Error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generic file processing endpoint
router.post('/process/:nodeType', async (req: Request, res: Response) => {
  try {
    const { nodeType } = req.params;
    const { config, input } = req.body;
    
    const nodeInstance = nodeRegistry.createNodeInstance(nodeType);
    const result = await nodeInstance.execute(
      { id: 'temp', type: 'action', config },
      { input, startTime: Date.now() }
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    logger.error(`File processing failed for node type: ${req.params.nodeType}`, error as Error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get file processing node schemas
router.get('/schemas', async (req: Request, res: Response) => {
  try {
    const fileProcessingNodes = nodeRegistry.getNodesByCategory('file-processing');
    
    const schemas = fileProcessingNodes.map(node => ({
      id: node.id,
      name: node.name,
      description: node.description,
      category: node.category,
      version: node.version,
      author: node.author,
      configSchema: node.configSchema,
      inputs: node.inputs,
      outputs: node.outputs
    }));

    res.json({
      success: true,
      data: schemas
    });

  } catch (error: any) {
    logger.error('Failed to get file processing schemas', error as Error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific file processing node schema
router.get('/schemas/:nodeType', async (req: Request, res: Response) => {
  try {
    const { nodeType } = req.params;
    
    const schema = nodeRegistry.getNodeSchema(nodeType);
    
    if (!schema) {
      return res.status(404).json({
        success: false,
        error: `Node schema not found: ${nodeType}`
      });
    }

    res.json({
      success: true,
      data: schema
    });

  } catch (error: any) {
    logger.error(`Failed to get schema for node type: ${req.params.nodeType}`, error as Error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test file processing node
router.post('/test/:nodeType', async (req: Request, res: Response) => {
  try {
    const { nodeType } = req.params;
    const { config, input } = req.body;
    
    const nodeInstance = nodeRegistry.createNodeInstance(nodeType);
    const result = await nodeInstance.execute(
      { id: 'test', type: 'action', config },
      { input, startTime: Date.now() }
    );

    res.json({
      success: true,
      data: {
        nodeType,
        status: result.success ? 'success' : 'error',
        message: result.success ? 'Test completed successfully' : result.error,
        config,
        result,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error(`Test failed for node type: ${req.params.nodeType}`, error as Error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to get MIME type from file extension
const getMimeType = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.xml': 'application/xml',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.zip': 'application/zip',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

// File download endpoint
router.get('/download/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Set appropriate headers based on file extension
    const contentType = getMimeType(filename);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);
    
    // Stream the file
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error: any) {
    logger.error('File download failed', error as Error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List uploaded files
router.get('/files', async (req: Request, res: Response) => {
  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    
    try {
      await fs.access(uploadDir);
    } catch {
      return res.json({
        success: true,
        data: []
      });
    }

    const files = await fs.readdir(uploadDir);
    const fileInfos = await Promise.all(
      files.map(async (filename) => {
        const filePath = path.join(uploadDir, filename);
        const stats = await fs.stat(filePath);
        return {
          filename,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          path: filePath
        };
      })
    );

    res.json({
      success: true,
      data: fileInfos
    });

  } catch (error: any) {
    logger.error('Failed to list files', error as Error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete file endpoint
router.delete('/files/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', filename);
    
    try {
      await fs.unlink(filePath);
      
      logger.info('File deleted successfully', { filename });
      
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      }
      throw error;
    }

  } catch (error: any) {
    logger.error('File deletion failed', error as Error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'File processing service is healthy',
    timestamp: new Date().toISOString(),
    availableNodes: nodeRegistry.getNodesByCategory('file-processing').map(node => node.id)
  });
});

export default router;
