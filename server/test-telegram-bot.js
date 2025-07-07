// Simple test script to verify Telegram bot is working
require('dotenv').config();

async function testTelegramBot() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  
  console.log('🤖 Testing Telegram Bot Configuration...');
  console.log(`Bot Token: ${botToken ? botToken.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log(`Bot Username: ${botUsername || 'NOT SET'}`);
  
  if (!botToken || botToken === 'YOUR_BOT_TOKEN_FROM_BOTFATHER') {
    console.log('❌ ERROR: TELEGRAM_BOT_TOKEN is not set in .env file');
    console.log('Please update your .env file with the actual bot token from BotFather');
    return;
  }
  
  if (!botUsername || botUsername === 'your_bot_username_without_@') {
    console.log('❌ ERROR: TELEGRAM_BOT_USERNAME is not set in .env file');
    console.log('Please update your .env file with your bot username (without @)');
    return;
  }
  
  try {
    console.log('🔄 Testing bot API connection...');
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ SUCCESS! Bot is working correctly:');
      console.log(`   Bot Name: ${result.result.first_name}`);
      console.log(`   Bot Username: @${result.result.username}`);
      console.log(`   Bot ID: ${result.result.id}`);
      console.log('\n🎉 Your bot is ready to use!');
      
      // Test sending a message to the bot (it will fail but that's expected)
      console.log('\n📝 To test in your group:');
      console.log('1. Make sure your bot is added to your Telegram group as admin');
      console.log('2. Send this message in your group: /start');
      console.log('3. The bot should respond with a welcome message');
      
    } else {
      console.log('❌ ERROR: Bot API call failed');
      console.log('Response:', result);
      console.log('\n🔍 Possible issues:');
      console.log('- Bot token is incorrect');
      console.log('- Bot was deleted or blocked');
      console.log('- Network connectivity issues');
    }
    
  } catch (error) {
    console.log('❌ ERROR: Failed to connect to Telegram API');
    console.error(error.message);
  }
}

// Run the test
testTelegramBot(); 