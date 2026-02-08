/**
 * Node Registry V2 - Supports both old and new n8n-compatible node structures
 * This allows gradual migration while maintaining backward compatibility
 */

import { NodeDefinition, NodeType } from '@rex/shared';
import { INodeType, INodeTypeDescription, IVersionedNodeType } from '../../types/n8n-types';
import { convertNodeDefinitionToDescription, createNodeAdapter } from '../../utils/node-adapter';
const logger = require("../../utils/logger");
import * as fs from 'fs';
import * as path from 'path';

export interface NodeRegistryEntryV2 {
	id: string;
	type: NodeType;
	name: string;
	description: string;
	category: string;
	version: string;
	author: string;
	nodeClass: any;
	// Old structure
	configSchema?: any;
	inputSchema?: any;
	outputSchema?: any;
	parameters?: any[];
	inputs?: any[];
	outputs?: any[];
	// New n8n-compatible structure
	n8nNode?: INodeType;
	n8nDescription?: INodeTypeDescription;
	isN8nCompatible?: boolean;
}

export class NodeRegistryV2 {
	private static instance: NodeRegistryV2;
	private nodes: Map<string, NodeRegistryEntryV2> = new Map();
	private aliases: Map<string, string> = new Map();
	private nodeDirectories: string[] = [];

	private constructor() {
		this.initializeNodeDirectories();
		this.autoLoadNodes();
		this.setupAliases();
	}

	public static getInstance(): NodeRegistryV2 {
		if (!NodeRegistryV2.instance) {
			NodeRegistryV2.instance = new NodeRegistryV2();
		}
		return NodeRegistryV2.instance;
	}

	private initializeNodeDirectories(): void {
		const basePath = path.join(__dirname, '../../nodes');
		this.nodeDirectories = [
			path.join(basePath, 'core'),
			path.join(basePath, 'llm'),
			path.join(basePath, 'ai'),
			path.join(basePath, 'integrations'),
			path.join(basePath, 'data'),
			path.join(basePath, 'logic'),
			path.join(basePath, 'triggers'),
			path.join(basePath, 'utility'),
			path.join(basePath, 'utilities'),
			path.join(basePath, 'agent'),
			path.join(basePath, 'cloud'),
			path.join(basePath, 'communication'),
			path.join(basePath, 'finance'),
			path.join(basePath, 'development'),
			path.join(basePath, 'analytics'),
			path.join(basePath, 'productivity'),
			path.join(basePath, 'file-processing')
		];
	}

	private setupAliases(): void {
		// Keep existing aliases
		this.aliases.set('ai.openai', 'openai');
		this.aliases.set('ai.claude', 'claude');
		this.aliases.set('ai.anthropic', 'claude');
		this.aliases.set('llm.openai', 'openai');
		this.aliases.set('llm.claude', 'claude');
	}

	private autoLoadNodes(): void {
		// Load old structure nodes
		for (const dir of this.nodeDirectories) {
			if (fs.existsSync(dir)) {
				this.loadNodesFromDirectory(dir);
			}
		}

		// Load new n8n-compatible nodes
		this.loadN8nCompatibleNodes();
	}

	private loadNodesFromDirectory(dir: string): void {
		const files = fs.readdirSync(dir);
		
		for (const file of files) {
			if (file.endsWith('.node.ts') && !file.includes('-v2.node.ts')) {
				const filePath = path.join(dir, file);
				this.loadNodeFromFile(filePath);
			}
		}
	}

