import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class MySQLNode {
  getNodeDefinition() {
    return {
  id: 'mysql',
  type: 'action',
  name: 'MySQL',
  description: 'Execute MySQL database queries',
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
        throw new Error('MySQL connection parameters are required');
      }

      // Import mysql2 dynamically
      const mysql = require('mysql2/promise');
      
      const connectionConfig = {
        host: host,
        port: parseInt(port || '3306'),
        user: username,
        password: password,
        database: database,
        ssl: ssl ? { rejectUnauthorized: false } : false,
        connectTimeout: parseInt(timeout || '30') * 1000,
        acquireTimeout: parseInt(timeout || '30') * 1000,
        timeout: parseInt(timeout || '30') * 1000
      };

      const connection = await mysql.createConnection(connectionConfig);

      let result: any = {};
      let executedQuery = '';

      try {
        switch (operation) {
          case 'select':
            executedQuery = this.buildSelectQuery(inputTable, columns, whereClause, orderBy, limit);
            result = await this.executeSelect(connection, executedQuery, inputValues);
            break;
          case 'insert':
            executedQuery = this.buildInsertQuery(inputTable, inputValues);
            result = await this.executeInsert(connection, executedQuery, inputValues);
            break;
          case 'update':
            executedQuery = this.buildUpdateQuery(inputTable, inputValues, whereClause);
            result = await this.executeUpdate(connection, executedQuery, inputValues);
            break;
          case 'delete':
            executedQuery = this.buildDeleteQuery(inputTable, whereClause);
            result = await this.executeDelete(connection, executedQuery, inputValues);
            break;
          case 'createTable':
            executedQuery = inputQuery;
            result = await this.executeRawSql(connection, executedQuery);
            break;
          case 'dropTable':
            executedQuery = `DROP TABLE IF EXISTS ${inputTable}`;
            result = await this.executeRawSql(connection, executedQuery);
            break;
          case 'alterTable':
            executedQuery = inputQuery;
            result = await this.executeRawSql(connection, executedQuery);
            break;
          case 'rawSql':
            executedQuery = inputQuery;
            result = await this.executeRawSql(connection, executedQuery, inputValues);
            break;
          default:
            throw new Error(`Unsupported MySQL operation: ${operation}`);
        }

        await connection.end();

        const duration = Date.now() - startTime;
        
        logger.info('MySQL node executed successfully', {
          operation,
          table: inputTable,
          duration
        });

        return {
          success: true,
          output: {
            rows: result.rows || [],
            affectedRows: result.affectedRows || 0,
            insertId: result.insertId || null,
            query: executedQuery,
            operation,
            timestamp: new Date().toISOString(),
            duration
          },
          duration
        };

      } catch (error) {
        await connection.end();
        throw error;
      }

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('MySQL node execution failed', {
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
    
    const placeholders = parsedValues.map(() => '?').join(', ');
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
    const placeholders = parsedValues.map(() => '?').join(', ');
    return `UPDATE ${table} SET column1 = ?, column2 = ? WHERE ${whereClause}`;
  }

  private buildDeleteQuery(table: string, whereClause?: string): string {
    if (!whereClause) {
      throw new Error('WHERE clause is required for DELETE operation');
    }
    
    return `DELETE FROM ${table} WHERE ${whereClause}`;
  }

  private async executeSelect(connection: any, query: string, values?: string): Promise<any> {
    let parsedValues;
    if (values) {
      try {
        parsedValues = JSON.parse(values);
      } catch (e) {
        parsedValues = [values];
      }
    }
    
    const [rows] = await connection.execute(query, parsedValues);
    return { rows };
  }

  private async executeInsert(connection: any, query: string, values?: string): Promise<any> {
    let parsedValues;
    if (values) {
      try {
        parsedValues = JSON.parse(values);
      } catch (e) {
        parsedValues = [values];
      }
    }
    
    const [result] = await connection.execute(query, parsedValues);
    return {
      affectedRows: result.affectedRows,
      insertId: result.insertId
    };
  }

  private async executeUpdate(connection: any, query: string, values?: string): Promise<any> {
    let parsedValues;
    if (values) {
      try {
        parsedValues = JSON.parse(values);
      } catch (e) {
        parsedValues = [values];
      }
    }
    
    const [result] = await connection.execute(query, parsedValues);
    return {
      affectedRows: result.affectedRows
    };
  }

  private async executeDelete(connection: any, query: string, values?: string): Promise<any> {
    let parsedValues;
    if (values) {
      try {
        parsedValues = JSON.parse(values);
      } catch (e) {
        parsedValues = [values];
      }
    }
    
    const [result] = await connection.execute(query, parsedValues);
    return {
      affectedRows: result.affectedRows
    };
  }

  private async executeRawSql(connection: any, query: string, values?: string): Promise<any> {
    let parsedValues;
    if (values) {
      try {
        parsedValues = JSON.parse(values);
      } catch (e) {
        parsedValues = [values];
      }
    }
    
    const [rows] = await connection.execute(query, parsedValues);
    return { rows };
  }}


export default MySQLNode;
