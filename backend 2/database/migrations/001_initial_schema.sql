-- Initial schema for Workflow Studio
-- Run this to set up the database tables

-- Users table (basic user management)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT false,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow runs table
CREATE TABLE IF NOT EXISTS workflow_runs (
    id VARCHAR(255) PRIMARY KEY,
    workflow_id VARCHAR(255) REFERENCES workflows(id) ON DELETE CASCADE,
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
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow run events table (for SSE and logging)
CREATE TABLE IF NOT EXISTS workflow_run_events (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(255) REFERENCES workflow_runs(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    node_id VARCHAR(255),
    payload JSONB,
    ts BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    model VARCHAR(100) DEFAULT 'gpt-4o-mini',
    instructions TEXT,
    tools JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT false,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent runs table
CREATE TABLE IF NOT EXISTS agent_runs (
    id VARCHAR(255) PRIMARY KEY,
    agent_id VARCHAR(255) REFERENCES agents(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'queued',
    input JSONB DEFAULT '{}',
    output JSONB,
    error TEXT,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent messages table
CREATE TABLE IF NOT EXISTS agent_messages (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(255) REFERENCES agent_runs(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credentials table (encrypted storage)
CREATE TABLE IF NOT EXISTS credentials (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    encrypted_data TEXT NOT NULL,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_user_id ON workflow_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_created_at ON workflow_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_run_events_run_id ON workflow_run_events(run_id);
CREATE INDEX IF NOT EXISTS idx_workflow_run_events_ts ON workflow_run_events(ts);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_id ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_user_id ON agent_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_run_id ON agent_messages(run_id);
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_type ON credentials(type);

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
