/**
 * Cron Node - n8n Compatible Version
 * Based on n8n's Cron node structure
 */

import {
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
	TriggerTime,
	NodeConnectionTypes,
} from '../../types/n8n-types';

// Note: We need to implement toCronExpression and cronNodeOptions helpers
// For now, using a simplified version that matches n8n's structure

function toCronExpression(triggerTime: TriggerTime): string {
	if (triggerTime.mode === 'cron') {
		return triggerTime.cronExpression || '0 * * * *';
	}
	// Convert other modes to cron expressions
	// This is a simplified version - n8n has a more complex implementation
	return '0 * * * *';
}

export class Cron implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cron',
		name: 'cron',
		icon: 'fa:clock',
		group: ['trigger', 'schedule'],
		version: 1,
		hidden: true,
		description: 'Triggers the workflow at a specific time',
		eventTriggerDescription: '',
		activationMessage:
			'Your cron trigger will now trigger executions on the schedule you have defined.',
		defaults: {
			name: 'Cron',
			color: '#29a568',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'This workflow will run on the schedule you define here once you <a data-key="activate">activate</a> it.<br><br>For testing, you can also trigger it manually: by going back to the canvas and clicking \'execute workflow\'',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Trigger Times',
				name: 'triggerTimes',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Time',
				},
				default: {},
				description: 'Triggers for the workflow',
				placeholder: 'Add Cron Time',
				// Note: In n8n, this uses NodeHelpers.cronNodeOptions
				// We'll need to implement this or use a similar structure
				options: [
					{
						displayName: 'Item',
						name: 'item',
						values: [
							{
								displayName: 'Mode',
								name: 'mode',
								type: 'options',
								options: [
									{ name: 'Every Minute', value: 'everyMinute' },
									{ name: 'Every Hour', value: 'everyHour' },
									{ name: 'Every Day', value: 'everyDay' },
									{ name: 'Every Week', value: 'everyWeek' },
									{ name: 'Every Month', value: 'everyMonth' },
									{ name: 'Cron Expression', value: 'cron' },
								],
								default: 'everyMinute',
							},
							{
								displayName: 'Cron Expression',
								name: 'cronExpression',
								type: 'string',
								displayOptions: {
									show: {
										mode: ['cron'],
									},
								},
								default: '0 * * * *',
								placeholder: '0 * * * *',
							},
							{
								displayName: 'Hour',
								name: 'hour',
								type: 'number',
								typeOptions: {
									minValue: 0,
									maxValue: 23,
								},
								displayOptions: {
									show: {
										mode: ['everyDay', 'everyWeek', 'everyMonth'],
									},
								},
								default: 0,
							},
							{
								displayName: 'Minute',
								name: 'minute',
								type: 'number',
								typeOptions: {
									minValue: 0,
									maxValue: 59,
								},
								displayOptions: {
									show: {
										mode: ['everyDay', 'everyWeek', 'everyMonth'],
									},
								},
								default: 0,
							},
							{
								displayName: 'Day of Week',
								name: 'dayOfWeek',
								type: 'options',
								displayOptions: {
									show: {
										mode: ['everyWeek'],
									},
								},
								options: [
									{ name: 'Sunday', value: 0 },
									{ name: 'Monday', value: 1 },
									{ name: 'Tuesday', value: 2 },
									{ name: 'Wednesday', value: 3 },
									{ name: 'Thursday', value: 4 },
									{ name: 'Friday', value: 5 },
									{ name: 'Saturday', value: 6 },
								],
								default: 0,
							},
							{
								displayName: 'Day of Month',
								name: 'dayOfMonth',
								type: 'number',
								typeOptions: {
									minValue: 1,
									maxValue: 31,
								},
								displayOptions: {
									show: {
										mode: ['everyMonth'],
									},
								},
								default: 1,
							},
						],
					},
				],
			},
		],
	};

	getNodeDefinition() {
		return {
			id: 'cron',
			type: 'trigger',
			name: 'Cron',
			description: 'Triggers the workflow at a specific time',
			category: 'core',
			version: '1.0.0',
			author: 'Workflow Studio',
			parameters: [
				{
					name: 'triggerTimes',
					type: 'object',
					displayName: 'Trigger Times',
					description: 'Schedule configuration',
					required: true,
					default: {}
				}
			],
			inputs: [],
			outputs: [
				{
					name: 'data',
					type: 'object',
					displayName: 'Trigger Data',
					description: 'Data from trigger',
					dataType: 'object'
				}
			]
		};
	}

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const triggerTimes = this.getNodeParameter('triggerTimes') as unknown as {
			item: TriggerTime[];
		};

		// Get all the trigger times
		const expressions = (triggerTimes.item || []).map(toCronExpression);

		// The trigger function to execute when the cron-time got reached
		// or when manually triggered
		const executeTrigger = () => {
			this.emit([this.helpers.returnJsonArray([{}])]);
		};

		// Register the cron-jobs
		// Note: In n8n, this uses this.helpers.registerCron
		// We'll need to implement this or use a similar mechanism
		expressions.forEach((expression) => {
			// For now, we'll use a simplified registration
			// In production, this should use the execution context's cron registration
			if (this.helpers && this.helpers.registerCron) {
				this.helpers.registerCron({ expression }, executeTrigger);
			}
		});

		return {
			manualTriggerFunction: async () => executeTrigger(),
		};
	}
}

export default Cron;

