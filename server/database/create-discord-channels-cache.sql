-- Migration: Create discord_channels table for caching Discord channel data
-- Description: Cache Discord channels to avoid repeated API calls and improve performance
-- Date: 2024

-- Create discord_channels table
CREATE TABLE IF NOT EXISTS public.discord_channels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  social_account_id uuid NOT NULL,
  discord_channel_id character varying NOT NULL,
  channel_name character varying NOT NULL,
  channel_position integer DEFAULT 0,
  parent_id character varying,
  topic text,
  nsfw boolean DEFAULT false,
  permissions jsonb DEFAULT '[]'::jsonb,
  guild_id character varying NOT NULL,
  guild_name character varying NOT NULL,
  cached_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT discord_channels_pkey PRIMARY KEY (id),
  CONSTRAINT discord_channels_social_account_id_fkey FOREIGN KEY (social_account_id) REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  CONSTRAINT discord_channels_unique_per_account UNIQUE (social_account_id, discord_channel_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_discord_channels_social_account_id ON public.discord_channels(social_account_id);
CREATE INDEX IF NOT EXISTS idx_discord_channels_cached_at ON public.discord_channels(cached_at);
CREATE INDEX IF NOT EXISTS idx_discord_channels_guild_id ON public.discord_channels(guild_id);

-- Add comment to the table
COMMENT ON TABLE public.discord_channels IS 'Cached Discord channel data to improve performance and reduce API calls';

-- Verify the table was created
SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'discord_channels' 
ORDER BY ordinal_position; 