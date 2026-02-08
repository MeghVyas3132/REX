/**
 * n8n Schema Adapter
 * Converts n8n-compatible node descriptions to frontend schemas
 */

import { FieldSchema, NodeSchema } from './nodeSchemas';

// n8n type definitions (simplified for frontend)
export interface INodeTypeDescription {
  displayName: string;
  name: string;
  group: string[];
  version: number | number[];
  description: string;
  properties: INodeProperties[];
  inputs?: string | string[];
  outputs?: string | string[];
  defaults?: {
    name: string;
    color?: string;
  };
  defaultVersion?: number;
}

export interface INodeProperties {
  displayName: string;
  name: string;
  type: string;
  default?: any;
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ name: string; value: string | number }>;
  credentialTypes?: string[]; // For credentialsSelect type
  typeOptions?: {
    rows?: number;
    minValue?: number;
    maxValue?: number;
    password?: boolean;
    loadOptionsMethod?: string; // Method name for dynamic option loading
    loadOptionsDependsOn?: string[]; // Parameters this field depends on
    [key: string]: any;
  };
  displayOptions?: IDisplayOptions;
}

export interface IDisplayOptions {
  show?: {
    [key: string]: any[] | string | number | boolean | { _cnd?: any };
  };
  hide?: {
    [key: string]: any[] | string | number | boolean | { _cnd?: any };
  };
}

function normalizeToArray<T>(value: T | T[]): T[] {
  if (Array.isArray(value)) return value;
  return [value];
}

function shouldSkipByVersion(displayOptions: IDisplayOptions | undefined, defaultVersion: number | undefined) {
  if (!displayOptions || defaultVersion === undefined || Number.isNaN(defaultVersion)) {
    return false;
  }

  const showVersions = displayOptions.show?.['@version'];
  if (showVersions) {
    const versions = normalizeToArray(showVersions).map(Number);
    if (!versions.includes(defaultVersion)) {
      return true;
    }
  }

  const hideVersions = displayOptions.hide?.['@version'];
  if (hideVersions) {
    const versions = normalizeToArray(hideVersions).map(Number);
    if (versions.includes(defaultVersion)) {
      return true;
    }
  }

  return false;
}

function cleanDisplayOptions(displayOptions: IDisplayOptions): IDisplayOptions {
  const cleaned: IDisplayOptions = {};
  if (displayOptions.show) {
    const { ['@version']: _ignored, ...rest } = displayOptions.show;
    if (Object.keys(rest).length > 0) {
      cleaned.show = rest;
    }
  }
  if (displayOptions.hide) {
    const { ['@version']: _ignored, ...rest } = displayOptions.hide;
    if (Object.keys(rest).length > 0) {
      cleaned.hide = rest;
    }
  }
  return cleaned;
}

/**
 * Converts n8n node description to frontend schema
 */
export function convertN8nDescriptionToSchema(description: INodeTypeDescription): NodeSchema {
  const defaultVersion = typeof description.defaultVersion === 'number'
    ? description.defaultVersion
    : Array.isArray(description.version)
      ? Number(description.version[description.version.length - 1])
      : Number(description.version);

  const fields: FieldSchema[] = description.properties
    .map(prop => {
      if (shouldSkipByVersion(prop.displayOptions, defaultVersion)) {
        return null;
      }

      // Map base field definition
      const field: FieldSchema = {
        key: prop.name,
        label: prop.displayName,
        type: mapN8nPropertyTypeToFieldType(prop.type),
        required: prop.required || false,
        placeholder: prop.placeholder,
      };

      // Prefix configuration keys so they map into node.data.config
      if (!prop.name.startsWith('@') && field.type !== 'notice') {
        field.key = prop.name.includes('.') ? prop.name : `config.${prop.name}`;
      }

      // Handle options
      if (prop.type === 'options' || prop.type === 'multiOptions') {
        if (prop.options && Array.isArray(prop.options)) {
          field.options = prop.options.map(opt => ({
            value: String(opt.value),
            label: opt.name || String(opt.value),
          }));
        }
      }

      // Handle displayOptions
      if (prop.displayOptions) {
        field.displayOptions = cleanDisplayOptions(prop.displayOptions);
      }

      // Handle typeOptions
      if (prop.typeOptions) {
        if (prop.typeOptions.rows) {
          field.rows = prop.typeOptions.rows;
        }
        if (prop.typeOptions.minValue !== undefined) {
          field.min = prop.typeOptions.minValue;
        }
        if (prop.typeOptions.maxValue !== undefined) {
          field.max = prop.typeOptions.maxValue;
        }
        if (prop.typeOptions.password) {
          field.password = true;
        }
        if (prop.typeOptions.editor === 'codeNodeEditor') {
          field.type = 'code';
          field.rows = prop.typeOptions.rows || 12;
        }
        // Handle loadOptions for dynamic option loading
        if (prop.typeOptions.loadOptionsMethod) {
          field.loadOptionsMethod = prop.typeOptions.loadOptionsMethod;
        }
        if (prop.typeOptions.loadOptionsDependsOn && Array.isArray(prop.typeOptions.loadOptionsDependsOn)) {
          field.loadOptionsDependsOn = prop.typeOptions.loadOptionsDependsOn;
        }
      }

      // Handle credentialTypes for credentialsSelect fields
      if (prop.type === 'credentialsSelect' || prop.type === 'credentials') {
        if (prop.credentialTypes && Array.isArray(prop.credentialTypes)) {
          field.credentialTypes = prop.credentialTypes;
        }
      }

      if (field.type === 'notice') {
        field.content = prop.description || prop.displayName;
      }

      if (field.type === 'hidden') {
        return null; // Skip hidden fields in UI
      }

      return field;
    })
    .filter((field): field is FieldSchema => field !== null);

  return {
    title: description.displayName,
    fields,
  };
}

