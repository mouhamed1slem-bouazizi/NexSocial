-- Fix telegram platform constraint for social_accounts table
-- This script updates the platform check constraint to include telegram

-- Drop the existing constraint
ALTER TABLE social_accounts DROP CONSTRAINT IF EXISTS social_accounts_platform_check;

-- Add the updated constraint with telegram included
ALTER TABLE social_accounts ADD CONSTRAINT social_accounts_platform_check 
CHECK (platform IN (
  'facebook',
  'instagram', 
  'twitter',
  'linkedin',
  'tiktok',
  'youtube',
  'pinterest',
  'discord',
  'telegram',
  'whatsapp',
  'snapchat',
  'reddit',
  'vimeo',
  'threads',
  'twitch',
  'line',
  'tumblr',
  'vk'
));

-- Verify the constraint was added
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'social_accounts_platform_check'; 