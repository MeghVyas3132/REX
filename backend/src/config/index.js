require('dotenv').config();

const config = {
  // Server
  port: process.env.PORT || 3002,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  database: {
    url: process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:8080'],
    credentials: true,
  },
  
  // AI Providers
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
  },
  
  // External Services
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  
  // Security
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: '7d',
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
  },
  
  // Workflow Execution
  workflow: {
    maxRetries: parseInt(process.env.WORKFLOW_MAX_RETRIES) || 3,
    defaultTimeout: parseInt(process.env.WORKFLOW_DEFAULT_TIMEOUT) || 60000,
    maxConcurrentRuns: parseInt(process.env.WORKFLOW_MAX_CONCURRENT) || 10,
  },
};

module.exports = config;
