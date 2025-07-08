-- Migration: Add preferences column to users table
-- Description: Add user preferences column with default Discord channel filtering settings
-- Date: 2024

-- Add preferences column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{
  "discord": {
    "showChannelsWithRules": false,
    "showChannelsWithAnnouncements": false,
    "customChannelFilters": []
  }
}'::jsonb;

-- Update existing users to have the default preferences if they don't have any
UPDATE public.users 
SET preferences = '{
  "discord": {
    "showChannelsWithRules": false,
    "showChannelsWithAnnouncements": false,
    "customChannelFilters": []
  }
}'::jsonb 
WHERE preferences IS NULL;

-- Add comment to the column
COMMENT ON COLUMN public.users.preferences IS 'User preferences including Discord channel filtering settings';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'preferences'; 