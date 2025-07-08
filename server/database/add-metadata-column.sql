-- Add metadata column to social_accounts table for Discord guild information
-- Migration: Add metadata column
-- Date: 2025-01-08

-- Add the metadata column to store platform-specific data (especially Discord guilds)
ALTER TABLE public.social_accounts 
ADD COLUMN metadata TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.social_accounts.metadata IS 'JSON string containing platform-specific metadata (Discord guilds, etc.)';

-- Update existing Discord accounts to have empty JSON metadata if they don't have any
UPDATE public.social_accounts 
SET metadata = '{}' 
WHERE platform = 'discord' AND metadata IS NULL;

-- Index for faster metadata queries (optional optimization)
CREATE INDEX IF NOT EXISTS social_accounts_metadata_idx ON public.social_accounts USING GIN ((metadata::jsonb));

-- Show the updated table structure
\d public.social_accounts; 