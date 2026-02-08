/**
 * Field Name Mappings
 * 
 * Maps frontend field names to backend field names for each node.
 * This handles cases where the frontend uses different field names than the backend expects.
 */

export interface FieldMapping {
  frontend: string;
  backend: string;
}

export type NodeFieldMappings = Record<string, FieldMapping[]>;

/**
 * Field name mappings for each node
 * Format: { nodeId: [{ frontend: 'frontendField', backend: 'backendField' }] }
 */
export const nodeFieldMappings: NodeFieldMappings = {
  // LLM Nodes
  'openai': [
    { frontend: 'prompt', backend: 'userPrompt' },
    { frontend: 'systemPrompt', backend: 'systemPrompt' },
  ],
  'anthropic': [
    { frontend: 'prompt', backend: 'userPrompt' },
    { frontend: 'systemPrompt', backend: 'systemPrompt' },
  ],
  'claude': [
    { frontend: 'prompt', backend: 'userPrompt' },
    { frontend: 'systemPrompt', backend: 'systemPrompt' },
  ],
  'gemini': [
    { frontend: 'prompt', backend: 'userPrompt' },
    { frontend: 'systemPrompt', backend: 'systemPrompt' },
  ],
  'openrouter': [
    { frontend: 'prompt', backend: 'userPrompt' },
    { frontend: 'systemPrompt', backend: 'systemPrompt' },
  ],

  // HTTP/Development Nodes
  'http-request': [
  ],
  'rest-api': [
    { frontend: 'method', backend: 'httpMethod' },
  ],

  // Integration Nodes
  // Slack and Discord use 'action' in both frontend and backend, no mapping needed
  // 'slack': [], // No field mapping needed - action stays as action
  // 'discord': [], // No field mapping needed - action stays as action
  // removed email-integration mapping

  // Utility Nodes
  'delay': [
    { frontend: 'delay', backend: 'delayMs' },
  ],
  'data-converter': [
    { frontend: 'inputFormat', backend: 'fromFormat' },
    { frontend: 'outputFormat', backend: 'toFormat' },
  ],

  // Add more mappings as needed
};

/**
 * Get field mappings for a specific node
 */
export function getFieldMappings(nodeId: string): FieldMapping[] {
  return nodeFieldMappings[nodeId] || [];
}

/**
 * Map a field name from frontend to backend for a specific node
 */
export function mapFieldToBackend(nodeId: string, frontendField: string): string {
  const mappings = getFieldMappings(nodeId);
  const mapping = mappings.find(m => m.frontend === frontendField);
  return mapping ? mapping.backend : frontendField;
}

/**
 * Map a field name from backend to frontend for a specific node
 */
export function mapFieldToFrontend(nodeId: string, backendField: string): string {
  const mappings = getFieldMappings(nodeId);
  const mapping = mappings.find(m => m.backend === backendField);
  return mapping ? mapping.frontend : backendField;
}

