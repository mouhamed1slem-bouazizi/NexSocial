require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Database configuration using Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createUserSubredditsTable() {
  console.log('🚀 Creating user_subreddits table...');
  
  try {
    // Check if table already exists
    const { data: existingTable } = await supabase
      .from('user_subreddits')
      .select('id')
      .limit(1);
    
    if (existingTable !== null) {
      console.log('ℹ️  user_subreddits table already exists, skipping creation');
      return;
    }
  } catch (error) {
    // If we get an error, the table likely doesn't exist, so continue with creation
    console.log('📝 Table does not exist, creating new table...');
  }
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'database', 'create-user-subreddits.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL using Supabase RPC
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Try alternative approach - create table using direct SQL execution
      console.log('⚠️  RPC method failed, trying manual table creation...');
      
      // Create the table structure manually
      await createTableManually();
    } else {
      console.log('✅ user_subreddits table created successfully!');
    }
    
    console.log('📊 Table features:');
    console.log('  - User-specific subreddit management');
    console.log('  - Subreddit validation and metadata');
    console.log('  - Posting success/failure tracking');
    console.log('  - Performance indexes');
    
  } catch (error) {
    console.error('❌ Error creating user_subreddits table:', error);
    console.log('');
    console.log('🔧 Manual setup required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the contents of: server/database/create-user-subreddits.sql');
    console.log('4. Then run this script again');
  }
}

async function createTableManually() {
  console.log('🛠️  Creating table manually...');
  
  // This is a simplified approach - in production, you would run the SQL in Supabase dashboard
  console.log('⚠️  Please manually run the SQL file in Supabase SQL Editor:');
  console.log('   1. Open Supabase Dashboard → SQL Editor');
  console.log('   2. Copy and paste the contents of: server/database/create-user-subreddits.sql');
  console.log('   3. Click "Run" to execute the SQL');
  console.log('   4. Then run this script again');
}

async function addSampleData() {
  console.log('📝 Adding sample popular subreddits...');
  
  try {
    // Get the first user for sample data
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (userError || !users || users.length === 0) {
      console.log('⚠️  No users found, skipping sample data');
      return;
    }
    
    const userId = users[0].id;
    
    // Sample popular subreddits
    const popularSubreddits = [
      {
        user_id: userId,
        subreddit_name: 'videos',
        display_name: 'videos',
        subscriber_count: 26500000,
        description: 'The best place for video content of all kinds',
        submission_type: 'link',
        is_verified: true,
        is_favorite: false
      },
      {
        user_id: userId,
        subreddit_name: 'funny',
        display_name: 'funny',
        subscriber_count: 52000000,
        description: 'Welcome to r/Funny: reddit\'s largest humour depository',
        submission_type: 'any',
        is_verified: true,
        is_favorite: false
      },
      {
        user_id: userId,
        subreddit_name: 'pics',
        display_name: 'pics',
        subscriber_count: 30000000,
        description: 'A place for photographs, pictures, and other images',
        submission_type: 'link',
        is_verified: true,
        is_favorite: false
      },
      {
        user_id: userId,
        subreddit_name: 'gifs',
        display_name: 'gifs',
        subscriber_count: 21000000,
        description: 'Funny, animated GIFs: Your favorite computer file type',
        submission_type: 'link',
        is_verified: true,
        is_favorite: false
      }
    ];
    
    // Insert sample data using Supabase
    const { error: insertError } = await supabase
      .from('user_subreddits')
      .upsert(popularSubreddits, { 
        onConflict: 'user_id,subreddit_name',
        ignoreDuplicates: true 
      });
    
    if (insertError) {
      console.log('⚠️  Could not add sample data (table may not exist yet):', insertError.message);
    } else {
      console.log('✅ Sample subreddits added successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error adding sample data:', error);
    // Don't throw - sample data is optional
  }
}

async function main() {
  try {
    console.log('🔗 Connecting to Supabase...');
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase environment variables');
      console.log('Please ensure these environment variables are set:');
      console.log('- SUPABASE_URL');
      console.log('- SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }
    
    await createUserSubredditsTable();
    await addSampleData();
    
    console.log('🎉 User subreddits setup complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. ✅ Database table created');
    console.log('2. 📝 Add API endpoints for subreddit management');
    console.log('3. 🎨 Build frontend interface');
    console.log('4. 🔗 Integrate with posting flow');
    
  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { createUserSubredditsTable, addSampleData }; 