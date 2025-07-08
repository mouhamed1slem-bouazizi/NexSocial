const { getSupabase } = require('./config/database.js');
const fs = require('fs');
const path = require('path');

async function addPreferencesColumn() {
  try {
    console.log('🔧 Adding preferences column to users table...');
    
    // Get Supabase client
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase client is not initialized. Please check your database connection.');
    }
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'database', 'add-preferences-column.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Since automatic execution might not work, let's show the manual steps
    console.log('📋 Please run the following SQL manually in your Supabase SQL Editor:');
    console.log('=' .repeat(80));
    console.log(sql);
    console.log('=' .repeat(80));
    
    // Test if the column already exists by trying to query it
    console.log('🧪 Testing if preferences column exists...');
    
    try {
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('id, email, preferences')
        .limit(1);
      
      if (testError) {
        if (testError.message.includes('column users.preferences does not exist')) {
          console.log('❌ Preferences column does not exist yet.');
          console.log('\n🚀 Next steps:');
          console.log('1. Go to your Supabase project dashboard: https://supabase.com/dashboard');
          console.log('2. Navigate to SQL Editor');
          console.log('3. Copy and paste the SQL above');
          console.log('4. Click "Run" to execute the migration');
          console.log('5. Restart your server');
        } else {
          console.error('❌ Column test failed:', testError.message);
        }
      } else {
        console.log('✅ Preferences column already exists and is working correctly!');
        if (testData && testData.length > 0) {
          console.log('🔍 Sample user data:', {
            id: testData[0].id,
            email: testData[0].email,
            hasPreferences: !!testData[0].preferences
          });
        }
      }
    } catch (queryError) {
      console.error('❌ Test query failed:', queryError.message);
    }
    
  } catch (error) {
    console.error('❌ Failed to add preferences column:', error.message);
    console.error('\n💡 Manual migration required:');
    console.error('Please run the following SQL in your Supabase SQL Editor:');
    
    try {
      const sqlFile = path.join(__dirname, 'database', 'add-preferences-column.sql');
      const sql = fs.readFileSync(sqlFile, 'utf8');
      console.error('\n' + sql);
    } catch (readError) {
      console.error('Could not read SQL file:', readError.message);
    }
  }
}

// Run if called directly
if (require.main === module) {
  addPreferencesColumn().then(() => {
    console.log('🏁 Migration script completed');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = { addPreferencesColumn }; 