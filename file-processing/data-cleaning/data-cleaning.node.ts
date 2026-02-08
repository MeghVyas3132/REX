import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
import { logger } from '../../utils/logger';
import fs from 'fs/promises';
import path from 'path';

export class DataCleaningNode {
  getNodeDefinition() {
    return {
      id: 'data-cleaning',
      type: 'action',
      name: 'Data Cleaning',
      description: 'Clean and normalize data using various techniques',
      category: 'file-processing',
      version: '1.0.0',
      author: 'Workflow Studio',
      inputs: [
        {
          id: 'data',
          name: 'Data',
          type: 'any',
          required: true,
          description: 'Data to clean (array, object, or string)'
        },
        {
          id: 'dataType',
          name: 'Data Type',
          type: 'string',
          required: false,
          description: 'Type of data (array, object, string, csv)'
        }
      ],
      outputs: [
        {
          id: 'cleanedData',
          name: 'Cleaned Data',
          type: 'any',
          description: 'Cleaned and normalized data'
        },
        {
          id: 'cleaningReport',
          name: 'Cleaning Report',
          type: 'object',
          description: 'Report of cleaning operations performed'
        },
        {
          id: 'removedItems',
          name: 'Removed Items',
          type: 'array',
          description: 'Items that were removed during cleaning'
        }
      ],
      configSchema: {
        type: 'object',
        properties: {
          cleaningOperations: {
            type: 'array',
            items: { 
              type: 'string',
              enum: ['removeDuplicates', 'removeNulls', 'normalizeText', 'removeOutliers', 'standardizeFormat', 'validateData']
            },
            default: ['removeDuplicates', 'removeNulls', 'normalizeText'],
            description: 'Types of cleaning operations to perform'
          },
          removeDuplicates: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: true },
              keyFields: { type: 'array', items: { type: 'string' } },
              caseSensitive: { type: 'boolean', default: false }
            }
          },
          removeNulls: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: true },
              strategy: { 
                type: 'string', 
                enum: ['removeRows', 'removeColumns', 'fillWithDefault', 'interpolate'],
                default: 'removeRows'
              },
              fillValue: { type: 'string', default: '' },
              nullValues: { 
                type: 'array', 
                items: { type: 'string' },
                default: ['', 'null', 'NULL', 'undefined', 'N/A', 'n/a']
              }
            }
          },
          normalizeText: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: true },
              operations: {
                type: 'array',
                items: { 
                  type: 'string',
                  enum: ['trim', 'lowercase', 'uppercase', 'removeSpecialChars', 'normalizeWhitespace', 'removeAccents']
                },
                default: ['trim', 'normalizeWhitespace']
              },
              fields: { type: 'array', items: { type: 'string' } }
            }
          },
          removeOutliers: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: false },
              method: { 
                type: 'string', 
                enum: ['iqr', 'zscore', 'percentile'],
                default: 'iqr'
              },
              threshold: { type: 'number', default: 1.5 },
              fields: { type: 'array', items: { type: 'string' } }
            }
          },
          standardizeFormat: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: false },
              dateFormat: { type: 'string', default: 'YYYY-MM-DD' },
              numberFormat: { type: 'string', default: 'decimal' },
              phoneFormat: { type: 'string', default: 'international' },
              emailFormat: { type: 'boolean', default: true }
            }
          },
          validateData: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: false },
              rules: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    type: { type: 'string', enum: ['email', 'phone', 'date', 'number', 'url', 'regex'] },
                    pattern: { type: 'string' },
                    required: { type: 'boolean' }
                  }
                }
              }
            }
          },
          enableMlPreprocessing: {
            type: 'boolean',
            default: false,
            description: 'Enable machine learning preprocessing'
          },
          imputeStrategy: {
            type: 'string',
            enum: ['mean', 'median', 'mode', 'forward', 'backward'],
            default: 'mean',
            description: 'Strategy for imputing missing values'
          },
          removeRowsWithNull: {
            type: 'boolean',
            default: true,
            description: 'Remove rows with null values'
          },
          normalization: {
            type: 'string',
            enum: ['minmax', 'zscore', 'robust'],
            default: 'minmax',
            description: 'Normalization method'
          },
          outlierHandling: {
            type: 'string',
            enum: ['clip', 'remove', 'transform'],
            default: 'clip',
            description: 'How to handle outliers'
          }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    try {
      const config = node.data?.config || {};
      // Make cleaning operations optional and safe
      const enableMlPreprocessing = Boolean(config.enableMlPreprocessing);
      let cleaningOperations: string[] = Array.isArray(config.cleaningOperations)
        ? config.cleaningOperations as string[]
        : ['removeDuplicates', 'removeNulls', 'normalizeText'];
      
      logger.info('Data cleaning node executing', { 
        cleaningOperations, 
        enableMlPreprocessing,
        nodeId: node.id 
      });

      // Accept either direct data or a file path from previous node (e.g., file-upload)
      let data = context.input?.data;
      if (!data && context.input?.filePath) {
        const filePath = context.input?.filePath as string;
        try {
          const ext = path.extname(filePath).toLowerCase();
          const content = await fs.readFile(filePath, 'utf8');
          if (ext === '.json') {
            data = JSON.parse(content);
          } else if (ext === '.csv') {
            const lines = content.split(/\r?\n/).filter(Boolean);
            const delimiter = [',',';','\t','|'].sort((a,b) => (content.split(a).length) - (content.split(b).length)).pop() || ',';
            const rows = lines.map(l => l.split(delimiter));
            const [header, ...rest] = rows;
            if (header && header.length > 1) {
              data = rest.map(r => Object.fromEntries(header.map((h,i) => [h, r[i]])));
            } else {
              data = rows; // fallback as array of arrays
            }
          } else if (ext === '.txt') {
            data = content.split(/\r?\n/).filter(Boolean);
          } else {
            // default: try JSON first, else raw text
            try { data = JSON.parse(content); } catch { data = content; }
          }
        } catch (e: any) {
          logger.warn('Failed to read input file for data-cleaning', { filePath, error: e?.message });
        }
      }

      const dataType = context.input?.dataType || this.detectDataType(data);
      
      const cleaningReport: any = {
        originalCount: this.getDataCount(data),
        operations: [],
        removedItems: [],
        errors: [],
        warnings: []
      };

      // Perform cleaning operations (if any)
      for (const operation of (cleaningOperations || [])) {
        try {
          const result = await this.performCleaningOperation(
            data,
            operation,
            // Provide safe defaults for nested configs to avoid undefined errors
            {
              ...config,
              removeDuplicates: { enabled: true, ...(config?.removeDuplicates || {}) },
              removeNulls: { enabled: true, strategy: 'removeRows', fillValue: '', nullValues: ['', 'null', 'NULL', 'undefined', 'N/A', 'n/a'], ...(config?.removeNulls || {}) },
              normalizeText: { enabled: true, operations: ['trim', 'normalizeWhitespace'], fields: [], ...(config?.normalizeText || {}) },
              removeOutliers: { enabled: false, method: 'iqr', threshold: 1.5, fields: [], ...(config?.removeOutliers || {}) },
              standardizeFormat: { enabled: false, ...(config?.standardizeFormat || {}) },
              validateData: { rules: [], ...(config?.validateData || {}) }
            },
            cleaningReport
          );
          data = result.data;
          cleaningReport.operations.push({
            operation,
            success: true,
            itemsProcessed: result.itemsProcessed,
            itemsRemoved: result.itemsRemoved
          });
        } catch (error: any) {
          cleaningReport.errors.push({
            operation,
            error: error.message
          });
          logger.warn(`Cleaning operation ${operation} failed`, { error: error.message });
        }
      }

      // ML preprocessing if enabled
      if (enableMlPreprocessing) {
        data = await this.performMlPreprocessing(data, config, cleaningReport);
      }

      cleaningReport.finalCount = this.getDataCount(data);
      cleaningReport.cleaningRatio = cleaningReport.originalCount > 0 ? 
        (cleaningReport.originalCount - cleaningReport.finalCount) / cleaningReport.originalCount : 0;

      // Ensure cleanedData is available in a format that next nodes can use
      // Also provide as 'content' for compatibility with nodes that expect that field name
      const output: any = {
        cleanedData: data,
        cleaningReport,
        removedItems: cleaningReport.removedItems,
        // For compatibility with Google Drive and other nodes
        content: typeof data === 'string' ? data : (Array.isArray(data) || typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)),
        fileContent: typeof data === 'string' ? data : (Array.isArray(data) || typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data))
      };
      
      // Preserve fileInfo and filePath from previous node if available
      if (context.input?.fileInfo) {
        output.fileInfo = context.input?.fileInfo;
      }
      if (context.input?.filePath) {
        output.filePath = context.input?.filePath;
        // Generate filename suggestion for Google Drive
        if (context.input?.fileInfo?.name) {
          output.fileName = context.input?.fileInfo.name.replace(/\.(json|csv|txt)$/i, '_cleaned$1');
        }
      }
      
      logger.info('Data cleaning completed - output summary', {
        nodeId: node.id,
        runId: context.runId,
        originalCount: cleaningReport.originalCount,
        finalCount: cleaningReport.finalCount,
        outputKeys: Object.keys(output),
        hasCleanedData: !!output.cleanedData,
        hasContent: !!output.content,
        hasFileContent: !!output.fileContent,
        hasFileInfo: !!output.fileInfo,
        hasFilePath: !!output.filePath,
        contentType: typeof output.content,
        contentLength: output.content?.length,
        cleanedDataType: typeof output.cleanedData,
        cleanedDataIsArray: Array.isArray(output.cleanedData),
        cleanedDataIsObject: typeof output.cleanedData === 'object' && !Array.isArray(output.cleanedData)
      });

      return {
        success: true,
        output,
        duration: Date.now() - (context as any).startTime
      };

    } catch (error: any) {
      logger.error('Data cleaning failed', error as Error, { nodeId: node.id });
      return {
        success: false,
        error: error.message,
        duration: Date.now() - (context as any).startTime
      };
    }
  }

  private async performCleaningOperation(data: any, operation: string, config: any, report: any): Promise<any> {
    let itemsProcessed = 0;
    let itemsRemoved = 0;

    switch (operation) {
      case 'removeDuplicates':
        const duplicateResult = this.removeDuplicates(data, config?.removeDuplicates || {});
        return {
          data: duplicateResult.data,
          itemsProcessed: duplicateResult.processed,
          itemsRemoved: duplicateResult.removed
        };

      case 'removeNulls':
        const nullResult = this.removeNulls(data, config?.removeNulls || {});
        return {
          data: nullResult.data,
          itemsProcessed: nullResult.processed,
          itemsRemoved: nullResult.removed
        };

      case 'normalizeText':
        const textResult = this.normalizeText(data, config?.normalizeText || {});
        return {
          data: textResult.data,
          itemsProcessed: textResult.processed,
          itemsRemoved: textResult.removed
        };

      case 'removeOutliers':
        const outlierResult = this.removeOutliers(data, config?.removeOutliers || {});
        return {
          data: outlierResult.data,
          itemsProcessed: outlierResult.processed,
          itemsRemoved: outlierResult.removed
        };

      case 'standardizeFormat':
        const formatResult = this.standardizeFormat(data, config?.standardizeFormat || {});
        return {
          data: formatResult.data,
          itemsProcessed: formatResult.processed,
          itemsRemoved: formatResult.removed
        };

      case 'validateData':
        const validationResult = this.validateData(data, config?.validateData || {});
        return {
          data: validationResult.data,
          itemsProcessed: validationResult.processed,
          itemsRemoved: validationResult.removed
        };

      default:
        throw new Error(`Unknown cleaning operation: ${operation}`);
    }
  }

  private removeDuplicates(data: any, config: any = {}): any {
    if (!Array.isArray(data)) {
      return { data, processed: 0, removed: 0 };
    }

    if (config.enabled === false) {
      return { data, processed: data.length, removed: 0 };
    }

    const { keyFields = [], caseSensitive = false } = config;
    const seen = new Set();
    const cleaned = [];
    let removed = 0;

    for (const item of data) {
      let key;
      if (keyFields.length > 0) {
        key = keyFields.map(field => this.getNestedValue(item, field)).join('|');
      } else {
        key = JSON.stringify(item);
      }

      if (!caseSensitive && typeof key === 'string') {
        key = key.toLowerCase();
      }

      if (!seen.has(key)) {
        seen.add(key);
        cleaned.push(item);
      } else {
        removed++;
      }
    }

    return { data: cleaned, processed: data.length, removed };
  }

  private removeNulls(data: any, config: any = {}): any {
    if (config.enabled === false) {
      return { data, processed: this.getDataCount(data), removed: 0 };
    }

    const { strategy = 'removeRows', fillValue = '', nullValues = ['', 'null', 'NULL', 'undefined', 'N/A', 'n/a'] } = config;

    if (Array.isArray(data)) {
      return this.removeNullsFromArray(data, strategy, fillValue, nullValues);
    } else if (typeof data === 'object' && data !== null) {
      return this.removeNullsFromObject(data, strategy, fillValue, nullValues);
    }

    return { data, processed: 1, removed: 0 };
  }

  private removeNullsFromArray(data: any[], strategy: string, fillValue: any, nullValues: string[]): any {
    // If the array contains objects, handle row-wise (per-field) nulls
    const isArrayOfObjects = data.some((item) => typeof item === 'object' && item !== null);
    let removed = 0;

    if (isArrayOfObjects) {
      if (strategy === 'removeRows') {
        const cleaned = data.filter((row) => {
          if (typeof row !== 'object' || row === null) {
            return !this.isNullValue(row, nullValues);
          }
          const hasAnyNull = Object.values(row).some((v) => this.isNullValue(v as any, nullValues));
          if (hasAnyNull) removed++;
          return !hasAnyNull;
        });
        return { data: cleaned, processed: data.length, removed };
      }

      if (strategy === 'fillWithDefault') {
        const cleaned = data.map((row) => {
          if (typeof row !== 'object' || row === null) {
            return this.isNullValue(row, nullValues) ? fillValue : row;
          }
          const next: any = Array.isArray(row) ? [...row] : { ...row };
          for (const key of Object.keys(next)) {
            if (this.isNullValue(next[key], nullValues)) {
              next[key] = fillValue;
            }
          }
          return next;
        });
        return { data: cleaned, processed: data.length, removed: 0 };
      }

      if (strategy === 'removeColumns') {
        // Remove keys that are null across ALL rows
        const keys = new Set<string>();
        data.forEach((row) => {
          if (typeof row === 'object' && row !== null) {
            Object.keys(row).forEach((k) => keys.add(k));
          }
        });
        const keysToRemove: string[] = [];
        keys.forEach((k) => {
          const allNull = data.every((row) => {
            if (typeof row !== 'object' || row === null) return true;
            return this.isNullValue((row as any)[k], nullValues);
          });
          if (allNull) keysToRemove.push(k);
        });
        const cleaned = data.map((row) => {
          if (typeof row !== 'object' || row === null) return row;
          const next: any = Array.isArray(row) ? [...row] : { ...row };
          for (const k of keysToRemove) delete next[k];
          return next;
        });
        return { data: cleaned, processed: data.length, removed: 0 };
      }

      // Default: no structural change
      return { data, processed: data.length, removed: 0 };
    }

    // Primitive array handling (strings/numbers/etc.)
    const cleaned: any[] = [];
    for (const item of data) {
      if (this.isNullValue(item, nullValues)) {
        if (strategy === 'removeRows') {
          removed++;
          continue;
        } else if (strategy === 'fillWithDefault') {
          cleaned.push(fillValue);
        } else {
          cleaned.push(item);
        }
      } else {
        cleaned.push(item);
      }
    }
    return { data: cleaned, processed: data.length, removed };
  }

  private removeNullsFromObject(data: any, strategy: string, fillValue: any, nullValues: string[]): any {
    const cleaned = { ...data };
    let removed = 0;

    for (const [key, value] of Object.entries(data)) {
      if (this.isNullValue(value, nullValues)) {
        if (strategy === 'removeColumns') {
          delete cleaned[key];
          removed++;
        } else if (strategy === 'fillWithDefault') {
          cleaned[key] = fillValue;
        }
      }
    }

    return { data: cleaned, processed: Object.keys(data).length, removed };
  }

  private normalizeText(data: any, config: any = {}): any {
    if (config.enabled === false) {
      return { data, processed: this.getDataCount(data), removed: 0 };
    }

    const { operations = ['trim', 'normalizeWhitespace'], fields = [] } = config;

    if (Array.isArray(data)) {
      return this.normalizeTextInArray(data, operations, fields);
    } else if (typeof data === 'object' && data !== null) {
      return this.normalizeTextInObject(data, operations, fields);
    } else if (typeof data === 'string') {
      return { data: this.applyTextOperations(data, operations), processed: 1, removed: 0 };
    }

    return { data, processed: 1, removed: 0 };
  }

  private normalizeTextInArray(data: any[], operations: string[], fields: string[]): any {
    const cleaned = data.map(item => {
      if (typeof item === 'string') {
        return this.applyTextOperations(item, operations);
      } else if (typeof item === 'object' && item !== null) {
        return this.normalizeTextInObject(item, operations, fields);
      }
      return item;
    });

    return { data: cleaned, processed: data.length, removed: 0 };
  }

  private normalizeTextInObject(data: any, operations: string[], fields: string[]): any {
    const cleaned = { ...data };
    const targetFields = fields.length > 0 ? fields : Object.keys(data);

    for (const field of targetFields) {
      const value = this.getNestedValue(cleaned, field);
      if (typeof value === 'string') {
        this.setNestedValue(cleaned, field, this.applyTextOperations(value, operations));
      }
    }

    return { data: cleaned, processed: Object.keys(data).length, removed: 0 };
  }

  private applyTextOperations(text: string, operations: string[]): string {
    let result = text;

    for (const operation of operations) {
      switch (operation) {
        case 'trim':
          result = result.trim();
          break;
        case 'lowercase':
          result = result.toLowerCase();
          break;
        case 'uppercase':
          result = result.toUpperCase();
          break;
        case 'removeSpecialChars':
          result = result.replace(/[^\w\s]/g, '');
          break;
        case 'normalizeWhitespace':
          result = result.replace(/\s+/g, ' ');
          break;
        case 'removeAccents':
          result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          break;
      }
    }

    return result;
  }

  private removeOutliers(data: any, config: any = {}): any {
    if (config.enabled === false) {
      return { data, processed: this.getDataCount(data), removed: 0 };
    }

    const { method = 'iqr', threshold = 1.5, fields = [] } = config;

    if (!Array.isArray(data) || data.length === 0) {
      return { data, processed: 0, removed: 0 };
    }

    const cleaned = [];
    let removed = 0;

    for (const item of data) {
      let isOutlier = false;

      for (const field of fields) {
        const value = this.getNestedValue(item, field);
        if (typeof value === 'number') {
          if (this.isOutlier(value, data, field, method, threshold)) {
            isOutlier = true;
            break;
          }
        }
      }

      if (!isOutlier) {
        cleaned.push(item);
      } else {
        removed++;
      }
    }

    return { data: cleaned, processed: data.length, removed };
  }

  private isOutlier(value: number, data: any[], field: string, method: string, threshold: number): boolean {
    const values = data.map(item => this.getNestedValue(item, field)).filter(v => typeof v === 'number');

    if (values.length < 3) return false;

    switch (method) {
      case 'iqr':
        return this.isOutlierIQR(value, values, threshold);
      case 'zscore':
        return this.isOutlierZScore(value, values, threshold);
      case 'percentile':
        return this.isOutlierPercentile(value, values, threshold);
      default:
        return false;
    }
  }

  private isOutlierIQR(value: number, values: number[], threshold: number): boolean {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - threshold * iqr;
    const upperBound = q3 + threshold * iqr;
    return value < lowerBound || value > upperBound;
  }

  private isOutlierZScore(value: number, values: number[], threshold: number): boolean {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const zScore = Math.abs((value - mean) / stdDev);
    return zScore > threshold;
  }

  private isOutlierPercentile(value: number, values: number[], threshold: number): boolean {
    const sorted = [...values].sort((a, b) => a - b);
    const lowerPercentile = sorted[Math.floor(sorted.length * (threshold / 100))];
    const upperPercentile = sorted[Math.floor(sorted.length * (1 - threshold / 100))];
    return value < lowerPercentile || value > upperPercentile;
  }

  private standardizeFormat(data: any, config: any = {}): any {
    if (config.enabled === false) {
      return { data, processed: this.getDataCount(data), removed: 0 };
    }
    // Implementation for standardizing formats (dates, numbers, phones, emails)
    // This is a simplified version - in production you'd want more robust formatting
    return { data, processed: this.getDataCount(data), removed: 0 };
  }

  private validateData(data: any, config: any = {}): any {
    const { rules = [] } = config;
    let removed = 0;

    if (Array.isArray(data)) {
      const cleaned = data.filter(item => {
        for (const rule of rules) {
          const value = this.getNestedValue(item, rule.field);
          if (!this.validateField(value, rule)) {
            removed++;
            return false;
          }
        }
        return true;
      });
      return { data: cleaned, processed: data.length, removed };
    }

    return { data, processed: 1, removed: 0 };
  }

  private validateField(value: any, rule: any): boolean {
    if (rule.required && (value === null || value === undefined || value === '')) {
      return false;
    }

    switch (rule.type) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'phone':
        return /^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, ''));
      case 'date':
        return !isNaN(Date.parse(value));
      case 'number':
        return !isNaN(Number(value));
      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      case 'regex':
        return new RegExp(rule.pattern).test(value);
      default:
        return true;
    }
  }

  private async performMlPreprocessing(data: any, config: any, report: any): Promise<any> {
    if (!Array.isArray(data) || data.length === 0) {
      report.operations.push({
        operation: 'mlPreprocessing',
        success: true,
        itemsProcessed: 0,
        itemsRemoved: 0,
        warning: 'ML preprocessing requires array data'
      });
      return data;
    }

    let processedData = [...data];
    const originalCount = processedData.length;
    const { imputeStrategy = 'mean', normalization = 'minmax', outlierHandling = 'clip', removeRowsWithNull = true } = config;

    // Step 1: Remove rows with null values if requested
    if (removeRowsWithNull) {
      processedData = processedData.filter(row => {
        if (typeof row !== 'object' || row === null) return false;
        return Object.values(row).every(val => val !== null && val !== undefined && val !== '');
      });
    }

    // Step 2: Imputation (fill missing numeric values)
    if (imputeStrategy && processedData.length > 0) {
      const numericFields = this.getNumericFields(processedData);
      for (const field of numericFields) {
        const values = processedData.map(row => this.getNestedValue(row, field)).filter(v => typeof v === 'number' && !isNaN(v));
        if (values.length === 0) continue;
        
        let imputeValue = 0;
        switch (imputeStrategy) {
          case 'mean':
            imputeValue = values.reduce((sum, v) => sum + v, 0) / values.length;
            break;
          case 'median':
            const sorted = [...values].sort((a, b) => a - b);
            imputeValue = sorted[Math.floor(sorted.length / 2)];
            break;
          case 'mode':
            const freq: Record<string, number> = {};
            values.forEach(v => freq[v] = (freq[v] || 0) + 1);
            imputeValue = parseFloat(Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b));
            break;
          case 'zero':
            imputeValue = 0;
            break;
        }
        
        processedData.forEach(row => {
          const val = this.getNestedValue(row, field);
          if (val === null || val === undefined || val === '' || isNaN(Number(val))) {
            this.setNestedValue(row, field, imputeValue);
          }
        });
      }
    }

    // Step 3: Normalization (scale numeric features)
    if (normalization !== 'none' && processedData.length > 0) {
      const numericFields = this.getNumericFields(processedData);
      for (const field of numericFields) {
        const values = processedData.map(row => Number(this.getNestedValue(row, field))).filter(v => !isNaN(v));
        if (values.length === 0) continue;

        const min = Math.min(...values);
        const max = Math.max(...values);
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        processedData.forEach(row => {
          let val = Number(this.getNestedValue(row, field));
          if (isNaN(val)) return;
          
          switch (normalization) {
            case 'minmax':
              if (max !== min) {
                val = (val - min) / (max - min);
              }
              break;
            case 'zscore':
              if (stdDev > 0) {
                val = (val - mean) / stdDev;
              }
              break;
          }
          this.setNestedValue(row, field, val);
        });
      }
    }

    // Step 4: Outlier handling
    if (outlierHandling !== 'none' && processedData.length > 0) {
      const numericFields = this.getNumericFields(processedData);
      for (const field of numericFields) {
        const values = processedData.map(row => Number(this.getNestedValue(row, field))).filter(v => !isNaN(v));
        if (values.length < 3) continue;

        const sorted = [...values].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;

        if (outlierHandling === 'remove') {
          processedData = processedData.filter(row => {
            const val = Number(this.getNestedValue(row, field));
            return !isNaN(val) && val >= lowerBound && val <= upperBound;
          });
        } else if (outlierHandling === 'clip') {
          processedData.forEach(row => {
            const val = Number(this.getNestedValue(row, field));
            if (!isNaN(val)) {
              const clippedVal = Math.max(lowerBound, Math.min(upperBound, val));
              this.setNestedValue(row, field, clippedVal);
            }
          });
        }
      }
    }

    const itemsRemoved = originalCount - processedData.length;
    report.operations.push({
      operation: 'mlPreprocessing',
      success: true,
      itemsProcessed: originalCount,
      itemsRemoved,
      config: { imputeStrategy, normalization, outlierHandling, removeRowsWithNull }
    });

    return processedData;
  }

  private getNumericFields(data: any[]): string[] {
    if (data.length === 0) return [];
    const fields = new Set<string>();
    data.forEach(row => {
      if (typeof row === 'object' && row !== null) {
        Object.keys(row).forEach(key => {
          const val = (row as any)[key];
          if (typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)))) {
            fields.add(key);
          }
        });
      }
    });
    return Array.from(fields);
  }

  private detectDataType(data: any): string {
    if (Array.isArray(data)) return 'array';
    if (typeof data === 'object' && data !== null) return 'object';
    if (typeof data === 'string') return 'string';
    return 'unknown';
  }

  private getDataCount(data: any): number {
    if (Array.isArray(data)) return data.length;
    if (typeof data === 'object' && data !== null) return Object.keys(data).length;
    return 1;
  }

  private isNullValue(value: any, nullValues: string[]): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') {
      return nullValues.includes(value.toLowerCase());
    }
    return false;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }}


export default DataCleaningNode;
