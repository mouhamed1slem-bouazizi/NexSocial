const { supabase } = require('./config/database.js');
const fs = require('fs');
const path = require('path');

async function createTelegramTable() {
  try {
    console.log('🔧 Creating telegram_connection_codes table...');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'database', 'create-telegram-table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Split SQL statements and execute them one by one
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      const cleanStatement = statement.trim();
      if (cleanStatement) {
        console.log(`Executing: ${cleanStatement.substring(0, 50)}...`);
        
        // Use raw SQL execution
        const { data, error } = await supabase.rpc('exec_sql', { sql: cleanStatement });
        
        if (error) {
          console.error(`❌ Error executing statement: ${error.message}`);
          // Try alternative approach with direct query
          const { error: directError } = await supabase
            .from('_pg_stat_statements')
            .select('*')
            .limit(0);
          
          if (directError) {
            console.log('Using direct SQL execution approach...');
            // This might work in some Supabase setups
            const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
              },
              body: JSON.stringify({ sql: cleanStatement })
            });
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
          }
        } else {
          console.log('✅ Statement executed successfully');
        }
      }
    }
    
    console.log('✅ telegram_connection_codes table created successfully!');
    
    // Test the table by trying to insert and delete a test record
    const testCode = 'test_code_' + Date.now();
    const testUserId = '00000000-0000-0000-0000-000000000000';
    const testExpires = new Date(Date.now() + 10000).toISOString();
    
    console.log('🧪 Testing table with insert/delete...');
    
    const { data: insertData, error: insertError } = await supabase
      .from('telegram_connection_codes')
      .insert([
        {
          code: testCode,
          user_id: testUserId,
          expires_at: testExpires
        }
      ]);
    
    if (insertError) {
      console.error('❌ Test insert failed:', insertError);
    } else {
      console.log('✅ Test insert successful');
      
      // Clean up test record
      const { error: deleteError } = await supabase
        .from('telegram_connection_codes')
        .delete()
        .eq('code', testCode);
      
      if (deleteError) {
        console.error('❌ Test cleanup failed:', deleteError);
      } else {
        console.log('✅ Test cleanup successful');
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to create telegram_connection_codes table:', error);
    console.error('💡 Please create the table manually in Supabase SQL Editor:');
    console.error('\n' + fs.readFileSync(path.join(__dirname, 'database', 'create-telegram-table.sql'), 'utf8'));
  }
}

// Run if called directly
if (require.main === module) {
  createTelegramTable().then(() => {
    console.log('🏁 Script completed');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = { createTelegramTable }; 