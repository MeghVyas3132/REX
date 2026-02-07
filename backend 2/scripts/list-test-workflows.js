#!/usr/bin/env node

/**
 * Script to list all test workflows in the database
 * This helps identify workflows that need to be deleted
 */

const { Pool } = require('pg');
const logger = require('../src/utils/logger');

async function listTestWorkflows() {
  // Create database connection
  const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING;
  
  let pool;
  if (connectionString) {
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  } else {
    // Use default connection for local development
    pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'workflow_studio',
      user: 'sahinbegum',
      ssl: false,
    });
  }
  
  if (!pool) {
    logger.error('Database connection not available.');
    process.exit(1);
  }

  try {
    logger.info('Searching for test workflows...');
    
    // Find all workflows with "Test" in the name or description
    const query = `
      SELECT id, name, description, created_at
      FROM workflows 
      WHERE name ILIKE '%test%' OR description ILIKE '%test%'
      ORDER BY name, created_at
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      logger.info('No test workflows found.');
    } else {
      logger.info(`Found ${result.rows.length} test workflow(s):`);
      result.rows.forEach((row, index) => {
        logger.info(`${index + 1}. ${row.name} (ID: ${row.id})`);
        if (row.description) {
          logger.info(`   Description: ${row.description}`);
        }
        logger.info(`   Created: ${row.created_at}`);
      });
    }
    
  } catch (error) {
    logger.error('Error listing test workflows:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  listTestWorkflows()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { listTestWorkflows };

