# Environment Setup Guide

## Missing .env File Issue

You need to create a `.env` file in the root directory with your Twitter API credentials.

## Create .env File

Create a file named `.env` in the main project directory with the following content:

```bash
# Server Configuration
PORT=3001
BASE_URL=http://localhost:3001
CLIENT_URL=http://localhost:5173

# Database Configuration (Supabase)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT Secret (generate a random string)
JWT_SECRET=your_jwt_secret_key_here

# Twitter API Configuration (OAuth 2.0)
TWITTER_CLIENT_ID=your_twitter_oauth2_client_id
TWITTER_CLIENT_SECRET=your_twitter_oauth2_client_secret

# Twitter API Configuration (OAuth 1.0a) - Same values as above
TWITTER_CONSUMER_KEY=your_twitter_oauth2_client_id
TWITTER_CONSUMER_SECRET=your_twitter_oauth2_client_secret

# Facebook/Instagram API Configuration
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# LinkedIn API Configuration
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# Google/YouTube API Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# TikTok API Configuration
TIKTOK_CLIENT_ID=your_tiktok_client_id
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret

# Discord API Configuration
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_BOT_TOKEN=your_discord_bot_token

# Reddit API Configuration
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
```

## Twitter API Setup

### 1. Get Your Twitter API Credentials

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Select your app or create a new one
3. Go to **"Keys and tokens"** tab

### 2. Find OAuth 2.0 Credentials
Under **"OAuth 2.0 Client ID and Client Secret"**:
- Copy the **Client ID** → use for `TWITTER_CLIENT_ID` and `TWITTER_CONSUMER_KEY`
- Copy the **Client Secret** → use for `TWITTER_CLIENT_SECRET` and `TWITTER_CONSUMER_SECRET`

### 3. Configure Callback URLs
In **"Settings"** tab → **"User authentication settings"**:
```
App permissions: Read and write and Direct message
Type of App: Web App
Callback URLs: 
  http://localhost:3001/api/oauth/twitter/callback
  http://localhost:3001/api/oauth/twitter/oauth2-callback
Website URL: http://localhost:5173
```

### 4. Example .env with Twitter credentials
```bash
BASE_URL=http://localhost:3001
CLIENT_URL=http://localhost:5173
TWITTER_CLIENT_ID=VGhpc19pc19hX2Zha2VfY2xpZW50X2lk
TWITTER_CLIENT_SECRET=VGhpc19pc19hX2Zha2VfY2xpZW50X3NlY3JldA
TWITTER_CONSUMER_KEY=VGhpc19pc19hX2Zha2VfY2xpZW50X2lk
TWITTER_CONSUMER_SECRET=VGhpc19pc19hX2Zha2VfY2xpZW50X3NlY3JldA
# ... other variables
```

## Important Notes

1. **Same Credentials**: For the dual auth setup, use the same OAuth 2.0 credentials for both sets of Twitter variables
2. **Callback URLs**: Must be exact matches in your Twitter app settings
3. **File Location**: The `.env` file must be in the main project directory (not in the server folder)
4. **Security**: Never commit your `.env` file to version control

## After Creating .env File

1. Restart your server: `npm run dev`
2. Try connecting your Twitter account again
3. You should see the dual authentication flow working

## Troubleshooting

If you still get callback URL errors:
1. Double-check the callback URLs in Twitter app settings
2. Wait 2-3 minutes after saving Twitter app settings
3. Clear browser cache or try incognito mode
4. Check that your server is running on port 3001 