-- Add password authentication to users table
-- This migration adds password_hash field and updates the users table

-- Add password_hash column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add index for better performance on email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add index for better performance on api_key lookups  
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);

-- Add index for active users
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
