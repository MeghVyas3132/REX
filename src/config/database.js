const { Pool } = require('pg');

let pool = null;

function createPool() {
  if (pool) return pool;
  
  const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING;
  
  if (!connectionString) {
    const logger = require('../utils/logger');
    logger.info('[DB] No DATABASE_URL found; using in-memory mode');
    return null;
  }

  try {
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    const logger = require('../utils/logger');
    
    pool.on('error', (err) => {
      logger.error('[DB] Unexpected error on idle client', err);
    });

    logger.info('[DB] Connected to PostgreSQL');
    return pool;
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('[DB] Failed to create pool', new Error(error.message));
    return null;
  }
}

function getPool() {
  return pool || createPool();
}

async function testConnection() {
  const p = getPool();
  if (!p) return false;
  
  try {
    const client = await p.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('[DB] Connection test failed', new Error(error.message));
    return false;
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  createPool,
  getPool,
  testConnection,
  closePool
};
