import 'dotenv/config';

function parseCorsOrigins(input?: string): string[] {
  if (!input || input.trim() === '') {
    return ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080', 'http://127.0.0.1:8080'];
  }
  if (input === '*') {
    return ['*'];
  }
  return input
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3003'),
  nodeEnv: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL || 'http://localhost:3003',
  
  // Database
  database: {
    url: process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  
  // CORS
  cors: {
    origin: parseCorsOrigins(process.env.CORS_ORIGIN),
    credentials: true,
  },
  
  // Security
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: '7d',
  },
  
  encryption: {
    key: process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'your-encryption-key-change-in-production',
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
  },
  
  // Workflow Execution
  workflow: {
    maxRetries: parseInt(process.env.WORKFLOW_MAX_RETRIES || '3'),
    defaultTimeout: parseInt(process.env.WORKFLOW_DEFAULT_TIMEOUT || '60000'),
    maxConcurrent: parseInt(process.env.WORKFLOW_MAX_CONCURRENT || '10'),
  },
  
  // AI Providers
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
  },
  
  // External Services
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  
  // Webhooks
  webhooks: {
    baseUrl: process.env.WEBHOOK_BASE_URL || process.env.BASE_URL || 'http://localhost:3003',
  },
  
  // API
  api: {
    key: process.env.API_KEY,
  }
};

export default config;
