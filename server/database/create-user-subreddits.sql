-- User Subreddits Management Table
-- This table stores user's selected subreddits with validation and metadata

CREATE TABLE public.user_subreddits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subreddit_name character varying(100) NOT NULL,
  display_name character varying(100) NOT NULL,
  subscriber_count integer DEFAULT 0,
  description text,
  rules_summary text,
  min_karma_required integer DEFAULT 0,
  account_age_required integer DEFAULT 0,
  submission_type character varying(20) DEFAULT 'any' CHECK (submission_type IN ('any', 'link', 'self')),
  over18 boolean DEFAULT false,
  quarantined boolean DEFAULT false,
  public_traffic boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  is_favorite boolean DEFAULT false,
  last_validated timestamp with time zone,
  validation_error text,
  posting_success_count integer DEFAULT 0,
  posting_failure_count integer DEFAULT 0,
  last_posted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Primary key and constraints
  CONSTRAINT user_subreddits_pkey PRIMARY KEY (id),
  CONSTRAINT user_subreddits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT user_subreddits_unique_user_subreddit UNIQUE (user_id, subreddit_name)
);

-- Indexes for better performance
CREATE INDEX idx_user_subreddits_user_id ON public.user_subreddits(user_id);
CREATE INDEX idx_user_subreddits_name ON public.user_subreddits(subreddit_name);
CREATE INDEX idx_user_subreddits_verified ON public.user_subreddits(is_verified);
CREATE INDEX idx_user_subreddits_favorite ON public.user_subreddits(user_id, is_favorite);

-- Comments for documentation
COMMENT ON TABLE public.user_subreddits IS 'Stores user-selected subreddits with validation data and posting statistics';
COMMENT ON COLUMN public.user_subreddits.subreddit_name IS 'Subreddit name without r/ prefix (e.g., videos)';
COMMENT ON COLUMN public.user_subreddits.display_name IS 'Full display name from Reddit API';
COMMENT ON COLUMN public.user_subreddits.submission_type IS 'Type of submissions allowed: any, link, or self';
COMMENT ON COLUMN public.user_subreddits.is_verified IS 'Whether subreddit exists and user can post to it';
COMMENT ON COLUMN public.user_subreddits.posting_success_count IS 'Number of successful posts to this subreddit';
COMMENT ON COLUMN public.user_subreddits.posting_failure_count IS 'Number of failed posts to this subreddit'; 