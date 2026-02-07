/**
 * Webhook Node - n8n Compatible Version (Simplified)
 * Based on n8n's Webhook node structure
 * This is a simplified version - full implementation would include all features
 */

import {
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	INodeExecutionData,
	NodeConnectionTypes,
} from '../../types/n8n-types';
const logger = require("../../utils/logger");

export class Webhook implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Webhook',
		icon: { light: 'file:webhook.svg', dark: 'file:webhook.dark.svg' },
		name: 'webhook',
		group: ['trigger'],
		version: [1, 1.1, 2, 2.1],
		defaultVersion: 2.1,
		description: 'Starts the workflow when a webhook is called',
		eventTriggerDescription: 'Waiting for you to call the Test URL',
		activationMessage: 'You can now make calls to your production webhook URL.',
		defaults: {
			name: 'Webhook',
		},
		supportsCORS: true,
		triggerPanel: {
			header: '',
			executionsHelp: {
				inactive:
					'Webhooks have two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the \'listen\' button, then make a request to the test URL. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. <a data-key="activate">Activate</a> the workflow, then make requests to the production URL. These executions will show up in the executions list, but not in the editor.',
				active:
					'Webhooks have two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the \'listen\' button, then make a request to the test URL. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. Since the workflow is activated, you can make requests to the production URL. These executions will show up in the <a data-key="executions">executions list</a>, but not in the editor.',
			},
			activationHint:
				"Once you've finished building your workflow, run it without having to click this button by using the production webhook URL.",
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Allow Multiple HTTP Methods',
				name: 'multipleMethods',
				type: 'boolean',
				default: false,
				isNodeSetting: true,
				description: 'Whether to allow the webhook to listen for multiple HTTP methods',
			},
			{
				displayName: 'HTTP Method',
				name: 'httpMethod',
				type: 'options',
				options: [
					{ name: 'DELETE', value: 'DELETE' },
					{ name: 'GET', value: 'GET' },
					{ name: 'HEAD', value: 'HEAD' },
					{ name: 'PATCH', value: 'PATCH' },
					{ name: 'POST', value: 'POST' },
					{ name: 'PUT', value: 'PUT' },
				],
				default: 'GET',
				description: 'The HTTP method to listen to',
				displayOptions: {
					show: {
						multipleMethods: [false],
					},
				},
			},
			{
				displayName: 'HTTP Methods',
				name: 'httpMethod',
				type: 'multiOptions',
				options: [
					{ name: 'DELETE', value: 'DELETE' },
					{ name: 'GET', value: 'GET' },
					{ name: 'HEAD', value: 'HEAD' },
					{ name: 'PATCH', value: 'PATCH' },
					{ name: 'POST', value: 'POST' },
					{ name: 'PUT', value: 'PUT' },
				],
				default: ['GET', 'POST'],
				description: 'The HTTP methods to listen to',
				displayOptions: {
					show: {
						multipleMethods: [true],
					},
				},
			},
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '',
				placeholder: 'webhook',
				description:
					"The path to listen to, dynamic values could be specified by using ':', e.g. 'your-path/:dynamic-value'. If dynamic values are set 'webhookId' would be prepended to path.",
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{ name: 'None', value: 'none' },
					{ name: 'Basic Auth', value: 'basicAuth' },
					{ name: 'Header Auth', value: 'headerAuth' },
					{ name: 'JWT Auth', value: 'jwtAuth' },
				],
				default: 'none',
				description: 'The way to authenticate',
			},
			{
				displayName: 'Respond',
				name: 'responseMode',
				type: 'options',
				options: [
					{
						name: 'Immediately',
						value: 'onReceived',
						description: 'As soon as this node executes',
					},
					{
						name: 'When Last Node Finishes',
						value: 'lastNode',
						description: 'Returns data of the last-executed node',
					},
					{
						name: "Using 'Respond to Webhook' Node",
						value: 'responseNode',
						description: 'Response defined in that node',
					},
					{
						name: 'Streaming',
						value: 'streaming',
						description: 'Returns data in real time from streaming enabled nodes',
					},
				],
				default: 'onReceived',
				description: 'When and how to respond to the webhook',
				displayOptions: {
					show: {
						'@version': [2, 2.1],
					},
				},
			},
			{
				displayName: 'Response Code',
				name: 'responseCode',
				type: 'number',
				typeOptions: {
					minValue: 100,
					maxValue: 599,
				},
				default: 200,
				description: 'The HTTP Response code to return',
				displayOptions: {
					hide: {
						responseMode: ['responseNode'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Raw Body',
						name: 'rawBody',
						type: 'boolean',
						default: false,
						description: 'Whether to return the raw body',
					},
					{
						displayName: 'Binary Data',
						name: 'binaryData',
						type: 'boolean',
						default: false,
						description: 'Whether to return binary data',
					},
					{
						displayName: 'Ignore Bots',
						name: 'ignoreBots',
						type: 'boolean',
						default: false,
						description: 'Whether to ignore bot requests',
					},
					{
						displayName: 'IP Whitelist',
						name: 'ipWhitelist',
						type: 'string',
						default: '',
						description: 'Comma-separated list of IP addresses to allow',
					},
				] as any,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: '={{$parameter["httpMethod"] || "GET"}}',
				responseCode: 200, // Default response code
				responseMode: '={{$parameter["responseMode"]}}',
				path: '={{$parameter["path"]}}',
			} as any,
		],
	};

	getNodeDefinition() {
		return {
			id: 'webhook',
			type: 'trigger',
			name: 'Webhook',
			description: 'Starts the workflow when a webhook is called',
			category: 'core',
			version: '2.1.0',
			author: 'Workflow Studio',
			parameters: [
				{
					name: 'httpMethod',
					type: 'options',
					displayName: 'HTTP Method',
					description: 'The HTTP method to listen to',
					required: true,
					default: 'GET',
					options: [
						{ name: 'GET', value: 'GET' },
						{ name: 'POST', value: 'POST' },
						{ name: 'PUT', value: 'PUT' },
						{ name: 'DELETE', value: 'DELETE' },
						{ name: 'PATCH', value: 'PATCH' },
						{ name: 'HEAD', value: 'HEAD' }
					]
				},
				{
					name: 'path',
					type: 'string',
					displayName: 'Path',
					description: 'The path to listen on',
					required: false,
					default: '',
					placeholder: 'webhook'
				}
			],
			inputs: [],
			outputs: [
				{
					name: 'data',
					type: 'object',
					displayName: 'Webhook Data',
					description: 'Data from webhook request',
					dataType: 'object'
				}
			]
		};
	}

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const resp = this.getResponseObject();
		const options = this.getNodeParameter('options', 0, {}) as {
			rawBody?: boolean;
			binaryData?: boolean;
			ignoreBots?: boolean;
			ipWhitelist?: string;
		};

		// IP whitelist check (simplified)
		if (options.ipWhitelist) {
			const allowedIPs = options.ipWhitelist.split(',').map(ip => ip.trim());
			const clientIP = req.ip || req.connection.remoteAddress;
			if (!allowedIPs.includes(clientIP)) {
				resp.writeHead(403);
				resp.end('IP is not whitelisted to access the webhook!');
				return { noWebhookResponse: true };
			}
		}

		// Prepare response data
		const responseData: INodeExecutionData = {
			json: {
				headers: req.headers,
				params: req.params || {},
				query: req.query || {},
				body: req.body || {},
			},
		};

		// Handle raw body if requested
		if (options.rawBody && req.rawBody) {
			responseData.binary = {
				data: {
					data: Buffer.from(req.rawBody).toString('base64'),
					mimeType: req.headers['content-type'] || 'application/octet-stream',
				},
			};
		}

		const responseMode = this.getNodeParameter('responseMode', 0, 'onReceived') as string;

		if (responseMode === 'streaming') {
			// Set up streaming response
			resp.writeHead(200, {
				'Content-Type': 'application/json; charset=utf-8',
				'Transfer-Encoding': 'chunked',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
			});
			resp.flushHeaders();

			return {
				noWebhookResponse: true,
				workflowData: [[responseData]],
			};
		}

		// Return workflow data
		return {
			workflowData: [[responseData]],
		};
	}
}

export default Webhook;

