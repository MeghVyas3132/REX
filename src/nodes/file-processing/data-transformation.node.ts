import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
import { logger } from '../../utils/logger';

export class DataTransformationNode {
  getNodeDefinition() {
    return {
      id: 'data-transformation',
      type: 'action',
      name: 'Data Transformation',
      description: 'Transform data structure and format using various operations',
      category: 'file-processing',
      version: '1.0.0',
      author: 'Workflow Studio',
      inputs: [
        {
          id: 'data',
          name: 'Data',
          type: 'any',
          required: true,
          description: 'Data to transform (array, object, or string)'
        },
        {
          id: 'transformationType',
          name: 'Transformation Type',
          type: 'string',
          required: false,
          description: 'Type of transformation to apply'
        }
      ],
      outputs: [
        {
          id: 'transformedData',
          name: 'Transformed Data',
          type: 'any',
          description: 'Transformed data'
        },
        {
          id: 'transformationReport',
          name: 'Transformation Report',
          type: 'object',
          description: 'Report of transformation operations performed'
        },
        {
          id: 'originalStructure',
          name: 'Original Structure',
          type: 'object',
          description: 'Structure of the original data'
        }
      ],
      configSchema: {
        type: 'object',
        properties: {
          transformationOperations: {
            type: 'array',
            items: { 
              type: 'string',
              enum: ['reshape', 'pivot', 'unpivot', 'aggregate', 'groupBy', 'sort', 'filter', 'map', 'reduce', 'flatten', 'nest']
            },
            default: ['reshape'],
            description: 'Types of transformation operations to perform'
          },
          reshape: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: true },
              targetFormat: { 
                type: 'string', 
                enum: ['wide', 'long', 'normalized'],
                default: 'normalized'
              },
              keyFields: { type: 'array', items: { type: 'string' } },
              valueFields: { type: 'array', items: { type: 'string' } }
            }
          },
          pivot: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: false },
              indexFields: { type: 'array', items: { type: 'string' } },
              pivotField: { type: 'string' },
              valueField: { type: 'string' },
              aggregationFunction: { 
                type: 'string', 
                enum: ['sum', 'mean', 'count', 'min', 'max', 'first', 'last'],
                default: 'sum'
              }
            }
          },
          aggregate: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: false },
              groupByFields: { type: 'array', items: { type: 'string' } },
              aggregations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    function: { 
                      type: 'string', 
                      enum: ['sum', 'mean', 'count', 'min', 'max', 'first', 'last', 'concat', 'unique']
                    },
                    alias: { type: 'string' }
                  }
                }
              }
            }
          },
          groupBy: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: false },
              groupFields: { type: 'array', items: { type: 'string' } },
              operations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    operation: { 
                      type: 'string', 
                      enum: ['sum', 'mean', 'count', 'min', 'max', 'first', 'last', 'concat']
                    }
                  }
                }
              }
            }
          },
          sort: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: false },
              sortFields: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    direction: { type: 'string', enum: ['asc', 'desc'], default: 'asc' }
                  }
                }
              }
            }
          },
          filter: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: false },
              conditions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    operator: { 
                      type: 'string', 
                      enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains', 'regex']
                    },
                    value: { type: 'any' }
                  }
                }
              }
            }
          },
          map: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: false },
              transformations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    sourceField: { type: 'string' },
                    targetField: { type: 'string' },
                    operation: { 
                      type: 'string', 
                      enum: ['copy', 'calculate', 'format', 'lookup', 'custom']
                    },
                    expression: { type: 'string' },
                    format: { type: 'string' }
                  }
                }
              }
            }
          },
          flatten: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: false },
              separator: { type: 'string', default: '.' },
              maxDepth: { type: 'number', default: 10 }
            }
          },
          nest: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: false },
              groupFields: { type: 'array', items: { type: 'string' } },
              nestedField: { type: 'string', default: 'data' }
            }
          }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    try {
      const config = node.data?.config || {};
      const { transformationOperations } = config;
      
      logger.info('Data transformation node executing', { 
        transformationOperations, 
        nodeId: node.id 
      });

      let data = context.input?.data;
      const originalStructure = this.analyzeStructure(data);
      
      const transformationReport = {
        originalStructure,
        operations: [],
        finalStructure: null,
        errors: [],
        warnings: []
      };

      // Perform transformation operations
      for (const operation of transformationOperations) {
        try {
          const result = await this.performTransformationOperation(data, operation, config, transformationReport);
          data = result.data;
          transformationReport.operations.push({
            operation,
            success: true,
            itemsProcessed: result.itemsProcessed,
            transformation: result.transformation
          });
        } catch (error: any) {
          transformationReport.errors.push({
            operation,
            error: error.message
          });
          logger.warn(`Transformation operation ${operation} failed`, { error: error.message });
        }
      }

      transformationReport.finalStructure = this.analyzeStructure(data);

      return {
        success: true,
        output: {
          transformedData: data,
          transformationReport,
          originalStructure
        },
        duration: Date.now() - (context as any).startTime
      };

    } catch (error: any) {
      logger.error('Data transformation failed', error as Error, { nodeId: node.id });
      return {
        success: false,
        error: error.message,
        duration: Date.now() - (context as any).startTime
      };
    }
  }

  private async performTransformationOperation(data: any, operation: string, config: any, report: any): Promise<any> {
    switch (operation) {
      case 'reshape':
        return this.reshapeData(data, config.reshape);
      case 'pivot':
        return this.pivotData(data, config.pivot);
      case 'unpivot':
        return this.unpivotData(data, config.pivot);
      case 'aggregate':
        return this.aggregateData(data, config.aggregate);
      case 'groupBy':
        return this.groupByData(data, config.groupBy);
      case 'sort':
        return this.sortData(data, config.sort);
      case 'filter':
        return this.filterData(data, config.filter);
      case 'map':
        return this.mapData(data, config.map);
      case 'reduce':
        return this.reduceData(data, config.reduce);
      case 'flatten':
        return this.flattenData(data, config.flatten);
      case 'nest':
        return this.nestData(data, config.nest);
      default:
        throw new Error(`Unknown transformation operation: ${operation}`);
    }
  }

  private reshapeData(data: any, config: any): any {
    const { targetFormat = 'normalized', keyFields = [], valueFields = [] } = config;

    if (!Array.isArray(data)) {
      return { data, itemsProcessed: 1, transformation: 'no_change' };
    }

    switch (targetFormat) {
      case 'wide':
        return this.reshapeToWide(data, keyFields, valueFields);
      case 'long':
        return this.reshapeToLong(data, keyFields, valueFields);
      case 'normalized':
        return this.normalizeData(data);
      default:
        return { data, itemsProcessed: data.length, transformation: 'no_change' };
    }
  }

  private reshapeToWide(data: any[], keyFields: string[], valueFields: string[]): any {
    const result: any = {};
    
    for (const item of data) {
      const key = keyFields.map(field => this.getNestedValue(item, field)).join('_');
      if (!result[key]) {
        result[key] = {};
      }
      
      for (const valueField of valueFields) {
        result[key][valueField] = this.getNestedValue(item, valueField);
      }
    }

    return { 
      data: Object.values(result), 
      itemsProcessed: data.length, 
      transformation: 'wide_format' 
    };
  }

  private reshapeToLong(data: any[], keyFields: string[], valueFields: string[]): any {
    const result: any[] = [];
    
    for (const item of data) {
      const baseItem: any = {};
      
      // Copy key fields
      for (const keyField of keyFields) {
        baseItem[keyField] = this.getNestedValue(item, keyField);
      }
      
      // Create rows for each value field
      for (const valueField of valueFields) {
        const newItem = { ...baseItem };
        newItem['variable'] = valueField;
        newItem['value'] = this.getNestedValue(item, valueField);
        result.push(newItem);
      }
    }

    return { 
      output: result, 
      itemsProcessed: data.length, 
      transformation: 'long_format' 
    };
  }

  private normalizeData(data: any[]): any {
    const normalized: any[] = [];
    
    for (const item of data) {
      const normalizedItem = this.flattenObject(item);
      normalized.push(normalizedItem);
    }

    return { 
      data: normalized, 
      itemsProcessed: data.length, 
      transformation: 'normalized' 
    };
  }

  private pivotData(data: any[], config: any): any {
    const { indexFields = [], pivotField = '', valueField = '', aggregationFunction = 'sum' } = config;
    
    if (!Array.isArray(data) || data.length === 0) {
      return { data, itemsProcessed: 0, transformation: 'no_change' };
    }

    const pivotMap = new Map();
    
    for (const item of data) {
      const indexKey = indexFields.map(field => this.getNestedValue(item, field)).join('|');
      const pivotKey = this.getNestedValue(item, pivotField);
      const value = this.getNestedValue(item, valueField);
      
      if (!pivotMap.has(indexKey)) {
        pivotMap.set(indexKey, {});
        // Copy index fields
        for (const field of indexFields) {
          pivotMap.get(indexKey)[field] = this.getNestedValue(item, field);
        }
      }
      
      const pivotRow = pivotMap.get(indexKey);
      if (pivotRow[pivotKey] === undefined) {
        pivotRow[pivotKey] = value;
      } else {
        pivotRow[pivotKey] = this.aggregateValue(pivotRow[pivotKey], value, aggregationFunction);
      }
    }

    return { 
      data: Array.from(pivotMap.values()), 
      itemsProcessed: data.length, 
      transformation: 'pivoted' 
    };
  }

  private unpivotData(data: any[], config: any): any {
    // Unpivot is essentially the reverse of pivot
    return this.reshapeToLong(data, [], []);
  }

  private aggregateData(data: any[], config: any): any {
    const { groupByFields = [], aggregations = [] } = config;
    
    if (!Array.isArray(data) || data.length === 0) {
      return { data, itemsProcessed: 0, transformation: 'no_change' };
    }

    const groupMap = new Map();
    
    for (const item of data) {
      const groupKey = groupByFields.map(field => this.getNestedValue(item, field)).join('|');
      
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {});
        // Copy group fields
        for (const field of groupByFields) {
          groupMap.get(groupKey)[field] = this.getNestedValue(item, field);
        }
        // Initialize aggregation fields
        for (const agg of aggregations) {
          groupMap.get(groupKey)[agg.alias || `${agg.field}_${agg.function}`] = this.getInitialAggregationValue(agg.function);
        }
      }
      
      const groupItem = groupMap.get(groupKey);
      for (const agg of aggregations) {
        const value = this.getNestedValue(item, agg.field);
        const fieldName = agg.alias || `${agg.field}_${agg.function}`;
        groupItem[fieldName] = this.aggregateValue(groupItem[fieldName], value, agg.function);
      }
    }

    return { 
      data: Array.from(groupMap.values()), 
      itemsProcessed: data.length, 
      transformation: 'aggregated' 
    };
  }

  private groupByData(data: any[], config: any): any {
    const { groupFields = [], operations = [] } = config;
    
    if (!Array.isArray(data) || data.length === 0) {
      return { data, itemsProcessed: 0, transformation: 'no_change' };
    }

    const groupMap = new Map();
    
    for (const item of data) {
      const groupKey = groupFields.map(field => this.getNestedValue(item, field)).join('|');
      
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          group: {},
          items: []
        });
        // Copy group fields
        for (const field of groupFields) {
          groupMap.get(groupKey).group[field] = this.getNestedValue(item, field);
        }
      }
      
      groupMap.get(groupKey).items.push(item);
    }

    // Apply operations to each group
    const result: any[] = [];
    for (const [key, group] of groupMap) {
      const processedGroup = { ...group.group };
      
      for (const operation of operations) {
        const values = group.items.map(item => this.getNestedValue(item, operation.field));
        processedGroup[`${operation.field}_${operation.operation}`] = this.performGroupOperation(values, operation.operation);
      }
      
      result.push(processedGroup);
    }

    return { 
      output: result, 
      itemsProcessed: data.length, 
      transformation: 'grouped' 
    };
  }

  private sortData(data: any[], config: any): any {
    const { sortFields = [] } = config;
    
    if (!Array.isArray(data) || sortFields.length === 0) {
      return { data, itemsProcessed: data?.length || 0, transformation: 'no_change' };
    }

    const sorted = [...data].sort((a, b) => {
      for (const sortField of sortFields) {
        const aValue = this.getNestedValue(a, sortField.field);
        const bValue = this.getNestedValue(b, sortField.field);
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;
        
        if (sortField.direction === 'desc') {
          comparison = -comparison;
        }
        
        if (comparison !== 0) return comparison;
      }
      return 0;
    });

    return { 
      data: sorted, 
      itemsProcessed: data.length, 
      transformation: 'sorted' 
    };
  }

  private filterData(data: any[], config: any): any {
    const { conditions = [] } = config;
    
    if (!Array.isArray(data) || conditions.length === 0) {
      return { data, itemsProcessed: data?.length || 0, transformation: 'no_change' };
    }

    const filtered = data.filter(item => {
      return conditions.every(condition => {
        const value = this.getNestedValue(item, condition.field);
        return this.evaluateCondition(value, condition.operator, condition.value);
      });
    });

    return { 
      data: filtered, 
      itemsProcessed: data.length, 
      transformation: 'filtered' 
    };
  }

  private mapData(data: any[], config: any): any {
    const { transformations = [] } = config;
    
    if (!Array.isArray(data) || transformations.length === 0) {
      return { data, itemsProcessed: data?.length || 0, transformation: 'no_change' };
    }

    const mapped = data.map(item => {
      const newItem = { ...item };
      
      for (const transformation of transformations) {
        const sourceValue = this.getNestedValue(item, transformation.sourceField);
        let targetValue = sourceValue;
        
        switch (transformation.operation) {
          case 'copy':
            targetValue = sourceValue;
            break;
          case 'calculate':
            targetValue = this.evaluateExpression(transformation.expression, item);
            break;
          case 'format':
            targetValue = this.formatValue(sourceValue, transformation.format);
            break;
          case 'lookup':
            targetValue = this.lookupValue(sourceValue, transformation.expression);
            break;
          case 'custom':
            targetValue = this.customTransform(sourceValue, transformation.expression);
            break;
        }
        
        this.setNestedValue(newItem, transformation.targetField, targetValue);
      }
      
      return newItem;
    });

    return { 
      data: mapped, 
      itemsProcessed: data.length, 
      transformation: 'mapped' 
    };
  }

  private reduceData(data: any[], config: any): any {
    // Reduce operation implementation
    return { data, itemsProcessed: data.length, transformation: 'reduced' };
  }

  private flattenData(data: any[], config: any): any {
    const { separator = '.', maxDepth = 10 } = config;
    
    if (!Array.isArray(data)) {
      return { data: [this.flattenObject(data, separator, maxDepth)], itemsProcessed: 1, transformation: 'flattened' };
    }

    const flattened = data.map(item => this.flattenObject(item, separator, maxDepth));

    return { 
      data: flattened, 
      itemsProcessed: data.length, 
      transformation: 'flattened' 
    };
  }

  private nestData(data: any[], config: any): any {
    const { groupFields = [], nestedField = 'data' } = config;
    
    if (!Array.isArray(data) || groupFields.length === 0) {
      return { data, itemsProcessed: data?.length || 0, transformation: 'no_change' };
    }

    const groupMap = new Map();
    
    for (const item of data) {
      const groupKey = groupFields.map(field => this.getNestedValue(item, field)).join('|');
      
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {});
        // Copy group fields
        for (const field of groupFields) {
          groupMap.get(groupKey)[field] = this.getNestedValue(item, field);
        }
        groupMap.get(groupKey)[nestedField] = [];
      }
      
      // Remove group fields from item and add to nested array
      const nestedItem = { ...item };
      for (const field of groupFields) {
        delete nestedItem[field];
      }
      
      groupMap.get(groupKey)[nestedField].push(nestedItem);
    }

    return { 
      data: Array.from(groupMap.values()), 
      itemsProcessed: data.length, 
      transformation: 'nested' 
    };
  }

  private analyzeStructure(data: any): any {
    if (Array.isArray(data)) {
      return {
        type: 'array',
        length: data.length,
        itemTypes: [...new Set(data.map(item => typeof item))],
        sampleKeys: data.length > 0 && typeof data[0] === 'object' ? Object.keys(data[0]) : []
      };
    } else if (typeof data === 'object' && data !== null) {
      return {
        type: 'object',
        keys: Object.keys(data),
        keyTypes: Object.keys(data).reduce((acc, key) => {
          acc[key] = typeof data[key];
          return acc;
        }, {} as any)
      };
    } else {
      return {
        type: typeof data,
        value: data
      };
    }
  }

  private flattenObject(obj: any, separator: string = '.', maxDepth: number = 10, currentDepth: number = 0): any {
    if (currentDepth >= maxDepth) return obj;
    
    const flattened: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const nested = this.flattenObject(value, separator, maxDepth, currentDepth + 1);
        for (const [nestedKey, nestedValue] of Object.entries(nested)) {
          flattened[`${key}${separator}${nestedKey}`] = nestedValue;
        }
      } else {
        flattened[key] = value;
      }
    }
    
    return flattened;
  }

  private aggregateValue(current: any, newValue: any, functionName: string): any {
    switch (functionName) {
      case 'sum':
        return (current || 0) + (newValue || 0);
      case 'mean':
        return (current || 0) + (newValue || 0);
      case 'count':
        return (current || 0) + 1;
      case 'min':
        return current === undefined ? newValue : Math.min(current, newValue);
      case 'max':
        return current === undefined ? newValue : Math.max(current, newValue);
      case 'first':
        return current === undefined ? newValue : current;
      case 'last':
        return newValue;
      case 'concat':
        return (current || '') + (newValue || '');
      case 'unique':
        const currentSet = new Set(current || []);
        currentSet.add(newValue);
        return Array.from(currentSet);
      default:
        return newValue;
    }
  }

  private getInitialAggregationValue(functionName: string): any {
    switch (functionName) {
      case 'sum':
      case 'count':
        return 0;
      case 'mean':
        return 0;
      case 'min':
      case 'max':
        return undefined;
      case 'first':
      case 'last':
        return undefined;
      case 'concat':
        return '';
      case 'unique':
        return [];
      default:
        return undefined;
    }
  }

  private performGroupOperation(values: any[], operation: string): any {
    switch (operation) {
      case 'sum':
        return values.reduce((sum, val) => sum + (val || 0), 0);
      case 'mean':
        return values.reduce((sum, val) => sum + (val || 0), 0) / values.length;
      case 'count':
        return values.length;
      case 'min':
        return Math.min(...values.filter(v => v !== undefined));
      case 'max':
        return Math.max(...values.filter(v => v !== undefined));
      case 'first':
        return values[0];
      case 'last':
        return values[values.length - 1];
      case 'concat':
        return values.join('');
      default:
        return values;
    }
  }

  private evaluateCondition(value: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'eq':
        return value === expectedValue;
      case 'ne':
        return value !== expectedValue;
      case 'gt':
        return value > expectedValue;
      case 'gte':
        return value >= expectedValue;
      case 'lt':
        return value < expectedValue;
      case 'lte':
        return value <= expectedValue;
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(value);
      case 'nin':
        return Array.isArray(expectedValue) && !expectedValue.includes(value);
      case 'contains':
        return typeof value === 'string' && value.includes(expectedValue);
      case 'regex':
        return new RegExp(expectedValue).test(value);
      default:
        return true;
    }
  }

  private evaluateExpression(expression: string, context: any): any {
    // Simple expression evaluation - in production, use a proper expression evaluator
    try {
      // Replace field references with actual values
      let evalExpression = expression;
      const fieldMatches = expression.match(/\{([^}]+)\}/g);
      if (fieldMatches) {
        for (const match of fieldMatches) {
          const field = match.slice(1, -1);
          const value = this.getNestedValue(context, field);
          evalExpression = evalExpression.replace(match, value);
        }
      }
      return eval(evalExpression);
    } catch {
      return expression;
    }
  }

  private formatValue(value: any, format: string): any {
    // Simple formatting - in production, use a proper formatting library
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
      case 'date':
        return new Date(value).toISOString().split('T')[0];
      case 'number':
        return Number(value);
      case 'string':
        return String(value);
      default:
        return value;
    }
  }

  private lookupValue(value: any, lookupExpression: string): any {
    // Simple lookup - in production, implement proper lookup logic
    return value;
  }

  private customTransform(value: any, expression: string): any {
    // Custom transformation - in production, implement proper transformation logic
    return value;
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
  }

}
export default DataTransformationNode;
