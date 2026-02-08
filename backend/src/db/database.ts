import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING;
    
    if (!connectionString) {
      const logger = require('../utils/logger');
      logger.info('[DB] No DATABASE_URL found; using default connection');
      // Use default connection for local development
      pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'workflow_studio',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        ssl: false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    } else {
      const logger = require('../utils/logger');
      logger.info('[DB] Using DATABASE_URL from environment');
      
      pool = new Pool({
        connectionString: connectionString,
        ssl: connectionString.includes('sslmode=disable') ? false : 
             (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    }

    pool.on('error', (err) => {
      const logger = require('../utils/logger');
      logger.error('[DB] Unexpected error on idle client', err as Error);
    });
  }

  return pool;
}

export async function testConnection(): Promise<boolean> {
  try {
    const p = getPool();
    const client = await p.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('[DB] Connection test failed', error as Error);
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Database operations
export class DatabaseService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  // User operations
  async createUser(email: string, passwordHash: string, name?: string) {
    // Generate a UUID string for id; database usually has uuid id
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    try {
      const safeName = name && name.trim().length > 0 ? name : email;
      const query = 'INSERT INTO users (id, email, password_hash, name, role, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *';
      const result = await this.pool.query(query, [id, email, passwordHash, safeName, 'user', true]);
      return result.rows[0];
    } catch (err: any) {
      // Fallback for legacy schema that uses password column instead of password_hash
      if (typeof err.message === 'string' && err.message.includes('column "password_hash"')) {
        const safeName = name && name.trim().length > 0 ? name : email;
        const altQuery = 'INSERT INTO users (id, email, password, name, role, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *';
        const result = await this.pool.query(altQuery, [id, email, passwordHash, safeName, 'user', true]);
        return result.rows[0];
      }
      throw err;
    }
  }

  async getUserByEmail(email: string) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.pool.query(query, [email]);
    return result.rows[0] || null;
  }

  async getUserById(id: string) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async updateUserLastLogin(userId: string) {
    const query = 'UPDATE users SET last_login_at = NOW() WHERE id = $1 RETURNING *';
    const result = await this.pool.query(query, [userId]);
    return result.rows[0];
  }

  async updateUser(userId: string, updates: any) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramCount}`);
      values.push(updates.name);
      paramCount++;
    }

    if (updates.email !== undefined) {
      fields.push(`email = $${paramCount}`);
      values.push(updates.email);
      paramCount++;
    }

    if (updates.role !== undefined) {
      fields.push(`role = $${paramCount}`);
      values.push(updates.role);
      paramCount++;
    }

    if (updates.is_active !== undefined) {
      fields.push(`is_active = $${paramCount}`);
      values.push(updates.is_active);
      paramCount++;
    }

    if (fields.length === 0) {
      return null;
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updateUserPassword(userId: string, passwordHash: string) {
    try {
      const query = 'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
      const result = await this.pool.query(query, [passwordHash, userId]);
      return result.rows[0];
    } catch (err: any) {
      if (typeof err.message === 'string' && err.message.includes('column "password_hash"')) {
        const altQuery = 'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
        const result = await this.pool.query(altQuery, [passwordHash, userId]);
        return result.rows[0];
      }
      throw err;
    }
  }

  // Credential operations
  async createCredential(userId: string, name: string, type: string, service: string, encryptedData: string) {
    const query = `
      INSERT INTO credentials (user_id, name, type, service, encrypted_data) 
      VALUES ($1::uuid, $2, $3, $4, $5) 
      RETURNING *
    `;
    const result = await this.pool.query(query, [userId, name, type, service, encryptedData]);
    return result.rows[0];
  }

  async getCredentialById(credentialId: string) {
    const query = 'SELECT * FROM credentials WHERE id = $1::uuid';
    const result = await this.pool.query(query, [credentialId]);
    return result.rows[0] || null;
  }

  async getCredentialByName(userId: string, name: string) {
    const query = 'SELECT * FROM credentials WHERE user_id = $1::uuid AND name = $2';
    const result = await this.pool.query(query, [userId, name]);
    return result.rows[0] || null;
  }

  async getUserCredentials(userId: string) {
    const query = 'SELECT * FROM credentials WHERE user_id = $1::uuid ORDER BY created_at DESC';
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async getCredentialsByService(userId: string, service: string) {
    const query = 'SELECT * FROM credentials WHERE user_id = $1::uuid AND service = $2 ORDER BY created_at DESC';
    const result = await this.pool.query(query, [userId, service]);
    return result.rows;
  }

  async updateCredential(credentialId: string, updates: any) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramCount}`);
      values.push(updates.name);
      paramCount++;
    }

    if (updates.type !== undefined) {
      fields.push(`type = $${paramCount}`);
      values.push(updates.type);
      paramCount++;
    }

    if (updates.service !== undefined) {
      fields.push(`service = $${paramCount}`);
      values.push(updates.service);
      paramCount++;
    }

    if (updates.encrypted_data !== undefined) {
      fields.push(`encrypted_data = $${paramCount}`);
      values.push(updates.encrypted_data);
      paramCount++;
    }

    if (updates.is_active !== undefined) {
      fields.push(`is_active = $${paramCount}`);
      values.push(updates.is_active);
      paramCount++;
    }

    if (fields.length === 0) {
      return null;
    }

    fields.push(`updated_at = NOW()`);
    values.push(credentialId);

    const query = `UPDATE credentials SET ${fields.join(', ')} WHERE id = $${paramCount}::uuid RETURNING *`;
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async deleteCredential(credentialId: string) {
    const query = 'DELETE FROM credentials WHERE id = $1::uuid RETURNING *';
    const result = await this.pool.query(query, [credentialId]);
    return result.rows[0];
  }

  // Workflow operations
  async createWorkflow(userId: string, name: string, description: string, nodes: any, edges: any) {
    const query = `
      INSERT INTO workflows (user_id, name, description, nodes, edges) 
      VALUES ($1::uuid, $2, $3, $4, $5) 
      RETURNING *
    `;
    const result = await this.pool.query(query, [userId, name, description, JSON.stringify(nodes), JSON.stringify(edges)]);
    return result.rows[0];
  }

  async getWorkflowById(id: string) {
    // Handle both UUID and string IDs - use proper UUID comparison
    // First try to find by UUID (if id is a UUID)
    // Then try to find by casting UUID to text (for custom IDs that match UUID format)
    // Finally try to find by name
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const logger = require('../utils/logger');
    
    let query: string;
    let params: any[];
    
    if (uuidRegex.test(id)) {
      // id is a valid UUID, search directly
      query = 'SELECT * FROM workflows WHERE id = $1::uuid';
      params = [id];
    } else {
      // id is a custom ID (like wf_xxx), search by casting UUID to text or by name
      // Note: This assumes workflows table has a UUID id column
      // If custom IDs are stored, we need a different approach
      // Also check if there's a custom_id field or if the id is stored in settings
      query = `
        SELECT * FROM workflows 
        WHERE id::text = $1 
           OR name = $1 
           OR (settings->>'customId')::text = $1
           OR (settings->>'id')::text = $1
        LIMIT 1
      `;
      params = [id];
    }
    
    try {
      const result = await this.pool.query(query, params);
      if (result.rows.length === 0) {
        logger.warn(`Workflow not found with ID: ${id}`);
        return null;
      }
      const workflow = result.rows[0];
      
      // Normalize field names - database returns snake_case, but code expects camelCase
      // Ensure userId is available (from either user_id or userId field)
      if (workflow.user_id && !workflow.userId) {
        workflow.userId = workflow.user_id;
      }
      
      logger.info(`Workflow found: ${workflow.id} (searched with: ${id})`, {
        workflowId: workflow.id,
        userId: workflow.userId || workflow.user_id,
        hasUserId: !!(workflow.userId || workflow.user_id)
      });
      return workflow;
    } catch (error: any) {
      logger.error(`Error looking up workflow ${id}:`, error.message);
      throw error;
    }
  }

  async getUserWorkflows(userId: string) {
    const query = 'SELECT * FROM workflows WHERE user_id = $1::uuid ORDER BY created_at DESC';
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async getAllWorkflows() {
    const query = 'SELECT * FROM workflows ORDER BY created_at DESC';
    const result = await this.pool.query(query);
    return result.rows;
  }

  async updateWorkflow(id: string, name: string, description: string, nodes: any, edges: any) {
    const query = `
      UPDATE workflows 
      SET name = $2, description = $3, nodes = $4, edges = $5, updated_at = NOW() 
      WHERE id = $1::uuid 
      RETURNING *
    `;
    const result = await this.pool.query(query, [id, name, description, JSON.stringify(nodes), JSON.stringify(edges)]);
    return result.rows[0];
  }

  async deleteWorkflow(id: string) {
    const query = 'DELETE FROM workflows WHERE id = $1::uuid RETURNING *';
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  // Workflow execution operations
  async createWorkflowExecution(workflowId: string, inputData: any, userId?: string) {
    // Generate proper UUID for execution id
    const { v4: uuidv4 } = require('uuid');
    const runId = uuidv4();
    const logger = require('../utils/logger');
    
    // Always validate and get the actual database UUID
    // The workflowId might be a custom ID (like wf_xxx) or a UUID
    let properWorkflowId = workflowId;
    
    // Check if it's a valid UUID
    if (!this.isValidUUID(workflowId)) {
      // Not a UUID, so it's likely a custom ID - look up the workflow to get the database UUID
      const workflow = await this.getWorkflowById(workflowId);
      if (!workflow || !workflow.id) {
        throw new Error(`Workflow ${workflowId} not found in database. Cannot create execution record.`);
      }
      
      // Check if the returned ID is a UUID
      if (this.isValidUUID(workflow.id)) {
        properWorkflowId = workflow.id; // Use the actual database UUID
      } else {
        // The database is storing custom IDs, not UUIDs
        // This means the workflows table id column is likely TEXT, not UUID
        // In this case, we need to check if we can cast it or if we should skip the foreign key
        logger.warn(`Workflow ${workflowId} has custom ID format in database: ${workflow.id}. Database schema may use TEXT for workflow IDs.`);
        
        // Try to find if there's a UUID stored in settings
        const settings = workflow.settings || {};
        if (settings.dbUuid && this.isValidUUID(settings.dbUuid)) {
          properWorkflowId = settings.dbUuid;
          logger.info(`Using UUID from workflow settings: ${properWorkflowId}`);
        } else {
          // If no UUID found, we can't create a foreign key relationship
          // But we can still create the execution record by storing the custom ID as text
          // However, this requires the workflow_runs.workflow_id to be TEXT, not UUID
          // For now, throw an error to indicate the issue
          throw new Error(`Workflow ${workflowId} uses custom ID format (${workflow.id}) but workflow_runs table requires UUID. Please ensure workflows are stored with UUID primary keys.`);
        }
      }
    }
    
    // At this point, properWorkflowId should be a valid UUID
    // Verify it exists in the database before creating the execution record
    try {
      const workflowCheck = await this.pool.query('SELECT id FROM workflows WHERE id = $1::uuid', [properWorkflowId]);
      if (workflowCheck.rows.length === 0) {
        // Workflow doesn't exist with this UUID - might be using custom IDs
        // Try to find it by casting to text
        const workflowCheckText = await this.pool.query('SELECT id FROM workflows WHERE id::text = $1', [workflowId]);
        if (workflowCheckText.rows.length > 0) {
          logger.warn(`Workflow found with custom ID but database uses TEXT for IDs. Cannot create foreign key relationship.`);
          throw new Error(`Workflow ${workflowId} exists but uses custom ID format. Database schema mismatch - workflows.id should be UUID type.`);
        }
        throw new Error(`Workflow with UUID ${properWorkflowId} does not exist in database. Cannot create execution record.`);
      }
    } catch (error: any) {
      // If the query fails due to type mismatch, the database column is likely TEXT
      if (error.message.includes('invalid input syntax for type uuid')) {
        logger.error(`Database schema mismatch: workflows.id column appears to be TEXT, not UUID. Cannot create foreign key relationship.`);
        throw new Error(`Database schema mismatch: workflows table uses TEXT for id column, but workflow_runs requires UUID. Please update database schema.`);
      }
      throw error;
    }
    
    const query = `
      INSERT INTO workflow_runs (id, workflow_id, input, status, started_at, user_id) 
      VALUES ($1::uuid, $2::uuid, $3, 'running', NOW(), $4::uuid) 
      RETURNING *
    `;
    const result = await this.pool.query(query, [runId, properWorkflowId, JSON.stringify(inputData), userId || null]);
    return result.rows[0];
  }

  // Helper method to check if a string is a valid UUID
  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  async updateWorkflowExecution(id: string, status: string, outputData?: any) {
    // Skip update if this is a temp ID (starts with "temp_")
    if (id && id.startsWith('temp_')) {
      const logger = require('../utils/logger');
      logger.debug(`Skipping update for temp execution ID: ${id}`);
      return null;
    }
    
    // Ensure the ID is a valid UUID
    const properId = this.isValidUUID(id) ? id : null;
    if (!properId) {
      // If it's not a UUID and not a temp ID, log and skip
      const logger = require('../utils/logger');
      logger.warn(`Cannot update workflow execution: invalid ID format: ${id}. Skipping update.`);
      return null;
    }
    
    try {
      const query = `
        UPDATE workflow_runs 
        SET status = $2::varchar, output = $3::jsonb, completed_at = CASE WHEN $2::varchar IN ('completed', 'failed') THEN NOW() ELSE NULL END
        WHERE id = $1::uuid 
        RETURNING *
      `;
      const result = await this.pool.query(query, [properId, status, outputData ? JSON.stringify(outputData) : '{}']);
      return result.rows[0] || null;
    } catch (error: any) {
      // If update fails (e.g., record doesn't exist), log and return null
      const logger = require('../utils/logger');
      logger.warn(`Failed to update workflow execution ${properId}: ${error.message}`);
      return null;
    }
  }

  async getWorkflowExecution(id: string) {
    // Ensure the ID is a valid UUID
    const properId = this.isValidUUID(id) ? id : null;
    if (!properId) {
      throw new Error(`Invalid UUID format: ${id}`);
    }
    
    const query = 'SELECT * FROM workflow_runs WHERE id = $1::uuid';
    const result = await this.pool.query(query, [properId]);
    return result.rows[0] || null;
  }

  async getUserWorkflowExecutions(userId: string) {
    const query = `
      SELECT wr.*, w.name as workflow_name 
      FROM workflow_runs wr 
      JOIN workflows w ON wr.workflow_id = w.id 
      WHERE w.user_id = $1::uuid 
      ORDER BY wr.started_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }
}

export const db = new DatabaseService();
