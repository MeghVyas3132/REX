/**
 * n8n Execution Adapter
 * Adapts n8n-compatible nodes to work with the existing execution engine
 */

import {
	INodeType,
	IExecuteFunctions,
	ITriggerFunctions,
	IWebhookFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INode,
} from '../../types/n8n-types';
import {
	WorkflowNode,
	ExecutionContext,
	ExecutionResult,
} from '@rex/shared';
const logger = require("../../utils/logger");

/**
 * Creates an execution context adapter for n8n-compatible nodes
 */
export class N8nExecutionAdapter {
	/**
	 * Converts old ExecutionContext to n8n IExecuteFunctions
	 */
	static createExecuteFunctions(
		node: WorkflowNode,
		context: ExecutionContext,
		inputData: INodeExecutionData[] = []
	): IExecuteFunctions {
		const n8nNode: INode = {
			id: node.id,
			name: node.name || node.id,
			type: node.type,
			typeVersion: node.data?.subtype ? parseInt(node.data.subtype) : 1,
			position: [node.position.x, node.position.y],
			parameters: node.data?.config || {},
			credentials: node.data?.credentials || {},
			disabled: node.data?.options?.disabled || false,
			notes: node.data?.label || '',
			notesInFlow: false,
			continueOnFail: node.data?.options?.continueOnError || false,
			alwaysOutputData: node.data?.options?.alwaysOutputData || false,
			executeOnce: node.data?.options?.executeOnce || false,
			retryOnFail: node.data?.options?.retries ? node.data.options.retries > 0 : false,
			maxTries: node.data?.options?.retries || 0,
			waitBetweenTries: node.data?.options?.backoffMs || 0,
		};

		return {
			getNodeParameter: (parameterName: string, itemIndex: number = 0, fallbackValue?: any, options?: any): any => {
				const config = node.data?.config || {};
				const paramValue = this.getNestedParameter(config, parameterName);
				
				if (paramValue !== undefined && paramValue !== null) {
					return paramValue;
				}
				
				// Try to get from input data
				if (inputData[itemIndex]) {
					const inputValue = this.getNestedParameter(inputData[itemIndex].json, parameterName);
					if (inputValue !== undefined && inputValue !== null) {
						return inputValue;
					}
				}
				
				return fallbackValue;
			},
			
			getInputData: (inputIndex?: number, connectionType?: string): INodeExecutionData[] => {
				return inputData;
			},
			
			getNode: (): INode => {
				return n8nNode;
			},
			
			getWorkflow: (): any => {
				return {
					id: context.workflowId,
					name: context.workflowId,
					active: true,
				};
			},
			
			getCredentials: async (type: string, itemIndex?: number): Promise<any> => {
				// Use credential helper to get decrypted credentials
				const { credentialHelper } = await import('../credentials/credential-helper');
				const nodeCredentials = node.data?.credentials || {};
				const credentialId = nodeCredentials[type]?.id;
				
				if (credentialId) {
					const decrypted = await credentialHelper.getCredentials(credentialId, type);
					return decrypted || {};
				}
				
				// Fallback to direct credentials if no credential system
				return nodeCredentials[type]?.data || {};
			},
			
			continueOnFail: (): boolean => {
				return node.data?.options?.continueOnError || false;
			},
			
			evaluateExpression: (expression: string, itemIndex: number): any => {
				// Simple expression evaluation - in production, use proper expression parser
				try {
					// Replace $json with actual data
					const data = inputData[itemIndex]?.json || {};
					const evaluated = expression.replace(/\$json\.([a-zA-Z0-9_]+)/g, (match, key) => {
						return data[key] !== undefined ? JSON.stringify(data[key]) : match;
					});
					return evaluated;
				} catch (error) {
					logger.warn('Expression evaluation failed', { expression, error });
					return expression;
				}
			},
			
			getMode: (): 'manual' | 'trigger' | 'webhook' => {
				return 'manual';
			},
			
			helpers: {
				httpRequest: async (options: any): Promise<any> => {
					const axios = require('axios');
					return await axios(options);
				},
				returnJsonArray: (data: any): INodeExecutionData[] => {
					if (Array.isArray(data)) {
						return data.map(item => ({ json: item }));
					}
					return [{ json: data }];
				},
			},
			
			logger: {
				info: (message: string, meta?: any) => logger.info(message, meta),
				warn: (message: string, meta?: any) => logger.warn(message, meta),
				error: (message: string, meta?: any) => logger.error(message, meta),
				debug: (message: string, meta?: any) => logger.debug(message, meta),
			},
		} as IExecuteFunctions;
	}

