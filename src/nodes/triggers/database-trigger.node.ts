import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require('../../utils/logger');
import { Pool, Client } from 'pg';
import { prisma } from '../../db/prisma';

// Map to store active database watchers
const activeWatchers = new Map<string, { client: Client; interval: NodeJS.Timeout }>();

export class DatabaseTriggerNode {
  getNodeDefinition() {
    return {
      id: 'database-trigger',
      type: 'trigger',
      name: 'Database Trigger',
      description: 'Trigger workflow when database changes occur (INSERT, UPDATE, DELETE)',
      category: 'trigger',
      version: '1.0.0',
      author: 'Workflow Studio',
      
      parameters: [
        {
          name: 'databaseType',
          type: 'options',
          displayName: 'Database Type',
          description: 'Type of database to monitor',
          required: true,
          default: 'postgresql',
          options: [
            { name: 'PostgreSQL', value: 'postgresql' },
            { name: 'MySQL', value: 'mysql' },
            { name: 'MongoDB', value: 'mongodb' }
          ]
        },
        {
          name: 'connectionString',
          type: 'string',
          displayName: 'Connection String',
          description: 'Database connection string (optional if using credentials)',
          required: false,
          placeholder: 'postgresql://user:password@localhost:5432/dbname'
        },
        {
          name: 'host',
          type: 'string',
          displayName: 'Host',
          description: 'Database host',
          required: false,
          placeholder: 'localhost'
        },
        {
          name: 'port',
          type: 'number',
          displayName: 'Port',
          description: 'Database port',
          required: false,
          placeholder: 5432
        },
        {
          name: 'database',
          type: 'string',
          displayName: 'Database Name',
          description: 'Database name',
          required: true,
          placeholder: 'mydb'
        },
        {
          name: 'username',
          type: 'string',
          displayName: 'Username',
          description: 'Database username',
          required: false,
          placeholder: 'postgres'
        },
        {
          name: 'password',
          type: 'string',
          displayName: 'Password',
          description: 'Database password',
          required: false,
          placeholder: 'password',
          credentialType: 'database_password'
        },
        {
          name: 'table',
          type: 'string',
          displayName: 'Table Name',
          description: 'Table name to monitor for changes',
          required: true,
          placeholder: 'users'
        },
        {
          name: 'schema',
          type: 'string',
          displayName: 'Schema',
          description: 'Database schema (PostgreSQL only)',
          required: false,
          default: 'public',
          placeholder: 'public'
        },
        {
          name: 'operations',
          type: 'options',
          displayName: 'Operations',
          description: 'Database operations to monitor',
          required: false,
          default: ['INSERT', 'UPDATE', 'DELETE'],
          multiple: true,
          options: [
            { name: 'INSERT', value: 'INSERT' },
            { name: 'UPDATE', value: 'UPDATE' },
            { name: 'DELETE', value: 'DELETE' }
          ]
        },
        {
          name: 'pollInterval',
          type: 'number',
          displayName: 'Poll Interval (ms)',
          description: 'How often to poll for changes (milliseconds)',
          required: false,
          default: 5000,
          min: 1000,
          max: 60000
        },
        {
          name: 'watchColumn',
          type: 'string',
          displayName: 'Watch Column',
          description: 'Column to watch for changes (optional, monitors all columns if not specified)',
          required: false,
          placeholder: 'updated_at'
        },
        {
          name: 'filterCondition',
          type: 'string',
          displayName: 'Filter Condition',
          description: 'SQL WHERE condition to filter rows (optional)',
          required: false,
          placeholder: "status = 'active'"
        },
        {
          name: 'useListenNotify',
          type: 'boolean',
          displayName: 'Use LISTEN/NOTIFY',
          description: 'Use PostgreSQL LISTEN/NOTIFY for real-time updates (PostgreSQL only)',
          required: false,
          default: true
        }
      ],
      inputs: [
        {
          name: 'connectionString',
          type: 'string',
          displayName: 'Connection String',
          description: 'Database connection string from previous node',
          required: false,
          dataType: 'text'
        },
        {
          name: 'table',
          type: 'string',
          displayName: 'Table Name',
          description: 'Table name from previous node',
          required: false,
          dataType: 'text'
        }
      ],
      outputs: [
        {
          name: 'operation',
          type: 'string',
          displayName: 'Operation',
          description: 'Database operation type (INSERT, UPDATE, DELETE)',
          dataType: 'text'
        },
        {
          name: 'table',
          type: 'string',
          displayName: 'Table Name',
          description: 'Table name where change occurred',
          dataType: 'text'
        },
        {
          name: 'schema',
          type: 'string',
          displayName: 'Schema',
          description: 'Database schema',
          dataType: 'text'
        },
        {
          name: 'record',
          type: 'object',
          displayName: 'Record',
          description: 'Record data (for INSERT/UPDATE) or old record (for DELETE)',
          dataType: 'object'
        },
        {
          name: 'oldRecord',
          type: 'object',
          displayName: 'Old Record',
          description: 'Previous record data (for UPDATE only)',
          dataType: 'object'
        },
        {
          name: 'timestamp',
          type: 'string',
          displayName: 'Timestamp',
          description: 'ISO timestamp when change occurred',
          dataType: 'text'
        },
        {
          name: 'triggerTime',
          type: 'string',
          displayName: 'Trigger Time',
          description: 'ISO timestamp when trigger fired',
          dataType: 'text'
        },
        {
          name: 'changeId',
          type: 'string',
          displayName: 'Change ID',
          description: 'Unique identifier for this change',
          dataType: 'text'
        }
      ],

      configSchema: {
        type: 'object',
        properties: {
          databaseType: { type: 'string' },
          connectionString: { type: 'string' },
          host: { type: 'string' },
          port: { type: 'number' },
          database: { type: 'string' },
          username: { type: 'string' },
          password: { type: 'string' },
          table: { type: 'string' },
          schema: { type: 'string' },
          operations: { type: 'array', items: { type: 'string' } },
          pollInterval: { type: 'number' },
          watchColumn: { type: 'string' },
          filterCondition: { type: 'string' },
          useListenNotify: { type: 'boolean' }
        },
        required: ['databaseType', 'database', 'table']
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    
    // Validation for required parameters
    if (!config.databaseType && !context.input?.databaseType) {
      throw new Error('Required parameter "databaseType" is missing');
    }
    if (!config.PostgreSQL && !context.input?.PostgreSQL) {
      throw new Error('Required parameter "PostgreSQL" is missing');
    }
    if (!config.username && !context.input?.username) {
      throw new Error('Required parameter "username" is missing');
    }

    const startTime = Date.now();
    
    try {
      const databaseType = config.databaseType || 'postgresql';
      const table = config.table || context.input?.table;
      const schema = config.schema || 'public';
      const operations = config.operations || ['INSERT', 'UPDATE', 'DELETE'];

      if (!table) {
        throw new Error('Table name is required for database trigger');
      }

      logger.info('Database trigger executed', {
        nodeId: node.id,
        databaseType,
        table,
        schema,
        operations,
        runId: context.runId
      });

      // For execute, we simulate a database change (actual watching happens via startWatching)
      const output = {
        operation: context.input?.operation || 'UPDATE',
        table,
        schema,
        record: context.input?.record || {},
        oldRecord: context.input?.oldRecord || null,
        timestamp: context.input?.timestamp || new Date().toISOString(),
        triggerTime: new Date().toISOString(),
        changeId: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      return {
        success: true,
        output,
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Database trigger failed', error, {
        nodeId: node.id,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  // Start watching database changes
  async startWatching(workflowId: string, node: WorkflowNode, onEvent: (event: any) => void): Promise<void> {
    const config = node.data?.config || {};
    const databaseType = config.databaseType || 'postgresql';
    const connectionString = config.connectionString;
    const host = config.host || 'localhost';
    const port = config.port || (databaseType === 'postgresql' ? 5432 : 3306);
    const database = config.database;
    const username = config.username;
    const password = config.password;
    const table = config.table;
    const schema = config.schema || 'public';
    const operations = config.operations || ['INSERT', 'UPDATE', 'DELETE'];
    const pollInterval = config.pollInterval || 5000;
    const watchColumn = config.watchColumn;
    const filterCondition = config.filterCondition;
    const useListenNotify = config.useListenNotify !== false && databaseType === 'postgresql';

    if (!database || !table) {
      throw new Error('Database name and table name are required');
    }

    const watcherKey = `${workflowId}-${node.id}`;

    // Stop existing watcher if any
    if (activeWatchers.has(watcherKey)) {
      await this.stopWatching(workflowId, node.id);
    }

    if (databaseType === 'postgresql') {
      await this.startPostgreSQLWatching(
        watcherKey,
        connectionString || {
          host,
          port,
          database,
          user: username,
          password
        },
        schema,
        table,
        operations,
        pollInterval,
        watchColumn,
        filterCondition,
        useListenNotify,
        workflowId,
        node.id,
        onEvent
      );
    } else if (databaseType === 'mysql') {
      // Check if mysql2 is installed
      let mysql: any;
      try {
        mysql = require('mysql2/promise');
      } catch (e) {
        throw new Error('mysql2 package is required for MySQL support. Install it with: npm install mysql2');
      }
      
      await this.startMySQLWatching(
        watcherKey,
        connectionString || {
          host,
          port,
          database,
          user: username,
          password
        },
        table,
        operations,
        pollInterval,
        watchColumn,
        filterCondition,
        workflowId,
        node.id,
        onEvent
      );
    } else {
      throw new Error(`Unsupported database type: ${databaseType}`);
    }

    logger.info('Database watcher started', {
      workflowId,
      nodeId: node.id,
      databaseType,
      table,
      schema
    });
  }

  private async startPostgreSQLWatching(
    watcherKey: string,
    connectionConfig: string | any,
    schema: string,
    table: string,
    operations: string[],
    pollInterval: number,
    watchColumn: string | undefined,
    filterCondition: string | undefined,
    useListenNotify: boolean,
    workflowId: string,
    nodeId: string,
    onEvent: (event: any) => void
  ): Promise<void> {
    let client: Client;

    if (typeof connectionConfig === 'string') {
      client = new Client({ connectionString: connectionConfig });
    } else {
      client = new Client(connectionConfig);
    }

    await client.connect();

    if (useListenNotify) {
      // Use PostgreSQL LISTEN/NOTIFY for real-time updates
      const channelName = `db_trigger_${schema}_${table}`;
      
      // Create trigger function if not exists
      const triggerFunction = `
        CREATE OR REPLACE FUNCTION notify_db_change()
        RETURNS TRIGGER AS $$
        DECLARE
          payload JSON;
        BEGIN
          payload = json_build_object(
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA,
            'old', row_to_json(OLD),
            'new', row_to_json(NEW)
          );
          PERFORM pg_notify('${channelName}', payload::text);
          RETURN COALESCE(NEW, OLD);
        END;
        $$ LANGUAGE plpgsql;
      `;

      try {
        await client.query(triggerFunction);

        // Drop existing trigger if exists
        await client.query(`
          DROP TRIGGER IF EXISTS db_trigger_${table} ON ${schema}.${table}
        `);

        // Create trigger
        let triggerConditions = '';
        if (operations.length < 3) {
          const ops = operations.map(op => `OR (TG_OP = '${op}')`).join(' ');
          triggerConditions = `WHEN (${ops.substring(3)})`;
        }

        await client.query(`
          CREATE TRIGGER db_trigger_${table}
          AFTER INSERT OR UPDATE OR DELETE ON ${schema}.${table}
          ${triggerConditions}
          FOR EACH ROW
          EXECUTE FUNCTION notify_db_change()
        `);

        // Listen to notifications
        await client.query(`LISTEN ${channelName}`);

        client.on('notification', (msg) => {
          try {
            const payload = JSON.parse(msg.payload || '{}');
            
            const output = {
              operation: payload.operation,
              table: payload.table,
              schema: payload.schema,
              record: payload.new || null,
              oldRecord: payload.old || null,
              timestamp: new Date().toISOString(),
              triggerTime: new Date().toISOString(),
              changeId: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };

            onEvent({
              ...output,
              workflowId,
              nodeId
            });

          } catch (error: any) {
            logger.error('Failed to parse notification payload', error, {
              workflowId,
              nodeId,
              payload: msg.payload
            });
          }
        });

        client.on('error', (error: Error) => {
          logger.error('PostgreSQL client error', error, {
            workflowId,
            nodeId
          });
        });

        activeWatchers.set(watcherKey, { client, interval: null as any });

      } catch (error: any) {
        await client.end();
        throw new Error(`Failed to set up PostgreSQL trigger: ${error.message}`);
      }

    } else {
      // Fallback to polling
      let lastCheckTime = new Date();
      let lastIds: Set<string> = new Set();

      const interval = setInterval(async () => {
        try {
          const checkTime = new Date();
          
          // Query for changes since last check
          let query = `
            SELECT *, 
              CASE 
                WHEN updated_at IS NOT NULL THEN updated_at
                WHEN created_at IS NOT NULL THEN created_at
                ELSE NOW()
              END as change_time
            FROM ${schema}.${table}
            WHERE (
              CASE 
                WHEN updated_at IS NOT NULL THEN updated_at
                WHEN created_at IS NOT NULL THEN created_at
                ELSE NOW()
              END
            ) >= $1
            ${filterCondition ? `AND (${filterCondition})` : ''}
            ORDER BY change_time DESC
            LIMIT 100
          `;

          const result = await client.query(query, [lastCheckTime]);

          for (const row of result.rows) {
            const rowId = row.id || row._id || JSON.stringify(row);
            
            if (!lastIds.has(rowId)) {
              // New or updated record
              onEvent({
                operation: lastIds.has(rowId) ? 'UPDATE' : 'INSERT',
                table,
                schema,
                record: row,
                oldRecord: null,
                timestamp: row.change_time,
                triggerTime: new Date().toISOString(),
                changeId: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                workflowId,
                nodeId
              });

              lastIds.add(rowId);
            }
          }

          lastCheckTime = checkTime;

        } catch (error: any) {
          logger.error('Database polling error', error, {
            workflowId,
            nodeId
          });
        }
      }, pollInterval);

      activeWatchers.set(watcherKey, { client, interval });
    }
  }

  private async startMySQLWatching(
    watcherKey: string,
    connectionConfig: string | any,
    table: string,
    operations: string[],
    pollInterval: number,
    watchColumn: string | undefined,
    filterCondition: string | undefined,
    workflowId: string,
    nodeId: string,
    onEvent: (event: any) => void
  ): Promise<void> {
    // MySQL doesn't have LISTEN/NOTIFY, so we use polling
    const mysql = require('mysql2/promise');
    
    let connection;
    if (typeof connectionConfig === 'string') {
      connection = await mysql.createConnection(connectionConfig);
    } else {
      connection = await mysql.createConnection(connectionConfig);
    }

    let lastCheckTime = new Date();
    let lastIds: Set<string> = new Set();

    const interval = setInterval(async () => {
      try {
        const checkTime = new Date();
        
        // MySQL polling query
        const query = `
          SELECT *, 
            COALESCE(updated_at, created_at, NOW()) as change_time
          FROM ${table}
          WHERE COALESCE(updated_at, created_at, NOW()) >= ?
          ${filterCondition ? `AND (${filterCondition})` : ''}
          ORDER BY change_time DESC
          LIMIT 100
        `;

        const [rows] = await connection.execute(query, [lastCheckTime]);

        for (const row of rows as any[]) {
          const rowId = row.id || row._id || JSON.stringify(row);
          
          if (!lastIds.has(rowId)) {
            onEvent({
              operation: lastIds.has(rowId) ? 'UPDATE' : 'INSERT',
              table,
              schema: null,
              record: row,
              oldRecord: null,
              timestamp: row.change_time,
              triggerTime: new Date().toISOString(),
              changeId: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              workflowId,
              nodeId
            });

            lastIds.add(rowId);
          }
        }

        lastCheckTime = checkTime;

      } catch (error: any) {
        logger.error('MySQL polling error', error, {
          workflowId,
          nodeId
        });
      }
    }, pollInterval);

    activeWatchers.set(watcherKey, { client: connection as any, interval });
  }

  async stopWatching(workflowId: string, nodeId: string): Promise<void> {
    const watcherKey = `${workflowId}-${nodeId}`;
    const watcher = activeWatchers.get(watcherKey);

    if (watcher) {
      if (watcher.interval) {
        clearInterval(watcher.interval);
      }
      if (watcher.client && watcher.client.end) {
        await watcher.client.end();
      }
      activeWatchers.delete(watcherKey);
      logger.info('Database watcher stopped', { workflowId, nodeId });
    }
  }}


export default DatabaseTriggerNode;

