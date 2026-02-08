import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;
const fs = require('fs');
const path = require('path');

export class DocumentProcessorNode {
  getNodeDefinition() {
    return {
      id: 'document-processor',
      type: 'action',
      name: 'Document Processor',
      description: 'Process documents (PDF, DOCX, TXT, CSV) and extract content, images, and tables',
      category: 'ai',
      version: '1.0.0',
      author: 'Workflow Studio',
      parameters: [
        {
          name: 'outputFormat',
          type: 'options',
          displayName: 'Output Format',
          description: 'Format for the processed document output',
          required: true,
          default: 'text',
          options: [
            { name: 'Text', value: 'text' },
            { name: 'JSON', value: 'json' },
            { name: 'Markdown', value: 'markdown' }
          ]
        },
        {
          name: 'filePath',
          type: 'string',
          displayName: 'File Path',
          description: 'Path to the document file',
          required: false,
          placeholder: '/path/to/document.pdf'
        },
        {
          name: 'extractImages',
          type: 'boolean',
          displayName: 'Extract Images',
          description: 'Extract images from document',
          required: false,
          default: false
        },
        {
          name: 'extractTables',
          type: 'boolean',
          displayName: 'Extract Tables',
          description: 'Extract tables from document',
          required: false,
          default: true
        },
        {
          name: 'chunkSize',
          type: 'number',
          displayName: 'Chunk Size',
          description: 'Size of text chunks for processing',
          required: false,
          default: 1000,
          min: 100,
          max: 10000
        },
        {
          name: 'chunkOverlap',
          type: 'number',
          displayName: 'Chunk Overlap',
          description: 'Overlap between chunks',
          required: false,
          default: 200,
          min: 0,
          max: 1000
        }
      ],
      inputs: [
        {
          name: 'filePath',
          type: 'string',
          displayName: 'File Path',
          description: 'Document file path from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'file',
          type: 'string',
          displayName: 'File',
          description: 'Document file from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'uploadedFile',
          type: 'object',
          displayName: 'Uploaded File',
          description: 'Uploaded file data from previous node',
          required: false,
          dataType: 'object'
        },
        {
          name: 'fileData',
          type: 'object',
          displayName: 'File Data',
          description: 'Base64 file data from previous node',
          required: false,
          dataType: 'object'
        },
        {
          name: 'outputFormat',
          type: 'string',
          displayName: 'Dynamic Output Format',
          description: 'Output format from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        }
      ],
      outputs: [
        {
          name: 'content',
          type: 'string',
          displayName: 'Content',
          description: 'Processed document content',
          dataType: 'text'
        },
        {
          name: 'chunks',
          type: 'array',
          displayName: 'Chunks',
          description: 'Text chunks of the document',
          dataType: 'array'
        },
        {
          name: 'metadata',
          type: 'object',
          displayName: 'Metadata',
          description: 'Document metadata',
          dataType: 'object'
        },
        {
          name: 'images',
          type: 'array',
          displayName: 'Images',
          description: 'Extracted images from document',
          dataType: 'array'
        },
        {
          name: 'tables',
          type: 'array',
          displayName: 'Tables',
          description: 'Extracted tables from document',
          dataType: 'array'
        }
      ]
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    const startTime = Date.now();

    if (!config.outputFormat && !context.input?.outputFormat) {
      throw new Error('Required parameter "outputFormat" is missing');
    }

    let tempFilePath: string | null = null;
    
    try {
      // Check multiple locations for file data
      let filePath = config.filePath || 
                     context.input?.filePath || 
                     config.file || 
                     context.input?.file ||
                     config.uploadedFile ||
                     context.input?.uploadedFile;
      
      // Check for base64 file data in various formats
      let fileData: any = null;
      
      // If filePath is an object directly, use it
      if (filePath && typeof filePath === 'object' && filePath.base64) {
        fileData = filePath;
        filePath = null; // Will be set after creating temp file
      } 
      // If filePath is a string, try to parse as JSON
      else if (filePath && typeof filePath === 'string') {
        try {
          const parsed = JSON.parse(filePath);
          if (parsed && parsed.base64 && parsed.name) {
            fileData = parsed;
            filePath = null; // Will be set after creating temp file
          }
        } catch (e) {
          // Not JSON, treat as regular file path - will continue below
        }
      }
      
      // Also check config.fileData and context.input.fileData
      if (!fileData && !filePath) {
        const fileDataRaw = config.fileData || context.input?.fileData;
        if (fileDataRaw) {
          if (typeof fileDataRaw === 'object' && fileDataRaw.base64) {
            fileData = fileDataRaw;
          } else if (typeof fileDataRaw === 'string') {
            try {
              const parsed = JSON.parse(fileDataRaw);
              if (parsed && parsed.base64 && parsed.name) {
                fileData = parsed;
              }
            } catch (e) {
              // Not valid JSON
            }
          }
        }
      }
      
      const outputFormat = config.outputFormat || 'text';
      const extractImages = config.extractImages || false;
      const extractTables = config.extractTables || true;
      const chunkSize = config.chunkSize || 1000;
      const chunkOverlap = config.chunkOverlap || 200;

      // If we have file data (base64), create temp file
      if (fileData && fileData.base64 && fileData.name) {
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const fileExtension = path.extname(fileData.name);
        tempFilePath = path.join(tempDir, `doc_${Date.now()}_${Math.random().toString(36).slice(2)}${fileExtension}`);
        
        // Write base64 data to temporary file
        const fileBuffer = Buffer.from(fileData.base64, 'base64');
        fs.writeFileSync(tempFilePath, fileBuffer);
        
        filePath = tempFilePath;
        
        logger.info('Processing uploaded document', {
          nodeId: node.id,
          fileName: fileData.name,
          fileSize: fileData.size,
          tempPath: tempFilePath,
          runId: context.runId
        });
      }

      if (!filePath) {
        logger.error('DocumentProcessor: No file found', {
          nodeId: node.id,
          configKeys: Object.keys(config),
          inputKeys: Object.keys(context.input || {}),
          hasConfigFile: !!config.filePath,
          hasInputFile: !!context.input?.filePath,
          runId: context.runId
        });
        throw new Error('File path or file upload is required. Please upload a file or provide a file path in the node configuration.');
      }

      logger.info('Processing document from file path', {
        nodeId: node.id,
        filePath,
        runId: context.runId
      });

      // Get file extension
      const ext = path.extname(filePath).toLowerCase();
      let content = '';
      let metadata: any = {};
      let images: any[] = [];
      let tables: any[] = [];

      // Process based on file type
      switch (ext) {
        case '.pdf':
          const pdfResult = await this.processPDF(filePath, extractImages, extractTables);
          content = pdfResult.content;
          metadata = pdfResult.metadata;
          images = pdfResult.images;
          tables = pdfResult.tables;
          break;
        
        case '.docx':
          const docxResult = await this.processDOCX(filePath, extractImages, extractTables);
          content = docxResult.content;
          metadata = docxResult.metadata;
          images = docxResult.images;
          tables = docxResult.tables;
          break;
        
        case '.txt':
        case '.md':
          content = await this.processText(filePath);
          break;
        
        case '.csv':
          const csvResult = await this.processCSV(filePath);
          content = csvResult.content;
          tables = csvResult.tables;
          break;
        
        default:
          throw new Error(`Unsupported file type: ${ext}`);
      }

      // Chunk the content if needed
      const chunks = this.chunkText(content, chunkSize, chunkOverlap);

      // Format output
      let formattedContent = content;
      if (outputFormat === 'json') {
        formattedContent = JSON.stringify({
          content,
          metadata,
          images,
          tables,
          chunks
        });
      } else if (outputFormat === 'markdown') {
        formattedContent = this.convertToMarkdown(content, tables);
      }

      const duration = Date.now() - startTime;

      logger.externalService('DocumentProcessor', 'process', duration, true, {
        nodeId: node.id,
        fileType: ext,
        contentLength: content.length,
        runId: context.runId
      });

      // Clean up temporary file if we created one
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          logger.warn('Failed to clean up temporary file', {
            tempFilePath,
            error: cleanupError
          });
        }
      }

      return {
        success: true,
        output: {
          content: formattedContent,
          chunks,
          metadata,
          images,
          tables
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Clean up temporary file on error
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          logger.warn('Failed to clean up temporary file on error', {
            tempFilePath,
            error: cleanupError
          });
        }
      }
      
      logger.externalService('DocumentProcessor', 'process', duration, false, {
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
  }

  private async processPDF(filePath: string, extractImages: boolean, extractTables: boolean): Promise<any> {
    // This is a simplified implementation
    // In production, you'd use libraries like pdf-parse, pdf2pic, etc.
    try {
      const pdfParse = require('pdf-parse');
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      
      return {
        content: data.text,
        metadata: {
          pages: data.numpages,
          info: data.info
        },
        images: extractImages ? [] : [], // Would extract images here
        tables: extractTables ? [] : [] // Would extract tables here
      };
    } catch (error) {
      throw new Error(`Failed to process PDF: ${error}`);
    }
  }

  private async processDOCX(filePath: string, extractImages: boolean, extractTables: boolean): Promise<any> {
    // This is a simplified implementation
    // In production, you'd use libraries like mammoth, docx, etc.
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      
      return {
        content: result.value,
        metadata: {
          messages: result.messages
        },
        images: extractImages ? [] : [], // Would extract images here
        tables: extractTables ? [] : [] // Would extract tables here
      };
    } catch (error) {
      throw new Error(`Failed to process DOCX: ${error}`);
    }
  }

  private async processText(filePath: string): Promise<string> {
    return fs.readFileSync(filePath, 'utf-8');
  }

  private async processCSV(filePath: string): Promise<any> {
    try {
      const csv = require('csv-parser');
      const results: any[] = [];
      
      return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data: any) => results.push(data))
          .on('end', () => {
            resolve({
              content: JSON.stringify(results),
              tables: [results]
            });
          })
          .on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to process CSV: ${error}`);
    }
  }

  private chunkText(text: string, chunkSize: number, chunkOverlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.slice(start, end);
      chunks.push(chunk);
      start = end - chunkOverlap;
    }
    
    return chunks;
  }

  private convertToMarkdown(content: string, tables: any[]): string {
    let markdown = content;
    
    // Add tables to markdown
    tables.forEach((table, index) => {
      if (Array.isArray(table) && table.length > 0) {
        markdown += `\n\n## Table ${index + 1}\n\n`;
        // Convert table to markdown format
        // This is simplified - you'd implement proper table conversion
      }
    });
    
    return markdown;
  }}


export default DocumentProcessorNode;
