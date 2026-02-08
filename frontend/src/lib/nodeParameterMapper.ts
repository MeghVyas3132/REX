/**
 * Node Parameter Mapper
 * 
 * Transforms parameters between frontend (nested) and backend (flat) structures.
 * 
 * Frontend uses nested structure: { config: { field1: value1, field2: value2 } }
 * Backend expects flat structure: { field1: value1, field2: value2 }
 */

import { getFieldMappings, mapFieldToBackend, mapFieldToFrontend } from './nodeFieldMappings';
import { mapOperationToBackend, mapOperationToFrontend } from './nodeOperationMappings';
import { normalizeNodeSubtype } from './nodeIdMappings';

/**
 * Transform frontend parameters (nested) to backend format (flat)
 * 
 * @param nodeId - The node ID
 * @param frontendParams - Frontend parameters with nested structure
 * @returns Backend parameters with flat structure
 */
export function transformToBackend(nodeId: string, frontendParams: any): any {
  if (!frontendParams) return {};

  const backendParams: any = {};

  // Handle nested config structure
  if (frontendParams.config) {
    // Transform config fields
    for (const [key, value] of Object.entries(frontendParams.config)) {
      const backendKey = mapFieldToBackend(nodeId, key);
      backendParams[backendKey] = value;
    }
  }

  // Handle top-level fields (non-config)
  for (const [key, value] of Object.entries(frontendParams)) {
    if (key !== 'config' && key !== 'options' && key !== 'authentication') {
      const backendKey = mapFieldToBackend(nodeId, key);
      backendParams[backendKey] = value;
    }
  }

  // Handle options (some nodes have options at top level)
  if (frontendParams.options) {
    for (const [key, value] of Object.entries(frontendParams.options)) {
      backendParams[`options.${key}`] = value;
    }
  }

  // Handle operation field mapping (if exists)
  if (backendParams.operation) {
    backendParams.operation = mapOperationToBackend(nodeId, backendParams.operation);
  }
  // Handle action field mapping (for Slack, Discord nodes)
  if (backendParams.action) {
    backendParams.action = mapOperationToBackend(nodeId, backendParams.action);
  }

  return backendParams;
}

/**
 * Transform backend parameters (flat) to frontend format (nested)
 * 
 * @param nodeId - The node ID
 * @param backendParams - Backend parameters with flat structure
 * @returns Frontend parameters with nested structure
 */
export function transformToFrontend(nodeId: string, backendParams: any): any {
  if (!backendParams) return { config: {} };

  const frontendParams: any = { config: {} };
  const options: any = {};

  // Transform flat structure to nested
  for (const [key, value] of Object.entries(backendParams)) {
    // Handle options fields
    if (key.startsWith('options.')) {
      const optionKey = key.substring(8); // Remove 'options.' prefix
      options[optionKey] = value;
      continue;
    }

    // Map field name from backend to frontend
    const frontendKey = mapFieldToFrontend(nodeId, key);
    
    // Put in config object
    frontendParams.config[frontendKey] = value;
  }

  // Handle operation field mapping (if exists)
  if (frontendParams.config.operation) {
    frontendParams.config.operation = mapOperationToFrontend(nodeId, frontendParams.config.operation);
  }
  // Handle action field mapping (for Slack, Discord nodes)
  if (frontendParams.config.action) {
    frontendParams.config.action = mapOperationToFrontend(nodeId, frontendParams.config.action);
  }

  // Add options if any
  if (Object.keys(options).length > 0) {
    frontendParams.options = options;
  }

  return frontendParams;
}

/**
 * Transform a node's data structure for backend execution
 * 
 * @param node - The node object
 * @returns Transformed node data for backend
 */
export function transformNodeForBackend(node: any): any {
  const frontendData = node.data || {};
  const normalizedSubtype = normalizeNodeSubtype(frontendData.subtype || node.type || '');
  const nodeId = normalizedSubtype || '';

  // Transform config
  const backendConfig = transformToBackend(nodeId, {
    config: frontendData.config || {},
    options: frontendData.options || {},
    ...frontendData,
  });

  // Return transformed node structure
  return {
    ...node,
    data: {
      ...frontendData,
      config: backendConfig,
      // Preserve options and credentials (they're needed for schedule nodes, retry settings, etc.)
      options: frontendData.options || {},
      credentials: frontendData.credentials || {},
      // Keep other fields like subtype, type, etc.
      subtype: normalizedSubtype || node.type,
      type: node.type,
    },
  };
}

/**
 * Transform backend response to frontend format
 * 
 * @param nodeId - The node ID
 * @param backendResponse - Backend response data
 * @returns Frontend-formatted response
 */
export function transformResponseFromBackend(nodeId: string, backendResponse: any): any {
  if (!backendResponse) return {};

  // If response has config, transform it
  if (backendResponse.config) {
    return transformToFrontend(nodeId, backendResponse.config);
  }

  // Otherwise, transform the whole response
  return transformToFrontend(nodeId, backendResponse);
}