	/**
	 * Converts old ExecutionContext to n8n ITriggerFunctions
	 */
	static createTriggerFunctions(
		node: WorkflowNode,
		context: ExecutionContext,
		emitCallback: (data: INodeExecutionData[][]) => void
	): ITriggerFunctions {
		const n8nNode: INode = {
			id: node.id,
			name: node.name || node.id,
			type: node.type,
			typeVersion: node.data?.subtype ? parseInt(node.data.subtype) : 1,
			position: [node.position.x, node.position.y],
			parameters: node.data?.config || {},
			credentials: node.data?.credentials || {},
		};

		return {
			getNodeParameter: (parameterName: string, itemIndex?: number, fallbackValue?: any): any => {
				const config = node.data?.config || {};
				return this.getNestedParameter(config, parameterName) || fallbackValue;
			},
			
			getNode: (): INode => {
				return n8nNode;
			},
			
			getWorkflow: (): any => {
				return {
					id: context.workflowId,
					name: context.workflowId,
					active: true,
				};
			},
			
			emit: (data: INodeExecutionData[][]): void => {
				emitCallback(data);
			},
			
			helpers: {
				registerCron: (cron: any, callback: () => void): void => {
					// Cron registration would be handled by the workflow engine
					logger.info('Cron registered', { cron });
				},
				returnJsonArray: (data: any): INodeExecutionData[] => {
					if (Array.isArray(data)) {
						return data.map(item => ({ json: item }));
					}
					return [{ json: data }];
				},
			},
			
			logger: {
				info: (message: string, meta?: any) => logger.info(message, meta),
				warn: (message: string, meta?: any) => logger.warn(message, meta),
				error: (message: string, meta?: any) => logger.error(message, meta),
				debug: (message: string, meta?: any) => logger.debug(message, meta),
			},
		} as ITriggerFunctions;
	}

	/**
	 * Converts old ExecutionContext to n8n IWebhookFunctions
	 */
	static createWebhookFunctions(
		node: WorkflowNode,
		context: ExecutionContext,
		requestObject: any,
		responseObject: any
	): IWebhookFunctions {
		const n8nNode: INode = {
			id: node.id,
			name: node.name || node.id,
			type: node.type,
			typeVersion: node.data?.subtype ? parseInt(node.data.subtype) : 1,
			position: [node.position.x, node.position.y],
			parameters: node.data?.config || {},
			credentials: node.data?.credentials || {},
		};

		return {
			getNodeParameter: (parameterName: string, itemIndex?: number, fallbackValue?: any): any => {
				const config = node.data?.config || {};
				return this.getNestedParameter(config, parameterName) || fallbackValue;
			},
			
			getNode: (): INode => {
				return n8nNode;
			},
			
			getWorkflow: (): any => {
				return {
					id: context.workflowId,
					name: context.workflowId,
					active: true,
				};
			},
			
			getWebhookName: (): string => {
				return node.data?.config?.webhookName || 'default';
			},
			
			getRequestObject: (): any => {
				return requestObject;
			},
			
			getResponseObject: (): any => {
				return responseObject;
			},
			
			helpers: {},
			
			logger: {
				info: (message: string, meta?: any) => logger.info(message, meta),
				warn: (message: string, meta?: any) => logger.warn(message, meta),
				error: (message: string, meta?: any) => logger.error(message, meta),
				debug: (message: string, meta?: any) => logger.debug(message, meta),
			},
		} as IWebhookFunctions;
	}

