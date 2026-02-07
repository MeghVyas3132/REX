/**
 * Code Node - n8n Compatible Version
 * Based on n8n's Code node structure with mode support
 */

import {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
	NodeConnectionTypes,
} from '../../types/n8n-types';

// JavaScript Code Description
const javascriptCodeDescription = [
	{
		displayName: 'JavaScript',
		name: 'jsCode',
		type: 'string',
		typeOptions: {
			editor: 'codeNodeEditor',
			editorLanguage: 'javaScript',
		},
		default: '',
		description:
			'JavaScript code to execute.<br><br>Tip: You can use luxon vars like <code>$today</code> for dates and <code>$jmespath</code> for querying JSON structures.',
		noDataExpression: true,
		displayOptions: {
			show: {
				'@version': [1],
				mode: ['runOnceForAllItems'],
			},
		},
	},
	{
		displayName: 'JavaScript',
		name: 'jsCode',
		type: 'string',
		typeOptions: {
			editor: 'codeNodeEditor',
			editorLanguage: 'javaScript',
		},
		default: '',
		description:
			'JavaScript code to execute.<br><br>Tip: You can use luxon vars like <code>$today</code> for dates and <code>$jmespath</code> for querying JSON structures.',
		noDataExpression: true,
		displayOptions: {
			show: {
				'@version': [1],
				mode: ['runOnceForEachItem'],
			},
		},
	},
	{
		displayName: 'JavaScript',
		name: 'jsCode',
		type: 'string',
		typeOptions: {
			editor: 'codeNodeEditor',
			editorLanguage: 'javaScript',
		},
		default: '',
		description:
			'JavaScript code to execute.<br><br>Tip: You can use luxon vars like <code>$today</code> for dates and <code>$jmespath</code> for querying JSON structures.',
		noDataExpression: true,
		displayOptions: {
			show: {
				'@version': [2],
				language: ['javaScript'],
				mode: ['runOnceForAllItems'],
			},
		},
	},
	{
		displayName: 'JavaScript',
		name: 'jsCode',
		type: 'string',
		typeOptions: {
			editor: 'codeNodeEditor',
			editorLanguage: 'javaScript',
		},
		default: '',
		description:
			'JavaScript code to execute.<br><br>Tip: You can use luxon vars like <code>$today</code> for dates and <code>$jmespath</code> for querying JSON structures.',
		noDataExpression: true,
		displayOptions: {
			show: {
				'@version': [2],
				language: ['javaScript'],
				mode: ['runOnceForEachItem'],
			},
		},
	},
	{
		displayName:
			'Type <code>$</code> for a list of special vars/methods. Debug by using <code>console.log()</code> statements and viewing their output in the browser console.',
		name: 'notice',
		type: 'notice',
		displayOptions: {
			show: {
				language: ['javaScript'],
			},
		},
		default: '',
	},
];

// Python Code Description
const pythonCodeDescription = [
	{
		displayName: 'Python',
		name: 'pythonCode',
		type: 'string',
		typeOptions: {
			editor: 'codeNodeEditor',
			editorLanguage: 'python',
		},
		default: '',
		description:
			'Python code to execute.<br><br>Tip: You can use built-in methods and variables like <code>_today</code> for dates and <code>_jmespath</code> for querying JSON structures. <a href="https://docs.n8n.io/code/builtin/">Learn more</a>.',
		noDataExpression: true,
		displayOptions: {
			show: {
				language: ['python', 'pythonNative'],
				mode: ['runOnceForAllItems'],
			},
		},
	},
	{
		displayName: 'Python',
		name: 'pythonCode',
		type: 'string',
		typeOptions: {
			editor: 'codeNodeEditor',
			editorLanguage: 'python',
		},
		default: '',
		description:
			'Python code to execute.<br><br>Tip: You can use built-in methods and variables like <code>_today</code> for dates and <code>_jmespath</code> for querying JSON structures. <a href="https://docs.n8n.io/code/builtin/">Learn more</a>.',
		noDataExpression: true,
		displayOptions: {
			show: {
				language: ['python', 'pythonNative'],
				mode: ['runOnceForEachItem'],
			},
		},
	},
	{
		displayName: 'Debug by using <code>print()</code> statements and viewing their output in the browser console.',
		name: 'notice',
		type: 'notice',
		displayOptions: {
			show: {
				language: ['python'],
			},
		},
		default: '',
	},
	{
		displayName: 'Debug by using <code>print()</code> statements and viewing their output in the browser console.',
		name: 'notice',
		type: 'notice',
		displayOptions: {
			show: {
				language: ['pythonNative'],
			},
		},
		default: '',
	},
];

// Icon function for dynamic icon based on language
function iconForLanguage(lang: 'javaScript' | 'python' | 'pythonNative'): string {
	switch (lang) {
		case 'python':
		case 'pythonNative':
			return 'file:python.svg';
		case 'javaScript':
			return 'file:js.svg';
		default:
			return 'file:code.svg';
	}
}