	private loadNodeFromFile(filePath: string): void {
		try {
			delete require.cache[require.resolve(filePath)];
			const nodeModule = require(filePath);
			const nodeClass = nodeModule.default || nodeModule[Object.keys(nodeModule)[0]];

			if (!nodeClass) {
				logger.warn(`No node class found in file: ${filePath}`);
				return;
			}

			const nodeInstance = new nodeClass();
			
			if (!nodeInstance.getNodeDefinition) {
				logger.warn(`Node in ${filePath} does not implement getNodeDefinition method`);
				return;
			}

			const definition = nodeInstance.getNodeDefinition();
			
			if (!definition.id || !definition.type) {
				logger.warn(`Node in ${filePath} has invalid definition`);
				return;
			}

			const registryEntry: NodeRegistryEntryV2 = {
				id: definition.id,
				type: definition.type,
				name: definition.name,
				description: definition.description,
				category: definition.category || 'general',
				version: definition.version || '1.0.0',
				author: definition.author || 'unknown',
				nodeClass,
				configSchema: definition.configSchema,
				inputSchema: definition.inputSchema,
				outputSchema: definition.outputSchema,
				parameters: definition.parameters,
				inputs: definition.inputs,
				outputs: definition.outputs,
				isN8nCompatible: false,
			};

			// Create adapter for n8n compatibility
			try {
				registryEntry.n8nNode = createNodeAdapter(nodeClass);
				registryEntry.n8nDescription = convertNodeDefinitionToDescription(definition);
			} catch (error) {
				logger.warn(`Failed to create n8n adapter for ${definition.id}:`, error);
			}

			this.nodes.set(definition.id, registryEntry);
			logger.info(`✅ Loaded node: ${definition.id} (${definition.type})`);
		} catch (error: any) {
			logger.warn(`⚠️  Skipped node file ${filePath}: ${error.message}`);
		}
	}

	private loadN8nCompatibleNodes(): void {
		// Load new n8n-compatible nodes (v2 nodes)
		const v2Nodes = [
			'../../nodes/triggers/manual-trigger-v2.node',
			'../../nodes/core/code-v2.node',
			'../../nodes/core/http-request/HttpRequest.node',
			'../../nodes/core/webhook-v2.node',
			'../../nodes/core/scheduler-v2.node',
			'../../nodes/data/postgresql-v2.node',
			'../../nodes/triggers/email-trigger-v2.node',
			'../../nodes/triggers/form-submit-v2.node',
			// removed file-watch-v2.node
			'../../nodes/triggers/file-trigger-v2.node',
			'../../nodes/triggers/database-trigger-v2.node',
		];

		for (const nodePath of v2Nodes) {
			try {
				const fullPath = path.join(__dirname, nodePath);
				if (fs.existsSync(fullPath + '.ts')) {
					delete require.cache[require.resolve(fullPath)];
					const nodeModule = require(fullPath);
					const nodeClass = nodeModule.default || nodeModule[Object.keys(nodeModule)[0]];

					if (!nodeClass) {
						continue;
					}

					const nodeInstance = new nodeClass();
					
					// Handle VersionedNodeType
					let actualNode: INodeType;
					let description: INodeTypeDescription;
					
					if (nodeInstance.getNodeType && typeof nodeInstance.getNodeType === 'function') {
						// It's a VersionedNodeType
						actualNode = nodeInstance.getNodeType();
						description = actualNode.description;
					} else if (nodeInstance.description) {
						// It's a regular INodeType
						actualNode = nodeInstance;
						description = nodeInstance.description as INodeTypeDescription;
					} else {
						logger.warn(`Node in ${fullPath} does not have description property`);
						continue;
					}

					const nodeId = description.name;

					const registryEntry: NodeRegistryEntryV2 = {
						id: nodeId,
						type: this.mapGroupToNodeType(description.group[0]),
						name: description.displayName,
						description: description.description,
						category: description.group[0],
						version: Array.isArray(description.version) 
							? String(description.version[description.version.length - 1])
							: String(description.version),
						author: 'n8n-compatible',
						nodeClass,
						n8nNode: actualNode,
						n8nDescription: description,
						isN8nCompatible: true,
					};

					this.nodes.set(nodeId, registryEntry);
					logger.info(`✅ Loaded n8n-compatible node: ${nodeId}`);
				}
			} catch (error: any) {
				logger.warn(`⚠️  Failed to load n8n-compatible node ${nodePath}: ${error.message}`);
			}
		}
	}

