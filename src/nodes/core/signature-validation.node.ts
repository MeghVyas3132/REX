import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");
const crypto = require('crypto');

export class SignatureValidationNode {
  getNodeDefinition() {
    return {
  id: 'signature-validation',
  type: 'action',
  name: 'Signature Validation',
  description: 'Validate cryptographic signatures',
  category: 'core',
  version: '1.0.0',
  author: 'Workflow Studio',
  parameters: [
    {
      name: 'algorithm',
      type: 'string',
      displayName: 'Algorithm',
      description: 'algorithm configuration',
      required: true,
      placeholder: 'Enter algorithm...'
    },
    {
      name: 'secret',
      type: 'string',
      displayName: 'Secret',
      description: 'secret configuration',
      required: false,
      placeholder: 'Enter secret...'
    },
    {
      name: 'headerName',
      type: 'string',
      displayName: 'Header Name',
      description: 'headerName configuration',
      required: false,
      placeholder: 'Enter headerName...'
    },
    {
      name: 'payloadPath',
      type: 'string',
      displayName: 'Payload Path',
      description: 'payloadPath configuration',
      required: false,
      placeholder: 'Enter payloadPath...'
    }
  ],
  inputs: [
    {
      name: 'algorithm',
      type: 'any',
      displayName: 'Algorithm',
      description: 'algorithm from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'headers',
      type: 'any',
      displayName: 'Headers',
      description: 'headers from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'header',
      type: 'any',
      displayName: 'Header',
      description: 'header from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'signature',
      type: 'any',
      displayName: 'Signature',
      description: 'signature from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'payload',
      type: 'any',
      displayName: 'Payload',
      description: 'payload from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'body',
      type: 'any',
      displayName: 'Body',
      description: 'body from previous node',
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
    const startTime = Date.now();
    const config = node.data?.config || {};
    if (!config.algorithm && !context.input?.algorithm) {
      throw new Error('Required parameter "algorithm" is missing');
    }

    
    try {
      const config = node.config || node.data?.config || {};
      const algorithm = config.algorithm || 'sha256';
      const secret = config.secret;
      const headerName = config.headerName || 'x-signature';
      
      if (!secret) {
        throw new Error('Secret key is required for signature validation');
      }

      // Get signature from headers or input
      const headers = context.input?.headers || context.input?.header || {};
      let signature = context.input?.signature || headers[headerName.toLowerCase()] || headers[headerName];
      
      // Remove 'sha256=' prefix if present (common in GitHub, Stripe webhooks)
      if (signature && typeof signature === 'string') {
        signature = signature.replace(/^(sha256=|sha512=|sha1=)/i, '');
      }

      if (!signature) {
        return {
          success: false,
          error: `Signature not found in header '${headerName}'`,
          duration: Date.now() - startTime
        };
      }

      // Get payload from input or context
      let payload = context.input?.payload || context.input?.body || context.input;
      
      // Handle payload path if specified
      if (config.payloadPath && payload) {
        const pathParts = config.payloadPath.split('.');
        for (const part of pathParts) {
          payload = payload?.[part];
        }
      }

      // Ensure payload is stringified for hashing
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      
      // Calculate expected signature
      const hmac = crypto.createHmac(algorithm, secret);
      hmac.update(payloadString);
      const expectedSignature = hmac.digest('hex');
      
      // Compare signatures (constant-time comparison to prevent timing attacks)
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      const duration = Date.now() - startTime;
      
      if (!isValid) {
        logger.warn('Signature validation failed', {
          nodeId: node.id,
          algorithm,
          headerName,
          runId: context.runId
        });
        
        return {
          success: false,
          error: 'Invalid signature',
          output: {
            isValid: false,
            message: 'Signature validation failed',
            payload: null
          },
          duration
        };
      }

      logger.info('Signature validation succeeded', {
        nodeId: node.id,
        algorithm,
        runId: context.runId
      });

      return {
        success: true,
        output: {
          isValid: true,
          message: 'Signature is valid',
          payload: payload
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Signature validation error', {
        error: error.message,
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


export default SignatureValidationNode;
