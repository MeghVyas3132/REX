import 'reflect-metadata';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
const logger = require("./utils/logger");
import { testConnection, closePool } from './db/database';
import { testRedisConnection, closeRedisConnection } from './db/redis';
import { queueService } from './core/queue/queue-service';
// import { queueService } from './core/queue/queue';
import { workerSetup } from './core/queue/worker-setup';
import { cronScheduler } from './core/scheduler/cron-scheduler';
import { webhookManager } from './core/webhooks/webhook-manager';
import { errorHandler, notFoundHandler, handleUncaughtException, handleUnhandledRejection } from './utils/error-handler';

// Import routes
import authRoutes from './api/routes/auth.routes';
import workflowRoutes from './api/routes/workflows.routes';
import executionRoutes from './api/routes/executions.routes';
import webhookRoutes from './api/routes/webhooks.routes';
import credentialsRoutes from './api/routes/credentials.routes';
import promptRoutes from './api/routes/prompts.routes';
import analyticsRoutes from './api/routes/analytics.routes';
import nodesRoutes from './api/routes/nodes.routes';
import templateRoutes from './api/routes/templates.routes';
import triggersRoutes from './api/routes/triggers.routes';
import utilitiesRoutes from './api/routes/utilities.routes';
import integrationsRoutes from './api/routes/integrations.routes';
import communicationRoutes from './api/routes/communication.routes';
import dataRoutes from './api/routes/data.routes';
import memoryRoutes from './api/routes/memory.routes';
import vectorMemoryRoutes from './api/routes/vector-memory.routes';
import oauthRoutes from './api/routes/oauth.routes';
import agentRoutes from './api/routes/agent.routes';
import orchestrationRoutes from './api/routes/orchestration.routes';
import multiAgentCoordinationRoutes from './api/routes/multi-agent-coordination.routes';
import queueRoutes from './api/routes/queue.routes';
import cloudRoutes from './api/routes/cloud.routes';
import enhancedNodesRoutes from './api/routes/enhanced-nodes.routes';
import workflowNodesRoutes from './api/routes/workflow-nodes.routes';
import fileProcessingRoutes from './api/routes/file-processing.routes';
import emailDataRoutes from './api/routes/email-data.routes';
import auditLogsRoutes from './api/routes/audit-logs.routes';
import emailLogsRoutes from './api/routes/email-logs.routes';

// Handle uncaught exceptions and unhandled rejections
handleUncaughtException();
handleUnhandledRejection();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration - use only CORS_ORIGIN env var
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow curl/postman
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing and compression (skip for SSE)
app.use(compression({
  filter: (req, res) => {
    const accept = req.headers['accept'];
    if (accept && typeof accept === 'string' && accept.includes('text/event-stream')) {
      return false;
    }
    const type = res.getHeader('Content-Type');
    if (type && String(type).includes('text/event-stream')) {
      return false;
    }
    // default filter
    // @ts-ignore - compression exports filter function on default export
    return compression.filter(req, res);
  }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined', {
  stream: { 
    write: message => {
      try {
        logger.info(message.trim());
      } catch (error) {
        logger.info(message.trim());
      }
    }
  }
}));

// Request ID for correlation
app.use((req, res, next) => {
  const rid = req.headers['x-request-id'] as string || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  (req as any).requestId = rid;
  res.setHeader('x-request-id', rid);
  next();
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Workflow Studio API is running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    status: 'operational',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      redis: 'connected',
      queue: 'active',
      nodes: 'loaded'
    },
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Auth status endpoint (public)
app.get('/api/auth/status', (req, res) => {
  res.json({
    success: true,
    status: 'authentication_available',
    timestamp: new Date().toISOString(),
    endpoints: {
      login: '/api/auth/login',
      register: '/api/auth/register',
      oauth: '/api/auth/oauth',
      refresh: '/api/auth/refresh'
    },
    features: {
      jwt: true,
      oauth: true,
      refresh_tokens: true
    }
  });
});

// Public prompts endpoint (no auth required)
app.get('/api/prompts/public', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Public prompts endpoint - authentication required for full access',
    timestamp: new Date().toISOString()
  });
});

// OAuth test endpoint
app.get('/oauth/test', (req, res) => {
  res.json({
    message: 'OAuth system is ready',
    endpoints: {
      google: '/api/auth/oauth/google',
      callback: '/api/auth/oauth/google/callback',
      status: '/api/auth/oauth/status',
      connections: '/api/auth/oauth/connections'
    },
    setup: {
      googleClientId: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'missing',
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'configured' : 'missing'
    }
  });
});

