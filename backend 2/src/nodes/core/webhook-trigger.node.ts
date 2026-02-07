import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class WebhookTriggerNode {
  getNodeDefinition() {
    return {
  id: 'webhook-trigger',
  type: 'action',
  name: 'Webhook Trigger',
  description: 'Trigger workflow from webhook',
  category: 'core',
  version: '1.0.0',
  author: 'Workflow Studio',
  parameters: [
    {
      name: 'method',
      type: 'string',
      displayName: 'Method',
      description: 'method configuration',
      required: true,
      placeholder: 'Enter method...'
    }
  ],
  inputs: [
    {
      name: 'method',
      type: 'any',
      displayName: 'Method',
      description: 'method from previous node',
      required: false,
      dataType: 'any'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'any',
      displayName: 'Output',
      description: 'Output from the node',
      dataType: 'any'
    },
    {
      name: 'success',
      type: 'boolean',
      displayName: 'Success',
      description: 'Whether the operation succeeded',
      dataType: 'boolean'
    }
  ]
};
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    // Trigger nodes typically don't execute like actions; they pass incoming data
    const startTime = Date.now();
    const config = node.data?.config || {};
    if (!config.method && !context.input?.method) {
      throw new Error('Required parameter "method" is missing');
    }

    try {
      const { input } = context;
      logger.info('Webhook trigger received input', { nodeId: node.id, runId: context.runId });
      return { success: true, output: input, duration: Date.now() - startTime };
    } catch (error: any) {
      return { success: false, error: error.message, duration: Date.now() - startTime };
    }
  }}


export default WebhookTriggerNode;
