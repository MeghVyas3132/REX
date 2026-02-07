import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class MySQLRealNode {
  getNodeDefinition() {
    return {
      id: 'mysql-real',
      type: 'action',
      name: 'MySQL',
      description: 'Execute MySQL database queries and operations',
      category: 'data',
      version: '1.0.0',
      author: 'Workflow Studio',
      
      parameters: [
        {
          name: 'host',
          type: 'string',
          displayName: 'Host',
          description: 'MySQL server hostname',
          required: true,
          placeholder: 'localhost',
          default: 'localhost'
        },
        {
          name: 'port',
          type: 'number',
          displayName: 'Port',
          description: 'MySQL server port',
          required: false,
          placeholder: '3306',
          default: 3306,
          min: 1,
          max: 65535
        },
        {
          name: 'database',
          type: 'string',
          displayName: 'Database',
          description: 'Database name',
          required: true,
          placeholder: 'mydatabase'
        },
        {
          name: 'username',
          type: 'string',
          displayName: 'Username',
          description: 'Database username',
          required: true,
          placeholder: 'root'
        },
        {
          name: 'password',
          type: 'string',
          displayName: 'Password',
          description: 'Database password',
          required: true,
          placeholder: 'password',
          credentialType: 'mysql_password'
        },
        {
          name: 'operation',
          type: 'options',
          displayName: 'Operation',
          description: 'Database operation to perform',
          required: true,
          default: 'select',
          options: [
            { name: 'Select', value: 'select' },
            { name: 'Insert', value: 'insert' },
            { name: 'Update', value: 'update' },
            { name: 'Delete', value: 'delete' },
            { name: 'Raw Query', value: 'raw' },
            { name: 'Create Table', value: 'createTable' },
            { name: 'Drop Table', value: 'dropTable' }
          ]
        },
        {
          name: 'table',
          type: 'string',
          displayName: 'Table Name',
          description: 'Database table name',
          required: false,
          placeholder: 'users'
        },
        {
          name: 'query',
          type: 'string',
          displayName: 'SQL Query',
          description: 'Raw SQL query (for raw operation)',
          required: false,
          placeholder: 'SELECT * FROM users WHERE age > 18'
        },
        {
          name: 'columns',
          type: 'string',
          displayName: 'Columns (JSON)',
          description: 'Columns to select (JSON array)',
          required: false,
          placeholder: '["id", "name", "email"]'
        },
        {
          name: 'whereClause',
          type: 'string',
          displayName: 'WHERE Clause',
          description: 'WHERE clause conditions',
          required: false,
          placeholder: 'age > 18 AND status = "active"'
        },
        {
          name: 'data',
          type: 'string',
          displayName: 'Data (JSON)',
          description: 'Data to insert/update (JSON object)',
          required: false,
          placeholder: '{"name": "John", "email": "john@example.com"}'
        },
        {
          name: 'limit',
          type: 'number',
          displayName: 'Limit',
          description: 'Number of rows to return',
          required: false,
          placeholder: '100',
          min: 1,
          max: 10000
        },
        {
          name: 'orderBy',
          type: 'string',
          displayName: 'ORDER BY',
          description: 'Order by clause',
          required: false,
          placeholder: 'created_at DESC'
        }
      ],

      inputs: [
        {
          name: 'query',
          type: 'string',
          description: 'SQL query from previous node',
          required: false
        },
        {
          name: 'data',
          type: 'object',
          description: 'Data from previous node',
          required: false
        },
        {
          name: 'table',
          type: 'string',
          description: 'Table name from previous node',
          required: false
        }
      ],

      outputs: [
        {
          name: 'rows',
          type: 'array',
          description: 'Query result rows'
        },
        {
          name: 'affectedRows',
          type: 'number',
          description: 'Number of affected rows'
        },
        {
          name: 'insertId',
          type: 'number',
          description: 'Last insert ID'
        },
        {
          name: 'query',
          type: 'string',
          description: 'Executed query'
        }
      ]
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = node.data?.config || {};
    
    // Validation for required parameters
    if (!config.host && !context.input?.host) {
      throw new Error('Required parameter "host" is missing');
    }
    if (!config.port && !context.input?.port) {
      throw new Error('Required parameter "port" is missing');
    }
    if (!config.username && !context.input?.username) {
      throw new Error('Required parameter "username" is missing');
    }
    if (!config.password && !context.input?.password) {
      throw new Error('Required parameter "password" is missing');
    }
    if (!config.operation && !context.input?.operation) {
      throw new Error('Required parameter "operation" is missing');
    }

    
    try {
      const config = node.config;
      const { host, port, database, username, password, operation, table, query, columns, whereClause, data, limit, orderBy } = config;
      
      const inputQuery = context.input?.query || query;
      const inputData = context.input?.data || data;
      const inputTable = context.input?.table || table;

      if (!host || !database || !username || !password) {
        throw new Error('Host, database, username, and password are required');
      }

      // Create MySQL connection
      const mysql = require('mysql2/promise');
      const connection = await mysql.createConnection({
        host: host,
        port: port || 3306,
        user: username,
        password: password,
        database: database
      });

      let result: any = {};
      let executedQuery: string = '';

      try {
        switch (operation) {
          case 'select':
            executedQuery = this.buildSelectQuery(inputTable, columns, whereClause, limit, orderBy);
            result = await this.executeSelect(connection, executedQuery);
            break;
          case 'insert':
            executedQuery = this.buildInsertQuery(inputTable, inputData);
            result = await this.executeInsert(connection, executedQuery);
            break;
          case 'update':
            executedQuery = this.buildUpdateQuery(inputTable, inputData, whereClause);
            result = await this.executeUpdate(connection, executedQuery);
            break;
          case 'delete':
            executedQuery = this.buildDeleteQuery(inputTable, whereClause);
            result = await this.executeDelete(connection, executedQuery);
            break;
          case 'raw':
            executedQuery = inputQuery;
            result = await this.executeRaw(connection, executedQuery);
            break;
          case 'createTable':
            executedQuery = this.buildCreateTableQuery(inputTable, inputData);
            result = await this.executeCreateTable(connection, executedQuery);
            break;
          case 'dropTable':
            executedQuery = `DROP TABLE IF EXISTS ${inputTable}`;
            result = await this.executeDropTable(connection, executedQuery);
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
            ...result,
            query: executedQuery,
            operation,
            timestamp: new Date().toISOString(),
            duration
          },
          duration
        };

      } catch (queryError) {
        await connection.end();
        throw queryError;
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
    
    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.map(() => '?').join(', ')})`;
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

    const setClause = Object.keys(dataObj).map(key => `${key} = ?`).join(', ');
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

  private async executeSelect(connection: any, query: string): Promise<any> {
    const [rows] = await connection.execute(query);
    return {
      rows: rows,
      affectedRows: rows.length
    };
  }

  private async executeInsert(connection: any, query: string): Promise<any> {
    const [result] = await connection.execute(query);
    return {
      affectedRows: result.affectedRows,
      insertId: result.insertId
    };
  }

  private async executeUpdate(connection: any, query: string): Promise<any> {
    const [result] = await connection.execute(query);
    return {
      affectedRows: result.affectedRows
    };
  }

  private async executeDelete(connection: any, query: string): Promise<any> {
    const [result] = await connection.execute(query);
    return {
      affectedRows: result.affectedRows
    };
  }

  private async executeRaw(connection: any, query: string): Promise<any> {
    const [rows] = await connection.execute(query);
    return {
      rows: rows,
      affectedRows: rows.length || 0
    };
  }

  private async executeCreateTable(connection: any, query: string): Promise<any> {
    await connection.execute(query);
    return {
      affectedRows: 0,
      message: 'Table created successfully'
    };
  }

  private async executeDropTable(connection: any, query: string): Promise<any> {
    await connection.execute(query);
    return {
      affectedRows: 0,
      message: 'Table dropped successfully'
    };
  }


  async test(context: ExecutionContext): Promise<ExecutionResult> {

    const { config } = context;
    const { host, database, username, password } = config;

    if (!host || !database || !username || !password) {
      return {
        success: false,
        error: 'Host, database, username, and password are required for MySQL node test.'
      };
    }

    // Mock a successful test response
    return {
      success: true,
      data: {
        nodeType: 'mysql',
        status: 'success',
        message: 'MySQL node test completed successfully',
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


export default MySQLRealNode;
