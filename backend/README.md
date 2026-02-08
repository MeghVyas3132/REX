# Workflow Studio Backend

A production-ready backend API for AI Agent Workflow Studio, built with Node.js, Express, and PostgreSQL.

## Features

- **Modular Architecture**: Clean separation of concerns with routes, controllers, services, and models
- **Database Models**: Structured data models for workflows, runs, agents, and credentials
- **Authentication**: JWT-based authentication with middleware
- **Error Handling**: Comprehensive error handling and logging
- **Rate Limiting**: Built-in rate limiting for API protection
- **Security**: Helmet.js for security headers, CORS configuration
- **Logging**: Winston-based structured logging
- **Workflow Execution**: Robust workflow execution with retry/timeout support
- **Real-time Updates**: Server-Sent Events (SSE) for live workflow monitoring
- **Agent Support**: AI agent management and execution
- **External Integrations**: Support for OpenAI, OpenRouter, Google, Slack, Discord, etc.

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup** (Optional)
   ```bash
   # Create PostgreSQL database
   createdb workflow_studio
   
   # Run migrations
   npm run migrate
   ```

4. **Start Server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Workflows
- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow
- `GET /api/workflows/:id` - Get workflow
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow
- `POST /api/workflows/:id/run` - Run workflow

### Runs
- `GET /api/runs` - List workflow runs
- `GET /api/runs/:id` - Get workflow run details

### Agents
- `GET /api/agents` - List agents
- `POST /api/agents` - Create agent
- `GET /api/agents/:id` - Get agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

### Legacy Endpoints (for compatibility)
- `POST /run-workflow` - Execute workflow with SSE
- `GET /runs/stream` - SSE stream for workflow events
- `GET /runs` - List recent runs

## Architecture

```
src/
├── config/           # Configuration management
├── controllers/      # Request handlers
├── middleware/       # Authentication, error handling
├── models/          # Data models
├── routes/          # API route definitions
├── services/        # Business logic
└── utils/          # Utilities (logging, etc.)
```

## Database Schema

The system uses PostgreSQL with the following main tables:
- `workflows` - Workflow definitions
- `workflow_runs` - Execution history
- `workflow_run_events` - Real-time events
- `agents` - AI agent configurations
- `agent_runs` - Agent execution history
- `credentials` - Encrypted credential storage
- `users` - User management

## Configuration

Key environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `OPENAI_API_KEY` - OpenAI API key
- `OPENROUTER_API_KEY` - OpenRouter API key
- `CORS_ORIGIN` - Allowed CORS origins

## Development

- **Linting**: `npm run lint`
- **Testing**: `npm test`
- **Database Migration**: `npm run migrate`

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure proper database connection
3. Set secure JWT secret
4. Configure CORS origins
5. Set up logging and monitoring
6. Use process manager (PM2, Docker, etc.)

## Security Considerations

- All API keys and credentials are encrypted at rest
- JWT tokens for authentication
- Rate limiting on all endpoints
- CORS properly configured
- Security headers via Helmet.js
- Input validation and sanitization