	/**
	 * Executes an n8n-compatible node and converts the result to ExecutionResult
	 */
	static async executeN8nNode(
		node: WorkflowNode,
		context: ExecutionContext,
		n8nNode: INodeType,
		inputData: INodeExecutionData[] = []
	): Promise<ExecutionResult> {
		const startTime = Date.now();

		try {
			// Prepare input data from context
			if (inputData.length === 0 && context.input) {
				inputData = [{ json: context.input }];
			}

			// Create execute functions
			const executeFunctions = this.createExecuteFunctions(node, context, inputData);

			// Execute the node
			let result: INodeExecutionData[][] | null = null;

			if (n8nNode.execute) {
				result = await n8nNode.execute.call(executeFunctions);
			} else if (n8nNode.trigger) {
				// For trigger nodes, we need to handle them differently
				const emitCallback = (data: INodeExecutionData[][]): void => {
					// Store emitted data for later use
					result = data;
				};
				const triggerFunctions = this.createTriggerFunctions(node, context, emitCallback);
				const triggerResponse = await n8nNode.trigger.call(triggerFunctions);
				
				// If manual trigger function exists, call it
				if (triggerResponse?.manualTriggerFunction) {
					await triggerResponse.manualTriggerFunction();
				}
			} else if (n8nNode.webhook) {
				// Webhook nodes are handled separately by the webhook handler
				throw new Error('Webhook nodes should be handled by the webhook handler');
			} else {
				throw new Error('Node does not implement execute, trigger, or webhook method');
			}

			const duration = Date.now() - startTime;

			// Convert n8n result to ExecutionResult
			if (result && result.length > 0 && result[0].length > 0) {
				// Flatten the result array
				const output = result[0].map(item => item.json);
				return {
					success: true,
					output: output.length === 1 ? output[0] : output,
					duration,
				};
			}

			return {
				success: true,
				output: {},
				duration,
			};
		} catch (error: any) {
			const duration = Date.now() - startTime;
			logger.error('n8n node execution failed', error, {
				nodeId: node.id,
				nodeType: node.type,
				runId: context.runId,
				duration,
			});

			return {
				success: false,
				error: error.message || 'Unknown error',
				duration,
			};
		}
	}

	/**
	 * Creates ILoadOptionsFunctions for loadOptions methods
	 */
	static createLoadOptionsFunctions(
		node: WorkflowNode,
		config: Record<string, any> = {}
	): ILoadOptionsFunctions {
		const n8nNode: INode = {
			id: node.id,
			name: node.name || node.id,
			type: node.type,
			typeVersion: node.data?.subtype ? parseInt(node.data.subtype) : 1,
			position: [node.position.x, node.position.y],
			parameters: config,
			credentials: node.data?.credentials || {},
		};

		return {
			getNodeParameter: (parameterName: string, itemIndex?: number, fallbackValue?: any): any => {
				const paramValue = this.getNestedParameter(config, parameterName);
				return paramValue !== undefined && paramValue !== null ? paramValue : fallbackValue;
			},
			
			getCredentials: async (type: string, itemIndex?: number): Promise<any> => {
				const { credentialHelper } = await import('../credentials/credential-helper');
				const nodeCredentials = node.data?.credentials || {};
				const credentialId = nodeCredentials[type]?.id;
				
				if (credentialId) {
					const decrypted = await credentialHelper.getCredentials(credentialId, type);
					return decrypted || {};
				}
				
				return nodeCredentials[type]?.data || {};
			},
			
			getCurrentNodeParameter: (parameterName: string): any => {
				return this.getNestedParameter(config, parameterName);
			},
			
			getCurrentNodeParameters: (): any => {
				return config;
			},
			
			getWorkflowStaticData: (type: string): any => {
				return {};
			},
			
			getWorkflow: (): any => {
				return {
					id: 'temp',
					name: 'temp',
					active: true,
				};
			},
			
			getNode: (): INode => {
				return n8nNode;
			},
			
			helpers: {
				httpRequest: async (options: any): Promise<any> => {
					const axios = require('axios');
					return await axios(options);
				},
				request: async (uriOrObject: string | any, options?: any): Promise<any> => {
					const axios = require('axios');
					if (typeof uriOrObject === 'string') {
						return await axios({ url: uriOrObject, ...options });
					}
					return await axios(uriOrObject);
				},
			},
			
			logger: {
				info: (message: string, meta?: any) => logger.info(message, meta),
				warn: (message: string, meta?: any) => logger.warn(message, meta),
				error: (message: string, meta?: any) => logger.error(message, meta),
				debug: (message: string, meta?: any) => logger.debug(message, meta),
			},
		} as ILoadOptionsFunctions;
	}

	/**
	 * Gets a nested parameter value using dot notation
	 */
	private static getNestedParameter(obj: any, path: string): any {
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
}

export default N8nExecutionAdapter;

