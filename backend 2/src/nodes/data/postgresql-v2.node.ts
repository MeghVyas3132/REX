/**
 * PostgreSQL Node (n8n-compatible)
 * Execute PostgreSQL database queries
 */

import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeProperties,
	NodeConnectionTypes,
} from '../../types/n8n-types';
const logger = require("../../utils/logger");
const { Pool } = require('pg');

export class Postgres implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Postgres',
		name: 'postgres',
		icon: 'file:postgres.svg',
		group: ['input'],
		version: [2, 2.1, 2.2],
		subtitle: '={{ $parameter["operation"] }}',
		description: 'Get, add and update data in Postgres',
		defaults: {
			name: 'Postgres',
			color: '#336791',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'postgres',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'hidden',
				noDataExpression: true,
				options: [
					{
						name: 'Database',
						value: 'database',
					},
				],
				default: 'database',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Execute Query',
						value: 'executeQuery',
						description: 'Execute a SQL query',
					},
					{
						name: 'Insert',
						value: 'insert',
						description: 'Insert rows into a table',
					},
					{
						name: 'Select',
						value: 'select',
						description: 'Select rows from a table',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update rows in a table',
					},
					{
						name: 'Upsert',
						value: 'upsert',
						description: 'Insert or update rows in a table',
					},
					{
						name: 'Delete Table',
						value: 'deleteTable',
						description: 'Delete a table',
					},
				],
				default: 'select',
				description: 'The operation to perform',
			},
			{
				displayName: 'Schema',
				name: 'schema',
				type: 'string',
				default: 'public',
				placeholder: 'e.g. public',
				description: 'The schema that contains the table',
				displayOptions: {
					show: {
						operation: ['select', 'insert', 'update', 'upsert', 'deleteTable'],
					},
				},
			},
			{
				displayName: 'Table',
				name: 'table',
				type: 'string',
				default: '',
				placeholder: 'e.g. users',
				description: 'The table you want to work on',
				required: true,
				displayOptions: {
					show: {
						operation: ['select', 'insert', 'update', 'upsert', 'deleteTable'],
					},
				},
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				typeOptions: {
					rows: 5,
					editor: 'sqlEditor',
				},
				default: '',
				placeholder: 'SELECT * FROM users WHERE id = $1',
				description: 'The SQL query to execute',
				required: true,
				displayOptions: {
					show: {
						operation: ['executeQuery'],
					},
				},
			},
			{
				displayName: 'Columns',
				name: 'columns',
				type: 'string',
				default: '*',
				placeholder: 'e.g. id, name, email',
				description: 'The columns to select (use * for all columns)',
				displayOptions: {
					show: {
						operation: ['select'],
					},
				},
			},
			{
				displayName: 'Where Clause',
				name: 'whereClause',
				type: 'string',
				default: '',
				placeholder: 'e.g. id = $1',
				description: 'The WHERE clause for the query',
				displayOptions: {
					show: {
						operation: ['select', 'update', 'upsert'],
					},
				},
			},
			{
				displayName: 'Query Parameters',
				name: 'queryParameters',
				type: 'string',
				default: '',
				placeholder: 'e.g. value1,value2,value3',
				description: 'Comma-separated list of values to use as query parameters (reference as $1, $2, $3...)',
				displayOptions: {
					show: {
						operation: ['executeQuery', 'select', 'update', 'upsert'],
					},
				},
			},
			{
				displayName: 'Values (JSON)',
				name: 'values',
				type: 'json',
				default: '{}',
				placeholder: '{"name": "John", "email": "john@example.com"}',
				description: 'The values to insert/update (JSON object or array of objects)',
				displayOptions: {
					show: {
						operation: ['insert', 'update', 'upsert'],
					},
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 100,
				description: 'Maximum number of rows to return',
				displayOptions: {
					show: {
						operation: ['select'],
					},
				},
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'string',
				default: '',
				placeholder: 'e.g. id DESC',
				description: 'The ORDER BY clause for the query',
				displayOptions: {
					show: {
						operation: ['select'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Connection Timeout',
						name: 'connectionTimeout',
						type: 'number',
						default: 30,
						description: 'Number of seconds reserved for connecting to the database',
					},
					{
						displayName: 'Query Batching',
						name: 'queryBatching',
						type: 'options',
						options: [
							{
								name: 'Single Query',
								value: 'single',
								description: 'A single query for all incoming items',
							},
							{
								name: 'Independent',
								value: 'independently',
								description: 'Execute one query per incoming item',
							},
							{
								name: 'Transaction',
								value: 'transaction',
								description: 'Execute all queries in a transaction',
							},
						],
						default: 'single',
						description: 'The way queries should be sent to the database',
					},
					{
						displayName: 'Replace Empty Strings with NULL',
						name: 'replaceEmptyStrings',
						type: 'boolean',
						default: false,
						description: 'Whether to replace empty strings with NULL in input',
					},
				],
			},
		],
	};

	getNodeDefinition() {
		return {
			id: 'postgres',
			type: 'action',
			name: 'Postgres',
			description: 'Get, add and update data in Postgres',
			category: 'data',
			version: '2.2.0',
			author: 'Workflow Studio',
			parameters: [
				{
					name: 'operation',
					type: 'options',
					displayName: 'Operation',
					description: 'The operation to perform',
					required: true,
					default: 'select',
					options: [
						{ name: 'Execute Query', value: 'executeQuery' },
						{ name: 'Insert', value: 'insert' },
						{ name: 'Select', value: 'select' },
						{ name: 'Update', value: 'update' },
						{ name: 'Upsert', value: 'upsert' },
						{ name: 'Delete Table', value: 'deleteTable' }
					]
				},
				{
					name: 'schema',
					type: 'string',
					displayName: 'Schema',
					description: 'The schema that contains the table',
					required: false,
					default: 'public'
				},
				{
					name: 'table',
					type: 'string',
					displayName: 'Table',
					description: 'The table name',
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
					description: 'Query result',
					dataType: 'object'
				}
			]
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnItems: INodeExecutionData[] = [];

		try {
			// Get credentials
			const credentials = await this.getCredentials('postgres');
			if (!credentials) {
				throw new Error('Postgres credentials are required');
			}

			// Get parameters
			const operation = this.getNodeParameter('operation', 0) as string;
			const options = this.getNodeParameter('options', 0, {}) as any;

			// Create connection pool
			const poolConfig: any = {
				host: credentials.host || 'localhost',
				port: credentials.port || 5432,
				user: credentials.user || credentials.username,
				password: credentials.password,
				database: credentials.database || 'postgres',
				connectionTimeoutMillis: (options.connectionTimeout || 30) * 1000,
			};

			if (credentials.allowUnauthorizedCerts) {
				poolConfig.ssl = { rejectUnauthorized: false };
			} else if (credentials.ssl) {
				poolConfig.ssl = credentials.ssl === 'require' ? { rejectUnauthorized: true } : false;
			}

			const pool = new Pool(poolConfig);

			// Process each item
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				try {
					const item = items[itemIndex];
					let result: any;

					const self = this as any;
					switch (operation) {
						case 'executeQuery':
							result = await self.executeQuery(itemIndex, pool, item);
							break;
						case 'select':
							result = await self.executeSelect(itemIndex, pool, item);
							break;
						case 'insert':
							result = await self.executeInsert(itemIndex, pool, item);
							break;
						case 'update':
							result = await self.executeUpdate(itemIndex, pool, item);
							break;
						case 'upsert':
							result = await self.executeUpsert(itemIndex, pool, item);
							break;
						case 'deleteTable':
							result = await self.executeDeleteTable(itemIndex, pool, item);
							break;
						default:
							throw new Error(`Unsupported operation: ${operation}`);
					}

					returnItems.push({
						json: {
							...item.json,
							...result,
						},
					});
				} catch (error: any) {
					if (this.continueOnFail()) {
						returnItems.push({
							json: {
								...items[itemIndex].json,
								error: error.message,
							},
						});
						continue;
					}
					throw error;
				}
			}

			await pool.end();

			return [returnItems];
		} catch (error: any) {
			logger.error('Postgres node execution failed', error);
			throw error;
		}
	}

	private async executeQuery(
		itemIndex: number,
		pool: any,
		item: INodeExecutionData
	): Promise<any> {
		const self = this as any as IExecuteFunctions;
		const query = self.getNodeParameter('query', itemIndex) as string;
		const queryParameters = self.getNodeParameter('queryParameters', itemIndex, '') as string;

		// Parse query parameters
		const params = queryParameters
			? queryParameters.split(',').map((p: string) => p.trim())
			: [];

		const client = await pool.connect();
		try {
			const result = await client.query(query, params);
			return {
				rows: result.rows,
				rowCount: result.rowCount,
				query,
			};
		} finally {
			client.release();
		}
	}

	private async executeSelect(
		itemIndex: number,
		pool: any,
		item: INodeExecutionData
	): Promise<any> {
		const self = this as any as IExecuteFunctions;
		const schema = self.getNodeParameter('schema', itemIndex, 'public') as string;
		const table = self.getNodeParameter('table', itemIndex) as string;
		const columns = self.getNodeParameter('columns', itemIndex, '*') as string;
		const whereClause = self.getNodeParameter('whereClause', itemIndex, '') as string;
		const orderBy = self.getNodeParameter('orderBy', itemIndex, '') as string;
		const limit = self.getNodeParameter('limit', itemIndex, 100) as number;
		const queryParameters = self.getNodeParameter('queryParameters', itemIndex, '') as string;

		// Build query
		let query = `SELECT ${columns} FROM ${schema}.${table}`;
		const params: string[] = [];

		if (whereClause) {
			query += ` WHERE ${whereClause}`;
		}

		if (orderBy) {
			query += ` ORDER BY ${orderBy}`;
		}

		query += ` LIMIT ${limit}`;

		// Parse query parameters
		if (queryParameters) {
			params.push(...queryParameters.split(',').map((p: string) => p.trim()));
		}

		const client = await pool.connect();
		try {
			const result = await client.query(query, params);
			return {
				rows: result.rows,
				rowCount: result.rowCount,
				query,
			};
		} finally {
			client.release();
		}
	}

	private async executeInsert(
		itemIndex: number,
		pool: any,
		item: INodeExecutionData
	): Promise<any> {
		const self = this as any as IExecuteFunctions;
		const schema = self.getNodeParameter('schema', itemIndex, 'public') as string;
		const table = self.getNodeParameter('table', itemIndex) as string;
		const valuesRaw = self.getNodeParameter('values', itemIndex, '{}') as string;

		// Parse values
		let values: any;
		try {
			values = typeof valuesRaw === 'string' ? JSON.parse(valuesRaw) : valuesRaw;
		} catch (error) {
			throw new Error('Values must be valid JSON');
		}

		// Ensure values is an array
		const valuesArray = Array.isArray(values) ? values : [values];

		const client = await pool.connect();
		try {
			const results: any[] = [];
			for (const valueObj of valuesArray) {
				const columns = Object.keys(valueObj);
				const valuesList = columns.map((_, i) => `$${i + 1}`);
				const params = columns.map((col) => valueObj[col]);

				const query = `INSERT INTO ${schema}.${table} (${columns.join(', ')}) VALUES (${valuesList.join(', ')}) RETURNING *`;
				const result = await client.query(query, params);
				results.push(...result.rows);
			}
			return {
				rows: results,
				rowCount: results.length,
			};
		} finally {
			client.release();
		}
	}

	private async executeUpdate(
		itemIndex: number,
		pool: any,
		item: INodeExecutionData
	): Promise<any> {
		const self = this as any as IExecuteFunctions;
		const schema = self.getNodeParameter('schema', itemIndex, 'public') as string;
		const table = self.getNodeParameter('table', itemIndex) as string;
		const whereClause = self.getNodeParameter('whereClause', itemIndex) as string;
		const valuesRaw = self.getNodeParameter('values', itemIndex, '{}') as string;
		const queryParameters = self.getNodeParameter('queryParameters', itemIndex, '') as string;

		// Parse values
		let values: any;
		try {
			values = typeof valuesRaw === 'string' ? JSON.parse(valuesRaw) : valuesRaw;
		} catch (error) {
			throw new Error('Values must be valid JSON');
		}

		// Build SET clause
		const setClause = Object.keys(values)
			.map((key, index) => `${key} = $${index + 1}`)
			.join(', ');
		const params = Object.values(values);

		// Add WHERE clause parameters
		if (queryParameters) {
			params.push(...queryParameters.split(',').map((p: string) => p.trim()));
		}

		const query = `UPDATE ${schema}.${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;

		const client = await pool.connect();
		try {
			const result = await client.query(query, params);
			return {
				rows: result.rows,
				rowCount: result.rowCount,
				query,
			};
		} finally {
			client.release();
		}
	}

	private async executeUpsert(
		itemIndex: number,
		pool: any,
		item: INodeExecutionData
	): Promise<any> {
		const self = this as any as IExecuteFunctions;
		const schema = self.getNodeParameter('schema', itemIndex, 'public') as string;
		const table = self.getNodeParameter('table', itemIndex) as string;
		const valuesRaw = self.getNodeParameter('values', itemIndex, '{}') as string;
		const whereClause = self.getNodeParameter('whereClause', itemIndex) as string;

		// Parse values
		let values: any;
		try {
			values = typeof valuesRaw === 'string' ? JSON.parse(valuesRaw) : valuesRaw;
		} catch (error) {
			throw new Error('Values must be valid JSON');
		}

		const columns = Object.keys(values);
		const valuesList = columns.map((_, i) => `$${i + 1}`);
		const params = columns.map((col) => values[col]);
		const updateClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');

		// Use ON CONFLICT for upsert (simplified - assumes primary key conflict)
		const query = `INSERT INTO ${schema}.${table} (${columns.join(', ')}) VALUES (${valuesList.join(', ')}) ON CONFLICT DO UPDATE SET ${updateClause} RETURNING *`;

		const client = await pool.connect();
		try {
			const result = await client.query(query, params);
			return {
				rows: result.rows,
				rowCount: result.rowCount,
				query,
			};
		} finally {
			client.release();
		}
	}

	private async executeDeleteTable(
		itemIndex: number,
		pool: any,
		item: INodeExecutionData
	): Promise<any> {
		const self = this as any as IExecuteFunctions;
		const schema = self.getNodeParameter('schema', itemIndex, 'public') as string;
		const table = self.getNodeParameter('table', itemIndex) as string;
		const options = self.getNodeParameter('options', itemIndex, {}) as any;

		const cascade = options.cascade || false;
		const query = `DROP TABLE IF EXISTS ${schema}.${table}${cascade ? ' CASCADE' : ''}`;

		const client = await pool.connect();
		try {
			const result = await client.query(query);
			return {
				rowCount: result.rowCount,
				query,
			};
		} finally {
			client.release();
		}
	}
}

export default Postgres;

