const fs = require('fs');
const path = require('path');

console.log('🔧 NexSocial Environment Setup Script');
console.log('=====================================');

const envTemplate = `# Server Configuration
PORT=3001
NODE_ENV=development
BASE_URL=http://localhost:3001
CLIENT_URL=http://localhost:5174

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/nexsocial

# Supabase Configuration (if using Supabase instead of MongoDB)
SUPABASE_URL=your-supabase-url-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
JWT_EXPIRES_IN=30d

# Twitter OAuth Configuration
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret

# Facebook OAuth Configuration
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# LinkedIn OAuth Configuration
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Google OAuth Configuration (for YouTube)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# TikTok OAuth Configuration
TIKTOK_CLIENT_ID=your-tiktok-client-id
TIKTOK_CLIENT_SECRET=your-tiktok-client-secret

# Optional: Rate limiting and security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
`;

const envPath = path.join(__dirname, 'server', '.env');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists at:', envPath);
  console.log('');
  console.log('Please make sure your .env file has these CRITICAL settings:');
  console.log('');
  console.log('PORT=3001');
  console.log('BASE_URL=http://localhost:3001');
  console.log('CLIENT_URL=http://localhost:3000');
  console.log('');
  console.log('The PORT and BASE_URL MUST be 3001 for OAuth to work correctly!');
} else {
  try {
    // Create server directory if it doesn't exist
    const serverDir = path.join(__dirname, 'server');
    if (!fs.existsSync(serverDir)) {
      fs.mkdirSync(serverDir, { recursive: true });
    }

    // Write the .env file
    fs.writeFileSync(envPath, envTemplate);
    console.log('✅ Created .env file at:', envPath);
    console.log('');
    console.log('🔧 Next steps:');
    console.log('1. Edit server/.env and add your actual OAuth credentials');
    console.log('2. Make sure TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET are set');
    console.log('3. Restart your server: npm run dev');
    console.log('');
    console.log('📖 See OAUTH_SETUP.md for detailed instructions on getting OAuth credentials');
  } catch (error) {
    console.error('❌ Failed to create .env file:', error.message);
    console.log('');
    console.log('Please manually create server/.env with this content:');
    console.log('');
    console.log(envTemplate);
  }
}

console.log('');
console.log('🚨 IMPORTANT: OAuth Callback URLs');
console.log('When setting up your Twitter app, use this callback URL:');
console.log('http://localhost:3001/api/oauth/twitter/callback');
console.log('');
console.log('❌ NOT: http://localhost:3000/api/oauth/twitter/callback');
console.log('✅ YES: http://localhost:3001/api/oauth/twitter/callback'); 