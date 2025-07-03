# OAuth Setup Guide for NexSocial

This guide will help you set up OAuth credentials for all supported social media platforms.

## Prerequisites

1. Create a `.env` file in the `server` directory
2. Copy the structure from `.env.example` (if available) or use the template below

## Environment Variables Template

Create a `.env` file in your `server` directory with the following structure:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
BASE_URL=http://localhost:3001
CLIENT_URL=http://localhost:3000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/nexsocial

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
```

## Platform-Specific Setup

### 1. Twitter OAuth Setup

1. **Create Twitter App**:
   - Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
   - Create a new project and app
   - Navigate to "Settings" → "User authentication settings"

2. **Configure OAuth 2.0**:
   - **App permissions**: Read and Write
   - **Type of App**: Web App
   - **Callback URLs**: `http://localhost:3001/api/oauth/twitter/callback`
   - **Website URL**: `http://localhost:3000`

3. **Get Credentials**:
   - Copy **Client ID** to `TWITTER_CLIENT_ID`
   - Copy **Client Secret** to `TWITTER_CLIENT_SECRET`

### 2. Facebook/Instagram OAuth Setup

1. **Create Facebook App**:
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Create a new app → Choose "Business" type
   - Add Facebook Login product

2. **Configure OAuth Settings**:
   - **Valid OAuth Redirect URIs**: 
     - `http://localhost:3001/api/oauth/facebook/callback`
     - `http://localhost:3001/api/oauth/instagram/callback`

3. **Get Credentials**:
   - Copy **App ID** to `FACEBOOK_APP_ID`
   - Copy **App Secret** to `FACEBOOK_APP_SECRET`

### 3. LinkedIn OAuth Setup

1. **Create LinkedIn App**:
   - Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
   - Create a new app
   - Request "Sign In with LinkedIn" product

2. **Configure OAuth Settings**:
   - **Redirect URLs**: `http://localhost:3001/api/oauth/linkedin/callback`

3. **Get Credentials**:
   - Copy **Client ID** to `LINKEDIN_CLIENT_ID`
   - Copy **Client Secret** to `LINKEDIN_CLIENT_SECRET`

### 4. YouTube (Google) OAuth Setup

1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable YouTube Data API v3

2. **Create OAuth Credentials**:
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: Web application
   - **Authorized redirect URIs**: `http://localhost:3001/api/oauth/youtube/callback`

3. **Get Credentials**:
   - Copy **Client ID** to `GOOGLE_CLIENT_ID`
   - Copy **Client Secret** to `GOOGLE_CLIENT_SECRET`

### 5. TikTok OAuth Setup

1. **Create TikTok App**:
   - Go to [TikTok Developers](https://developers.tiktok.com/)
   - Create a new app
   - Add "Login Kit" product

2. **Configure OAuth Settings**:
   - **Redirect URL**: `http://localhost:3001/api/oauth/tiktok/callback`

3. **Get Credentials**:
   - Copy **Client Key** to `TIKTOK_CLIENT_ID`
   - Copy **Client Secret** to `TIKTOK_CLIENT_SECRET`

## Common Issues and Solutions

### Twitter OAuth Error: "Something went wrong"

This usually happens when:
- **Invalid Client ID/Secret**: Check your credentials
- **Incorrect Redirect URI**: Must match exactly what's configured in Twitter
- **Missing PKCE**: Our updated implementation now uses proper PKCE
- **App not approved**: Some Twitter apps need approval for OAuth 2.0

### Facebook/Instagram Issues

- **App not in Development Mode**: Make sure your app is in development mode for testing
- **Missing Business Verification**: Some features require business verification
- **Invalid Redirect URI**: Must match exactly what's configured

### General Troubleshooting

1. **Check Environment Variables**: Ensure all required variables are set
2. **Restart Server**: After changing .env file, restart your server
3. **Check Console Logs**: Look for detailed error messages in server logs
4. **Verify URLs**: Ensure callback URLs match exactly in both code and platform settings

## Testing

After setting up credentials:

1. Start your server: `npm run dev` (in server directory)
2. Start your client: `npm run dev` (in client directory)
3. Go to `http://localhost:3000` and try connecting accounts
4. Check server logs for any errors

## Production Considerations

- Use HTTPS URLs for all callback URIs
- Store sensitive credentials securely
- Implement proper error handling
- Consider using environment-specific configurations
- Set up proper CORS policies

## Need Help?

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify your app settings on each platform
3. Ensure your .env file is properly configured
4. Make sure all required permissions are granted to your apps 