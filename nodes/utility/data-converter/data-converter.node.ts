import { WorkflowNode, ExecutionContext, ExecutionResult, NodeType } from '@rex/shared';
import { logger } from '../../lib/logger.js';

export class DataConverterNode {
  getNodeDefinition() {
    return {
      id: 'data-converter',
      type: 'action' as NodeType,
      name: 'Data Converter',
      description: 'Convert data between formats (CSV, XLSX, JSON, XML, HTML, PDF)',
      category: 'utility',
      version: '1.0.0',
      author: 'Workflow Studio',
      parameters: [
        {
          name: 'fromFormat',
          type: 'options',
          displayName: 'From Format',
          description: 'Source data format',
          required: true,
          default: 'json',
          options: [
            { name: 'JSON', value: 'json' },
            { name: 'CSV', value: 'csv' },
            { name: 'XML', value: 'xml' },
            { name: 'HTML', value: 'html' },
            { name: 'XLSX', value: 'xlsx' }
          ]
        },
        {
          name: 'toFormat',
          type: 'options',
          displayName: 'To Format',
          description: 'Target data format',
          required: true,
          default: 'json',
          options: [
            { name: 'JSON', value: 'json' },
            { name: 'CSV', value: 'csv' },
            { name: 'XML', value: 'xml' },
            { name: 'HTML', value: 'html' },
            { name: 'XLSX', value: 'xlsx' }
          ]
        },
        {
          name: 'options',
          type: 'object',
          displayName: 'Conversion Options',
          description: 'Format-specific conversion options',
          required: false
        }
      ],
      inputs: [
        {
          name: 'data',
          type: 'any',
          displayName: 'Input Data',
          description: 'Data to convert',
          required: true,
          dataType: 'any'
        }
      ],
      outputs: [
        {
          name: 'convertedData',
          type: 'any',
          displayName: 'Converted Data',
          description: 'Data in the target format',
          dataType: 'any'
        },
        {
          name: 'format',
          type: 'string',
          displayName: 'Format',
          description: 'Format of the converted data',
          dataType: 'text'
        }
      ],
      configSchema: {
        type: 'object',
        properties: {
          fromFormat: { type: 'string', enum: ['json', 'csv', 'xml', 'html', 'xlsx'] },
          toFormat: { type: 'string', enum: ['json', 'csv', 'xml', 'html', 'xlsx'] },
          // Support frontend naming for backward compatibility
          inputFormat: { type: 'string', enum: ['json', 'csv', 'xml', 'html', 'xlsx'] },
          outputFormat: { type: 'string', enum: ['json', 'csv', 'xml', 'html', 'xlsx'] },
          options: { type: 'object' }
        }
        // Note: Validation is handled in execute() method to support both naming conventions
        // Either fromFormat/toFormat OR inputFormat/outputFormat must be provided
      } as any,
      outputSchema: {
        type: 'object',
        properties: {
          convertedData: { type: 'any' },
          format: { type: 'string' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = node.data?.config || {};
    
    // Support both parameter name formats for compatibility:
    // - fromFormat/toFormat (backend standard)
    // - inputFormat/outputFormat (frontend naming)
    const fromFormatValue = config.fromFormat || config.inputFormat || context.input?.fromFormat || context.input?.inputFormat;
    const toFormatValue = config.toFormat || config.outputFormat || context.input?.toFormat || context.input?.outputFormat;
    
    // Validation for required parameters
    if (!fromFormatValue) {
      throw new Error('Required parameter "fromFormat" (or "inputFormat") is missing');
    }
    if (!toFormatValue) {
      throw new Error('Required parameter "toFormat" (or "outputFormat") is missing');
    }
    if (context.input?.data === undefined && context.input === undefined) {
      throw new Error('Required input "data" is missing');
    }

    
    try {
      const fromFormat = (fromFormatValue || 'json') as string;
      const toFormat = (toFormatValue || 'json') as string;
      const inputData = (context.input?.data !== undefined ? context.input.data : (context.input || {})) as any;

      // Basic conversion - in production, use proper libraries
      let convertedData: any = inputData;

      if (fromFormat === toFormat) {
        // No conversion needed
        convertedData = inputData;
      } else if (fromFormat === 'json' && toFormat === 'csv') {
        // JSON to CSV conversion would go here
        convertedData = JSON.stringify(inputData);
      } else if (fromFormat === 'csv' && toFormat === 'json') {
        // CSV to JSON conversion would go here
        convertedData = { data: inputData };
      } else {
        // Default: stringify for now
        convertedData = typeof inputData === 'string' ? inputData : JSON.stringify(inputData);
      }

      logger.info('Data converter executed', {
        nodeId: node.id,
        runId: context.runId,
        fromFormat,
        toFormat
      });

      return {
        success: true,
        output: {
          convertedData,
          format: toFormat
        },
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      logger.error('Data converter failed', error, { nodeId: node.id, runId: context.runId });
      
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }}


export default DataConverterNode;

