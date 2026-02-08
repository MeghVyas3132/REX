import { WorkflowNode, ExecutionContext, ExecutionResult, NodeType } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;

export class ManualTriggerNode {
  getNodeDefinition() {
    return {
      id: 'manual',
      type: 'trigger' as NodeType,
      name: 'Manual Trigger',
      description: 'Start workflow manually from the UI',
      category: 'core',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'buttonText',
          type: 'string',
          displayName: 'Button Text',
          description: 'Text to display on the run button',
          required: false,
          default: 'Run Workflow',
          placeholder: 'Run Workflow'
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'input',
          type: 'object',
          displayName: 'Input Data',
          description: 'Initial input data for the workflow',
          required: false,
          dataType: 'object'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'input',
          type: 'object',
          displayName: 'Input Data',
          description: 'Pass through input data to next nodes',
          dataType: 'object'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          buttonText: { type: 'string' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          input: { type: 'object' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.data?.config || {};
      
      // Check if Manual Trigger has configured inputData
      let outputData = {};
      if (config.inputData) {
        // Use configured inputData from node config
        if (typeof config.inputData === 'string') {
          try {
            outputData = JSON.parse(config.inputData);
          } catch {
            outputData = config.inputData;
          }
        } else {
          outputData = config.inputData;
        }
      } else {
        // Fallback to context.input if no inputData configured
        outputData = context.input || {};
      }

      logger.info('Manual trigger executed', {
        nodeId: node.id,
        runId: context.runId,
        hasConfigInputData: !!config.inputData,
        inputKeys: Object.keys(context.input || {}),
        outputKeys: Object.keys(outputData),
        output: outputData
      });

      // Manual trigger passes through the configured inputData or context input
      return {
        success: true,
        output: outputData,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Manual trigger failed', error, {
        nodeId: node.id,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }

}}

export default ManualTriggerNode;