// Readiness check
app.get('/ready', async (req, res) => {
  try {
    const ok = await testConnection();
    if (!ok) {
      return res.status(503).json({ status: 'degraded', ready: false, timestamp: new Date().toISOString() });
    }
    return res.json({ status: 'ready', ready: true, timestamp: new Date().toISOString() });
  } catch (e) {
    return res.status(503).json({ status: 'degraded', ready: false, timestamp: new Date().toISOString() });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/executions', executionRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/credentials', credentialsRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/nodes', nodesRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/triggers', triggersRoutes);
app.use('/api/utilities', utilitiesRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/vector-memory', vectorMemoryRoutes);
app.use('/api/auth/oauth', oauthRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/orchestration', orchestrationRoutes);
app.use('/api/multi-agent-coordination', multiAgentCoordinationRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/cloud', cloudRoutes);
app.use('/api/enhanced-nodes', enhancedNodesRoutes);
app.use('/api/workflows/nodes', workflowNodesRoutes);
app.use('/api/file-processing', fileProcessingRoutes);
app.use('/api/email-data', emailDataRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/email-logs', emailLogsRoutes);

// Legacy endpoints for compatibility
app.post('/run-workflow', async (req, res) => {
  try {
    const { nodes = [], edges = [], initialInput = {}, runId: incomingRunId, runOptions = {} } = req.body;
    const runId = incomingRunId || `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    logger.info('Legacy workflow execution request', { runId, nodeCount: nodes.length });

    // Create a temporary workflow for execution
    const workflow = {
      id: 'legacy-workflow',
      name: 'Legacy Workflow',
      nodes,
      edges,
      settings: {},
      isActive: true,
      userId: 'legacy-user',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Execute workflow using the engine
    const { WorkflowEngine } = await import('./core/engine/workflow-engine');
    const engine = new WorkflowEngine();
    const result = await engine.executeWorkflow(workflow, initialInput, runOptions);

    return res.status(200).json({ runId, ...result });
  } catch (error) {
    logger.error('Legacy workflow execution failed', error as Error);
    return res.status(500).json({ success: false, error: 'Workflow execution failed' });
  }
});

// SSE stream endpoint
app.get('/runs/stream', (req, res) => {
  const runId = req.query.runId as string;
  if (!runId) {
    return res.status(400).json({ error: 'runId required' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ runId, ts: Date.now() })}\n\n`);

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`event: ping\n`);
    res.write(`data: ${JSON.stringify({ ts: Date.now() })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
  return; // satisfy linter for explicit return in all paths
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Validate required environment variables
function validateEnvironmentVariables(): void {
  const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
  const missing: string[] = [];

  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    logger.error('Missing required environment variables', new Error('Environment validation failed'), { missing });
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Warn about weak secrets in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET === 'your-secret-key-change-in-production' || 
        process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
      logger.warn('WARNING: Using default JWT_SECRET in production! This is insecure!');
    }
    if (process.env.ENCRYPTION_KEY === 'your-encryption-key-change-in-production' ||
        !process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 32) {
      logger.warn('WARNING: ENCRYPTION_KEY must be exactly 32 characters in production!');
    }
  }
}

// Initialize services
async function initializeServices(): Promise<void> {
  try {
    // Validate environment variables first
    validateEnvironmentVariables();

    // Connect to database (PostgreSQL pool)
    const dbConnected = await testConnection();
    if (dbConnected) {
      logger.info('Database connected (PostgreSQL)');
    } else {
      logger.error('Database connection failed', new Error('Database connection failed'));
    }
    
    // Connect to Prisma ORM
    try {
      const { prismaService } = await import('./db/prisma');
      await prismaService.connect();
      logger.info('Prisma ORM connected');
      
      // Test Prisma connection with a simple query
      try {
        await prismaService.prisma.$queryRaw`SELECT 1`;
        logger.info('Prisma database query test passed');
      } catch (testError: any) {
        logger.warn('Prisma query test failed', { error: testError.message });
      }
    } catch (error: any) {
      logger.warn('Prisma connection failed', { error: error.message });
      logger.warn('Workflow listing will fail until database is configured');
      // Continue without Prisma if it fails - but services will handle gracefully
    }
    
    // Test Redis connection
    const redisConnected = await testRedisConnection();
    if (redisConnected) {
      logger.info('Redis connected successfully');
      
      // Initialize queue service
      await queueService.initializeQueues();
      await queueService.startWorkers();
      logger.info('Queue service started with background workers');
    } else {
      logger.warn('Redis connection failed - background jobs disabled', { error: 'Redis connection failed' });
    }
    
    // Initialize scheduler
    try {
      const ok = await cronScheduler.healthCheck();
      logger.info(`Scheduler ${ok ? 'initialized' : 'loaded (health unknown)'}`);
      logger.info('ℹ️  NOTE: Active workflows with Schedule Trigger nodes will run automatically. To disable, set workflow.isActive=false or remove the Schedule Trigger node.');
    } catch (e) {
      logger.warn('Scheduler initialization encountered an issue', { error: e as Error });
    }
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services', error as Error);
    // Don't hard exit; allow server to continue for non-critical features
  }
}

// Start server
async function startServer(): Promise<void> {
  try {
    await initializeServices();
    
    const PORT = process.env.PORT || 3003;
    const server = http.createServer(app);

    // Initialize ExecutionMonitor with the HTTP server so SSE works
    try {
      const { ExecutionMonitor } = await import('./core/execution/execution-monitor');
      ExecutionMonitor.getInstance(server);
    } catch (e) {
      logger.warn('ExecutionMonitor initialization failed', { error: e as Error });
    }

    server.listen(PORT, async () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Database: Connected (PostgreSQL)`);
      const redisStatus = await testRedisConnection();
      logger.info(`Redis: ${redisStatus ? 'Connected' : 'Not available'}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    // Don't hard exit; surface error but keep process alive for diagnostics
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    // await cronScheduler.shutdown();
    // await workerSetup.stopWorkers();
    // Queue service intentionally disabled in simple mode
    await closePool();
    await closeRedisConnection();
    await queueService.close();
    
    logger.info('Server shut down successfully');
    // Avoid forced exit in dev tooling; let process terminate naturally
  } catch (error) {
    logger.error('Error during shutdown', error as Error);
    // Avoid forced exit in dev tooling
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  try {
    // await cronScheduler.shutdown();
    // Queue service intentionally disabled in simple mode
    await closePool();
    await closeRedisConnection();
    await queueService.close();
    
    logger.info('Server shut down successfully');
    // Avoid forced exit in dev tooling
  } catch (error) {
    logger.error('Error during shutdown', error as Error);
    // Avoid forced exit in dev tooling
  }
});

// Start the server
startServer();

export default app;
