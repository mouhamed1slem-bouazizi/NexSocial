const { getSupabase } = require('./config/database.js');
const fs = require('fs');

async function setupAnalyticsTable() {
  try {
    console.log('📊 Setting up analytics table...');
    
    const supabase = getSupabase();
    if (!supabase) {
      console.error('❌ Database connection not available');
      return;
    }

    // Check if table exists
    const { data: tables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'user_posts');

    if (checkError) {
      console.log('⚠️ Could not check table existence, proceeding with creation...');
    } else if (tables && tables.length > 0) {
      console.log('✅ user_posts table already exists!');
      return;
    }

    // Create the table using raw SQL
    console.log('📄 Creating user_posts table...');
    
    const sql = `
-- Create posts tracking table for analytics
CREATE TABLE IF NOT EXISTS user_posts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'video', 'mixed')),
    media_count INTEGER DEFAULT 0,
    platforms JSONB NOT NULL,
    successful_platforms JSONB NOT NULL DEFAULT '[]',
    failed_platforms JSONB NOT NULL DEFAULT '[]',
    total_accounts INTEGER NOT NULL DEFAULT 0,
    successful_accounts INTEGER NOT NULL DEFAULT 0,
    failed_accounts INTEGER NOT NULL DEFAULT 0,
    post_results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_posts_user_id ON user_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_posts_created_at ON user_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_user_posts_user_created ON user_posts(user_id, created_at);
    `;

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Error creating table:', error);
      console.log('💡 Please run this SQL manually in your Supabase dashboard:');
      console.log(sql);
    } else {
      console.log('✅ Analytics table created successfully!');
      console.log('📊 Your dashboard will now show real posting statistics');
    }

  } catch (err) {
    console.error('❌ Setup error:', err.message);
    console.log('💡 Alternative: Run the SQL from server/database/create-posts-tracking.sql in Supabase');
  }
}

setupAnalyticsTable(); 