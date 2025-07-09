-- Create posts tracking table for analytics
CREATE TABLE IF NOT EXISTS user_posts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'video', 'mixed')),
    media_count INTEGER DEFAULT 0,
    platforms JSONB NOT NULL, -- Array of platforms where post was attempted
    successful_platforms JSONB NOT NULL DEFAULT '[]', -- Array of platforms where post succeeded
    failed_platforms JSONB NOT NULL DEFAULT '[]', -- Array of platforms where post failed
    total_accounts INTEGER NOT NULL DEFAULT 0,
    successful_accounts INTEGER NOT NULL DEFAULT 0,
    failed_accounts INTEGER NOT NULL DEFAULT 0,
    post_results JSONB, -- Detailed results from each platform
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_posts_user_id ON user_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_posts_created_at ON user_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_user_posts_user_created ON user_posts(user_id, created_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_posts_updated_at 
    BEFORE UPDATE ON user_posts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add some helpful comments
COMMENT ON TABLE user_posts IS 'Tracks all user posts for analytics and statistics';
COMMENT ON COLUMN user_posts.platforms IS 'JSON array of all platforms attempted for this post';
COMMENT ON COLUMN user_posts.successful_platforms IS 'JSON array of platforms where post succeeded';
COMMENT ON COLUMN user_posts.failed_platforms IS 'JSON array of platforms where post failed';
COMMENT ON COLUMN user_posts.post_results IS 'Detailed results from each platform posting attempt'; 