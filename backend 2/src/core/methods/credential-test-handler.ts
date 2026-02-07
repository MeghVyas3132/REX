/**
 * Credential Test Handler
 * Handles credential testing for nodes
 */

import { INodeCredentialTestResult, ICredentialTestFunctions } from '../../types/n8n-types';
import { ICredentialDataDecryptedObject } from '../../types/n8n-types';
import NodeRegistryV2 from '../registry/node-registry-v2';
import { nodeRegistry } from '../registry/node-registry';
const logger = require("../../utils/logger");

export class CredentialTestHandler {
	private static instance: CredentialTestHandler;
	private nodeRegistryV2: NodeRegistryV2;

	private constructor() {
		this.nodeRegistryV2 = NodeRegistryV2.getInstance();
	}

	public static getInstance(): CredentialTestHandler {
		if (!CredentialTestHandler.instance) {
			CredentialTestHandler.instance = new CredentialTestHandler();
		}
		return CredentialTestHandler.instance;
	}

	/**
	 * Tests credentials for a node
	 */
	public async testCredentials(
		nodeId: string,
		methodName: string,
		credentials: ICredentialDataDecryptedObject,
		testContext: ICredentialTestFunctions
	): Promise<INodeCredentialTestResult> {
		try {
			// First check n8n-compatible nodes
			const n8nNodeEntry = this.nodeRegistryV2.getNode(nodeId);
			if (n8nNodeEntry && n8nNodeEntry.isN8nCompatible && n8nNodeEntry.n8nNode) {
				const methods = n8nNodeEntry.n8nNode.methods;
				if (methods && methods.credentialTest && methods.credentialTest[methodName]) {
					const testMethod = methods.credentialTest[methodName];
					return await testMethod.call(testContext, credentials);
				}
			}

			// Fallback to old structure
			const oldNodeEntry = nodeRegistry.getNode(nodeId);
			if (oldNodeEntry && oldNodeEntry.nodeClass) {
				const nodeInstance = new oldNodeEntry.nodeClass();
				if (nodeInstance.methods && nodeInstance.methods.credentialTest && nodeInstance.methods.credentialTest[methodName]) {
					const testMethod = nodeInstance.methods.credentialTest[methodName];
					return await testMethod.call(testContext, credentials);
				}
			}

			logger.warn(`Credential test method '${methodName}' not found for node '${nodeId}'`);
			return {
				status: 'Error',
				message: `Credential test method '${methodName}' not found for node '${nodeId}'`,
			};
		} catch (error: any) {
			logger.error(`Failed to test credentials for ${nodeId}.${methodName}:`, error);
			return {
				status: 'Error',
				message: error.message || 'Credential test failed',
			};
		}
	}

	/**
	 * Checks if a node has a credential test method
	 */
	public hasCredentialTestMethod(nodeId: string, methodName: string): boolean {
		// Check n8n-compatible nodes
		const n8nNodeEntry = this.nodeRegistryV2.getNode(nodeId);
		if (n8nNodeEntry && n8nNodeEntry.isN8nCompatible && n8nNodeEntry.n8nNode) {
			const methods = n8nNodeEntry.n8nNode.methods;
			if (methods && methods.credentialTest && methods.credentialTest[methodName]) {
				return true;
			}
		}

		// Check old structure
		const oldNodeEntry = nodeRegistry.getNode(nodeId);
		if (oldNodeEntry && oldNodeEntry.nodeClass) {
			const nodeInstance = new oldNodeEntry.nodeClass();
			if (nodeInstance.methods && nodeInstance.methods.credentialTest && nodeInstance.methods.credentialTest[methodName]) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Gets all available credential test methods for a node
	 */
	public getCredentialTestMethods(nodeId: string): string[] {
		const methods: string[] = [];

		// Check n8n-compatible nodes
		const n8nNodeEntry = this.nodeRegistryV2.getNode(nodeId);
		if (n8nNodeEntry && n8nNodeEntry.isN8nCompatible && n8nNodeEntry.n8nNode) {
			const nodeMethods = n8nNodeEntry.n8nNode.methods;
			if (nodeMethods && nodeMethods.credentialTest) {
				methods.push(...Object.keys(nodeMethods.credentialTest));
			}
		}

		// Check old structure
		const oldNodeEntry = nodeRegistry.getNode(nodeId);
		if (oldNodeEntry && oldNodeEntry.nodeClass) {
			const nodeInstance = new oldNodeEntry.nodeClass();
			if (nodeInstance.methods && nodeInstance.methods.credentialTest) {
				methods.push(...Object.keys(nodeInstance.methods.credentialTest));
			}
		}

		return [...new Set(methods)]; // Remove duplicates
	}
}

export const credentialTestHandler = CredentialTestHandler.getInstance();

