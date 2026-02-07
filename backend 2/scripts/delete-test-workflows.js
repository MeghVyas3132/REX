#!/usr/bin/env node

/**
 * Script to delete all test workflows from the database
 * This removes workflows created for testing purposes
 */

const { Pool } = require('pg');
const logger = require('../src/utils/logger');

const TEST_WORKFLOW_NAMES = [
  'Error Trigger Test',
  'Form Submit Trigger Test',
  'Database Trigger Test',
  'File Trigger Test',
  'File Watch Test',
  'Email Trigger Test',
  'Google Drive Real Test',
  'Gemini Real Test',
  'Claude Real Test',
  'Kubernetes Real Test',
  'Google Cloud Storage Real Test',
  'Docker Real Test',
  'Azure Blob Real Test',
  'AWS Lambda Real Test',
  'AWS S3 Real Test',
  // Additional test workflows
  'MySQL Real Test',
  'PostgreSQL Real Test',
  'Audit Log Test',
  'Fetch Email Data Test',
  'Terraform Test',
  'Kubernetes Test',
  'Google Cloud Storage Test',
  'Docker Test',
  'CloudWatch Test',
  'Azure Blob Test',
  'AWS Lambda Test',
  'AWS S3 Test',
  'Memory Test',
  'Text To Speech Test',
  'Speech To Text Test',
  'Vector Search Test',
  'OpenAI Enhanced Test'
];

async function deleteTestWorkflows() {
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
    logger.info('Starting deletion of test workflows...');
    
    // Delete all workflows with "Test" in name or description
    // This is more comprehensive than listing specific names
    const query = `
      DELETE FROM workflows 
      WHERE name ILIKE '%test%' OR description ILIKE '%test%'
      RETURNING id, name
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      logger.info('No test workflows found to delete.');
    } else {
      logger.info(`Successfully deleted ${result.rows.length} test workflow(s):`);
      result.rows.forEach(row => {
        logger.info(`  - ${row.name} (ID: ${row.id})`);
      });
    }
    
    // Also delete any workflow runs associated with these workflows
    // First, get the IDs of deleted workflows
    const deletedIds = result.rows.map(row => row.id);
    
    if (deletedIds.length > 0) {
      const deleteRunsQuery = `
        DELETE FROM workflow_runs 
        WHERE workflow_id = ANY($1::text[])
        RETURNING id, workflow_id
      `;
      
      const runsResult = await pool.query(deleteRunsQuery, [deletedIds]);
      
      if (runsResult.rows.length > 0) {
        logger.info(`Also deleted ${runsResult.rows.length} associated workflow run(s).`);
      }
    }
    
    logger.info('Test workflow deletion completed successfully.');
    
  } catch (error) {
    logger.error('Error deleting test workflows:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  deleteTestWorkflows()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { deleteTestWorkflows };

