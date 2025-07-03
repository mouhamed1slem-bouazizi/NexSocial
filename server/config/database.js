const { createClient } = require('@supabase/supabase-js');

let supabaseClient = null;

const connectDB = async () => {
  try {
    console.log('🔗 Attempting to connect to Supabase...');
    console.log('🔗 Supabase URL:', process.env.SUPABASE_URL);
    console.log('🔗 Node.js version:', process.version);

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase environment variables');
      console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
      console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      return null;
    }

    console.log('🔗 Creating Supabase client...');
    console.log('🔗 URL format check:', process.env.SUPABASE_URL.startsWith('https://'));
    console.log('🔗 Service key length:', process.env.SUPABASE_SERVICE_ROLE_KEY.length);

    // Create Supabase client
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('✅ Supabase client created successfully');

    // Test the connection with a simple query
    console.log('🔗 Testing connection with a simple query...');
    const { data, error } = await supabaseClient
      .from('social_accounts')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Database connection test failed:', error.message);
      console.error('❌ Error details:', error);

      // Check if it's a table not found error
      if (error.message.includes('relation "social_accounts" does not exist')) {
        console.log('⚠️  Table "social_accounts" does not exist. Please run the setup SQL script.');
        console.log('⚠️  You can find the script in server/database/setup.sql');
        console.log('⚠️  Run it in your Supabase SQL Editor at: https://supabase.com/dashboard/project/ksxbxwdqfdpfvnhbyokj/sql');
      }

      return null;
    }

    console.log('✅ Database connection test successful');
    console.log('✅ Supabase connection established successfully');
    return supabaseClient;

  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error.message);
    console.error('❌ Full error:', error);
    return null;
  }
};

const getSupabase = () => {
  if (!supabaseClient) {
    console.warn('⚠️  Supabase client not initialized');
  }
  return supabaseClient;
};

module.exports = {
  connectDB,
  getSupabase
};