	private mapGroupToNodeType(group: string): NodeType {
		const groupMap: Record<string, NodeType> = {
			'trigger': 'trigger',
			'transform': 'action',
			'input': 'action',
			'output': 'action',
			'organization': 'action',
			'schedule': 'trigger',
		};
		return groupMap[group] || 'action';
	}

	public registerNode(nodeClass: any, definition?: Partial<NodeDefinition>): void {
		try {
			const nodeInstance = new nodeClass();
			
			// Check if it's n8n-compatible
			if (nodeInstance.description) {
				const description = nodeInstance.description as INodeTypeDescription;
				const nodeId = description.name;

				const registryEntry: NodeRegistryEntryV2 = {
					id: nodeId,
					type: this.mapGroupToNodeType(description.group[0]),
					name: description.displayName,
					description: description.description,
					category: description.group[0],
					version: Array.isArray(description.version) 
						? String(description.version[description.version.length - 1])
						: String(description.version),
					author: 'n8n-compatible',
					nodeClass,
					n8nNode: nodeInstance,
					n8nDescription: description,
					isN8nCompatible: true,
				};

				this.nodes.set(nodeId, registryEntry);
				logger.info(`Manually registered n8n-compatible node: ${nodeId}`);
			} else if (nodeInstance.getNodeDefinition) {
				// Old structure
				const fullDefinition = nodeInstance.getNodeDefinition();
				
				const registryEntry: NodeRegistryEntryV2 = {
					id: fullDefinition.id,
					type: fullDefinition.type,
					name: fullDefinition.name,
					description: fullDefinition.description,
					category: fullDefinition.category || 'general',
					version: fullDefinition.version || '1.0.0',
					author: fullDefinition.author || 'unknown',
					nodeClass,
					configSchema: fullDefinition.configSchema,
					inputSchema: fullDefinition.inputSchema,
					outputSchema: fullDefinition.outputSchema,
					parameters: fullDefinition.parameters,
					inputs: fullDefinition.inputs,
					outputs: fullDefinition.outputs,
					isN8nCompatible: false,
				};

				// Create adapter
				try {
					registryEntry.n8nNode = createNodeAdapter(nodeClass);
					registryEntry.n8nDescription = convertNodeDefinitionToDescription(fullDefinition);
				} catch (error) {
					logger.warn(`Failed to create n8n adapter:`, error);
				}

				this.nodes.set(fullDefinition.id, registryEntry);
				logger.info(`Manually registered node: ${fullDefinition.id}`);
			}
		} catch (error: any) {
			logger.error('Error registering node:', error);
		}
	}

	public getNode(nodeId: string): NodeRegistryEntryV2 | undefined {
		const actualNodeId = this.aliases.get(nodeId) || nodeId;
		return this.nodes.get(actualNodeId);
	}

	public getAllNodes(): NodeRegistryEntryV2[] {
		return Array.from(this.nodes.values());
	}

	public getN8nCompatibleNodes(): NodeRegistryEntryV2[] {
		return Array.from(this.nodes.values()).filter(node => node.isN8nCompatible);
	}

	public getOldStructureNodes(): NodeRegistryEntryV2[] {
		return Array.from(this.nodes.values()).filter(node => !node.isN8nCompatible);
	}

	public getNodeDefinition(nodeId: string): NodeDefinition | INodeTypeDescription | undefined {
		const node = this.getNode(nodeId);
		if (!node) return undefined;

		if (node.isN8nCompatible && node.n8nDescription) {
			return node.n8nDescription;
		} else if (node.nodeClass) {
			const instance = new node.nodeClass();
			if (instance.getNodeDefinition) {
				return instance.getNodeDefinition();
			}
		}

		return undefined;
	}
}

export default NodeRegistryV2;

