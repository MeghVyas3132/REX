import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateBody, validateQuery, commonSchemas } from '../../utils/validators';

const router = Router();

// Helper functions
function getFieldValue(data: any, field: string): any {
  const parts = field.split('.');
  let value: any = data;
  
  for (const part of parts) {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (Array.isArray(value) && !isNaN(Number(part))) {
      value = value[Number(part)];
    } else if (typeof value === 'object') {
      value = value[part];
    } else {
      return undefined;
    }
  }
  
  return value;
}

function evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
  switch (operator) {
    case 'equals':
      return fieldValue === expectedValue;
    case 'not_equals':
      return fieldValue !== expectedValue;
    case 'greater_than':
      return Number(fieldValue) > Number(expectedValue);
    case 'less_than':
      return Number(fieldValue) < Number(expectedValue);
    case 'contains':
      return String(fieldValue).includes(String(expectedValue));
    case 'not_contains':
      return !String(fieldValue).includes(String(expectedValue));
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null;
    case 'not_exists':
      return fieldValue === undefined || fieldValue === null;
    default:
      return false;
  }
}

// Apply auth middleware to all routes
router.use(authenticateToken);

// GET /api/utilities - Get all utility nodes
router.get('/', async (req, res) => {
  try {
    const utilityNodes = [
      {
        id: 'data-transform',
        name: 'Data Transform',
        description: 'Transform data using JavaScript expressions or templates',
        category: 'utility',
        configSchema: {
          mode: { type: 'string', enum: ['javascript', 'template', 'jsonpath'], default: 'javascript' },
          expression: { type: 'string', required: true },
          outputFormat: { type: 'string', enum: ['json', 'text', 'xml', 'csv'], default: 'json' }
        }
      },
      {
        id: 'conditional',
        name: 'Conditional Logic',
        description: 'Execute different paths based on conditions',
        category: 'utility',
        configSchema: {
          conditions: { type: 'array', required: true },
          defaultPath: { type: 'string' },
          logic: { type: 'string', enum: ['and', 'or'], default: 'and' }
        }
      },
      {
        id: 'loop',
        name: 'Loop Control',
        description: 'Execute workflow steps in a loop with various conditions',
        category: 'utility',
        configSchema: {
          type: { type: 'string', enum: ['for', 'while', 'foreach', 'do_while'], default: 'for' },
          maxIterations: { type: 'number', default: 100 },
          condition: { type: 'string' }
        }
      },
      {
        id: 'merge',
        name: 'Data Merge',
        description: 'Merge multiple data sources into a single output',
        category: 'utility',
        configSchema: {
          mode: { type: 'string', enum: ['merge', 'concat', 'intersect', 'union'], default: 'merge' },
          fields: { type: 'array' },
          outputFormat: { type: 'string', enum: ['object', 'array', 'string'], default: 'object' }
        }
      }
    ];

    res.json({
      success: true,
      data: utilityNodes,
      count: utilityNodes.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch utility nodes'
    });
  }
});

// POST /api/utilities/data-transform/test - Test data transformation
router.post('/data-transform/test', async (req, res) => {
  try {
    const { mode = 'javascript', expression, data = {} } = req.body;
    
    if (!expression) {
      return res.status(400).json({
        success: false,
        error: 'Expression is required for data transformation'
      });
    }

    let result: any;

    switch (mode) {
      case 'javascript':
        try {
          const func = new Function('data', 'context', 'input', `return ${expression}`);
          result = func(data, {}, {});
        } catch (error: any) {
          throw new Error(`JavaScript execution failed: ${error.message}`);
        }
        break;
      case 'template':
        result = expression
          .replace(/\{\{data\.(\w+)\}\}/g, (match, key) => data[key] || '')
          .replace(/\{\{context\.(\w+)\}\}/g, (match, key) => '');
        break;
      case 'jsonpath':
        const parts = expression.split('.');
        result = data;
        for (const part of parts) {
          if (result && typeof result === 'object') {
            result = result[part];
          } else {
            result = undefined;
            break;
          }
        }
        break;
      default:
        throw new Error(`Unsupported transformation mode: ${mode}`);
    }

    res.json({
      success: true,
      data: {
        result,
        mode,
        expression
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test data transformation'
    });
  }
});

// POST /api/utilities/conditional/test - Test conditional logic
router.post('/conditional/test', async (req, res) => {
  try {
    const { conditions = [], logic = 'and', data = {} } = req.body;
    
    if (!conditions || conditions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one condition is required'
      });
    }

    const matchedConditions: any[] = [];
    let result = logic === 'and';

    for (const condition of conditions) {
      const fieldValue = getFieldValue(data, condition.field);
      const conditionResult = evaluateCondition(fieldValue, condition.operator, condition.value);
      
      if (conditionResult) {
        matchedConditions.push(condition);
      }

      if (logic === 'and') {
        result = result && conditionResult;
      } else if (logic === 'or') {
        result = result || conditionResult;
      }
    }

    res.json({
      success: true,
      data: {
        result,
        matchedConditions,
        logic
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test conditional logic'
    });
  }
});

// POST /api/utilities/loop/test - Test loop control
router.post('/loop/test', async (req, res) => {
  try {
    const { type = 'for', maxIterations = 5, data = {} } = req.body;
    
    const results: any[] = [];
    let iterations = 0;

    switch (type) {
      case 'for':
        for (let i = 0; i < maxIterations; i++) {
          results.push({ index: i, value: i, iteration: iterations });
          iterations++;
        }
        break;
      case 'foreach':
        const array = data.array || [1, 2, 3, 4, 5];
        for (let i = 0; i < Math.min(array.length, maxIterations); i++) {
          results.push({ index: i, value: array[i], iteration: i });
          iterations++;
        }
        break;
      default:
        throw new Error(`Unsupported loop type: ${type}`);
    }

    res.json({
      success: true,
      data: {
        iterations,
        results,
        completed: iterations >= maxIterations
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test loop control'
    });
  }
});

// POST /api/utilities/merge/test - Test data merge
router.post('/merge/test', async (req, res) => {
  try {
    const { mode = 'merge', inputs = [] } = req.body;
    
    let result: any;

    switch (mode) {
      case 'merge':
        result = inputs.reduce((acc: any, item: any) => ({ ...acc, ...item }), {});
        break;
      case 'concat':
        result = inputs.flat();
        break;
      case 'intersect':
        result = inputs.length > 0 ? inputs[0].filter((item: any) => 
          inputs.every((arr: any) => arr.includes(item))
        ) : [];
        break;
      case 'union':
        const seen = new Set();
        result = inputs.flat().filter((item: any) => {
          const key = JSON.stringify(item);
          if (!seen.has(key)) {
            seen.add(key);
            return true;
          }
          return false;
        });
        break;
      default:
        throw new Error(`Unsupported merge mode: ${mode}`);
    }

    res.json({
      success: true,
      data: {
        result,
        mergedCount: inputs.length,
        mode
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test data merge'
    });
  }
});

export default router;
