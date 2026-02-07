-- Migration for Email Automation Tables
-- Run this to add email_data and audit_logs tables

-- Email Data Table
CREATE TABLE IF NOT EXISTS email_data (
    id VARCHAR(255) PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    sender_email VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255),
    subject TEXT NOT NULL,
    body_html TEXT,
    body_text TEXT,
    template_id VARCHAR(255),
    campaign_id VARCHAR(255),
    attachments JSONB DEFAULT '[]',
    form_inputs JSONB DEFAULT '{}',
    trigger_source VARCHAR(255),
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for email_data
CREATE INDEX IF NOT EXISTS idx_email_data_event_id ON email_data(event_id);
CREATE INDEX IF NOT EXISTS idx_email_data_user_id ON email_data(user_id);
CREATE INDEX IF NOT EXISTS idx_email_data_template_id ON email_data(template_id);
CREATE INDEX IF NOT EXISTS idx_email_data_campaign_id ON email_data(campaign_id);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('success', 'error', 'info', 'warning')),
    event VARCHAR(255) NOT NULL,
    workflow_id VARCHAR(255),
    run_id VARCHAR(255),
    node_id VARCHAR(255),
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_type ON audit_logs(type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workflow_id ON audit_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Update triggers for updated_at
CREATE TRIGGER update_email_data_updated_at 
    BEFORE UPDATE ON email_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audit_logs_updated_at 
    BEFORE UPDATE ON audit_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

