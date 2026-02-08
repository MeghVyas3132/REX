import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
import { logger } from '../../utils/logger';
import fs from 'fs/promises';
import path from 'path';
// xlsx is already in package.json; import lazily to avoid startup cost
// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX = require('xlsx');

export class FileExportNode {
  getNodeDefinition() {
    return {
      id: 'file-export',
      type: 'action',
      name: 'File Export',
      description: 'Export data to a downloadable file in uploads directory',
      category: 'file-processing',
      version: '1.0.0',
      author: 'Workflow Studio',
      inputs: [
        { id: 'data', name: 'Data', type: 'any', required: true, description: 'Data to export (array/object/string)' },
      ],
      outputs: [
        { id: 'filePath', name: 'File Path', type: 'string', description: 'Absolute path to exported file' },
        { id: 'fileName', name: 'File Name', type: 'string', description: 'Exported file name' },
        { id: 'downloadUrl', name: 'Download URL', type: 'string', description: 'Backend URL to download' },
      ],
      configSchema: {
        type: 'object',
        properties: {
          // Primary (singular) format used by backend
          format: { type: 'string', enum: ['json','csv','txt','xlsx'], default: 'json' },
          // Compatibility: accept frontend's plural array and map to format[0]
          formats: { type: 'array', items: { type: 'string' }, description: 'Compatibility with frontend array input' },
          // Optional flags from frontend; ignored by exporter but allowed
          includeMetadata: { type: 'boolean', description: 'Frontend flag; accepted and ignored by exporter' },
          compressOutput: { type: 'boolean', description: 'Frontend flag; accepted and ignored by exporter' },
          fileName: { type: 'string', description: 'Optional file name without extension' },
          headers: { type: 'array', items: { type: 'string' }, description: 'CSV headers (optional)' },
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    try {
      const config = node.data?.config || {};
      const cfg = config;
      // Determine format with compatibility for `formats` (array)
      // Priority: cfg.format > cfg.formats[0] > default 'json'
      let format: 'json'|'csv'|'txt'|'xlsx' = 'json';
      
      // First check cfg.format
      if (cfg.format && typeof cfg.format === 'string') {
        const formatLower = String(cfg.format).toLowerCase().trim();
        if (['json','csv','txt','xlsx'].includes(formatLower)) {
          format = formatLower as 'json'|'csv'|'txt'|'xlsx';
        }
      }
      // If format not found, check cfg.formats array
      else if (Array.isArray(cfg.formats) && cfg.formats.length > 0) {
        const first = String(cfg.formats[0]).toLowerCase().trim();
        if (['json','csv','txt','xlsx'].includes(first)) {
          format = first as 'json'|'csv'|'txt'|'xlsx';
        }
      }
      
      // Log format detection for debugging
      logger.info('File export format detected', { 
        format, 
        cfgFormat: cfg.format, 
        cfgFormats: cfg.formats 
      });
      const baseName = (cfg.fileName || `export_${Date.now()}`) as string;
      // Accept multiple common shapes from previous nodes
      const data = (context.input?.data ?? context.input?.cleanedData ?? context.input?.transformedData ?? context.input);

      if (data === undefined) {
        throw new Error('No input data provided to export');
      }

      const uploadsDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });

      let out = '';
      let ext = '.' + format;
      let fileBuffer: Buffer | null = null;
      const rows: any[] = Array.isArray(data) ? data : [data];

      if (format === 'json') {
        out = JSON.stringify(data, null, 2);
      } else if (format === 'txt') {
        out = typeof data === 'string' ? data : Array.isArray(data) ? data.join('\n') : JSON.stringify(data);
      } else if (format === 'csv' || format === 'xlsx') {
        const headers: string[] = cfg.headers && cfg.headers.length ? cfg.headers : Array.from(new Set(rows.flatMap(r => typeof r === 'object' && r !== null ? Object.keys(r) : ['value'])));
        // Build CSV string (also used as sheet source)
        const makeRow = (r: any) => headers.map(h => {
          const v = (typeof r === 'object' && r !== null) ? r[h] : r;
          const s = v === undefined || v === null ? '' : String(v);
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
        }).join(',');
        const csv = headers.join(',') + '\n' + rows.map(makeRow).join('\n');
        if (format === 'csv') {
          out = csv;
        } else {
          // xlsx: create workbook from rows
          const normalized = rows.map(r => (typeof r === 'object' && r !== null) ? r : { value: r });
          const ws = XLSX.utils.json_to_sheet(normalized, { header: headers.length ? headers : undefined });
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
          fileBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
          ext = '.xlsx';
        }
      }

      const fileName = `${baseName}${ext}`;
      const filePath = path.join(uploadsDir, fileName);
      if (fileBuffer) {
        await fs.writeFile(filePath, fileBuffer);
      } else {
        await fs.writeFile(filePath, out, 'utf8');
      }

      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3003}`;
      const downloadUrl = `${baseUrl}/api/file-processing/download/${encodeURIComponent(fileName)}`;

      logger.info('File exported', { fileName, filePath });

      return {
        success: true,
        output: { filePath, fileName, downloadUrl },
        };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('File export failed', error as Error);
      return { success: false, error: error.message, duration };
    }
  }}


export default FileExportNode;


