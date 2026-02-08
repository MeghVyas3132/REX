/**
 * Load Options Handler
 * Handles dynamic option loading for nodes
 */

import { INodePropertyOptions, ILoadOptionsFunctions } from '../../types/n8n-types';
import { INodeType } from '../../types/n8n-types';
import NodeRegistryV2 from '../registry/node-registry-v2';
import { nodeRegistry } from '../registry/node-registry';
const logger = require("../../utils/logger");

export class LoadOptionsHandler {
	private static instance: LoadOptionsHandler;
	private nodeRegistryV2: NodeRegistryV2;

	private constructor() {
		this.nodeRegistryV2 = NodeRegistryV2.getInstance();
	}

	public static getInstance(): LoadOptionsHandler {
		if (!LoadOptionsHandler.instance) {
			LoadOptionsHandler.instance = new LoadOptionsHandler();
		}
		return LoadOptionsHandler.instance;
	}

	/**
	 * Loads options for a node property
	 */
	public async loadOptions(
		nodeId: string,
		methodName: string,
		loadOptionsContext: ILoadOptionsFunctions
	): Promise<INodePropertyOptions[]> {
		try {
			// First check n8n-compatible nodes
			const n8nNodeEntry = this.nodeRegistryV2.getNode(nodeId);
			if (n8nNodeEntry && n8nNodeEntry.isN8nCompatible && n8nNodeEntry.n8nNode) {
				const methods = n8nNodeEntry.n8nNode.methods;
				if (methods && methods.loadOptions && methods.loadOptions[methodName]) {
					const loadOptionsMethod = methods.loadOptions[methodName];
					return await loadOptionsMethod.call(loadOptionsContext);
				}
			}

			// Fallback to old structure
			const oldNodeEntry = nodeRegistry.getNode(nodeId);
			if (oldNodeEntry && oldNodeEntry.nodeClass) {
				const nodeInstance = new oldNodeEntry.nodeClass();
				if (nodeInstance.methods && nodeInstance.methods.loadOptions && nodeInstance.methods.loadOptions[methodName]) {
					const loadOptionsMethod = nodeInstance.methods.loadOptions[methodName];
					return await loadOptionsMethod.call(loadOptionsContext);
				}
			}

			logger.warn(`Load options method '${methodName}' not found for node '${nodeId}'`);
			return [];
		} catch (error: any) {
			logger.error(`Failed to load options for ${nodeId}.${methodName}:`, error);
			return [];
		}
	}

	/**
	 * Checks if a node has a load options method
	 */
	public hasLoadOptionsMethod(nodeId: string, methodName: string): boolean {
		// Check n8n-compatible nodes
		const n8nNodeEntry = this.nodeRegistryV2.getNode(nodeId);
		if (n8nNodeEntry && n8nNodeEntry.isN8nCompatible && n8nNodeEntry.n8nNode) {
			const methods = n8nNodeEntry.n8nNode.methods;
			if (methods && methods.loadOptions && methods.loadOptions[methodName]) {
				return true;
			}
		}

		// Check old structure
		const oldNodeEntry = nodeRegistry.getNode(nodeId);
		if (oldNodeEntry && oldNodeEntry.nodeClass) {
			const nodeInstance = new oldNodeEntry.nodeClass();
			if (nodeInstance.methods && nodeInstance.methods.loadOptions && nodeInstance.methods.loadOptions[methodName]) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Gets all available load options methods for a node
	 */
	public getLoadOptionsMethods(nodeId: string): string[] {
		const methods: string[] = [];

		// Check n8n-compatible nodes
		const n8nNodeEntry = this.nodeRegistryV2.getNode(nodeId);
		if (n8nNodeEntry && n8nNodeEntry.isN8nCompatible && n8nNodeEntry.n8nNode) {
			const nodeMethods = n8nNodeEntry.n8nNode.methods;
			if (nodeMethods && nodeMethods.loadOptions) {
				methods.push(...Object.keys(nodeMethods.loadOptions));
			}
		}

		// Check old structure
		const oldNodeEntry = nodeRegistry.getNode(nodeId);
		if (oldNodeEntry && oldNodeEntry.nodeClass) {
			const nodeInstance = new oldNodeEntry.nodeClass();
			if (nodeInstance.methods && nodeInstance.methods.loadOptions) {
				methods.push(...Object.keys(nodeInstance.methods.loadOptions));
			}
		}

		return [...new Set(methods)]; // Remove duplicates
	}
}

export const loadOptionsHandler = LoadOptionsHandler.getInstance();

