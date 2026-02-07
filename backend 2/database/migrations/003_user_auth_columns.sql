-- Add authentication-related columns to users table
-- Safe to run multiple times

-- Add password_hash column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='password_hash'
    ) THEN
        ALTER TABLE users ADD COLUMN password_hash TEXT;
        -- Backfill: set empty string to avoid NOT NULL failure, we'll enforce NOT NULL after
        UPDATE users SET password_hash = '' WHERE password_hash IS NULL;
        ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
    END IF;
END $$;

-- Add is_active column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='is_active'
    ) THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        UPDATE users SET is_active = TRUE WHERE is_active IS NULL;
        ALTER TABLE users ALTER COLUMN is_active SET NOT NULL;
    END IF;
END $$;

-- Add last_login_at column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='last_login_at'
    ) THEN
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL;
    END IF;
END $$;


