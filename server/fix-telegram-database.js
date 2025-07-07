// Script to fix the database constraint for Telegram platform
// Run this to enable Telegram connections

require('dotenv').config();

async function fixTelegramConstraint() {
  console.log('🔧 Fixing Telegram platform constraint...');
  console.log('');
  
  // Since we can't directly execute DDL through Supabase client,
  // we'll provide instructions for running the SQL manually
  
  console.log('📋 MANUAL DATABASE FIX REQUIRED');
  console.log('================================');
  console.log('');
  console.log('The database constraint needs to be updated to allow Telegram connections.');
  console.log('Please run the following SQL in your Supabase SQL Editor:');
  console.log('');
  console.log('🔗 Go to: https://supabase.com/dashboard/project/[your-project]/sql');
  console.log('');
  console.log('📝 Copy and paste this SQL:');
  console.log('');
  console.log('-- Drop existing constraint');
  console.log('ALTER TABLE social_accounts DROP CONSTRAINT IF EXISTS social_accounts_platform_check;');
  console.log('');
  console.log('-- Add updated constraint with telegram included');
  console.log('ALTER TABLE social_accounts ADD CONSTRAINT social_accounts_platform_check');
  console.log('CHECK (platform IN (');
  console.log('  \'facebook\', \'instagram\', \'twitter\', \'linkedin\', \'tiktok\', \'youtube\',');
  console.log('  \'pinterest\', \'discord\', \'telegram\', \'whatsapp\', \'snapchat\', \'reddit\',');
  console.log('  \'vimeo\', \'threads\', \'twitch\', \'line\', \'tumblr\', \'vk\'');
  console.log('));');
  console.log('');
  console.log('✅ After running this SQL, your Telegram connections will work!');
  console.log('');
  
  // Alternative: Try direct connection to PostgreSQL if credentials are available
  if (process.env.DATABASE_URL) {
    console.log('🔄 Attempting direct database connection...');
    
    try {
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });

      // Drop existing constraint
      await pool.query('ALTER TABLE social_accounts DROP CONSTRAINT IF EXISTS social_accounts_platform_check;');
      console.log('✅ Dropped existing constraint');

      // Add new constraint
      await pool.query(`
        ALTER TABLE social_accounts ADD CONSTRAINT social_accounts_platform_check 
        CHECK (platform IN (
          'facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube',
          'pinterest', 'discord', 'telegram', 'whatsapp', 'snapchat', 'reddit',
          'vimeo', 'threads', 'twitch', 'line', 'tumblr', 'vk'
        ));
      `);
      
      console.log('✅ Added updated constraint with Telegram support');
      console.log('🎉 SUCCESS! Database fixed automatically');
      
      await pool.end();
      
    } catch (dbError) {
      console.log('❌ Direct database connection failed:', dbError.message);
      console.log('👆 Please use the manual SQL method above');
    }
  }
}

console.log('🚀 Telegram Database Fix');
console.log('========================');
console.log('This script will update the database to support Telegram connections');
console.log('');

fixTelegramConstraint(); 