/**
 * Maps n8n property type to frontend field type
 */
function mapN8nPropertyTypeToFieldType(n8nType: string): FieldSchema['type'] {
  const typeMap: Record<string, FieldSchema['type']> = {
    'string': 'string',
    'number': 'number',
    'boolean': 'boolean',
    'options': 'select',
    'multiOptions': 'select',
    'json': 'textarea',
    'notice': 'notice',
    'collection': 'textarea', // Collections are typically JSON
    'fixedCollection': 'textarea', // Fixed collections are typically JSON
    'credentialsSelect': 'credentialSelect', // Credential selection field
    'credentials': 'credentialSelect', // Alias for credentialsSelect
    'hidden': 'hidden',
  };

  return typeMap[n8nType] || 'string';
}

/**
 * Evaluates displayOptions to determine if a field should be shown
 */
export function evaluateDisplayOptions(
  displayOptions: IDisplayOptions | undefined,
  nodeConfig: Record<string, any>
): boolean {
  if (!displayOptions) {
    return true; // Show by default if no displayOptions
  }

  // Check show conditions
  if (displayOptions.show) {
    for (const [key, value] of Object.entries(displayOptions.show)) {
      if (key === '@version' || key === '@tool') {
        // Skip version and tool checks for now
        continue;
      }

      // Get config value - handles both flat and nested structures
      const configValue = getConfigValue(nodeConfig, key);
      const shouldShow = evaluateCondition(configValue, value);
      
      if (!shouldShow) {
        return false; // Don't show if any show condition fails
      }
    }
  }

  // Check hide conditions
  if (displayOptions.hide) {
    for (const [key, value] of Object.entries(displayOptions.hide)) {
      if (key === '@version' || key === '@tool') {
        // Skip version and tool checks for now
        continue;
      }

      // Get config value - handles both flat and nested structures
      const configValue = getConfigValue(nodeConfig, key);
      const shouldHide = evaluateCondition(configValue, value);
      
      if (shouldHide) {
        return false; // Don't show if any hide condition matches
      }
    }
  }

  return true; // Show by default
}

/**
 * Evaluates a condition value against a config value
 */
function evaluateCondition(configValue: any, conditionValue: any): boolean {
  // If condition is an array, check if configValue is in the array
  if (Array.isArray(conditionValue)) {
    return conditionValue.includes(configValue);
  }

  // If condition is an object with _cnd (conditional), evaluate it
  if (conditionValue && typeof conditionValue === 'object' && conditionValue._cnd) {
    return evaluateConditionalExpression(configValue, conditionValue._cnd);
  }

  // Simple equality check
  return configValue === conditionValue;
}

/**
 * Evaluates a conditional expression (_cnd object)
 */
function evaluateConditionalExpression(value: any, condition: any): boolean {
  if (condition.eq !== undefined) {
    return value === condition.eq;
  }
  if (condition.not !== undefined) {
    return value !== condition.not;
  }
  if (condition.gte !== undefined) {
    return Number(value) >= Number(condition.gte);
  }
  if (condition.lte !== undefined) {
    return Number(value) <= Number(condition.lte);
  }
  if (condition.gt !== undefined) {
    return Number(value) > Number(condition.gt);
  }
  if (condition.lt !== undefined) {
    return Number(value) < Number(condition.lt);
  }
  if (condition.startsWith !== undefined) {
    return String(value).startsWith(condition.startsWith);
  }
  if (condition.endsWith !== undefined) {
    return String(value).endsWith(condition.endsWith);
  }
  if (condition.includes !== undefined) {
    return String(value).includes(condition.includes);
  }
  if (condition.exists === true) {
    return value !== undefined && value !== null;
  }

  return true; // Default to true if condition is not recognized
}

/**
 * Gets a nested value from an object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

// Helper to get config value - handles both flat and nested structures
function getConfigValue(config: any, key: string): any {
  if (!config || !key) {
    return undefined;
  }
  
  // Try direct key first (for flat config like { useGmailApi: true })
  if (key in config) {
    return config[key];
  }
  
  // Try with config. prefix stripped (for keys like 'config.useGmailApi')
  if (key.startsWith('config.')) {
    const strippedKey = key.substring(7);
    if (strippedKey in config) {
      return config[strippedKey];
    }
  }
  
  // Try nested path
  return getNestedValue(config, key);
}

/**
 * Filters fields based on displayOptions
 */
export function filterFieldsByDisplayOptions(
  fields: FieldSchema[],
  nodeConfig: Record<string, any>
): FieldSchema[] {
  return fields.filter(field => {
    if (field.displayOptions) {
      return evaluateDisplayOptions(field.displayOptions, nodeConfig);
    }
    return true; // Show by default if no displayOptions
  });
}

