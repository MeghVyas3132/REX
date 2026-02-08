import { Router } from 'express';
import { optionalAuth } from '../middlewares/auth.middleware';
import { validateBody, validateQuery, commonSchemas } from '../../utils/validators';
import { nodeRegistry, FileTriggerNode, DatabaseTriggerNode } from '@rex/nodes';
import * as fs from 'fs';
import { promisify } from 'util';
import { Client } from 'pg';

const router = Router();
const stat = promisify(fs.stat);
const fileTriggerNode = new FileTriggerNode();
const databaseTriggerNode = new DatabaseTriggerNode();

// GET /api/triggers - Get all trigger nodes
router.get('/', optionalAuth, async (req, res) => {
  try {
    // Get trigger nodes from registry
    const allNodes = nodeRegistry.getAllNodeDefinitions();
    const triggerNodes = allNodes.filter(node => node.type === 'trigger');

    // Also include hardcoded ones for backwards compatibility
    const triggerNodesList = triggerNodes.map(node => ({
      id: node.id,
      name: node.name,
      description: node.description,
      category: node.category,
      configSchema: node.configSchema || {}
    }));

    // Add file-trigger and database-trigger if not already present
    if (!triggerNodesList.find(n => n.id === 'file-trigger')) {
      triggerNodesList.push({
        id: 'file-trigger',
        name: 'File Trigger',
        description: 'Trigger workflow when files are created, modified, or deleted',
        category: 'trigger',
        configSchema: fileTriggerNode.getNodeDefinition().configSchema
      });
    }

    if (!triggerNodesList.find(n => n.id === 'database-trigger')) {
      triggerNodesList.push({
        id: 'database-trigger',
        name: 'Database Trigger',
        description: 'Trigger workflow when database changes occur',
        category: 'trigger',
        configSchema: databaseTriggerNode.getNodeDefinition().configSchema
      });
    }

    res.json({
      success: true,
      data: triggerNodesList,
      count: triggerNodesList.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch trigger nodes'
    });
  }
});

// POST /api/triggers/schedule/test - Test schedule trigger
router.post('/schedule/test', optionalAuth, validateBody(commonSchemas.pagination), async (req, res) => {
  try {
    const { cron, timezone = 'UTC' } = req.body;
    
    if (!cron) {
      return res.status(400).json({
        success: false,
        error: 'Cron expression is required'
      });
    }

    // Simulate schedule trigger execution
    const result = {
      triggerTime: new Date().toISOString(),
      timezone,
      cron,
      message: 'Schedule trigger test executed successfully'
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test schedule trigger'
    });
  }
});

// removed file-watch test endpoint

// POST /api/triggers/file-trigger/test - Test file trigger
router.post('/file-trigger/test', optionalAuth, async (req, res) => {
  try {
    const config = req.body.config || req.body;
    const watchPath = config.watchPath || config.path;
    
    if (!watchPath) {
      return res.status(400).json({
        success: false,
        error: 'Watch path is required'
      });
    }

    // Test by getting file stats
    try {
      const stats = await stat(watchPath);
      
      const result = {
        filePath: watchPath,
        fileName: watchPath.split('/').pop() || watchPath.split('\\').pop(),
        fileExtension: watchPath.includes('.') ? watchPath.split('.').pop() : '',
        event: 'change',
        fileSize: stats.size,
        modifiedTime: stats.mtime.toISOString(),
        stats: {
          size: stats.size,
          mtime: stats.mtime.toISOString(),
          ctime: stats.ctime.toISOString(),
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          mode: stats.mode
        },
        triggerTime: new Date().toISOString()
      };

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: `Path does not exist: ${watchPath}`
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test file trigger'
    });
  }
});

// POST /api/triggers/database-trigger/test - Test database trigger
router.post('/database-trigger/test', optionalAuth, async (req, res) => {
  try {
    const config = req.body.config || req.body;
    const databaseType = config.databaseType || 'postgresql';
    const connectionString = config.connectionString;
    const host = config.host || 'localhost';
    const port = config.port || (databaseType === 'postgresql' ? 5432 : 3306);
    const database = config.database;
    const username = config.username;
    const password = config.password;
    const table = config.table;
    const schema = config.schema || 'public';

    if (!database || !table) {
      return res.status(400).json({
        success: false,
        error: 'Database name and table name are required'
      });
    }

    // Test database connection
    try {
      if (databaseType === 'postgresql') {
        let client: Client;
        
        if (connectionString) {
          client = new Client({ connectionString });
        } else if (username && password) {
          client = new Client({
            host,
            port,
            database,
            user: username,
            password
          });
        } else {
          return res.status(400).json({
            success: false,
            error: 'Connection string or username/password required'
          });
        }

        await client.connect();

        // Test if table exists
        const tableCheckQuery = `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = $1 
            AND table_name = $2
          );
        `;
        const tableResult = await client.query(tableCheckQuery, [schema, table]);
        
        if (!tableResult.rows[0].exists) {
          await client.end();
          return res.status(400).json({
            success: false,
            error: `Table ${schema}.${table} does not exist`
          });
        }

        // Get table info
        const columnsQuery = `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = $1 
          AND table_name = $2
          ORDER BY ordinal_position;
        `;
        const columnsResult = await client.query(columnsQuery, [schema, table]);

        await client.end();

        res.json({
          success: true,
          data: {
            connected: true,
            databaseType,
            database,
            schema,
            table,
            columns: columnsResult.rows.map(row => ({
              name: row.column_name,
              type: row.data_type
            })),
            message: 'Database connection successful and table exists'
          }
        });

      } else if (databaseType === 'mysql') {
        let mysql: any;
        try {
          mysql = require('mysql2/promise');
        } catch (e) {
          return res.status(400).json({
            success: false,
            error: 'mysql2 package is required for MySQL support. Install it with: npm install mysql2'
          });
        }
        
        let connection;
        
        if (connectionString) {
          connection = await mysql.createConnection(connectionString);
        } else if (username && password) {
          connection = await mysql.createConnection({
            host,
            port,
            database,
            user: username,
            password
          });
        } else {
          return res.status(400).json({
            success: false,
            error: 'Connection string or username/password required'
          });
        }

        // Test if table exists
        const [tables] = await connection.execute(
          'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
          [database, table]
        );

        if ((tables as any[])[0].count === 0) {
          await connection.end();
          return res.status(400).json({
            success: false,
            error: `Table ${table} does not exist in database ${database}`
          });
        }

        // Get table info
        const [columns] = await connection.execute(
          'SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ORDINAL_POSITION',
          [database, table]
        );

        await connection.end();

        res.json({
          success: true,
          data: {
            connected: true,
            databaseType,
            database,
            table,
            columns: (columns as any[]).map(row => ({
              name: row.COLUMN_NAME,
              type: row.DATA_TYPE
            })),
            message: 'Database connection successful and table exists'
          }
        });

      } else {
        return res.status(400).json({
          success: false,
          error: `Unsupported database type: ${databaseType}`
        });
      }

    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: `Database connection failed: ${error.message}`
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test database trigger'
    });
  }
});

// POST /api/triggers/email/test - Test email trigger
router.post('/email/test', optionalAuth, async (req, res) => {
  try {
    const { email, subject, from } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    // Simulate email trigger execution
    const result = {
      email,
      subject: subject || 'Test Email',
      from: from || 'sender@example.com',
      body: 'Email content here',
      attachments: [],
      receivedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test email trigger'
    });
  }
});

export default router;
