/**
 * Node Adapter - Bridges between old node structure and n8n-compatible structure
 * This allows gradual migration while maintaining backward compatibility
 */

import {
	INodeType,
	INodeTypeDescription,
	INodeProperties,
	NodeConnectionTypes,
} from '../types/n8n-types';
import { NodeDefinition, NodeType } from './types';

/**
 * Converts old node definition to n8n-compatible description
 */
export function convertNodeDefinitionToDescription(
	oldDefinition: NodeDefinition
): INodeTypeDescription {
	const properties: INodeProperties[] = (oldDefinition.parameters || []).map((param: any) => {
		const prop: INodeProperties = {
			displayName: param.displayName || param.name,
			name: param.name,
			type: mapParameterTypeToPropertyType(param.type),
			default: param.default,
			description: param.description,
			placeholder: param.placeholder,
			required: param.required,
		};

		// Handle options type
		if (param.type === 'options' && param.options) {
			prop.options = param.options.map((opt: any) => ({
				name: opt.name || opt.label || String(opt.value),
				value: opt.value,
				description: opt.description,
			}));
		}

		// Handle number constraints
		if (param.type === 'number') {
			prop.typeOptions = {
				minValue: param.min,
				maxValue: param.max,
			};
		}

		// Handle string with rows (textarea)
		if (param.type === 'string' && param.rows) {
			prop.typeOptions = {
				rows: param.rows,
			};
		}

		return prop;
	});

	// Map node type to group
	const group = mapNodeTypeToGroup(oldDefinition.type);

	return {
		displayName: oldDefinition.name,
		name: oldDefinition.id,
		icon: 'fa:code', // Default icon
		group: [group],
		version: parseVersion(oldDefinition.version),
		defaultVersion: 1,
		description: oldDefinition.description,
		defaults: {
			name: oldDefinition.name,
			color: '#000000', // Default color
		},
		inputs: oldDefinition.inputs && oldDefinition.inputs.length > 0
			? [NodeConnectionTypes.Main]
			: [],
		outputs: oldDefinition.outputs && oldDefinition.outputs.length > 0
			? [NodeConnectionTypes.Main]
			: [],
		properties,
	};
}

/**
 * Maps parameter type to n8n property type
 */
function mapParameterTypeToPropertyType(type: string): INodeProperties['type'] {
	const typeMap: Record<string, INodeProperties['type']> = {
		'string': 'string',
		'number': 'number',
		'boolean': 'boolean',
		'options': 'options',
		'select': 'options',
		'textarea': 'string',
		'file': 'string',
		'expression': 'string',
		'nodeOutput': 'string',
	};

	return typeMap[type] || 'string';
}

/**
 * Maps node type to n8n group
 */
function mapNodeTypeToGroup(type: NodeType): 'input' | 'output' | 'organization' | 'schedule' | 'transform' | 'trigger' {
	const groupMap: Record<NodeType, 'input' | 'output' | 'organization' | 'schedule' | 'transform' | 'trigger'> = {
		'trigger': 'trigger',
		'action': 'transform',
		'condition': 'transform',
		'loop': 'transform',
		'data': 'input',
		'ai': 'transform',
		'integration': 'input',
		'utility': 'transform',
		'agent': 'transform',
		'cloud': 'input',
		'llm': 'transform',
		'logic': 'transform',
	};

	return groupMap[type] || 'transform';
}

/**
 * Parses version string to number or array
 */
function parseVersion(version: string): number | number[] {
	// Handle version strings like "1.0.0" -> 1
	const match = version.match(/^(\d+)/);
	if (match) {
		return parseInt(match[1], 10);
	}
	return 1;
}

/**
 * Creates a wrapper that adapts old node class to INodeType interface
 */
export function createNodeAdapter(oldNodeClass: any): INodeType {
	// Create instance to get definition
	const nodeInstance = new oldNodeClass();
	if (!nodeInstance.getNodeDefinition) {
		throw new Error('Node class does not implement getNodeDefinition method');
	}
	const definition = nodeInstance.getNodeDefinition();
	
	return {
		description: convertNodeDefinitionToDescription(definition),
		async execute(this: any): Promise<any[][]> {
			// Adapt execution context
			const node = this.getNode();
			const context = {
				runId: this.getExecutionId(),
				workflowId: this.getWorkflow().id,
				nodeId: node.id,
				input: this.getInputData()[0]?.json || {},
				output: {},
				variables: {},
				credentials: {},
			};

			// Create new instance for execution
			const execInstance = new oldNodeClass();
			// Call old execute method
			const result = await execInstance.execute(node, context);

			// Convert result to n8n format
			if (result.success) {
				const output = Array.isArray(result.output) ? result.output : [result.output];
				return [output.map((item: any) => ({ json: item }))];
			} else {
				throw new Error(result.error || 'Node execution failed');
			}
		},
	};
}

