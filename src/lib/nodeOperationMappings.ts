/**
 * Operation Value Mappings
 * 
 * Maps frontend operation values to backend expected values for each node.
 * This handles cases where the frontend uses different operation names than the backend expects.
 */

export interface OperationMapping {
  frontend: string;
  backend: string;
}

export type NodeOperationMappings = Record<string, OperationMapping[]>;

/**
 * Operation value mappings for each node
 * Format: { nodeId: [{ frontend: 'send', backend: 'postMessage' }] }
 */
export const nodeOperationMappings: NodeOperationMappings = {
  // Slack Node - Backend uses 'action' parameter, not 'operation'
  // Frontend 'communication.operation' values need to map to backend 'action' values
  'slack': [
    { frontend: 'send_message', backend: 'send_message' },
    { frontend: 'send', backend: 'send_message' },
    { frontend: 'reply', backend: 'send_message' }, // Reply is also send_message with thread_ts
    { frontend: 'update', backend: 'send_message' }, // Update uses chat.update API
    { frontend: 'delete', backend: 'send_message' }, // Delete uses chat.delete API
    { frontend: 'create_channel', backend: 'create_channel' },
    { frontend: 'invite_user', backend: 'invite_user' },
    { frontend: 'upload_file', backend: 'upload_file' },
    { frontend: 'get_user_info', backend: 'get_user_info' },
  ],

  // Discord Node - Backend uses 'action' parameter, not 'operation'
  // Frontend 'communication.operation' values need to map to backend 'action' values
  'discord': [
    { frontend: 'send_message', backend: 'send_message' },
    { frontend: 'send', backend: 'send_message' },
    { frontend: 'reply', backend: 'send_message' }, // Reply is also send_message
    { frontend: 'edit', backend: 'send_message' }, // Edit uses PATCH message API
    { frontend: 'delete', backend: 'send_message' }, // Delete uses DELETE message API
    { frontend: 'create_channel', backend: 'create_channel' },
    { frontend: 'send_embed', backend: 'send_embed' },
    { frontend: 'react', backend: 'react' },
    { frontend: 'get_user_info', backend: 'get_user_info' },
  ],

  // Google Drive Node - Operations match directly, no mapping needed
  // Backend: list, download, upload, create_folder, delete
  // Frontend: upload, download, list, delete (missing create_folder)
  'google-drive': [
    // No mapping needed - operations match directly
    // Frontend operations: upload, download, list, delete
    // Backend operations: list, download, upload, create_folder, delete
  ],

  // Azure Blob Node - Operations match directly, no mapping needed
  // Backend: upload, download, list, delete, copy, move, create-container, delete-container, list-containers
  // Frontend: upload, download, list, delete (missing: copy, move, create-container, delete-container, list-containers)
  'azure-blob': [
    // No mapping needed - operations match directly
    // Frontend operations: upload, download, list, delete
    // Backend operations: upload, download, list, delete, copy, move, create-container, delete-container, list-containers
  ],

  // Google Cloud Storage Node - Operations match directly, no mapping needed
  // Backend: upload, download, list, delete, copy, move, create-bucket, delete-bucket, list-buckets
  // Frontend: upload, download, list, delete (missing: copy, move, create-bucket, delete-bucket, list-buckets)
  'google-cloud-storage': [
    // No mapping needed - operations match directly
    // Frontend operations: upload, download, list, delete
    // Backend operations: upload, download, list, delete, copy, move, create-bucket, delete-bucket, list-buckets
  ],

  // Integration Nodes
  // removed email-integration mapping

  // Add more mappings as needed
};

/**
 * Get operation mappings for a specific node
 */
export function getOperationMappings(nodeId: string): OperationMapping[] {
  return nodeOperationMappings[nodeId] || [];
}

/**
 * Map an operation value from frontend to backend for a specific node
 */
export function mapOperationToBackend(nodeId: string, frontendOperation: string): string {
  const mappings = getOperationMappings(nodeId);
  const mapping = mappings.find(m => m.frontend === frontendOperation);
  return mapping ? mapping.backend : frontendOperation;
}

/**
 * Map an operation value from backend to frontend for a specific node
 */
export function mapOperationToFrontend(nodeId: string, backendOperation: string): string {
  const mappings = getOperationMappings(nodeId);
  const mapping = mappings.find(m => m.backend === backendOperation);
  return mapping ? mapping.frontend : backendOperation;
}

