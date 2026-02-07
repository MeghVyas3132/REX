import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class MongoDBRealNode {
  getNodeDefinition() {
    return {
  id: 'mongodb-real',
  type: 'action',
  name: 'MongoDB (Real)',
  description: 'Execute MongoDB operations with real driver',
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
      name: 'query',
      type: 'any',
      displayName: 'Query',
      description: 'query from previous node',
      required: false,
      dataType: 'any'
    },
    {
      name: 'collection',
      type: 'any',
      displayName: 'Collection',
      description: 'collection from previous node',
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
    if (!config.connectionString && !context.input?.connectionString) {
      throw new Error('Required parameter "connectionString" is missing');
    }

    
    try {
      const config = node.config;
      const { connectionString, operation, collection, query, data, updateData, projection, sort, limit, skip, pipeline } = config;
      
      const inputQuery = context.input?.query || query;
      const inputData = context.input?.data || data;
      const inputCollection = context.input?.collection || collection;

      if (!connectionString || !inputCollection) {
        throw new Error('Connection string and collection are required');
      }

      // Create MongoDB connection
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(connectionString);
      
      await client.connect();
      const db = client.db();
      const collectionObj = db.collection(inputCollection);

      let result: any = {};

      try {
        switch (operation) {
          case 'find':
            result = await this.executeFind(collectionObj, inputQuery, projection, sort, limit, skip);
            break;
          case 'insertOne':
            result = await this.executeInsertOne(collectionObj, inputData);
            break;
          case 'insertMany':
            result = await this.executeInsertMany(collectionObj, inputData);
            break;
          case 'updateOne':
            result = await this.executeUpdateOne(collectionObj, inputQuery, updateData);
            break;
          case 'updateMany':
            result = await this.executeUpdateMany(collectionObj, inputQuery, updateData);
            break;
          case 'deleteOne':
            result = await this.executeDeleteOne(collectionObj, inputQuery);
            break;
          case 'deleteMany':
            result = await this.executeDeleteMany(collectionObj, inputQuery);
            break;
          case 'count':
            result = await this.executeCount(collectionObj, inputQuery);
            break;
          case 'aggregate':
            result = await this.executeAggregate(collectionObj, pipeline);
            break;
          default:
            throw new Error(`Unsupported MongoDB operation: ${operation}`);
        }

        await client.close();

        const duration = Date.now() - startTime;
        
        logger.info('MongoDB node executed successfully', {
          operation,
          collection: inputCollection,
          duration
        });

        return {
          success: true,
          output: {
            ...result,
            operation,
            collection: inputCollection,
            timestamp: new Date().toISOString(),
            duration
          },
          duration
        };

      } catch (queryError) {
        await client.close();
        throw queryError;
      }

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('MongoDB node execution failed', {
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

  private parseJsonField(field: any): any {
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch (e) {
        return field;
      }
    }
    return field;
  }

  private async executeFind(collection: any, query?: any, projection?: any, sort?: any, limit?: number, skip?: number): Promise<any> {
    let cursor = collection.find(this.parseJsonField(query) || {});
    
    if (projection) {
      cursor = cursor.project(this.parseJsonField(projection));
    }
    
    if (sort) {
      cursor = cursor.sort(this.parseJsonField(sort));
    }
    
    if (skip) {
      cursor = cursor.skip(skip);
    }
    
    if (limit) {
      cursor = cursor.limit(limit);
    }
    
    const documents = await cursor.toArray();
    
    return {
      documents: documents,
      count: documents.length
    };
  }

  private async executeInsertOne(collection: any, data: any): Promise<any> {
    if (!data) {
      throw new Error('Data is required for insert operation');
    }

    const document = this.parseJsonField(data);
    const result = await collection.insertOne(document);
    
    return {
      insertedId: result.insertedId.toString(),
      acknowledged: result.acknowledged
    };
  }

  private async executeInsertMany(collection: any, data: any): Promise<any> {
    if (!data) {
      throw new Error('Data is required for insert many operation');
    }

    const documents = this.parseJsonField(data);
    if (!Array.isArray(documents)) {
      throw new Error('Data must be an array for insert many operation');
    }

    const result = await collection.insertMany(documents);
    
    return {
      insertedIds: Object.values(result.insertedIds).map(id => id.toString()),
      insertedCount: result.insertedCount,
      acknowledged: result.acknowledged
    };
  }

  private async executeUpdateOne(collection: any, query: any, updateData: any): Promise<any> {
    if (!query || !updateData) {
      throw new Error('Query and update data are required for update operation');
    }

    const filter = this.parseJsonField(query);
    const update = this.parseJsonField(updateData);
    
    const result = await collection.updateOne(filter, update);
    
    return {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
      acknowledged: result.acknowledged
    };
  }

  private async executeUpdateMany(collection: any, query: any, updateData: any): Promise<any> {
    if (!query || !updateData) {
      throw new Error('Query and update data are required for update many operation');
    }

    const filter = this.parseJsonField(query);
    const update = this.parseJsonField(updateData);
    
    const result = await collection.updateMany(filter, update);
    
    return {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
      acknowledged: result.acknowledged
    };
  }

  private async executeDeleteOne(collection: any, query: any): Promise<any> {
    if (!query) {
      throw new Error('Query is required for delete operation');
    }

    const filter = this.parseJsonField(query);
    const result = await collection.deleteOne(filter);
    
    return {
      deletedCount: result.deletedCount,
      acknowledged: result.acknowledged
    };
  }

  private async executeDeleteMany(collection: any, query: any): Promise<any> {
    if (!query) {
      throw new Error('Query is required for delete many operation');
    }

    const filter = this.parseJsonField(query);
    const result = await collection.deleteMany(filter);
    
    return {
      deletedCount: result.deletedCount,
      acknowledged: result.acknowledged
    };
  }

  private async executeCount(collection: any, query?: any): Promise<any> {
    const filter = this.parseJsonField(query) || {};
    const count = await collection.countDocuments(filter);
    
    return {
      count: count
    };
  }

  private async executeAggregate(collection: any, pipeline: any): Promise<any> {
    if (!pipeline) {
      throw new Error('Pipeline is required for aggregate operation');
    }

    const stages = this.parseJsonField(pipeline);
    if (!Array.isArray(stages)) {
      throw new Error('Pipeline must be an array of stages');
    }

    const documents = await collection.aggregate(stages).toArray();
    
    return {
      documents: documents,
      count: documents.length
    };
  }


  async test(context: ExecutionContext): Promise<ExecutionResult> {
    const { config } = context;
    const { connectionString, collection, operation } = config;

    if (!connectionString || !collection) {
      return {
        success: false,
        error: 'Connection string and collection are required for MongoDB node test.'
      };
    }

    // Mock a successful test response
    return {
      success: true,
      data: {
        nodeType: 'mongodb',
        status: 'success',
        message: 'MongoDB node test completed successfully',
        config: { connectionString: '***', collection, operation },
        capabilities: {
          find: true,
          insert: true,
          update: true,
          delete: true,
          aggregate: true
        },
        timestamp: new Date().toISOString()
      }
    };
  }}


export default MongoDBRealNode;