export class Code implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Code',
		name: 'code',
		icon: `={{(${iconForLanguage})($parameter.language)}}`,
		group: ['transform'],
		version: [1, 2],
		defaultVersion: 2,
		description: 'Run custom JavaScript or Python code',
		defaults: {
			name: 'Code',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		parameterPane: 'wide',
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Run Once for All Items',
						value: 'runOnceForAllItems',
						description: 'Run this code only once, no matter how many input items there are',
					},
					{
						name: 'Run Once for Each Item',
						value: 'runOnceForEachItem',
						description: 'Run this code as many times as there are input items',
					},
				],
				default: 'runOnceForAllItems',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				options: [
					{
						name: 'JavaScript',
						value: 'javaScript',
						action: 'Code in JavaScript',
					},
					{
						name: 'Python (Beta)',
						value: 'python',
						action: 'Code in Python (Beta)',
					},
					{
						name: 'Python (Native) (Beta)',
						value: 'pythonNative',
						action: 'Code in Python (Native) (Beta)',
					},
				],
				default: 'javaScript',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'hidden',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
				default: 'javaScript',
			},
			...javascriptCodeDescription as any,
			...pythonCodeDescription as any,
		],
	};

	getNodeDefinition() {
		return {
			id: 'code',
			type: 'action',
			name: 'Code',
			description: 'Run custom JavaScript or Python code',
			category: 'core',
			version: '2.0.0',
			author: 'Workflow Studio',
			parameters: [
				{
					name: 'mode',
					type: 'options',
					displayName: 'Mode',
					description: 'Execution mode',
					required: true,
					default: 'runOnceForAllItems',
					options: [
						{ name: 'Run Once for All Items', value: 'runOnceForAllItems' },
						{ name: 'Run Once for Each Item', value: 'runOnceForEachItem' }
					]
				},
				{
					name: 'language',
					type: 'options',
					displayName: 'Language',
					description: 'Programming language to execute',
					required: true,
					default: 'javaScript',
					options: [
						{ name: 'JavaScript', value: 'javaScript' },
						{ name: 'Python (Beta)', value: 'python' },
						{ name: 'Python (Native) (Beta)', value: 'pythonNative' }
					]
				},
				{
					name: 'jsCode',
					type: 'string',
					displayName: 'JavaScript Code',
					description: 'JavaScript code to execute',
					required: false,
					default: ''
				},
				{
					name: 'pythonCode',
					type: 'string',
					displayName: 'Python Code',
					description: 'Python code to execute',
					required: false,
					default: ''
				}
			],
			inputs: [
				{
					name: 'data',
					type: 'object',
					displayName: 'Input Data',
					description: 'Data from previous node',
					required: false,
					dataType: 'object'
				}
			],
			outputs: [
				{
					name: 'result',
					type: 'object',
					displayName: 'Result',
					description: 'Result from code execution',
					dataType: 'object'
				}
			]
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const node = this.getNode();
		const nodeVersion = node.typeVersion || 2;
		const language: 'javaScript' | 'python' | 'pythonNative' =
			nodeVersion === 2
				? (this.getNodeParameter('language', 0) as 'javaScript' | 'python' | 'pythonNative')
				: 'javaScript';

		const nodeMode = this.getNodeParameter('mode', 0) as 'runOnceForAllItems' | 'runOnceForEachItem';
		const codeParameterName =
			language === 'python' || language === 'pythonNative' ? 'pythonCode' : 'jsCode';
		const code = this.getNodeParameter(codeParameterName, 0) as string;

		// Simplified execution - in production, use proper sandbox
		const inputData = this.getInputData();
		
		if (nodeMode === 'runOnceForAllItems') {
			// Execute once for all items
			try {
				// Create safe execution context
				const context = {
					items: inputData.map(item => item.json),
					$input: {
						all: () => inputData.map(item => item.json),
						first: () => inputData[0]?.json || {},
						last: () => inputData[inputData.length - 1]?.json || {},
					},
				};

				// Execute JavaScript code
				if (language === 'javaScript') {
					const func = new Function('items', '$input', code);
					const result = func(context.items, context.$input);
					
					// Convert result to execution data format
					const outputData: INodeExecutionData[] = Array.isArray(result)
						? result.map((item: any) => ({ json: item }))
						: [{ json: result }];
					
					return [outputData];
				} else {
					// Python execution would require Python runtime
					throw new Error('Python execution not yet implemented. Use JavaScript instead.');
				}
			} catch (error: any) {
				if (!this.continueOnFail()) {
					throw error;
				}
				return [[{ json: { error: error.message } }]];
			}
		} else {
			// Execute for each item
			const returnData: INodeExecutionData[] = [];

			for (let index = 0; index < inputData.length; index++) {
				try {
					const item = inputData[index];
					
					// Create safe execution context
					const context = {
						item: item.json,
						$input: {
							item: item.json,
							all: () => inputData.map(i => i.json),
							first: () => inputData[0]?.json || {},
							last: () => inputData[inputData.length - 1]?.json || {},
						},
					};

					// Execute JavaScript code
					if (language === 'javaScript') {
						const func = new Function('item', '$input', code);
						const result = func(context.item, context.$input);
						
						returnData.push({
							json: result,
							pairedItem: { item: index },
						});
					} else {
						// Python execution would require Python runtime
						throw new Error('Python execution not yet implemented. Use JavaScript instead.');
					}
				} catch (error: any) {
					if (!this.continueOnFail()) {
						throw error;
					}
					returnData.push({
						json: { error: error.message },
						pairedItem: { item: index },
					});
				}
			}

			return [returnData];
		}
	}
}

export default Code;

