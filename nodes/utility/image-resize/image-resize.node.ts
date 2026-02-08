import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;
import * as fs from 'fs';
import * as path from 'path';

// Using sharp for image processing (most popular and performant)
// Fallback to native methods if sharp is not available
let sharp: any;
try {
  sharp = require('sharp');
} catch (e) {
  // Sharp is optional - fallback to basic methods
  logger.debug('Sharp library not found. Image resize will use basic methods.');
}

export class ImageResizeNode {
  getNodeDefinition() {
    return {
      id: 'image-resize',
      type: 'action',
      name: 'Image Resize',
      description: 'Resize and optimize images',
      category: 'utility',
      version: '1.0.0',
      author: 'Workflow Studio',
      parameters: [
        {
          name: 'imageSource',
          type: 'string',
          displayName: 'Image Source',
          description: 'Image file path, URL, or base64 data',
          required: true,
          placeholder: '/path/to/image.jpg or data:image/png;base64,...'
        },
        {
          name: 'width',
          type: 'number',
          displayName: 'Width',
          description: 'Target width in pixels (maintains aspect ratio if height not specified)',
          required: false,
          min: 1,
          max: 10000
        },
        {
          name: 'height',
          type: 'number',
          displayName: 'Height',
          description: 'Target height in pixels',
          required: false,
          min: 1,
          max: 10000
        },
        {
          name: 'resizeMode',
          type: 'options',
          displayName: 'Resize Mode',
          description: 'How to resize the image',
          required: false,
          default: 'fit',
          options: [
            { name: 'Fit (Maintain Aspect)', value: 'fit' },
            { name: 'Fill (Crop)', value: 'fill' },
            { name: 'Stretch', value: 'stretch' },
            { name: 'Cover', value: 'cover' },
            { name: 'Contain', value: 'contain' }
          ]
        },
        {
          name: 'quality',
          type: 'number',
          displayName: 'Quality',
          description: 'Image quality (1-100)',
          required: false,
          default: 90,
          min: 1,
          max: 100
        },
        {
          name: 'format',
          type: 'options',
          displayName: 'Output Format',
          description: 'Output image format',
          required: false,
          default: 'auto',
          options: [
            { name: 'Auto (Same as input)', value: 'auto' },
            { name: 'JPEG', value: 'jpeg' },
            { name: 'PNG', value: 'png' },
            { name: 'WebP', value: 'webp' },
            { name: 'AVIF', value: 'avif' }
          ]
        },
        {
          name: 'optimize',
          type: 'boolean',
          displayName: 'Optimize',
          description: 'Optimize image for smaller file size',
          required: false,
          default: true
        },
        {
          name: 'outputPath',
          type: 'string',
          displayName: 'Output Path',
          description: 'Path to save resized image (if not provided, returns base64)',
          required: false,
          placeholder: '/path/to/output.jpg'
        },
        {
          name: 'backgroundColor',
          type: 'string',
          displayName: 'Background Color',
          description: 'Background color for transparent images (hex or rgb)',
          required: false,
          placeholder: '#ffffff or rgb(255,255,255)'
        }
      ],
      inputs: [
        {
          name: 'imageSource',
          type: 'string',
          displayName: 'Image Source',
          description: 'Image source from previous node (path, URL, or base64)',
          required: false,
          dataType: 'file'
        },
        {
          name: 'width',
          type: 'number',
          displayName: 'Width',
          description: 'Target width from previous node',
          required: false,
          dataType: 'number'
        },
        {
          name: 'height',
          type: 'number',
          displayName: 'Height',
          description: 'Target height from previous node',
          required: false,
          dataType: 'number'
        }
      ],
      outputs: [
        {
          name: 'imageData',
          type: 'string',
          displayName: 'Image Data',
          description: 'Resized image as base64 string or file path',
          dataType: 'text'
        },
        {
          name: 'imagePath',
          type: 'string',
          displayName: 'Image Path',
          description: 'Path to saved image file (if outputPath was provided)',
          dataType: 'text'
        },
        {
          name: 'width',
          type: 'number',
          displayName: 'Actual Width',
          description: 'Actual width of resized image',
          dataType: 'number'
        },
        {
          name: 'height',
          type: 'number',
          displayName: 'Actual Height',
          description: 'Actual height of resized image',
          dataType: 'number'
        },
        {
          name: 'format',
          type: 'string',
          displayName: 'Output Format',
          description: 'Output image format',
          dataType: 'text'
        },
        {
          name: 'fileSize',
          type: 'number',
          displayName: 'File Size',
          description: 'File size in bytes',
          dataType: 'number'
        }
      ],
      configSchema: {
        type: 'object',
        properties: {
          imageSource: { type: 'string' },
          width: { type: 'number', minimum: 1, maximum: 10000 },
          height: { type: 'number', minimum: 1, maximum: 10000 },
          resizeMode: { type: 'string', enum: ['fit', 'fill', 'stretch', 'cover', 'contain'] },
          quality: { type: 'number', minimum: 1, maximum: 100 },
          format: { type: 'string', enum: ['auto', 'jpeg', 'png', 'webp', 'avif'] },
          optimize: { type: 'boolean' },
          outputPath: { type: 'string' },
          backgroundColor: { type: 'string' }
        },
        required: ['imageSource']
      },
      inputSchema: {
        type: 'object',
        properties: {
          imageSource: { type: 'string' },
          width: { type: 'number' },
          height: { type: 'number' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    const startTime = Date.now();

    
    try {
      const imageSource = config.imageSource || context.input?.imageSource;
      const width = config.width || context.input?.width;
      const height = config.height || context.input?.height;
      const resizeMode = config.resizeMode || 'fit';
      const quality = config.quality || 90;
      const format = config.format || 'auto';
      const optimize = config.optimize !== false;
      const outputPath = config.outputPath;
      const backgroundColor = config.backgroundColor;

      // Validation for required parameters - check if imageSource exists and is not empty
      // Also check if it's a valid JSON string with file data
      logger.debug('Image resize validation', {
        nodeId: node.id,
        hasImageSource: !!imageSource,
        imageSourceType: typeof imageSource,
        imageSourceLength: typeof imageSource === 'string' ? imageSource.length : 'N/A',
        imageSourcePreview: typeof imageSource === 'string' ? imageSource.substring(0, 100) : 'N/A'
      });
      
      let hasValidImageSource = false;
      if (imageSource) {
        // Check if it's a non-empty string
        if (typeof imageSource === 'string' && imageSource.trim().length > 0) {
          // Check if it's a data URL
          if (imageSource.startsWith('data:image/') || imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
            hasValidImageSource = true;
            logger.debug('Image source is data URL or HTTP URL');
          } else {
            // Try to parse as JSON to check if it's a file upload structure
            try {
              const parsed = JSON.parse(imageSource);
              if (parsed && typeof parsed === 'object' && (parsed.base64 || parsed.dataUrl)) {
                hasValidImageSource = true;
                logger.debug('Image source is valid JSON with file data', {
                  hasBase64: !!parsed.base64,
                  hasDataUrl: !!parsed.dataUrl,
                  fileName: parsed.name
                });
              } else {
                logger.debug('Image source JSON parsed but missing base64/dataUrl', { parsed });
              }
            } catch (e) {
              // Not JSON, might be a file path - check if it's not just an empty string
              if (imageSource.trim().length > 0 && !imageSource.match(/^\s*$/)) {
                hasValidImageSource = true;
                logger.debug('Image source appears to be a file path');
              } else {
                logger.debug('Image source is empty or whitespace only');
              }
            }
          }
        } else if (typeof imageSource === 'object') {
          // Check if it's already an object with file data
          hasValidImageSource = !!(imageSource.base64 || imageSource.dataUrl);
          logger.debug('Image source is object', {
            hasBase64: !!imageSource.base64,
            hasDataUrl: !!imageSource.dataUrl
          });
        }
      } else {
        logger.debug('Image source is null/undefined/empty');
      }
      
      if (!hasValidImageSource) {
        logger.error('Image source validation failed', {
          nodeId: node.id,
          config: Object.keys(config),
          imageSource: imageSource ? (typeof imageSource === 'string' ? imageSource.substring(0, 200) : 'object') : 'null/undefined'
        });
        throw new Error('Required parameter "imageSource" is missing. Please upload an image file.');
      }

      if (!width && !height) {
        throw new Error('Either width or height must be specified');
      }

      logger.info('Resizing image', {
        nodeId: node.id,
        width,
        height,
        resizeMode,
        format,
        runId: context.runId
      });

      let imageBuffer: Buffer;
      let inputFormat: string;

      // Load image
      // Check if imageSource is a JSON string (from file upload)
      let parsedImageSource = imageSource;
      try {
        const parsed = typeof imageSource === 'string' ? JSON.parse(imageSource) : imageSource;
        if (parsed && typeof parsed === 'object' && (parsed.base64 || parsed.dataUrl)) {
          // This is a file upload JSON structure
          if (parsed.dataUrl && parsed.dataUrl.startsWith('data:image/')) {
            parsedImageSource = parsed.dataUrl;
          } else if (parsed.base64) {
            // Construct data URL from base64 and type
            const mimeType = parsed.type || 'image/png';
            parsedImageSource = `data:${mimeType};base64,${parsed.base64}`;
          }
        }
      } catch (e) {
        // Not JSON, use as-is
      }

      if (parsedImageSource.startsWith('data:image/')) {
        // Base64 data URL
        const base64Data = parsedImageSource.split(',')[1];
        imageBuffer = Buffer.from(base64Data, 'base64');
        const mimeMatch = parsedImageSource.match(/data:image\/([^;]+)/);
        inputFormat = mimeMatch ? mimeMatch[1] : 'png';
      } else if (parsedImageSource.startsWith('http://') || parsedImageSource.startsWith('https://')) {
        // URL
        const response = await fetch(imageSource);
        if (!response.ok) {
          throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
        }
        imageBuffer = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get('content-type');
        inputFormat = contentType ? contentType.split('/')[1] : 'png';
      } else {
        // File path
        if (!fs.existsSync(parsedImageSource)) {
          throw new Error(`Image file not found: ${parsedImageSource}`);
        }
        imageBuffer = fs.readFileSync(parsedImageSource);
        inputFormat = path.extname(parsedImageSource).slice(1).toLowerCase() || 'png';
      }

      // Determine output format
      const outputFormat = format === 'auto' ? inputFormat : format;
      const mimeType = `image/${outputFormat === 'jpg' ? 'jpeg' : outputFormat}`;

      let resizedBuffer: Buffer;
      let finalWidth: number;
      let finalHeight: number;

      if (sharp) {
        // Use sharp for high-quality resizing
        let sharpInstance = sharp(imageBuffer);

        // Apply resize based on mode
        const resizeOptions: any = {};
        if (resizeMode === 'fit' || resizeMode === 'contain') {
          resizeOptions.fit = 'inside';
        } else if (resizeMode === 'cover' || resizeMode === 'fill') {
          resizeOptions.fit = 'cover';
        } else if (resizeMode === 'stretch') {
          resizeOptions.fit = 'fill';
        }

        if (width && height) {
          sharpInstance = sharpInstance.resize(Number(width), Number(height), resizeOptions);
        } else if (width) {
          sharpInstance = sharpInstance.resize(Number(width), null, resizeOptions);
        } else if (height) {
          sharpInstance = sharpInstance.resize(null, Number(height), resizeOptions);
        }

        // Apply format and quality
        if (outputFormat === 'jpeg' || outputFormat === 'jpg') {
          sharpInstance = sharpInstance.jpeg({ quality, progressive: optimize });
        } else if (outputFormat === 'png') {
          sharpInstance = sharpInstance.png({ quality, compressionLevel: optimize ? 9 : 6 });
        } else if (outputFormat === 'webp') {
          sharpInstance = sharpInstance.webp({ quality });
        } else if (outputFormat === 'avif') {
          sharpInstance = sharpInstance.avif({ quality });
        }

        // Apply background color if specified
        if (backgroundColor && (outputFormat === 'jpeg' || outputFormat === 'jpg')) {
          sharpInstance = sharpInstance.removeAlpha().background(backgroundColor);
        }

        resizedBuffer = await sharpInstance.toBuffer();
        
        // Get final dimensions
        const metadata = await sharp(resizedBuffer).metadata();
        finalWidth = metadata.width || Number(width) || 0;
        finalHeight = metadata.height || Number(height) || 0;
      } else {
        // Fallback: basic resize (would need canvas or similar)
        throw new Error('Image resize requires sharp library. Please install it: npm install sharp');
      }

      const finalSize = resizedBuffer.length;
      const base64Image = resizedBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      let savedPath: string | undefined;

      // Save to file if outputPath provided
      if (outputPath) {
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.writeFileSync(outputPath, resizedBuffer);
        savedPath = outputPath;

        logger.info('Resized image saved', {
          nodeId: node.id,
          outputPath,
          finalWidth,
          finalHeight,
          finalSize,
          runId: context.runId
        });
      }

      const duration = Date.now() - startTime;

      logger.externalService('ImageResize', resizeMode, duration, true, {
        nodeId: node.id,
        width: finalWidth,
        height: finalHeight,
        format: outputFormat,
        runId: context.runId
      });

      return {
        success: true,
        output: {
          image: dataUrl,
          imagePath: savedPath,
          width: finalWidth,
          height: finalHeight,
          format: outputFormat,
          size: finalSize
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.externalService('ImageResize', 'unknown', duration, false, {
        nodeId: node.id,
        error: error.message,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }}


export default ImageResizeNode;

