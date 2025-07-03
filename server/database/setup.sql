-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid,
  platform character varying NOT NULL,
  content text NOT NULL,
  author_name character varying NOT NULL,
  author_username character varying NOT NULL,
  author_avatar text,
  platform_comment_id character varying,
  parent_comment_id uuid,
  likes_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.comments(id)
);
CREATE TABLE public.content_approvals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL,
  workflow_id uuid NOT NULL,
  current_step integer DEFAULT 0,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'cancelled'::character varying]::text[])),
  submitted_by uuid NOT NULL,
  submitted_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  approvers jsonb DEFAULT '[]'::jsonb,
  comments text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT content_approvals_pkey PRIMARY KEY (id),
  CONSTRAINT content_approvals_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.posts(id),
  CONSTRAINT content_approvals_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id),
  CONSTRAINT content_approvals_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id)
);
CREATE TABLE public.media_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  filename character varying NOT NULL,
  original_filename character varying NOT NULL,
  url text NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['image'::character varying, 'video'::character varying, 'gif'::character varying, 'document'::character varying]::text[])),
  size integer NOT NULL,
  dimensions jsonb,
  tags ARRAY DEFAULT '{}'::text[],
  folder character varying,
  usage_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT media_files_pkey PRIMARY KEY (id),
  CONSTRAINT media_files_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.mentions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform character varying NOT NULL,
  author_name character varying NOT NULL,
  author_username character varying NOT NULL,
  author_avatar text,
  content text NOT NULL,
  post_content text,
  platform_mention_id character varying,
  is_read boolean DEFAULT false,
  sentiment character varying DEFAULT 'neutral'::character varying CHECK (sentiment::text = ANY (ARRAY['positive'::character varying, 'neutral'::character varying, 'negative'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mentions_pkey PRIMARY KEY (id),
  CONSTRAINT mentions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform character varying NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['comment'::character varying, 'mention'::character varying, 'direct_message'::character varying]::text[])),
  author_name character varying NOT NULL,
  author_username character varying NOT NULL,
  author_avatar text,
  content text NOT NULL,
  post_content text,
  is_read boolean DEFAULT false,
  sentiment character varying DEFAULT 'neutral'::character varying CHECK (sentiment::text = ANY (ARRAY['positive'::character varying, 'neutral'::character varying, 'negative'::character varying]::text[])),
  platform_message_id character varying,
  recipient_id character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  platforms ARRAY NOT NULL DEFAULT '{}'::text[],
  status character varying NOT NULL DEFAULT 'draft'::character varying CHECK (status::text = ANY (ARRAY['draft'::character varying, 'scheduled'::character varying, 'published'::character varying, 'failed'::character varying]::text[])),
  scheduled_at timestamp with time zone,
  published_at timestamp with time zone,
  media ARRAY DEFAULT '{}'::text[],
  engagement jsonb DEFAULT '{"likes": 0, "reach": 0, "shares": 0, "comments": 0}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  permissions ARRAY NOT NULL DEFAULT '{}'::text[],
  description text,
  is_system boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.social_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform character varying NOT NULL CHECK (platform::text = ANY (ARRAY['facebook'::character varying, 'instagram'::character varying, 'twitter'::character varying, 'linkedin'::character varying, 'tiktok'::character varying, 'youtube'::character varying]::text[])),
  username character varying NOT NULL,
  display_name character varying NOT NULL,
  platform_user_id character varying NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  followers integer DEFAULT 0,
  is_connected boolean DEFAULT true,
  profile_image text DEFAULT ''::text,
  last_sync timestamp with time zone DEFAULT now(),
  connected_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT social_accounts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  assigned_by uuid,
  assigned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  password character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.workflows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT workflows_pkey PRIMARY KEY (id),
  CONSTRAINT workflows_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);