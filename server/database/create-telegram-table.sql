-- Create table for storing Telegram connection codes
CREATE TABLE IF NOT EXISTS telegram_connection_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_telegram_connection_codes_code ON telegram_connection_codes(code);

-- Create index on user_id for faster user lookups
CREATE INDEX IF NOT EXISTS idx_telegram_connection_codes_user_id ON telegram_connection_codes(user_id);

-- Create index on expires_at for faster cleanup queries
CREATE INDEX IF NOT EXISTS idx_telegram_connection_codes_expires_at ON telegram_connection_codes(expires_at); 