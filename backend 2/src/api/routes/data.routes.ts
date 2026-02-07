import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateBody, validateQuery, commonSchemas } from '../../utils/validators';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// GET /api/data - Get all data processing nodes
router.get('/', async (req, res) => {
  try {
    const dataNodes = [
      {
        id: 'csv',
        name: 'CSV Processor',
        description: 'Read, write, and manipulate CSV files',
        category: 'data',
        configSchema: {
          operation: { type: 'string', enum: ['read', 'write', 'parse', 'stringify', 'filter'], required: true },
          filePath: { type: 'string' },
          delimiter: { type: 'string', default: ',' },
          headers: { type: 'boolean', default: true }
        }
      },
      {
        id: 'json',
        name: 'JSON Processor',
        description: 'Parse, validate, and manipulate JSON data',
        category: 'data',
        configSchema: {
          operation: { type: 'string', enum: ['parse', 'stringify', 'validate', 'merge', 'extract'], required: true },
          filePath: { type: 'string' },
          pretty: { type: 'boolean', default: false },
          schema: { type: 'object' }
        }
      },
      {
        id: 'database',
        name: 'Database Operations',
        description: 'Execute SQL queries and database operations',
        category: 'data',
        configSchema: {
          operation: { type: 'string', enum: ['select', 'insert', 'update', 'delete'], required: true },
          query: { type: 'string' },
          table: { type: 'string' },
          data: { type: 'object' }
        }
      }
    ];

    res.json({
      success: true,
      data: dataNodes,
      count: dataNodes.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch data nodes'
    });
  }
});

// POST /api/data/csv/test - Test CSV processing
router.post('/csv/test', async (req, res) => {
  try {
    const { operation = 'parse', csvString, delimiter = ',' } = req.body;
    
    if (!csvString) {
      return res.status(400).json({
        success: false,
        error: 'CSV string is required for testing'
      });
    }

    // Simulate CSV parsing
    const lines = csvString.split('\n');
    const headers = lines[0]?.split(delimiter) || [];
    const data = lines.slice(1).map(line => {
      const values = line.split(delimiter);
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    const result = {
      data,
      rowCount: data.length,
      headers,
      operation
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test CSV processing'
    });
  }
});

// POST /api/data/json/test - Test JSON processing
router.post('/json/test', async (req, res) => {
  try {
    const { operation = 'parse', jsonString, pretty = false } = req.body;
    
    if (!jsonString) {
      return res.status(400).json({
        success: false,
        error: 'JSON string is required for testing'
      });
    }

    let result: any;

    switch (operation) {
      case 'parse':
        try {
          const data = JSON.parse(jsonString);
          result = { data, valid: true, errors: [] };
        } catch (error: any) {
          result = { data: null, valid: false, errors: [error.message] };
        }
        break;
      case 'stringify':
        try {
          const data = JSON.parse(jsonString);
          const stringified = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
          result = { jsonString: stringified, valid: true, errors: [] };
        } catch (error: any) {
          result = { jsonString: '', valid: false, errors: [error.message] };
        }
        break;
      default:
        result = { message: `${operation} operation not implemented in test mode` };
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test JSON processing'
    });
  }
});

// POST /api/data/database/test - Test database operations
router.post('/database/test', async (req, res) => {
  try {
    const { operation = 'select', query, table = 'test_table' } = req.body;
    
    // Simulate database operation
    const result = {
      operation,
      query: query || `SELECT * FROM ${table}`,
      affectedRows: operation === 'select' ? 5 : 1,
      data: operation === 'select' ? [
        { id: 1, name: 'Test 1' },
        { id: 2, name: 'Test 2' },
        { id: 3, name: 'Test 3' }
      ] : undefined,
      success: true
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test database operation'
    });
  }
});

export default router;
