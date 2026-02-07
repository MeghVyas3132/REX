-- Workflow Studio Database Schema
-- This migration creates all necessary tables for the workflow studio

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    api_key VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    settings JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT false,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow runs table
CREATE TABLE IF NOT EXISTS workflow_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    input JSONB DEFAULT '{}',
    output JSONB,
    error TEXT,
    node_results JSONB DEFAULT '{}',
    execution_order JSONB DEFAULT '[]',
    node_outputs JSONB DEFAULT '{}',
    run_options JSONB DEFAULT '{}',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration INTEGER, -- in milliseconds
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow run events table (for SSE and logging)
CREATE TABLE IF NOT EXISTS workflow_run_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    node_id VARCHAR(255),
    payload JSONB,
    ts BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    model VARCHAR(100) DEFAULT 'gpt-4o-mini',
    instructions TEXT,
    tools JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT false,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent runs table
CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'queued',
    input JSONB DEFAULT '{}',
    output JSONB,
    error TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent messages table
CREATE TABLE IF NOT EXISTS agent_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credentials table (encrypted storage)
CREATE TABLE IF NOT EXISTS credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    encrypted_data TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    method VARCHAR(10) DEFAULT 'POST',
    headers JSONB DEFAULT '{}',
    secret VARCHAR(255),
    events JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhook events table
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Queue jobs table
CREATE TABLE IF NOT EXISTS queue_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    options JSONB DEFAULT '{}',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    delay INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 0,
    processed_at TIMESTAMP,
    failed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_user_id ON workflow_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_created_at ON workflow_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_started_at ON workflow_runs(started_at);

CREATE INDEX IF NOT EXISTS idx_workflow_run_events_run_id ON workflow_run_events(run_id);
CREATE INDEX IF NOT EXISTS idx_workflow_run_events_ts ON workflow_run_events(ts);
CREATE INDEX IF NOT EXISTS idx_workflow_run_events_event_type ON workflow_run_events(event_type);

CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON agents(is_active);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_id ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_user_id ON agent_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);

CREATE INDEX IF NOT EXISTS idx_agent_messages_run_id ON agent_messages(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_created_at ON agent_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_type ON credentials(type);

CREATE INDEX IF NOT EXISTS idx_webhooks_workflow_id ON webhooks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks(is_active);

CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook_id ON webhook_events(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);

CREATE INDEX IF NOT EXISTS idx_queue_jobs_type ON queue_jobs(type);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_attempts ON queue_jobs(attempts);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_priority ON queue_jobs(priority);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_created_at ON queue_jobs(created_at);

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_runs_updated_at BEFORE UPDATE ON agent_runs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credentials_updated_at BEFORE UPDATE ON credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
