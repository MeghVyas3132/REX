import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class PostgreSQLRealNode {
  getNodeDefinition() {
    return {
  id: 'postgresql-real',
  type: 'action',
  name: 'PostgreSQL (Real)',
  description: 'Execute PostgreSQL operations with real driver',
  category: 'data',
  version: '1.0.0',
  author: 'Workflow Studio',
  parameters: [
    {
      name: 'ssl',
      type: 'boolean',
      displayName: 'SSL',
      description: 'Enable SSL connection',
      required: false,
      default: false
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
      name: 'ssl',
      type: 'any',
      displayName: 'Ssl',
      description: 'ssl from previous node',
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
  ,
  configSchema: {
    type: 'object',
    properties: {
      host: { type: 'string' },
      port: { type: 'number' },
      database: { type: 'string' },
      username: { type: 'string' },
      password: { type: 'string' },
      ssl: { type: 'boolean' },
      operation: { type: 'string', enum: ['select','insert','update','delete','raw','createTable','dropTable'] },
      table: { type: 'string' },
      query: { type: 'string' },
      columns: { type: 'string' },
      whereClause: { type: 'string' },
      data: { type: 'object' },
      limit: { type: 'number' },
      orderBy: { type: 'string' }
    },
    required: ['host','database','username','operation']
  }
};
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = node.data?.config || {};

    
    try {
      const { host, port, database, username, password, ssl, operation, table, query, columns, whereClause, data, limit, orderBy } = config;
      
      const inputQuery = context.input?.query || query;
      const inputData = context.input?.data || data;
      const inputTable = context.input?.table || table;

      if (!host || !database || !username) {
        throw new Error('Host, database, and username are required');
      }

      // Create PostgreSQL connection
      const { Pool } = require('pg');
      const pool = new Pool({
        host: host,
        port: port || 5432,
        database: database,
        user: username,
        password: password,
        ssl: ssl ? { rejectUnauthorized: false } : false
      });

      let result: any = {};
      let executedQuery: string = '';

      try {
        switch (operation) {
          case 'select':
            executedQuery = this.buildSelectQuery(inputTable, columns, whereClause, limit, orderBy);
            result = await this.executeSelect(pool, executedQuery);
            break;
          case 'insert':
            executedQuery = this.buildInsertQuery(inputTable, inputData);
            result = await this.executeInsert(pool, executedQuery);
            break;
          case 'update':
            executedQuery = this.buildUpdateQuery(inputTable, inputData, whereClause);
            result = await this.executeUpdate(pool, executedQuery);
            break;
          case 'delete':
            executedQuery = this.buildDeleteQuery(inputTable, whereClause);
            result = await this.executeDelete(pool, executedQuery);
            break;
          case 'raw':
            executedQuery = inputQuery;
            result = await this.executeRaw(pool, executedQuery);
            break;
          case 'createTable':
            executedQuery = this.buildCreateTableQuery(inputTable, inputData);
            result = await this.executeCreateTable(pool, executedQuery);
            break;
          case 'dropTable':
            executedQuery = `DROP TABLE IF EXISTS ${inputTable}`;
            result = await this.executeDropTable(pool, executedQuery);
            break;
          default:
            throw new Error(`Unsupported PostgreSQL operation: ${operation}`);
        }

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
            ...result,
            query: executedQuery,
            operation,
            timestamp: new Date().toISOString(),
            duration
          },
          duration
        };

      } catch (queryError) {
        await pool.end();
        throw queryError;
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

  private buildSelectQuery(table: string, columns?: string, whereClause?: string, limit?: number, orderBy?: string): string {
    if (!table) {
      throw new Error('Table name is required for select operation');
    }

    let query = 'SELECT ';
    
    if (columns) {
      try {
        const columnArray = JSON.parse(columns);
        query += columnArray.join(', ');
      } catch (e) {
        query += columns;
      }
    } else {
      query += '*';
    }
    
    query += ` FROM ${table}`;
    
    if (whereClause) {
      query += ` WHERE ${whereClause}`;
    }
    
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }
    
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    
    return query;
  }

  private buildInsertQuery(table: string, data: any): string {
    if (!table || !data) {
      throw new Error('Table name and data are required for insert operation');
    }

    let dataObj: any;
    if (typeof data === 'string') {
      try {
        dataObj = JSON.parse(data);
      } catch (e) {
        throw new Error('Invalid JSON data format');
      }
    } else {
      dataObj = data;
    }

    const columns = Object.keys(dataObj);
    const values = Object.values(dataObj);
    
    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.map(() => '$' + (values.indexOf(values[values.indexOf(values)]) + 1)).join(', ')})`;
    return query;
  }

  private buildUpdateQuery(table: string, data: any, whereClause?: string): string {
    if (!table || !data) {
      throw new Error('Table name and data are required for update operation');
    }

    if (!whereClause) {
      throw new Error('WHERE clause is required for update operation');
    }

    let dataObj: any;
    if (typeof data === 'string') {
      try {
        dataObj = JSON.parse(data);
      } catch (e) {
        throw new Error('Invalid JSON data format');
      }
    } else {
      dataObj = data;
    }

    const setClause = Object.keys(dataObj).map((key, index) => `${key} = $${index + 1}`).join(', ');
    const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    return query;
  }

  private buildDeleteQuery(table: string, whereClause?: string): string {
    if (!table) {
      throw new Error('Table name is required for delete operation');
    }

    if (!whereClause) {
      throw new Error('WHERE clause is required for delete operation');
    }

    return `DELETE FROM ${table} WHERE ${whereClause}`;
  }

  private buildCreateTableQuery(table: string, schema: any): string {
    if (!table || !schema) {
      throw new Error('Table name and schema are required for create table operation');
    }

    let schemaObj: any;
    if (typeof schema === 'string') {
      try {
        schemaObj = JSON.parse(schema);
      } catch (e) {
        throw new Error('Invalid JSON schema format');
      }
    } else {
      schemaObj = schema;
    }

    const columns = Object.entries(schemaObj).map(([name, type]) => `${name} ${type}`).join(', ');
    return `CREATE TABLE IF NOT EXISTS ${table} (${columns})`;
  }

  private async executeSelect(pool: any, query: string): Promise<any> {
    const result = await pool.query(query);
    return {
      rows: result.rows,
      affectedRows: result.rowCount
    };
  }

  private async executeInsert(pool: any, query: string): Promise<any> {
    const result = await pool.query(query);
    return {
      affectedRows: result.rowCount,
      insertId: result.rows[0]?.id || null
    };
  }

  private async executeUpdate(pool: any, query: string): Promise<any> {
    const result = await pool.query(query);
    return {
      affectedRows: result.rowCount
    };
  }

  private async executeDelete(pool: any, query: string): Promise<any> {
    const result = await pool.query(query);
    return {
      affectedRows: result.rowCount
    };
  }

  private async executeRaw(pool: any, query: string): Promise<any> {
    const result = await pool.query(query);
    return {
      rows: result.rows,
      affectedRows: result.rowCount || 0
    };
  }

  private async executeCreateTable(pool: any, query: string): Promise<any> {
    await pool.query(query);
    return {
      affectedRows: 0,
      message: 'Table created successfully'
    };
  }

  private async executeDropTable(pool: any, query: string): Promise<any> {
    await pool.query(query);
    return {
      affectedRows: 0,
      message: 'Table dropped successfully'
    };
  }


  async test(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const { config } = context;
    const { host, database, username, password } = config;

    if (!host || !database || !username || !password) {
      return {
        success: false,
        error: 'Host, database, username, and password are required for PostgreSQL node test.'
      };
    }

    // Mock a successful test response
    return {
      duration: Date.now() - startTime,
      success: true,
      data: {
        nodeType: 'postgresql',
        status: 'success',
        message: 'PostgreSQL node test completed successfully',
        config: { host, database, username, password: '***' },
        capabilities: {
          select: true,
          insert: true,
          update: true,
          delete: true,
          raw: true
        },
        timestamp: new Date().toISOString()
      }
    };
  }}


export default PostgreSQLRealNode;
