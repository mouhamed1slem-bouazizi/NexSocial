// Script to set up Telegram webhook for production
// Run this once after deploying to Render

const TELEGRAM_BOT_TOKEN = '7988870336:AAEdF4x69xmHn1UFm9bDr0U-uI2j2_sckU';
const RENDER_URL = 'https://nexsocial.onrender.com/'; // Replace with your actual Render URL

async function setupWebhook() {
  try {
    console.log('🔗 Setting up Telegram webhook for production...');
    console.log(`Bot Token: ${TELEGRAM_BOT_TOKEN.substring(0, 10)}...`);
    console.log(`Webhook URL: ${RENDER_URL}/api/oauth/telegram/webhook`);
    
    // Set webhook
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `${RENDER_URL}/api/oauth/telegram/webhook`,
        allowed_updates: ['message'],
        drop_pending_updates: true
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ SUCCESS! Webhook set up successfully');
      console.log('Your bot is now ready to receive messages in production');
      
      // Get webhook info to verify
      const infoResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
      const infoResult = await infoResponse.json();
      
      if (infoResult.ok) {
        console.log('\n📋 Webhook Information:');
        console.log(`URL: ${infoResult.result.url}`);
        console.log(`Pending Updates: ${infoResult.result.pending_update_count}`);
        console.log(`Last Error: ${infoResult.result.last_error_message || 'None'}`);
      }
      
    } else {
      console.log('❌ ERROR: Failed to set webhook');
      console.log('Response:', result);
    }
    
  } catch (error) {
    console.log('❌ ERROR: Failed to set up webhook');
    console.error(error.message);
  }
}

// Test bot first
async function testBot() {
  try {
    console.log('🤖 Testing bot...');
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Bot is working:');
      console.log(`   Name: ${result.result.first_name}`);
      console.log(`   Username: @${result.result.username}`);
      console.log(`   ID: ${result.result.id}\n`);
      
      // Now set up webhook
      await setupWebhook();
      
    } else {
      console.log('❌ Bot test failed:', result);
    }
    
  } catch (error) {
    console.log('❌ Bot test error:', error.message);
  }
}

console.log('🚀 Telegram Production Setup');
console.log('==============================');
testBot(); 