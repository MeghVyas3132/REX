/**
 * Manual Trigger Node - n8n Compatible Version
 * Based on n8n's ManualTrigger node structure
 */

import {
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
	NodeConnectionTypes,
} from '../../types/n8n-types';

export class ManualTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Manual Trigger',
		name: 'manualTrigger',
		icon: 'fa:mouse-pointer',
		group: ['trigger'],
		version: 1,
		description: 'Runs the flow on clicking a button in n8n',
		eventTriggerDescription: '',
		maxNodes: 1,
		defaults: {
			name: 'When clicking \'Execute workflow\'',
			color: '#909298',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'This node is where the workflow execution starts (when you click the \'test\' button on the canvas).<br><br> <a data-action="showNodeCreator">Explore other ways to trigger your workflow</a> (e.g on a schedule, or a webhook)',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};

	getNodeDefinition() {
		return {
			id: 'manualTrigger',
			type: 'trigger',
			name: 'Manual Trigger',
			description: 'Runs the flow on clicking a button',
			category: 'core',
			version: '1.0.0',
			author: 'Workflow Studio',
			parameters: [],
			inputs: [],
			outputs: [
				{
					name: 'data',
					type: 'object',
					displayName: 'Trigger Data',
					description: 'Empty trigger data',
					dataType: 'object'
				}
			]
		};
	}

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const manualTriggerFunction = async () => {
			this.emit([this.helpers.returnJsonArray([{}])]);
		};

		return {
			manualTriggerFunction,
		};
	}
}

export default ManualTrigger;

