import type { Node } from '@xyflow/react';

const LEGACY_TO_CANONICAL: Record<string, string> = {
  // Core trigger/utility aliases
  scheduler: 'schedule',
  'schedule-trigger': 'schedule',
  webhook: 'webhook-trigger',
  conditional: 'condition',

  // Communication aliases
  'send-email': 'email',
  'email-send': 'email',

  // HTTP aliases
  'http-request-enhanced': 'http-request',
};

export function normalizeNodeSubtype(subtype?: string | null): string | undefined {
  if (!subtype) return subtype || undefined;
  const trimmed = subtype.trim();
  return LEGACY_TO_CANONICAL[trimmed] ?? trimmed;
}

export function normalizeWorkflowNodes(nodes: Node[] | undefined | null): Node[] {
  if (!nodes || nodes.length === 0) return nodes || [];

  return nodes.map((node) => {
    const currentSubtype = (node.data as any)?.subtype;
    const normalizedSubtype = normalizeNodeSubtype(currentSubtype);
    
    // Preserve all node data including config, options, credentials, etc.
    const nextData = { 
      ...(node.data || {}), 
      subtype: normalizedSubtype || currentSubtype,
      // Ensure config is preserved
      config: node.data?.config || {},
      // Preserve other important fields
      options: node.data?.options || {},
      credentials: node.data?.credentials || {},
    };

    // Some stored workflows keep legacy subtype under config.type or metadata.nodeId
    if ((nextData as any)?.config && typeof (nextData as any).config === 'object') {
      const config = { ...(nextData as any).config };
      if (typeof config?.nodeType === 'string' && LEGACY_TO_CANONICAL[config.nodeType]) {
        config.nodeType = LEGACY_TO_CANONICAL[config.nodeType];
      }
      (nextData as any).config = config;
    }

    // Only update if subtype actually changed
    if (!normalizedSubtype || normalizedSubtype === currentSubtype) {
      // Still ensure config and other fields are preserved
      return {
        ...node,
        data: nextData,
      };
    }

    return {
      ...node,
      data: nextData,
    };
  });
}

export function normalizeWorkflowPayloadNodes(nodes: any[] | undefined | null): any[] {
  if (!nodes || nodes.length === 0) return nodes || [];
  return nodes.map((node) => {
    const subtype = (node?.data as any)?.subtype;
    const normalizedSubtype = normalizeNodeSubtype(subtype);
    if (!normalizedSubtype || normalizedSubtype === subtype) {
      return node;
    }
    const nextData = { ...(node?.data || {}), subtype: normalizedSubtype };
    return {
      ...node,
      data: nextData,
    };
  });
}

