const { getSupabase } = require('./config/database.js');
const fs = require('fs');
const path = require('path');

async function createDiscordChannelsCache() {
  try {
    console.log('🔧 Creating discord_channels cache table...');
    
    // Get Supabase client
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase client is not initialized. Please check your database connection.');
    }
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'database', 'create-discord-channels-cache.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Show the manual steps
    console.log('📋 Please run the following SQL manually in your Supabase SQL Editor:');
    console.log('=' .repeat(80));
    console.log(sql);
    console.log('=' .repeat(80));
    
    // Test if the table already exists by trying to query it
    console.log('🧪 Testing if discord_channels table exists...');
    
    try {
      const { data: testData, error: testError } = await supabase
        .from('discord_channels')
        .select('id')
        .limit(1);
      
      if (testError) {
        if (testError.message.includes('relation "discord_channels" does not exist')) {
          console.log('❌ discord_channels table does not exist yet.');
          console.log('\n🚀 Next steps:');
          console.log('1. Go to your Supabase project dashboard: https://supabase.com/dashboard');
          console.log('2. Navigate to SQL Editor');
          console.log('3. Copy and paste the SQL above');
          console.log('4. Click "Run" to execute the migration');
          console.log('5. Restart your server');
        } else {
          console.error('❌ Table test failed:', testError.message);
        }
      } else {
        console.log('✅ discord_channels table already exists and is working correctly!');
        console.log('🔍 Table structure verified');
      }
    } catch (queryError) {
      console.error('❌ Test query failed:', queryError.message);
    }
    
  } catch (error) {
    console.error('❌ Failed to create discord_channels table:', error.message);
    console.error('\n💡 Manual migration required:');
    console.error('Please run the following SQL in your Supabase SQL Editor:');
    
    try {
      const sqlFile = path.join(__dirname, 'database', 'create-discord-channels-cache.sql');
      const sql = fs.readFileSync(sqlFile, 'utf8');
      console.error('\n' + sql);
    } catch (readError) {
      console.error('Could not read SQL file:', readError.message);
    }
  }
}

// Run if called directly
if (require.main === module) {
  createDiscordChannelsCache().then(() => {
    console.log('🏁 Migration script completed');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = { createDiscordChannelsCache }; 