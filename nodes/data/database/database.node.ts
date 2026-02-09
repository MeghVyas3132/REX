import { WorkflowNode, ExecutionContext, ExecutionResult } from '@rex/shared';
import { logger } from '../../lib/logger.js';
const { PrismaClient } = require('@prisma/client');

export class DatabaseNode {
  getNodeDefinition() {
    return {
  id: 'database',
  type: 'action',
  name: 'Database',
  description: 'Execute database operations',
  category: 'data',
  version: '1.0.0',
  author: 'Workflow Studio',
  parameters: [
    {
      name: 'connectionString',
      type: 'string',
      displayName: 'Connection String',
      description: 'connectionString configuration',
      required: true,
      placeholder: 'Enter connectionString...'
    },
    {
      name: 'operation',
      type: 'string',
      displayName: 'Operation',
      description: 'operation configuration',
      required: true,
      placeholder: 'Enter operation...'
    },
    {
      name: 'table',
      type: 'string',
      displayName: 'Table',
      description: 'table configuration',
      required: false,
      placeholder: 'Enter table...'
    },
    {
      name: 'where',
      type: 'string',
      displayName: 'Where',
      description: 'where configuration',
      required: false,
      placeholder: 'Enter where...'
    },
    {
      name: 'select',
      type: 'string',
      displayName: 'Select',
      description: 'select configuration',
      required: false,
      placeholder: 'Enter select...'
    },
    {
      name: 'orderBy',
      type: 'string',
      displayName: 'Order By',
      description: 'orderBy configuration',
      required: false,
      placeholder: 'Enter orderBy...'
    },
    {
      name: 'limit',
      type: 'string',
      displayName: 'Limit',
      description: 'limit configuration',
      required: false,
      placeholder: 'Enter limit...'
    },
    {
      name: 'offset',
      type: 'string',
      displayName: 'Offset',
      description: 'offset configuration',
      required: false,
      placeholder: 'Enter offset...'
    },
    {
      name: 'query',
      type: 'string',
      displayName: 'Query',
      description: 'query configuration',
      required: false,
      placeholder: 'Enter query...'
    }
  ],
  inputs: [
    {
      name: 'connectionString',
      type: 'any',
      displayName: 'Connection String',
      description: 'connectionString from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'operation',
      type: 'any',
      displayName: 'Operation',
      description: 'operation from previous node',
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
    },
    {
      name: 'where',
      type: 'any',
      displayName: 'Where',
      description: 'where from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'select',
      type: 'any',
      displayName: 'Select',
      description: 'select from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'orderBy',
      type: 'any',
      displayName: 'Order By',
      description: 'orderBy from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'limit',
      type: 'any',
      displayName: 'Limit',
      description: 'limit from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'offset',
      type: 'any',
      displayName: 'Offset',
      description: 'offset from previous node',
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
    const config = node.data?.config || {};
    const startTime = Date.now();

    if (!config.connectionString && !context.input?.connectionString) {
      throw new Error('Required parameter "connectionString" is missing');
    }

    
    try {
      const operation = config.operation || context.input?.operation;
      if (!operation) {
        throw new Error('Database operation is required');
      }

      logger.info('Executing database operation', {
        nodeId: node.id,
        operation,
        runId: context.runId
      });

      let result: any;

      switch (operation) {
        case 'select':
          result = await this.select(config, context);
          break;
        case 'insert':
          result = await this.insert(config, context);
          break;
        case 'update':
          result = await this.update(config, context);
          break;
        case 'delete':
          result = await this.delete(config, context);
          break;
        case 'raw_query':
          result = await this.rawQuery(config, context);
          break;
        default:
          throw new Error(`Unsupported database operation: ${operation}`);
      }

      const duration = Date.now() - startTime;

      logger.externalService('Database', operation, duration, true, {
        nodeId: node.id,
        runId: context.runId
      });

      return {
        success: true,
        output: result,
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.externalService('Database', config.operation || 'unknown', duration, false, {
        nodeId: node.id,
        error: error.message,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  private async select(config: any, context: ExecutionContext) {
    const table = config.table || context.input?.table;
    if (!table) {
      throw new Error('Table name is required for select operation');
    }

    // This is a simplified example - in production, you'd use proper ORM
    const prisma = new PrismaClient();
    
    try {
      const where = config.where || context.input?.where || {};
      const select = config.select || context.input?.select;
      const orderBy = config.orderBy || context.input?.orderBy;
      const limit = config.limit || context.input?.limit;
      const offset = config.offset || context.input?.offset;

      let query: any = { where };
      
      if (select) query.select = select;
      if (orderBy) query.orderBy = orderBy;
      if (limit) query.take = limit;
      if (offset) query.skip = offset;

      // Note: This is a simplified example. In production, you'd need to handle
      // different table names dynamically or use a more flexible approach
      const data = await (prisma as any)[table].findMany(query);

      return {
        success: true,
        data,
        count: data.length
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  private async insert(config: any, context: ExecutionContext) {
    const table = config.table || context.input?.table;
    const data = config.data || context.input?.data;
    
    if (!table || !data) {
      throw new Error('Table name and data are required for insert operation');
    }

    const prisma = new PrismaClient();
    
    try {
      const result = await (prisma as any)[table].create({
        data
      });

      return {
        success: true,
        output: result,
        affectedRows: 1
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  private async update(config: any, context: ExecutionContext) {
    const table = config.table || context.input?.table;
    const where = config.where || context.input?.where;
    const data = config.data || context.input?.data;
    
    if (!table || !where || !data) {
      throw new Error('Table name, where clause, and data are required for update operation');
    }

    const prisma = new PrismaClient();
    
    try {
      const result = await (prisma as any)[table].updateMany({
        where,
        data
      });

      return {
        success: true,
        affectedRows: result.count,
        output: result
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  private async delete(config: any, context: ExecutionContext) {
    const table = config.table || context.input?.table;
    const where = config.where || context.input?.where;
    
    if (!table || !where) {
      throw new Error('Table name and where clause are required for delete operation');
    }

    const prisma = new PrismaClient();
    
    try {
      const result = await (prisma as any)[table].deleteMany({
        where
      });

      return {
        success: true,
        affectedRows: result.count,
        output: result
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  private async rawQuery(config: any, context: ExecutionContext) {
    const query = config.query || context.input?.query;
    if (!query) {
      throw new Error('SQL query is required for raw_query operation');
    }

    const prisma = new PrismaClient();
    
    try {
      const result = await prisma.$queryRawUnsafe(query);
      
      return {
        success: true,
        output: result,
        count: Array.isArray(result) ? result.length : 1
      };
    } finally {
      await prisma.$disconnect();
    }
  }}


export default DatabaseNode;
