-- Create credentials table for storing encrypted API keys and credentials
CREATE TABLE IF NOT EXISTS credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- 'api_key', 'oauth', 'basic_auth', etc.
    service VARCHAR(100) NOT NULL, -- 'openai', 'anthropic', 'google', 'slack', etc.
    encrypted_data TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_service ON credentials(service);
CREATE INDEX IF NOT EXISTS idx_credentials_type ON credentials(type);
CREATE INDEX IF NOT EXISTS idx_credentials_is_active ON credentials(is_active);

-- Create unique constraint for user_id + name combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_credentials_user_name ON credentials(user_id, name);
