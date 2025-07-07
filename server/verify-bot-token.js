// Script to verify the Telegram bot token

// Test the token from your Render environment
const TOKEN_FROM_RENDER = '7988870336:AAEdF4x69xmHn1UFm9bDr0U-uI2j2_sckU';

async function verifyToken(token, label) {
  console.log(`\n🔍 Testing token: ${label}`);
  console.log(`Token preview: ${token.substring(0, 10)}...${token.substring(token.length - 5)}`);
  console.log(`Token length: ${token.length} characters`);
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ SUCCESS! Token is valid');
      console.log(`   Bot Name: ${result.result.first_name}`);
      console.log(`   Bot Username: @${result.result.username}`);
      console.log(`   Bot ID: ${result.result.id}`);
      console.log(`   Can Join Groups: ${result.result.can_join_groups}`);
      console.log(`   Can Read All Group Messages: ${result.result.can_read_all_group_messages}`);
      return true;
    } else {
      console.log('❌ FAILED! Token is invalid');
      console.log(`   Error Code: ${result.error_code}`);
      console.log(`   Error: ${result.description}`);
      
      if (result.error_code === 401) {
        console.log('\n💡 This usually means:');
        console.log('   - Token is incorrect or has typos');
        console.log('   - Bot was deleted by BotFather');
        console.log('   - Token was revoked');
      }
      return false;
    }
    
  } catch (error) {
    console.log('❌ ERROR: Network or API issue');
    console.error(error.message);
    return false;
  }
}

async function main() {
  console.log('🤖 Telegram Bot Token Verification');
  console.log('=====================================');
  
  // Test the token from Render
  const isValid = await verifyToken(TOKEN_FROM_RENDER, 'Token from Render Environment');
  
  if (!isValid) {
    console.log('\n🔧 WHAT TO DO:');
    console.log('1. Go to @BotFather in Telegram');
    console.log('2. Send /mybots');
    console.log('3. Find your bot "nexora_manager_bot"');
    console.log('4. If it exists, click "API Token" to get the token');
    console.log('5. Update your Render environment variables with the correct token');
    console.log('6. If bot doesn\'t exist, create a new one with /newbot');
  } else {
    console.log('\n🎉 Your bot token is working correctly!');
    console.log('The issue might be with the webhook or server configuration.');
  }
}

main(); 