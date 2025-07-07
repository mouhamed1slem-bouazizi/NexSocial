// Simple script to fix Telegram database constraint
require('dotenv').config();

async function runSQL() {
  console.log('🔧 TELEGRAM DATABASE CONSTRAINT FIX');
  console.log('===================================');
  console.log('');
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase credentials');
      console.log('Please run this SQL manually in your Supabase SQL Editor:');
      console.log('');
      console.log('ALTER TABLE social_accounts DROP CONSTRAINT IF EXISTS social_accounts_platform_check;');
      console.log("ALTER TABLE social_accounts ADD CONSTRAINT social_accounts_platform_check CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest', 'discord', 'telegram', 'whatsapp', 'snapchat', 'reddit', 'vimeo', 'threads', 'twitch', 'line', 'tumblr', 'vk'));");
      return;
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('📡 Connected to Supabase');
    
    // Drop constraint
    console.log('🔄 Dropping existing constraint...');
    const { data: drop, error: dropError } = await supabase.rpc('sql', {
      query: 'ALTER TABLE social_accounts DROP CONSTRAINT IF EXISTS social_accounts_platform_check;'
    });
    
    if (dropError) {
      console.log('⚠️  Note: Could not drop constraint (might not exist)');
    } else {
      console.log('✅ Constraint dropped');
    }

    // Add new constraint
    console.log('🔄 Adding new constraint with Telegram...');
    const { data: add, error: addError } = await supabase.rpc('sql', {
      query: `ALTER TABLE social_accounts ADD CONSTRAINT social_accounts_platform_check 
              CHECK (platform IN (
                'facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube',
                'pinterest', 'discord', 'telegram', 'whatsapp', 'snapchat', 'reddit',
                'vimeo', 'threads', 'twitch', 'line', 'tumblr', 'vk'
              ));`
    });

    if (addError) {
      console.error('❌ Failed to add constraint:', addError.message);
      console.log('');
      console.log('Please run this SQL manually in Supabase SQL Editor:');
      console.log("ALTER TABLE social_accounts ADD CONSTRAINT social_accounts_platform_check CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest', 'discord', 'telegram', 'whatsapp', 'snapchat', 'reddit', 'vimeo', 'threads', 'twitch', 'line', 'tumblr', 'vk'));");
    } else {
      console.log('✅ New constraint added successfully!');
      console.log('🎉 Telegram connections are now enabled!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
    console.log('MANUAL FIX REQUIRED:');
    console.log('Go to Supabase Dashboard > SQL Editor and run:');
    console.log('');
    console.log('ALTER TABLE social_accounts DROP CONSTRAINT IF EXISTS social_accounts_platform_check;');
    console.log("ALTER TABLE social_accounts ADD CONSTRAINT social_accounts_platform_check CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest', 'discord', 'telegram', 'whatsapp', 'snapchat', 'reddit', 'vimeo', 'threads', 'twitch', 'line', 'tumblr', 'vk'));");
  }
}

runSQL(); 