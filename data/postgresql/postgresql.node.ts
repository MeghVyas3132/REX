import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
// TODO: Replace with proper logger
const logger = console;

export class PostgreSQLNode {
  getNodeDefinition() {
    return {
  id: 'postgresql',
  type: 'action',
  name: 'PostgreSQL',
  description: 'Execute PostgreSQL database queries',
  category: 'data',
  version: '1.0.0',
  author: 'Workflow Studio',
  parameters: [
    {
      name: 'host',
      type: 'string',
      displayName: 'Host',
      description: 'host configuration',
      required: true,
      placeholder: 'Enter host...'
    },
    {
      name: 'username',
      type: 'string',
      displayName: 'Username',
      description: 'username configuration',
      required: true,
      placeholder: 'Enter username...'
    },
    {
      name: 'password',
      type: 'string',
      displayName: 'Password',
      description: 'password configuration',
      required: true,
      placeholder: 'Enter password...'
    },
    {
      name: 'operation',
      type: 'string',
      displayName: 'Operation',
      description: 'operation configuration',
      required: true,
      placeholder: 'Enter operation...'
    }
  ],
  inputs: [
    {
      name: 'host',
      type: 'any',
      displayName: 'Host',
      description: 'host from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'username',
      type: 'any',
      displayName: 'Username',
      description: 'username from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'password',
      type: 'any',
      displayName: 'Password',
      description: 'password from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'query',
      type: 'any',
      displayName: 'Query',
      description: 'query from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'values',
      type: 'any',
      displayName: 'Values',
      description: 'values from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'table',
      type: 'any',
      displayName: 'Table',
      description: 'table from previous node',
      required: false,
      dataType: 'any'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'any',
      displayName: 'Output',
      description: 'Output from the node',
      dataType: 'any'
    },
    {
      name: 'success',
      type: 'boolean',
      displayName: 'Success',
      description: 'Whether the operation succeeded',
      dataType: 'boolean'
    }
  ]
};
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = node.data?.config || {};
    
    try {
    if (!config.host && !context.input?.host) {
      throw new Error('Required parameter "host" is missing');
    }
    if (!config.username && !context.input?.username) {
      throw new Error('Required parameter "username" is missing');
    }
    if (!config.password && !context.input?.password) {
      throw new Error('Required parameter "password" is missing');
    }


      const { 
        host, 
        port, 
        database, 
        username, 
        password, 
        operation,
        query,
        table,
        columns,
        whereClause,
        values,
        limit,
        orderBy,
        ssl,
        timeout
      } = config;
      
      const inputQuery = context.input?.query || query;
      const inputValues = context.input?.values || values;
      const inputTable = context.input?.table || table;

      if (!host || !database || !username || !password) {
        throw new Error('PostgreSQL connection parameters are required');
      }

      // Import pg dynamically
      const { Pool } = require('pg');
      
      const poolConfig = {
        host: host,
        port: parseInt(port || '5432'),
        user: username,
        password: password,
        database: database,
        ssl: ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: parseInt(timeout || '30') * 1000,
        idleTimeoutMillis: parseInt(timeout || '30') * 1000,
        query_timeout: parseInt(timeout || '30') * 1000
      };

      const pool = new Pool(poolConfig);
      const client = await pool.connect();

      let result: any = {};
      let executedQuery = '';

      try {
        switch (operation) {
          case 'select':
            executedQuery = this.buildSelectQuery(inputTable, columns, whereClause, orderBy, limit);
            result = await this.executeSelect(client, executedQuery, inputValues);
            break;
          case 'insert':
            executedQuery = this.buildInsertQuery(inputTable, inputValues);
            result = await this.executeInsert(client, executedQuery, inputValues);
            break;
          case 'update':
            executedQuery = this.buildUpdateQuery(inputTable, inputValues, whereClause);
            result = await this.executeUpdate(client, executedQuery, inputValues);
            break;
          case 'delete':
            executedQuery = this.buildDeleteQuery(inputTable, whereClause);
            result = await this.executeDelete(client, executedQuery, inputValues);
            break;
          case 'createTable':
            executedQuery = inputQuery;
            result = await this.executeRawSql(client, executedQuery);
            break;
          case 'dropTable':
            executedQuery = `DROP TABLE IF EXISTS ${inputTable}`;
            result = await this.executeRawSql(client, executedQuery);
            break;
          case 'alterTable':
            executedQuery = inputQuery;
            result = await this.executeRawSql(client, executedQuery);
            break;
          case 'rawSql':
            executedQuery = inputQuery;
            result = await this.executeRawSql(client, executedQuery, inputValues);
            break;
          default:
            throw new Error(`Unsupported PostgreSQL operation: ${operation}`);
        }

        client.release();
        await pool.end();

        const duration = Date.now() - startTime;
        
        logger.info('PostgreSQL node executed successfully', {
          operation,
          table: inputTable,
          duration
        });

        return {
          success: true,
          output: {
            rows: result.rows || [],
            rowCount: result.rowCount || 0,
            query: executedQuery,
            operation,
            timestamp: new Date().toISOString(),
            duration
          },
          duration
        };

      } catch (error) {
        client.release();
        await pool.end();
        throw error;
      }

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('PostgreSQL node execution failed', {
        error: error.message,
        operation: config.operation,
        duration
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  private buildSelectQuery(table: string, columns?: string, whereClause?: string, orderBy?: string, limit?: string): string {
    const cols = columns || '*';
    let query = `SELECT ${cols} FROM ${table}`;
    
    if (whereClause) {
      query += ` WHERE ${whereClause}`;
    }
    
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }
    
    if (limit) {
      query += ` LIMIT ${parseInt(limit)}`;
    }
    
    return query;
  }

  private buildInsertQuery(table: string, values?: string): string {
    if (!values) {
      throw new Error('Values are required for INSERT operation');
    }
    
    let parsedValues;
    try {
      parsedValues = JSON.parse(values);
    } catch (e) {
      throw new Error('Values must be a valid JSON array');
    }
    
    if (!Array.isArray(parsedValues)) {
      throw new Error('Values must be an array');
    }
    
    const placeholders = parsedValues.map((_, index) => `$${index + 1}`).join(', ');
    return `INSERT INTO ${table} VALUES (${placeholders})`;
  }

  private buildUpdateQuery(table: string, values?: string, whereClause?: string): string {
    if (!values || !whereClause) {
      throw new Error('Values and WHERE clause are required for UPDATE operation');
    }
    
    let parsedValues;
    try {
      parsedValues = JSON.parse(values);
    } catch (e) {
      throw new Error('Values must be a valid JSON array');
    }
    
    if (!Array.isArray(parsedValues)) {
      throw new Error('Values must be an array');
    }
    
    // For simplicity, assume all columns are being updated
    const placeholders = parsedValues.map((_, index) => `$${index + 1}`).join(', ');
    return `UPDATE ${table} SET column1 = $1, column2 = $2 WHERE ${whereClause}`;
  }

  private buildDeleteQuery(table: string, whereClause?: string): string {
    if (!whereClause) {
      throw new Error('WHERE clause is required for DELETE operation');
    }
    
    return `DELETE FROM ${table} WHERE ${whereClause}`;
  }

  private async executeSelect(client: any, query: string, values?: string): Promise<any> {
    let parsedValues;
    if (values) {
      try {
        parsedValues = JSON.parse(values);
      } catch (e) {
        parsedValues = [values];
      }
    }
    
    const result = await client.query(query, parsedValues);
    return { rows: result.rows };
  }

  private async executeInsert(client: any, query: string, values?: string): Promise<any> {
    let parsedValues;
    if (values) {
      try {
        parsedValues = JSON.parse(values);
      } catch (e) {
        parsedValues = [values];
      }
    }
    
    const result = await client.query(query, parsedValues);
    return {
      rowCount: result.rowCount
    };
  }

  private async executeUpdate(client: any, query: string, values?: string): Promise<any> {
    let parsedValues;
    if (values) {
      try {
        parsedValues = JSON.parse(values);
      } catch (e) {
        parsedValues = [values];
      }
    }
    
    const result = await client.query(query, parsedValues);
    return {
      rowCount: result.rowCount
    };
  }

  private async executeDelete(client: any, query: string, values?: string): Promise<any> {
    let parsedValues;
    if (values) {
      try {
        parsedValues = JSON.parse(values);
      } catch (e) {
        parsedValues = [values];
      }
    }
    
    const result = await client.query(query, parsedValues);
    return {
      rowCount: result.rowCount
    };
  }

  private async executeRawSql(client: any, query: string, values?: string): Promise<any> {
    let parsedValues;
    if (values) {
      try {
        parsedValues = JSON.parse(values);
      } catch (e) {
        parsedValues = [values];
      }
    }
    
    const result = await client.query(query, parsedValues);
    return { rows: result.rows };
  }}


export default PostgreSQLNode;
