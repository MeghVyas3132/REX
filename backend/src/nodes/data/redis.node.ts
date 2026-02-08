import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require('../../utils/logger');

export class RedisNode {
  getNodeDefinition() {
    return {
      id: 'redis',
      type: 'action',
      name: 'Redis Cache',
      description: 'Interact with Redis cache for storing and retrieving data',
      category: 'data',
      version: '1.0.0',
      author: 'Workflow Studio',
      // Node Configuration Fields (what user fills when setting up the node)
      parameters: [
        {
          name: 'operation',
          type: 'options',
          displayName: 'Operation',
          description: 'Redis operation to perform',
          required: true,
          default: 'get',
          options: [
            { name: 'Get', value: 'get' },
            { name: 'Set', value: 'set' },
            { name: 'Delete', value: 'delete' },
            { name: 'Exists', value: 'exists' },
            { name: 'Increment', value: 'increment' },
            { name: 'Decrement', value: 'decrement' },
            { name: 'Get Multiple', value: 'mget' },
            { name: 'Set Multiple', value: 'mset' },
            { name: 'Set with Expiry', value: 'setex' },
            { name: 'List Push', value: 'lpush' },
            { name: 'List Pop', value: 'rpop' },
            { name: 'List Range', value: 'lrange' },
            { name: 'Hash Set', value: 'hset' },
            { name: 'Hash Get', value: 'hget' },
            { name: 'Hash Get All', value: 'hgetall' },
            { name: 'Keys', value: 'keys' },
            { name: 'Delete Multiple', value: 'del' }
          ]
        },
        {
          name: 'host',
          type: 'string',
          displayName: 'Redis Host',
          description: 'Redis server hostname',
          required: true,
          default: 'localhost',
          placeholder: 'localhost'
        },
        {
          name: 'port',
          type: 'number',
          displayName: 'Redis Port',
          description: 'Redis server port',
          required: false,
          default: 6379,
          placeholder: '6379'
        },
        {
          name: 'password',
          type: 'string',
          displayName: 'Password',
          description: 'Redis password (if required)',
          required: false,
          placeholder: 'Redis password',
          credentialType: 'redis_password'
        },
        {
          name: 'db',
          type: 'number',
          displayName: 'Database Number',
          description: 'Redis database number (0-15)',
          required: false,
          default: 0,
          placeholder: '0'
        },
        {
          name: 'key',
          type: 'string',
          displayName: 'Key',
          description: 'Redis key',
          required: false,
          placeholder: 'mykey'
        },
        {
          name: 'value',
          type: 'string',
          displayName: 'Value',
          description: 'Value to set (JSON string for objects)',
          required: false,
          placeholder: 'myvalue or {"key":"value"}'
        },
        {
          name: 'expiry',
          type: 'number',
          displayName: 'Expiry (seconds)',
          description: 'Key expiry time in seconds (for setex operation)',
          required: false,
          placeholder: '3600'
        },
        {
          name: 'keys',
          type: 'string',
          displayName: 'Keys (JSON array)',
          description: 'Array of keys (for mget, del operations)',
          required: false,
          placeholder: '["key1", "key2"]'
        },
        {
          name: 'keyValues',
          type: 'string',
          displayName: 'Key-Value Pairs (JSON object)',
          description: 'Object with key-value pairs (for mset operation)',
          required: false,
          placeholder: '{"key1":"value1", "key2":"value2"}'
        },
        {
          name: 'start',
          type: 'number',
          displayName: 'Start Index',
          description: 'Start index for list range (0-based)',
          required: false,
          default: 0,
          placeholder: '0'
        },
        {
          name: 'end',
          type: 'number',
          displayName: 'End Index',
          description: 'End index for list range (-1 for all)',
          required: false,
          default: -1,
          placeholder: '-1'
        },
        {
          name: 'field',
          type: 'string',
          displayName: 'Hash Field',
          description: 'Hash field name (for hash operations)',
          required: false,
          placeholder: 'fieldname'
        },
        {
          name: 'hashData',
          type: 'string',
          displayName: 'Hash Data (JSON object)',
          description: 'Hash key-value pairs (for hset operation)',
          required: false,
          placeholder: '{"field1":"value1", "field2":"value2"}'
        },
        {
          name: 'pattern',
          type: 'string',
          displayName: 'Key Pattern',
          description: 'Pattern for keys operation (e.g., "user:*")',
          required: false,
          placeholder: 'user:*'
        }
      ],

      // Data Flow Input Fields (what comes from previous nodes)
      inputs: [
        {
          name: 'key',
          type: 'string',
          displayName: 'Dynamic Key',
          description: 'Redis key from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'value',
          type: 'string',
          displayName: 'Dynamic Value',
          description: 'Value from previous node (overrides configured)',
          required: false,
          dataType: 'text'
        },
        {
          name: 'keys',
          type: 'array',
          displayName: 'Dynamic Keys Array',
          description: 'Array of keys from previous node (overrides configured)',
          required: false,
          dataType: 'array'
        },
        {
          name: 'keyValues',
          type: 'object',
          displayName: 'Dynamic Key-Value Pairs',
          description: 'Key-value pairs from previous node (overrides configured)',
          required: false,
          dataType: 'object'
        }
      ],

      // Output Fields (what this node produces for next nodes)
      outputs: [
        {
          name: 'result',
          type: 'any',
          displayName: 'Result',
          description: 'Operation result',
          dataType: 'any'
        },
        {
          name: 'value',
          type: 'string',
          displayName: 'Retrieved Value',
          description: 'Value retrieved from Redis',
          dataType: 'text'
        },
        {
          name: 'exists',
          type: 'boolean',
          displayName: 'Key Exists',
          description: 'Whether the key exists',
          dataType: 'boolean'
        },
        {
          name: 'count',
          type: 'number',
          displayName: 'Count',
          description: 'Number of items affected or retrieved',
          dataType: 'number'
        },
        {
          name: 'keys',
          type: 'array',
          displayName: 'Keys List',
          description: 'List of keys matching pattern',
          dataType: 'array'
        }
      ],

      // Legacy schema support
      configSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string' },
          host: { type: 'string' },
          port: { type: 'number' },
          password: { type: 'string' },
          db: { type: 'number' },
          key: { type: 'string' },
          value: { type: 'string' },
          expiry: { type: 'number' },
          keys: { type: 'string' },
          keyValues: { type: 'string' }
        }
      },
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          value: { type: 'string' },
          keys: { type: 'array' },
          keyValues: { type: 'object' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          result: { type: 'any' },
          value: { type: 'string' },
          exists: { type: 'boolean' },
          count: { type: 'number' },
          keys: { type: 'array' }
        }
      }
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const config = node.data?.config || {};
    
    // Validation for required parameters
    if (!config.operation && !context.input?.operation) {
      throw new Error('Required parameter "operation" is missing');
    }
    // No legacy parameter required; accept operation-only for execution

    const startTime = Date.now();
    
    try {
      const operation = config.operation || 'get';
      const host = config.host || 'localhost';
      const port = config.port || 6379;
      const password = config.password;
      const db = config.db || 0;
      
      // Get dynamic inputs
      const key = context.input?.key || config.key;
      const value = context.input?.value || config.value;
      const keysInput = context.input?.keys || config.keys;
      const keyValuesInput = context.input?.keyValues || config.keyValues;

      logger.info('Redis operation executed', {
        nodeId: node.id,
        operation,
        host,
        port,
        db,
        runId: context.runId
      });

      // Import redis client dynamically
      let redis: any;
      try {
        redis = require('redis');
      } catch (e) {
        throw new Error('redis package not installed. Please install it: npm install redis');
      }

      // Create Redis client
      const client = redis.createClient({
        socket: {
          host,
          port: Number(port)
        },
        password: password || undefined,
        database: Number(db)
      });

      // Handle connection errors
      client.on('error', (err: Error) => {
        logger.error('Redis client error', err);
      });

      // Connect to Redis
      await client.connect();

      let result: any;

      try {
        switch (operation) {
          case 'get':
            if (!key) throw new Error('Key is required for get operation');
            const getValue = await client.get(key);
            result = { value: getValue, exists: getValue !== null };
            break;

          case 'set':
            if (!key) throw new Error('Key is required for set operation');
            if (value === undefined || value === null) throw new Error('Value is required for set operation');
            await client.set(key, value);
            result = { success: true };
            break;

          case 'setex':
            if (!key) throw new Error('Key is required for setex operation');
            if (value === undefined || value === null) throw new Error('Value is required for setex operation');
            const expiry = config.expiry || 3600;
            await client.setEx(key, Number(expiry), value);
            result = { success: true, expiry: Number(expiry) };
            break;

          case 'delete':
          case 'del':
            if (!key) throw new Error('Key is required for delete operation');
            const deleted = await client.del(key);
            result = { count: deleted, success: deleted > 0 };
            break;

          case 'exists':
            if (!key) throw new Error('Key is required for exists operation');
            const exists = await client.exists(key);
            result = { exists: exists === 1 };
            break;

          case 'increment':
            if (!key) throw new Error('Key is required for increment operation');
            const incrValue = await client.incr(key);
            result = { value: incrValue };
            break;

          case 'decrement':
            if (!key) throw new Error('Key is required for decrement operation');
            const decrValue = await client.decr(key);
            result = { value: decrValue };
            break;

          case 'mget':
            let keysArray: string[] = [];
            if (Array.isArray(keysInput)) {
              keysArray = keysInput;
            } else if (typeof keysInput === 'string') {
              try {
                keysArray = JSON.parse(keysInput);
              } catch {
                keysArray = [keysInput];
              }
            } else if (key) {
              keysArray = [key];
            } else {
              throw new Error('Keys are required for mget operation');
            }
            const values = await client.mGet(keysArray);
            result = { values, count: values.length };
            break;

          case 'mset':
            let kvPairs: Record<string, string> = {};
            if (typeof keyValuesInput === 'object' && keyValuesInput !== null) {
              kvPairs = keyValuesInput;
            } else if (typeof keyValuesInput === 'string') {
              try {
                kvPairs = JSON.parse(keyValuesInput);
              } catch {
                throw new Error('Invalid key-values format. Expected JSON object.');
              }
            } else {
              throw new Error('Key-value pairs are required for mset operation');
            }
            await client.mSet(kvPairs);
            result = { success: true, count: Object.keys(kvPairs).length };
            break;

          case 'lpush':
            if (!key) throw new Error('Key is required for lpush operation');
            if (value === undefined || value === null) throw new Error('Value is required for lpush operation');
            const lpushLength = await client.lPush(key, value);
            result = { length: lpushLength };
            break;

          case 'rpop':
            if (!key) throw new Error('Key is required for rpop operation');
            const popped = await client.rPop(key);
            result = { value: popped, exists: popped !== null };
            break;

          case 'lrange':
            if (!key) throw new Error('Key is required for lrange operation');
            const start = config.start || 0;
            const end = config.end !== undefined ? config.end : -1;
            const rangeValues = await client.lRange(key, Number(start), Number(end));
            result = { values: rangeValues, count: rangeValues.length };
            break;

          case 'hset':
            if (!key) throw new Error('Key is required for hset operation');
            let hashData: Record<string, string> = {};
            if (config.hashData) {
              if (typeof config.hashData === 'object') {
                hashData = config.hashData;
              } else if (typeof config.hashData === 'string') {
                try {
                  hashData = JSON.parse(config.hashData);
                } catch {
                  if (config.field && value) {
                    hashData = { [config.field]: value };
                  } else {
                    throw new Error('Invalid hash data format. Expected JSON object.');
                  }
                }
              }
            } else if (config.field && value !== undefined) {
              hashData = { [config.field]: value };
            } else {
              throw new Error('Hash data or field+value is required for hset operation');
            }
            const hsetCount = await client.hSet(key, hashData);
            result = { count: hsetCount, success: true };
            break;

          case 'hget':
            if (!key) throw new Error('Key is required for hget operation');
            if (!config.field) throw new Error('Field is required for hget operation');
            const hgetValue = await client.hGet(key, config.field);
            result = { value: hgetValue, exists: hgetValue !== null };
            break;

          case 'hgetall':
            if (!key) throw new Error('Key is required for hgetall operation');
            const hashAll = await client.hGetAll(key);
            result = { data: hashAll, count: Object.keys(hashAll).length };
            break;

          case 'keys':
            const pattern = config.pattern || '*';
            const matchingKeys = await client.keys(pattern);
            result = { keys: matchingKeys, count: matchingKeys.length };
            break;

          case 'del':
            // Handle multiple keys deletion
            let keysToDelete: string[] = [];
            if (Array.isArray(keysInput)) {
              keysToDelete = keysInput;
            } else if (typeof keysInput === 'string') {
              try {
                keysToDelete = JSON.parse(keysInput);
              } catch {
                keysToDelete = [keysInput];
              }
            } else if (key) {
              keysToDelete = [key];
            } else {
              throw new Error('Keys are required for del operation');
            }
            const deletedCount = await client.del(keysToDelete);
            result = { count: deletedCount, success: deletedCount > 0 };
            break;

          default:
            throw new Error(`Unsupported Redis operation: ${operation}`);
        }
      } finally {
        // Always close the connection
        await client.quit();
      }

      return {
        success: true,
        output: result,
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Redis operation failed', error, {
        nodeId: node.id,
        runId: context.runId
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }

}}

export default RedisNode;

